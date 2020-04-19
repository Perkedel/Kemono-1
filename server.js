require('dotenv').config();
const request = require('request-promise');
const scrapeIt = require('scrape-it');
const getUrls = require('get-urls');
const { posts, lookup } = require('./db');
const cloudscraper = require('cloudscraper');
const bodyParser = require('body-parser');
const express = require('express');
const esc = require('escape-string-regexp');
const compression = require('compression');
const path = require('path');
posts.createIndex({ user: 1, service: 1 });
posts.createIndex({ service: 1 });
posts.createIndex({ added_at: -1 });
posts.createIndex({ published_at: -1 });
lookup.createIndex({ service: 1, name: 1 });
lookup.createIndex({ id: 1, service: 1 });
require('./indexer')();
express()
  .use(compression())
  .use(bodyParser.urlencoded({ extended: false }))
  .use(bodyParser.json())
  .use(express.static('public', {
    extensions: ['html', 'htm'],
    setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000')
  }))
  .use('/files', express.static(`${process.env.DB_ROOT}/files`, {
    dotfiles: 'allow',
    setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600')
  }))
  .use('/attachments', express.static(`${process.env.DB_ROOT}/attachments`, {
    dotfiles: 'allow',
    setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600')
  }))
  .use('/inline', express.static(`${process.env.DB_ROOT}/inline`, {
    dotfiles: 'allow',
    setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600')
  }))
  .get('/user/:id', (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.sendFile(path.join(__dirname, '/www/user.html'));
  })
  .get('/fanbox/user/:id', (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.sendFile(path.join(__dirname, '/www/fanbox/user.html'));
  })
  .get('/gumroad/user/:id', (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.sendFile(path.join(__dirname, '/www/gumroad/user.html'));
  })
  .get('/discord/server/:id', (req, res) => {
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.sendFile(path.join(__dirname, '/www/discord/server.html'));
  })
  .get('/random', async (req, res) => {
    const lookupCount = await lookup.count({ service: 'patreon' });
    const random = await lookup
      .find({ service: 'patreon' })
      .skip(Math.random() * lookupCount)
      .limit(1)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.redirect('/user/' + random[0].id);
  })
  .get('/api/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: 'patreon',
        name: { $regex: '^' + esc(req.query.q) }
      })
      .limit(Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .map(user => user.id)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/api/fanbox/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: 'fanbox',
        name: { $regex: '^' + esc(req.query.q) }
      })
      .limit(Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .map(user => user.id)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/api/gumroad/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: 'gumroad',
        name: { $regex: '^' + esc(req.query.q) }
      })
      .limit(Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .map(user => user.id)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/api/discord/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: 'discord',
        name: { $regex: '^' + esc(req.query.q) }
      })
      .limit(Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .map(user => user.id)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=2592000');
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
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/api/user/:id', async (req, res) => {
    const userPosts = await posts.find({ user: req.params.id })
      .sort({ published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/fanbox/user/:id', async (req, res) => {
    const userPosts = await posts.find({ user: req.params.id, service: 'fanbox' })
      .sort({ published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/gumroad/user/:id', async (req, res) => {
    const userPosts = await posts.find({ user: req.params.id, service: 'gumroad' })
      .sort({ published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/discord/channel/:id', async (req, res) => {
    const userPosts = await posts.find({ channel: req.params.id, service: 'discord' })
      .sort({ published_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) < 50 ? Number(req.query.limit) : 10)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/api/recent', async (req, res) => {
    const recentPosts = await posts.find({ service: { $ne: 'discord' } })
      .sort({ added_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50)
      .toArray();
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=2592000');
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
    }
    res.redirect('/importer/ok');
  })
  .post('/api/discord/import', async (req, res) => {
    if (!req.body.session_key) return res.sendStatus(401);
    if (!req.body.server_id) return res.sendStatus(400);
    if (!req.body.channel_ids) return res.sendStatus(400);
    require('./importers/discord/importer.js')({
      key: req.body.session_key,
      server: req.body.server_id,
      channels: req.body.channel_ids
    });
    res.redirect('/importer/ok');
  })
  .get('/proxy/user/:id', async (req, res) => {
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
  .get('/proxy/fanbox/user/:id', async (req, res) => {
    const api = 'https://fanbox.pixiv.net/api/creator.get?userId';
    request
      .get(`${api}=${req.params.id}`, {
        json: true,
        headers: {
          origin: 'https://www.pixiv.net',
          cookie: `PHPSESSID=${process.env.FANBOX_KEY}`
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

      res.setHeader('Cache-Control', 'max-age=2629800, public, stale-while-revalidate=2592000');
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
  .listen(process.env.PORT || 8000);
