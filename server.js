require('dotenv').config();
const { posts, lookup, flags, bans } = require('./db');
const { artists, post, user, server } = require('./templates');
const cloudscraper = require('cloudscraper');
const request = require('request-promise');
const bodyParser = require('body-parser');
const readChunk = require('read-chunk');
const imageType = require('image-type');
const scrapeIt = require('scrape-it');
const express = require('express');
const fs = require('fs-extra');
const sharp = require('sharp');
const path = require('path');
const esc = require('escape-string-regexp');
const indexer = require('./indexer');
const getUrls = require('get-urls');
posts.createIndex({ title: 'text', content: 'text' }); // /api/:service?/:entity/:id/lookup
posts.createIndex({ user: 1, service: 1 }); // /api/:service?/:entity/:id
posts.createIndex({ user: 1, service: 1, published_at: -1 });
posts.createIndex({ id: 1, user: 1, service: 1, published_at: -1 });
posts.createIndex({ service: 1 }); // /random, /api/recent
posts.createIndex({ service: 1, added_at: -1 }); // /api/recent
posts.createIndex({ added_at: -1 }); // indexer
posts.createIndex({ published_at: -1 }); // /api/:service?/:entity/:id, /api/:service?/:entity/:id/lookup, /api/:service?/:entity/:id/post/:post,
lookup.createIndex({ service: 1, name: 1 }); // /api/lookup, /api/discord/channels/lookup
lookup.createIndex({ id: 1, service: 1 }); // /api/lookup/cache/:id
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
  .get('/thumbnail/*', async (req, res) => {
    const file = `${process.env.DB_ROOT}/${req.params[0]}`;
    if (process.env.DISABLE_THUMBNAILS === 'true') return fs.createReadStream(file).pipe(res);
    const fileExists = await fs.pathExists(file);
    if (!fileExists) return res.sendStatus(404);
    let type = imageType(await readChunk(file, 0, imageType.minimumBytes))
    let ext = type ? type.ext : ''
    ext = ext === 'jpg' ? 'jpeg' : ext;
    const fileSupported = sharp.format[ext] ? sharp.format[ext].input.file : false
    if (!fileSupported) return res.sendStatus(404);
    res.setHeader('Cache-Control', 'max-age=31557600, public');
    sharp(file, { failOnError: false })
      .jpeg({ quality: 60 })
      .resize({ width: Number(req.query.size) <= 800 ? Number(req.query.size) : 800, withoutEnlargement: true })
      .setMaxListeners(250)
      .on('error', () => {
        fs.createReadStream(file)
          .pipe(res);
      })
      .pipe(res);
  })
  .get('/', (_, res) => res.redirect('/artists'))
  .get('/artists', async (req, res) => {
    if (!req.query.commit) return res.send(artists({ results: [], query: req.query }))
    let query = {
      name: {
        $regex: esc(req.query.q || ''),
        $options: 'i'
      }
    };
    if (req.query.service) query['service'] = req.query.service;
    let sort = {};
    if (req.query.sort_by) sort[req.query.sort_by] = req.query.order === 'asc' ? 1 : -1;
    const index = await lookup
      .find(query)
      .sort(sort)
      .limit(Number(req.query.limit) <= 250 ? Number(req.query.limit) : 50)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.send(artists({ results: index, query: req.query, url: req.originalUrl }))
  })
  .use('/files', express.static(`${process.env.DB_ROOT}/files`, staticOpts))
  .use('/attachments', express.static(`${process.env.DB_ROOT}/attachments`, staticOpts))
  .use('/inline', express.static(`${process.env.DB_ROOT}/inline`, staticOpts))
  .get('/random', async (_, res) => {
    const postsCount = await posts.countDocuments({ service: { $ne: 'discord' } });
    const random = await posts
      .find({ service: { $ne: 'discord' } })
      .hint({ service: 1 })
      .skip(Math.random() * postsCount)
      .limit(1)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.redirect(path.join(
      '/',
      random[0].service === 'patreon' || !random[0].service ? '' : random[0].service,
      'user', random[0].user,
      'post', random[0].id
    ));
  })
  .get('/api/bans', async (_, res) => {
    const userBans = await bans.find({}).toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userBans);
  })
  .get('/api/recent', async (req, res) => {
    const recentPosts = await posts.find({ service: { $ne: 'discord' } })
      .sort({ added_at: -1 })
      .hint({ service: 1, added_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(recentPosts);
  })
  .post('/api/import', (req, res) => {
    if (!req.body.session_key) return res.sendStatus(401);
    switch (req.body.service) {
      case 'patreon':
        require('./importer.js')(req.body.session_key);
        break;
      case 'fanbox':
        require('./importers/fanbox/importer.js')(req.body.session_key);
        break;
      case 'gumroad':
        require('./importers/gumroad/importer.js')(req.body.session_key);
        break;
      case 'subscribestar':
        require('./importers/subscribestar/importer.js')(req.body.session_key);
        break;
      case 'discord':
        if (!req.body.channel_ids) return res.sendStatus(400);
        require('./importers/discord/importer.js')({
          key: req.body.session_key,
          channels: req.body.channel_ids
        });
        break;
    }
    res.redirect('/importer/ok');
  })
  .get('/api/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: req.query.service,
        name: {
          $regex: esc(req.query.q),
          $options: 'i'
        }
      })
      .limit(Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .map(user => user.id)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/api/discord/channels/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: 'discord-channel',
        server: req.query.q
      })
      .limit(Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/api/lookup/cache/:id', async (req, res) => {
    const cache = await lookup.findOne({ id: req.params.id, service: req.query.service });
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json({ name: cache ? cache.name : '' });
  })
  .get('/api/:service?/:entity/:id/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const query = { $text: { $search: req.query.q } };
    query[req.params.entity] = req.params.id;
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
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/:service?/:entity/:id/purge', async (req, res) => {
    const banExists = await bans.findOne({ id: req.params.id, service: req.params.service || 'patreon' });
    if (!banExists) return res.sendStatus(403);

    const query = {};
    query[req.params.entity] = req.params.id;
    if (!req.params.service) {
      query.$or = [
        { service: 'patreon' },
        { service: null }
      ];
    } else {
      query.service = req.params.service;
    }
    await posts.deleteMany(query);
    await fs.remove(path.join(
      process.env.DB_ROOT,
      'files',
      req.params.service ? req.params.service : '',
      req.params.id
    ));
    await fs.remove(path.join(
      process.env.DB_ROOT,
      'attachments',
      req.params.service ? req.params.service : '',
      req.params.id
    ));
    res.setHeader('Cache-Control', 'no-store');
    res.send('Purged!'); // THOTFAGS BTFO
  })
  .get('/api/:service?/:entity/:id/post/:post', async (req, res) => {
    const query = { id: req.params.post };
    query[req.params.entity] = req.params.id;
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
      .hint({ id: 1, user: 1, service: 1, published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/:service?/:entity/:id/post/:post/flag', async (req, res) => {
    const service = req.params.service ? req.params.service : 'patreon';
    const flagQuery = { id: req.params.post, service: service };
    flagQuery[req.params.entity] = req.params.id;
    res.setHeader('Cache-Control', 'max-age=60, public, no-cache');
    return await flags.findOne(flagQuery) ? res.sendStatus(200) : res.sendStatus(404);
  })
  .post('/api/:service?/:entity/:id/post/:post/flag', async (req, res) => {
    const query = { id: req.params.post };
    query[req.params.entity] = req.params.id;
    if (!req.params.service) {
      query.$or = [
        { service: 'patreon' },
        { service: null }
      ];
    } else {
      query.service = req.params.service;
    }

    const postExists = await posts.findOne(query);
    if (!postExists) return res.sendStatus(404);

    const service = req.params.service ? req.params.service : 'patreon';
    const flagQuery = { id: req.params.post, service: service };
    flagQuery[req.params.entity] = req.params.id;
    const flagExists = await flags.findOne(query);
    if (flagExists) return res.sendStatus(409); // flag already exists
    await flags.insertOne(flagQuery);
    res.end();
  })
  .get('/api/:service?/:entity/:id', async (req, res) => {
    const query = {};
    query[req.params.entity] = req.params.id;
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
      .hint({ user: 1, service: 1, published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/proxy/user/:id', (req, res) => {
    const api = 'https://www.patreon.com/api/user';
    const options = cloudscraper.defaultParams;
    options.json = true;
    cloudscraper.get(`${api}/${req.params.id}`, options)
      .then(user => {
        res.setHeader('Cache-Control', 'max-age=2629800, public, stale-while-revalidate=2592000');
        res.json(user);
      })
      .catch(() => res.sendStatus(404));
  })
  .get('/proxy/fanbox/user/:id', (req, res) => {
    const api = 'https://api.fanbox.cc/creator.get?userId';
    request.get(`${api}=${req.params.id}`, {
      json: true,
      headers: {
        origin: 'https://fanbox.cc',
        cookie: `FANBOXSESSID=${process.env.FANBOX_KEY}`
      }
    })
      .then(user => {
        res.setHeader('Cache-Control', 'max-age=2629800, public, stale-while-revalidate=2592000');
        res.json(user);
      })
      .catch(() => res.sendStatus(404));
  })
  .get('/proxy/gumroad/user/:id', async (req, res) => {
    const api = 'https://gumroad.com';
    try {
      const html = await request.get(`${api}/${req.params.id}`);
      const user = scrapeIt.scrapeHTML(html, {
        background: {
          selector: '.profile-background-container.js-background-image-container img',
          attr: 'src'
        },
        avatar: {
          selector: '.profile-picture.js-profile-picture',
          attr: 'style',
          convert: x => {
            const urls = getUrls(x, {
              sortQueryParameters: false,
              stripWWW: false
            });
            return urls.values().next().value.replace(');', '');
          }
        },
        name: 'h2.creator-profile-card__name.js-creator-name'
      });

      res.setHeader('Cache-Control', 'max-age=31557600, public, stale-while-revalidate=2592000');
      res.json(user);
    } catch (err) {
      res.sendStatus(404);
    }
  })
  .get('/proxy/subscribestar/user/:id', async (req, res) => {
    const api = 'https://subscribestar.adult';
    try {
      const html = await cloudscraper(`${api}/${req.params.id}`);
      const user = scrapeIt.scrapeHTML(html, {
        background: {
          selector: '.profile_main_info-cover',
          attr: 'src'
        },
        avatar: {
          selector: '.profile_main_info-userpic img',
          attr: 'src'
        },
        name: '.profile_main_info-name'
      });

      res.setHeader('Cache-Control', 'max-age=31557600, public, stale-while-revalidate=2592000');
      res.json(user);
    } catch (err) {
      res.sendStatus(404);
    }
  })
  .get('/proxy/discord/server/:id', async (req, res) => {
    const index = await lookup
      .find({ service: 'discord', id: req.params.id })
      .project({ name: 1, icon: 1 })
      .toArray();
    res.setHeader('Cache-Control', 'max-age=2629800, public, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/:service?/:type/:id', (req, res) => {
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    switch (req.params.type) {
      case 'user':
        res.send(user({ service: req.params.service || 'patreon' }));
        break;
      case 'server':
        res.send(server());
        break;
      default:
        res.sendStatus(404);
    }
  })
  .get('/:service?/:type/:id/post/:post', (req, res) => {
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.send(post({ service: req.params.service || 'patreon' }));
  })
  .listen(process.env.PORT || 8000);
