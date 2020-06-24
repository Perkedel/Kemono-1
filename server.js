require('dotenv').config();
const cloudscraper = require('cloudscraper');
const request = require('request-promise');
const { posts, lookup } = require('./db');
const bodyParser = require('body-parser');
const scrapeIt = require('scrape-it');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const esc = require('escape-string-regexp');
const indexer = require('./indexer');
const getUrls = require('get-urls');
const proxy = require('./proxy');
const sharp = require('sharp');
posts.createIndex({ title: 'text', content: 'text' });
sharp.cache(false);
indexer();

const staticOpts = {
  dotfiles: 'allow',
  setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600')
};

express()
  .use(bodyParser.urlencoded({ extended: false }))
  .use(bodyParser.json())
  .use(express.static('public', {
    extensions: ['html', 'htm'],
    setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000')
  }))
  .get('/thumbnail/*', async (req, res) => {
    const file = `${process.env.DB_ROOT}/${req.params[0]}`;
    const resizer = sharp({ failOnError: false, sequentialRead: true })
      .jpeg()
      .resize({ width: Number(req.query.size) <= 800 ? Number(req.query.size) : 800, withoutEnlargement: true })
      .on('error', err => {
        switch (err.message) {
          case 'Input buffer contains unsupported image format': {
            // stream down the original image if cannot be resized
            fs.createReadStream(file)
              .pipe(res);
            break;
          }
          default: {
            console.error(`${err.stack}: ${file}`);
          }
        }
      });
    const fileExists = await fs.pathExists(file);
    if (!fileExists || !(/\.(gif|jpe?g|png|webp|Untitled)$/i).test(file)) return res.sendStatus(404);
    res.setHeader('Cache-Control', 'max-age=31557600, public');
    fs.createReadStream(file)
      .pipe(resizer)
      .pipe(res);
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
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.redirect(path.join(
      '/',
      random[0].service === 'patreon' || !random[0].service ? '' : random[0].service,
      'user', random[0].user,
      'post', random[0].id
    ));
  })
  .get('/api/recent', async (req, res) => {
    const recentPosts = await posts.find({ service: { $ne: 'discord' } })
      .sort({ added_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.json(recentPosts);
  })
  .post('/api/import', async (req, res) => {
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
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
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
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/api/lookup/cache/:id', async (req, res) => {
    const cache = await lookup.findOne({ id: req.params.id, service: req.query.service });
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.send(cache ? cache.name : '');
  })
  .get('/api/:service?/:entity/:id/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const query = { $text: { $search: req.query.q } };
    query[req.params.entity] = req.params.id;
    if (!req.params.service) {
      query.$or = [
        { service: 'patreon' },
        { service: { $exists: false } }
      ];
    } else {
      query.service = req.params.service;
    }
    const userPosts = await posts.find(query)
      .sort({ published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/:service?/:entity/:id', async (req, res) => {
    const query = {};
    query[req.params.entity] = req.params.id;
    if (!req.params.service) {
      query.$or = [
        { service: 'patreon' },
        { service: { $exists: false } }
      ];
    } else {
      query.service = req.params.service;
    }
    const userPosts = await posts.find(query)
      .sort({ published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/:service?/:entity/:id/post/:post', async (req, res) => {
    const query = { id: req.params.post };
    query[req.params.entity] = req.params.id;
    if (!req.params.service) {
      query.$or = [
        { service: 'patreon' },
        { service: { $exists: false } }
      ];
    } else {
      query.service = req.params.service;
    }
    const userPosts = await posts.find(query)
      .sort({ published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/proxy/user/:id', async (req, res) => {
    const api = 'https://www.patreon.com/api/user';
    const options = cloudscraper.defaultParams;
    options.json = true;
    proxy(`${api}/${req.params.id}`, options, cloudscraper)
      .then(user => {
        res.setHeader('Cache-Control', 'max-age=2629800, public, stale-while-revalidate=2592000');
        res.json(user);
      })
      .catch(() => res.sendStatus(404));
  })
  .get('/proxy/fanbox/user/:id', async (req, res) => {
    const api = 'https://api.fanbox.cc/creator.get?userId';
    proxy(`${api}=${req.params.id}`, {
      json: true,
      headers: {
        origin: 'https://fanbox.cc',
        cookie: `FANBOXSESSID=${process.env.FANBOX_KEY}`
      }
    }, request)
      .then(user => {
        res.setHeader('Cache-Control', 'max-age=2629800, public, stale-while-revalidate=2592000');
        res.json(user);
      })
      .catch(() => res.sendStatus(404));
  })
  .get('/proxy/gumroad/user/:id', async (req, res) => {
    const api = 'https://gumroad.com';
    try {
      const html = await proxy(`${api}/${req.params.id}`, {}, cloudscraper);
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
      const html = await proxy(`${api}/${req.params.id}`, {}, cloudscraper);
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
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.sendFile(path.join(__dirname, '/www/', req.params.service || '', `${req.params.type}.html`));
  })
  .get('/:service?/:type/:id/post/:post', (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=2592000');
    res.sendFile(path.join(__dirname, '/www/', req.params.service || '', 'post.html'));
  })
  .listen(process.env.PORT || 8000);
