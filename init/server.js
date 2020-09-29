require('dotenv').config();
const { api, proxy, board, importer, help, requests } = require('../routes');
const bodyParser = require('body-parser');
const readChunk = require('read-chunk');
const imageType = require('image-type');
const express = require('express');
const fs = require('fs-extra');
const sharp = require('sharp');
const { db } = require('../utils/db');
const path = require('path');
const Promise = require('bluebird');
const { Feed } = require('feed');
const { artists, post, user, server, tags, upload, updated, favorites } = require('../views');
const { booruQueryFromString } = require('../utils/builders');
const urljoin = require('url-join');

const staticOpts = {
  dotfiles: 'allow',
  setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600, no-cache')
};

module.exports = () => {
  express()
    .set('trust proxy', true)
    .use(bodyParser.urlencoded({ extended: false }))
    .use(bodyParser.json())
    .use(express.static('public', {
      extensions: ['html', 'htm'],
      setHeaders: (res) => res
        .set('Cache-Control', 'max-age=300, public, stale-while-revalidate=2592000')
        .set('Service-Worker-Allowed', '/')
    }))
    .use('/api', api)
    .use('/help', help)
    .use('/proxy', proxy)
    .use('/board', board)
    .use('/requests', requests)
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
    .get('/', async (req, res) => {
      if (!req.query.commit) return res.send(artists({ results: [], query: req.query, url: req.originalUrl }));
      const index = await db('lookup')
        .select('*')
        .where(req.query.service ? { service: req.query.service } : {})
        .where('name', 'ILIKE', '%' + req.query.q + '%')
        .whereNot('service', 'discord-channel')
        .orderBy(({
          _id: 'indexed',
          indexed: 'indexed',
          name: 'name',
          service: 'service'
        })[req.query.sort_by], ({
          asc: 'asc',
          desc: 'desc'
        })[req.query.order])
        .offset(Number(req.query.o) || 0)
        .limit(Number(req.query.limit) && Number(req.query.limit) <= 250 ? Number(req.query.limit) : 25);
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .type('html')
        .send(artists({
          results: index,
          query: req.query,
          url: req.originalUrl
        }));
    })
    .get('/artists', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').redirect('/'))
    .get('/artists/random', async (_, res) => {
      const random = await db('lookup')
        .select('id', 'service')
        .orderByRaw('random()')
        .limit(1);
      if (!random.length) return res.redirect('back');
      res.set('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000')
        .redirect(path.join(
          '/',
          random[0].service,
          'user', random[0].id
        ));
    })
    .get('/artists/updated', async (req, res) => {
      await db.transaction(async trx => {
        const recentUsers = await trx('booru_posts')
          .select('user', 'service')
          .max('added')
          .groupBy('user', 'service')
          .orderByRaw('max(added) desc')
          .limit(50);

        const index = await Promise.map(recentUsers, async (user) => {
          const cache = await trx('lookup').where({ id: user.user, service: user.service });
          if (!cache.length) return;
          return {
            id: user.user,
            name: cache[0].name,
            service: user.service,
            updated: user.max
          };
        });

        res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
          .type('html')
          .send(updated({
            results: index,
            query: req.query,
            url: req.originalUrl
          }));
      });
    })
    .get('/artists/favorites', (_, res) => res
      .set('Cache-Control', 'max-age=300, public, stale-while-revalidate=2592000')
      .send(favorites()))
    .get('/posts', async (req, res) => {
      if (!req.query.commit) return res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .type('html')
        .send(tags({
          posts: await db('booru_posts').select('*')
            .orderBy('added', 'desc')
            .offset(Number(req.query.o) || 0)
            .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25),
          query: req.query,
          url: req.path
        }));
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .type('html')
        .send(tags({
          posts: await booruQueryFromString(req.query.tags, {
            order: 'added',
            sort: 'desc',
            offset: Number(req.query.o) || 0,
            limit: Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25
          }),
          query: req.query,
          url: req.path
        }));
    })
    .get('/posts/upload', (req, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(upload({
      query: req.query
    })))
    .get('/posts/random', async (_, res) => {
      const random = await db('booru_posts')
        .select('service', 'user', 'id')
        .whereRaw('random() < 0.01')
        .limit(1);
      if (!random.length) return res.redirect('back');
      res.set('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000')
        .redirect(path.join('/posts', random[0].service, random[0].id));
    })
    .use('/files', express.static(`${process.env.DB_ROOT}/files`, staticOpts))
    .use('/attachments', express.static(`${process.env.DB_ROOT}/attachments`, staticOpts))
    .use('/inline', express.static(`${process.env.DB_ROOT}/inline`, staticOpts))
    .get('/:service/user/:id/rss', async (req, res) => {
      const cache = await db('lookup').where({ id: req.params.id, service: req.params.service });
      if (!cache.length) return res.status(404).send('Unable to generate RSS feed; please wait for this user to be indexed.');

      const userPosts = await db('booru_posts')
        .where({ user: req.params.id, service: req.params.service })
        .orderBy('added', 'desc')
        .limit(10);

      const feed = new Feed({
        title: cache[0].name,
        description: `Feed for posts from ${cache[0].name}.`,
        id: urljoin(process.env.PUBLIC_ORIGIN, req.params.service, 'user', req.params.id),
        link: urljoin(process.env.PUBLIC_ORIGIN, req.params.service, 'user', req.params.id),
        generator: 'Kemono',
        ttl: 40
      });
      await Promise.map(userPosts, post => {
        const item = {
          title: post.title,
          id: urljoin(process.env.PUBLIC_ORIGIN, req.params.service, 'user', req.params.id, 'post', post.id),
          link: urljoin(process.env.PUBLIC_ORIGIN, req.params.service, 'user', req.params.id, 'post', post.id),
          description: post.content,
          date: new Date(post.added)
        };
        if (Object.keys(post.file).length !== 0 && (/\.(gif|jpe?g|png|webp)$/i).test(post.file.path)) {
          item.image = urljoin(process.env.PUBLIC_ORIGIN, post.file.path);
        }
        feed.addItem(item);
      });
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .send(feed.rss2());
    })
    .get('/user/:id', (req, res) => res.redirect('/patreon/user/' + req.params.id))
    .get('/user/:id/post/:post', (req, res) => res.redirect(path.join('/patreon/user/', req.params.id, 'post', req.params.post)))
    .get('/:service/user/:id', async (req, res) => {
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
      
    })
    .get('/discord/server/:id', async (_, res) => {
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
      res.type('html')
        .send(server());
    })
    .get('/posts/:service/:post', async (req, res) => {
      const userPosts = await db('booru_posts')
        .where({ id: req.params.post, service: req.params.service })
        .orderBy('added', 'asc');
      const tags = {};
      if (userPosts.length) {
        await Promise.mapSeries(userPosts[0].tags.replace(/\s\s+/g, ' ').trim().split(' '), async tag => {
          if (!tag) return;
          let tagInfo = await db('booru_tags').where({ id: tag });
          tags[tagInfo[0].type] = tags[tagInfo[0].type] ? tags[tagInfo[0].type].push(tagInfo[0].name) : [tagInfo[0].name];
        })
      }
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .type('html')
        .send(post({
          posts: userPosts,
          tags: tags,
          flag: await db('booru_flags').where({ id: req.params.post, service: req.params.service }),
          service: req.params.service || 'patreon'
        }));
    })
    .get('/:service/user/:id/post/:post', (req, res) => res.redirect(path.join('/posts', req.params.service, req.params.post)))
    .listen(process.env.PORT || 8000);
};
