const { posts, lookup, flags, bans } = require('../db');
const fs = require('fs-extra');
const path = require('path');
const esc = require('escape-string-regexp');

const express = require('express');
const router = express.Router();

router
  .get('/bans', async (_, res) => {
    const userBans = await bans.find({}).toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userBans);
  })
  .get('/recent', async (req, res) => {
    const recentPosts = await posts.find({ service: { $ne: 'discord' } })
      .sort({ added_at: -1 })
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(recentPosts);
  })
  .post('/import', (req, res) => {
    if (!req.body.session_key) return res.sendStatus(401);
    switch (req.body.service) {
      case 'patreon':
        require('../importer')(req.body.session_key);
        break;
      case 'fanbox':
        require('../importers/fanbox/importer')(req.body.session_key);
        break;
      case 'gumroad':
        require('../importers/gumroad/importer')(req.body.session_key);
        break;
      case 'subscribestar':
        require('../importers/subscribestar/importer')(req.body.session_key);
        break;
      case 'dlsite':
        require('../importers/dlsite/importer')({ key: req.body.session_key });
        break;
      case 'dlsite-jp':
        require('../importers/dlsite/importer')({
          key: req.body.session_key,
          jp: true
        });
        break;
      case 'yiffparty':
        if (!req.body.users) return res.sendStatus(400);
        require('../importers/yiffparty/importer')(req.body.users);
        break;
      case 'discord':
        if (!req.body.channel_ids) return res.sendStatus(400);
        require('../importers/discord/importer')({
          key: req.body.session_key,
          channels: req.body.channel_ids.replace(/\s+/g, '')
        });
        break;
    }
    res.redirect('/importer/ok');
  })
  .get('/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: req.query.service,
        name: {
          $regex: esc(req.query.q),
          $options: 'i'
        }
      })
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .map(user => user.id)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/discord/channels/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await lookup
      .find({
        service: 'discord-channel',
        server: req.query.q
      })
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(index);
  })
  .get('/lookup/cache/:id', async (req, res) => {
    const cache = await lookup.findOne({ id: req.params.id, service: req.query.service });
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json({ name: cache ? cache.name : '' });
  })
  .get('/:service?/:entity/:id/lookup', async (req, res) => {
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
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/:service?/:entity/:id/purge', async (req, res) => {
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
  .get('/:service?/:entity/:id/post/:post', async (req, res) => {
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
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/:service?/:entity/:id/post/:post/flag', async (req, res) => {
    const service = req.params.service ? req.params.service : 'patreon';
    const flagQuery = { id: req.params.post, service: service };
    flagQuery[req.params.entity] = req.params.id;
    res.setHeader('Cache-Control', 'max-age=60, public, no-cache');
    return await flags.findOne(flagQuery) ? res.sendStatus(200) : res.sendStatus(404);
  })
  .post('/:service?/:entity/:id/post/:post/flag', async (req, res) => {
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
  .get('/:service?/:entity/:id', async (req, res) => {
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
      .skip(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25)
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  });

module.exports = router;
