require('dotenv').config();
const { api, proxy, board, importer, help } = require('./routes');
const { db } = require('./db');
const bodyParser = require('body-parser');
const readChunk = require('read-chunk');
const imageType = require('image-type');
const express = require('express');
const fs = require('fs-extra');
const sharp = require('sharp');
const path = require('path');
const Promise = require('bluebird');
const { Feed } = require('feed');
const { artists, post, user, server, recent, upload, updated } = require('./views');
const urljoin = require('url-join');

const staticOpts = {
  dotfiles: 'allow',
  setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600, no-cache')
};

module.exports = () => {
  sharp.cache(false);
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
      const index = await db('lookup')
        .select('*')
        .where(req.query.service ? { service: req.query.service } : {})
        .where('name', 'ILIKE', '%' + req.query.q + '%')
        .whereNot('service', 'discord-channel')
        .orderBy(({
          indexed: 'indexed',
          name: 'name',
          service: 'service'
        })[req.query.sort_by], ({
          asc: 'asc',
          desc: 'desc'
        })[req.query.order])
        .limit(Number(req.query.limit) && Number(req.query.limit) <= 250 ? Number(req.query.limit) : 50);
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .type('html')
        .send(artists({
          results: index,
          query: req.query,
          url: req.originalUrl
        }));
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

      })
    })
    .get('/posts', async (req, res) => {
      const recentPosts = await db('booru_posts')
        .select('*')
        .orderBy('added', 'desc')
        .offset(Number(req.query.o) || 0)
        .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25);
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .type('html')
        .send(recent({
          posts: recentPosts,
          query: req.query,
          url: req.path
        }));
    })
    .get('/posts/upload', (req, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(upload({
      query: req.query
    })))
    .use('/files', express.static(`${process.env.DB_ROOT}/files`, staticOpts))
    .use('/attachments', express.static(`${process.env.DB_ROOT}/attachments`, staticOpts))
    .use('/inline', express.static(`${process.env.DB_ROOT}/inline`, staticOpts))
    .get('/random', async (_, res) => {
      const random = await db('booru_posts')
        .select('service', 'user', 'id')
        .whereRaw('random() < 0.01')
        .limit(1);
      if (!random.length) return res.redirect('back');
      res.set('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000')
        .redirect(path.join(
          '/',
          random[0].service,
          'user', random[0].user,
          'post', random[0].id
        ));
    })
    .get('/:service/user/:id/rss', async (req, res) => {
      const cache = await db('lookup').where({ id: req.params.id, service: req.params.service });
      if (!cache.length) return res.sendStatus(404);

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
          item.image = post.file.path;
        }
        feed.addItem({
          title: post.title,
          id: urljoin(process.env.PUBLIC_ORIGIN, req.params.service, 'user', req.params.id, 'post', post.id),
          link: urljoin(process.env.PUBLIC_ORIGIN, req.params.service, 'user', req.params.id, 'post', post.id),
          description: post.content,
          date: new Date(post.added)
        });
      });
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .send(feed.rss2());
    })
    .get('/user/:id', (req, res) => res.redirect('/patreon/user/' + req.params.id))
    .get('/user/:id/post/:post', (req, res) => res.redirect(path.join('/patreon/user/', req.params.id, 'post', req.params.post)))
    .get('/:service/user/:id', async (req, res) => {
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
      const userPosts = await db('booru_posts')
        .where({ user: req.params.id, service: req.params.service })
        .orderBy('published', 'desc')
        .offset(Number(req.query.o) || 0)
        .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25);
      const userUniqueIds = await db('booru_posts')
        .select('id')
        .where({ user: req.params.id, service: req.params.service })
        .groupBy('id')
      res.type('html')
        .send(user({
          count: userUniqueIds.length,
          service: req.params.service || 'patreon',
          id: req.params.id,
          posts: userPosts,
          query: req.query,
          url: req.path
        }));
    })
    .get('/discord/server/:id', async (_, res) => {
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
      res.type('html')
        .send(server());
    })
    .get('/:service/:type/:id/post/:post', async (req, res) => {
      const userPosts = await db('booru_posts')
        .where({ id: req.params.post, user: req.params.id, service: req.params.service })
        .orderBy('added', 'asc');
      res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
        .type('html')
        .send(post({
          posts: userPosts,
          service: req.params.service || 'patreon'
        }));
    })
    .listen(process.env.PORT || 8000);
};
