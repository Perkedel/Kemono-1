require('dotenv').config();
const { posts, lookup, flags } = require('./db');
const { api, proxy } = require('./routes');
const bodyParser = require('body-parser');
const readChunk = require('read-chunk');
const imageType = require('image-type');
const express = require('express');
const fs = require('fs-extra');
const sharp = require('sharp');
const path = require('path');
const { artists, post, user, server, recent } = require('./views');
const esc = require('escape-string-regexp');
const indexer = require('./indexer');
posts.createIndex({ title: 'text', content: 'text' }); // /api/:service?/:entity/:id/lookup
posts.createIndex({ user: 1, service: 1 }); // /api/:service?/:entity/:id
posts.createIndex({ user: 1, service: 1, published_at: -1 });
posts.createIndex({ id: 1, user: 1, service: 1 });
posts.createIndex({ id: 1, user: 1, service: 1, published_at: -1 });
posts.createIndex({ service: 1 }); // /random, /api/recent
posts.createIndex({ service: 1, added_at: -1 }); // /api/recent
posts.createIndex({ added_at: -1 }); // indexer
posts.createIndex({ published_at: -1 }); // /api/:service?/:entity/:id, /api/:service?/:entity/:id/lookup, /api/:service?/:entity/:id/post/:post,
lookup.createIndex({ service: 1, name: 1 }); // /api/lookup, /api/discord/channels/lookup
lookup.createIndex({ id: 1, service: 1 }); // /api/lookup/cache/:id
flags.createIndex({ id: 1, service: 1, user: 1 })
sharp.cache(false);
indexer();

const staticOpts = {
  dotfiles: 'allow',
  setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600, no-cache')
};

express()
  .use(bodyParser.urlencoded({ extended: false }))
  .use(bodyParser.json())
  .use(express.static('public', {
    extensions: ['html', 'htm'],
    setHeaders: (res) => res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
  }))
  .use('/api', api)
  .use('/proxy', proxy)
  .get('/thumbnail/*', async (req, res) => {
    const file = `${process.env.DB_ROOT}/${req.params[0]}`;
    if (process.env.DISABLE_THUMBNAILS === 'true') return fs.createReadStream(file).pipe(res);
    const fileExists = await fs.pathExists(file);
    if (!fileExists) return res.sendStatus(404);
    const type = imageType(await readChunk(file, 0, imageType.minimumBytes));
    let ext = type ? type.ext : '';
    ext = ext === 'jpg' ? 'jpeg' : ext;
    const fileSupported = sharp.format[ext] ? sharp.format[ext].input.file : false;
    if (!fileSupported) return res.sendStatus(404);
    res.setHeader('Cache-Control', 'max-age=31557600, public');
    sharp(file, { failOnError: false })
      .jpeg({ quality: 60 })
      .resize({ width: Number(req.query.limit) && Number(req.query.size) <= 800 ? Number(req.query.size) : 800, withoutEnlargement: true })
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
      .type('html')
      .send(artists({
        results: index,
        query: req.query,
        url: req.originalUrl
      }));
  })
  .get('/posts', async (req, res) => {
    const recentPosts = await posts.find({ service: { $ne: 'discord' } })
      .sort({ added_at: -1 })
      .skip(Number(req.query.o) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50)
      .toArray();
    res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
      .type('html')
      .send(recent({
        posts: recentPosts,
        query: req.query,
        url: req.path
      }));
  })
  .use('/files', express.static(`${process.env.DB_ROOT}/files`, staticOpts))
  .use('/attachments', express.static(`${process.env.DB_ROOT}/attachments`, staticOpts))
  .use('/inline', express.static(`${process.env.DB_ROOT}/inline`, staticOpts))
  .get('/random', async (_, res) => {
    const postsCount = await posts.countDocuments({ service: { $ne: 'discord' } });
    const random = await posts
      .find({ service: { $ne: 'discord' } })
      .skip(Math.random() * postsCount)
      .limit(1)
      .toArray();
    res.set('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000')
      .redirect(path.join(
        '/',
        random[0].service === 'patreon' || !random[0].service ? '' : random[0].service,
        'user', random[0].user,
        'post', random[0].id
      ));
  })
  .get('/:service?/:type/:id', async (req, res) => {
    res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    switch (req.params.type) {
      case 'user': {
        const query = {};
        query[req.params.type] = req.params.id;
        if (!req.params.service) {
          query.$or = [
            { service: 'patreon' },
            { service: null }
          ];
        } else {
          query.service = req.params.service;
        }
        const userPosts = await posts.find(query)
          .sort({ published_at: -1 })
          .skip(Number(req.query.o) || 0)
          .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
          .toArray();
        const userUniqueIds = await posts.distinct('id', query);
        res.type('html')
          .send(user({
            count: userUniqueIds.length,
            service: req.params.service || 'patreon',
            posts: userPosts,
            query: req.query,
            url: req.path
          }));
        break;
      }
      case 'server':
        res.type('html')
          .send(server());
        break;
      default:
        res.sendStatus(404);
    }
  })
  .get('/:service?/:type/:id/post/:post', async (req, res) => {
    const query = { id: req.params.post };
    query[req.params.type] = req.params.id;
    if (!req.params.service) {
      query.$or = [
        { service: 'patreon' },
        { service: null }
      ];
    } else {
      query.service = req.params.service;
    }
    const userPosts = await posts.find(query)
      .sort({ published_at: -1 })
      .toArray();
    res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
      .type('html')
      .send(post({
        posts: userPosts,
        service: req.params.service || 'patreon'
      }));
  })
  .listen(process.env.PORT || 8000);
