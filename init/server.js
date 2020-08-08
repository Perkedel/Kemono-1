require('dotenv').config();
const { api, proxy, board, importer, help } = require('../routes');
const { posts, lookup, flags, revisions } = require('../utils/db');
const bodyParser = require('body-parser');
const readChunk = require('read-chunk');
const imageType = require('image-type');
const express = require('express');
const fs = require('fs-extra');
const sharp = require('sharp');
const path = require('path');
const Promise = require('bluebird');
const { Feed } = require('feed');
const { artists, post, server, tags, upload, history } = require('../views');
const { buildBooruQueryFromString } = require('../utils/builders');
const urljoin = require('url-join');
const esc = require('escape-string-regexp');
sharp.cache(false);

const staticOpts = {
  dotfiles: 'allow',
  setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600, no-cache')
};

module.exports = () => {
  express()
    .use(bodyParser.urlencoded({ extended: false }))
    .use(bodyParser.json())
    .use(express.static('public', {
      extensions: ['html', 'htm'],
      setHeaders: (res) => res.setHeader('Cache-Control', 'max-age=300, public, stale-while-revalidate=2592000')
    }))
    .use('/api', api)
    .use('/help', help)
    .use('/proxy', proxy)
    .use('/board', board)
    .use('/importer', importer)
    .get('/thumbnail/*', async (req, res) => {
      const file = `${process.env.DB_ROOT}/${req.params[0]}`;
      const fileExists = await fs.pathExists(file);
      if (!fileExists) return res.sendStatus(404);
      if (process.env.DISABLE_THUMBNAILS === 'true') return fs.createReadStream(file).pipe(res);
      const type = imageType(await readChunk(file, 0, imageType.minimumBytes));
      let ext = type ? type.ext : '';
      ext = ext === 'jpg' ? 'jpeg' : ext;
      const fileSupported = sharp.format[ext] ? sharp.format[ext].input.file : false;
      if (!fileSupported) return res.sendStatus(404);
      res.setHeader('Cache-Control', 'max-age=31557600, public');
      sharp(file, { failOnError: false })
        .jpeg({
          quality: 60,
          chromaSubsampling: '4:2:0',
          progressive: true
        })
        .resize({ width: Number(req.query.size) && Number(req.query.size) <= 800 ? Number(req.query.size) : 800, withoutEnlargement: true })
        .setMaxListeners(250)
        .on('error', () => {
          fs.createReadStream(file)
            .pipe(res);
        })
        .pipe(res);
    })
    .get('/', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').redirect('/artists'))
    .get('/artists', async (req, res) => {
      if (!req.query.commit) return res.send(artists({ results: [], query: req.query }));
      const query = {
        $and: [
          { service: { $ne: 'discord-channel' } }
        ],
        name: {
          $regex: esc(req.query.q || ''),
          $options: 'i'
        }
      };
      if (req.query.service) query.$and.push({ service: req.query.service });
      const sort = {};
      if (req.query.sort_by) sort[req.query.sort_by] = req.query.order === 'asc' ? 1 : -1;
      const index = await lookup
        .find(query)
        .sort(sort)
        .limit(Number(req.query.limit) && Number(req.query.limit) <= 250 ? Number(req.query.limit) : 50)
        .toArray();
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .send(artists({
          results: index,
          query: req.query,
          url: req.originalUrl
        }));
    })
    .get('/posts', async (req, res) => {
      const recentPosts = await posts.find(req.query.tags ? buildBooruQueryFromString(req.query.tags) : {})
        .sort({ _id: -1 })
        .skip(Number(req.query.o) || 0)
        .limit(Number(req.query.limit) && Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50)
        .toArray();
      const uniqueCount = await posts.distinct('id', req.query.tags ? buildBooruQueryFromString(req.query.tags) : {});
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .send(tags({
          posts: recentPosts,
          count: uniqueCount,
          query: req.query,
          url: req.path
        }));
    })
    .get('/posts/rss', async (req, res) => {
      const recentPosts = await posts.find(req.query.tags ? buildBooruQueryFromString(req.query.tags) : {})
        .sort({ _id: -1 })
        .limit(10)
        .toArray();
      const feed = new Feed({
        title: `Search for "${req.query.tags}"`,
        description: `Feed for search "${req.query.tags}".`,
        id: urljoin(process.env.PUBLIC_ORIGIN, `posts${req.query.tags ? `?tags=${req.query.tags}` : ''}`),
        link: urljoin(process.env.PUBLIC_ORIGIN, `posts${req.query.tags ? `?tags=${req.query.tags}` : ''}`),
        generator: 'Kemono',
        ttl: 40
      });
      await Promise.map(recentPosts, post => {
        const item = {
          title: post.title,
          id: urljoin(process.env.PUBLIC_ORIGIN, `posts${req.query.tags ? `?tags=${req.query.tags}` : ''}`),
          link: urljoin(process.env.PUBLIC_ORIGIN, `posts${req.query.tags ? `?tags=${req.query.tags}` : ''}`),
          description: post.content,
          date: new Date(post.added_at)
        };
        if (Object.keys(post.file).length !== 0 && (/\.(gif|jpe?g|png|webp)$/i).test(post.file.name)) {
          item.image = post.file.path;
        }
        feed.addItem({
          title: post.title,
          id: urljoin(process.env.PUBLIC_ORIGIN, `posts${req.query.tags ? `?tags=${req.query.tags}` : ''}`),
          link: urljoin(process.env.PUBLIC_ORIGIN, `posts${req.query.tags ? `?tags=${req.query.tags}` : ''}`),
          description: post.content,
          date: new Date(post.added_at)
        });
      });
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .send(feed.rss2());
    })
    .get('/posts/random', async (req, res) => {
      const postsCount = await posts.countDocuments(req.query.tags ? buildBooruQueryFromString(req.query.tags) : {});
      const random = await posts.find(req.query.tags ? buildBooruQueryFromString(req.query.tags) : {})
        .skip(Math.random() * postsCount)
        .limit(1)
        .toArray();
      res.set('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000')
        .redirect(path.join('/posts', random[0].service, random[0].id));
    })
    .get('/posts/:service/:id', async (req, res) => {
      const idPosts = await posts.find({ id: req.params.id, service: req.params.service }).toArray();
      if (!idPosts.length) res.status(404);
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .send(post({
          posts: idPosts,
          flag: await flags.findOne({ id: req.params.id, service: req.params.service })
        }));
    })
    .get('/posts/:service/:id/history', async (req, res) => {
      const idRevisions = await revisions.find({ id: req.params.id, service: req.params.service })
        .sort({ _id: -1 })
        .toArray();
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .send(history({
          revisions: idRevisions
        }));
    })
    .get('/posts/upload', (req, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(upload({
      query: req.query
    })))
    .use('/files', express.static(`${process.env.DB_ROOT}/files`, staticOpts))
    .use('/attachments', express.static(`${process.env.DB_ROOT}/attachments`, staticOpts))
    .use('/inline', express.static(`${process.env.DB_ROOT}/inline`, staticOpts))
    .get('/discord/server/:id', (_, res) => res.send(server()))
    .listen(process.env.PORT || 8000);
};
