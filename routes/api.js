const { db } = require('../utils/db');
const upload = require('./upload');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { success } = require('../views');
router
  .use('/upload', upload)
  .get('/bans', async (_, res) => {
    const userBans = await db('dnp').select('*');
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userBans);
  })
  .get('/recent', async (req, res) => {
    const recentPosts = await db
      .select('*')
      .from('booru_posts')
      .orderBy('added', 'desc')
      .offset(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50);
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(recentPosts);
  })
  .post('/import', (req, res) => {
    if (!req.body.session_key) return res.sendStatus(401);
    const importId = crypto.randomBytes(5).toString('hex');
    switch (req.body.service) {
      case 'patreon':
        require('../importers/patreon')({
          id: importId,
          key: req.body.session_key
        });
        break;
      case 'fanbox':
        require('../importers/fanbox')({
          id: importId,
          key: req.body.session_key
        });
        break;
      case 'gumroad':
        require('../importers/gumroad')({
          id: importId,
          key: req.body.session_key
        });
        break;
      case 'subscribestar':
        require('../importers/subscribestar')({
          id: importId,
          key: req.body.session_key
        });
        break;
      case 'dlsite':
        require('../importers/dlsite')({
          id: importId,
          key: req.body.session_key
        });
        break;
      case 'dlsite-jp':
        require('../importers/dlsite')({
          id: importId,
          key: req.body.session_key,
          jp: true
        });
        break;
      case 'yiffparty':
        if (!req.body.users) return res.sendStatus(400);
        require('../importers/yiffparty')({
          id: importId,
          users: req.body.users.replace(/\s+/g, '').trim()
        });
        break;
      case 'discord':
        if (!req.body.channel_ids) return res.sendStatus(400);
        require('../importers/discord')({
          key: req.body.session_key,
          channels: req.body.channel_ids.replace(/\s+/g, '').trim()
        });
        break;
    }
    res.redirect('/importer/ok');
  })
  .get('/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const index = await db('lookup')
      .select('*')
      .where(req.query.service ? { service: req.query.service } : {})
      .where('name', 'ILIKE', '%' + req.query.q + '%')
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 150 ? Number(req.query.limit) : 50);
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(index.map(user => user.id));
  })
  .get('/discord/channels/lookup', async (req, res) => {
    const index = await db('discord_posts')
      .distinct('channel')
      .where({ server: req.query.q });
    const channels = await Promise.map(index, async (x) => {
      const lookup = await db('lookup').where({ service: 'discord-channel', id: x.channel });
      return {
        id: x.channel,
        name: lookup[0].name
      };
    });
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(channels);
  })
  .get('/discord/channel/:id', async (req, res) => {
    const posts = await db('discord_posts')
      .where({ channel: req.params.id })
      .orderBy('published', 'desc')
      .offset(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 150 ? Number(req.query.limit) : 25);
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(posts);
  })
  .get('/lookup/cache/:id', async (req, res) => {
    const cache = await db('lookup').where({ id: req.params.id, service: req.query.service });
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json({ name: cache.length ? cache[0].name : '' });
  })
  .get('/:service/user/:id/lookup', async (req, res) => {
    if (req.query.q.length > 35) return res.sendStatus(400);
    const userPosts = await db('booru_posts')
      .where({ user: req.params.id, service: req.params.service })
      .whereRaw('to_tsvector(content || \' \' || title) @@ websearch_to_tsquery(?)', [req.query.q])
      .orderBy('published', 'desc')
      .offset(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25);
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/:service/user/:id/purge', async (req, res) => {
    const banExists = await db('dnp').where({ id: req.params.id, service: req.params.service });
    if (!banExists.length) return res.status(403).send('A user must be banned to purge their files.');
    await db('booru_posts').where({ user: req.params.id, service: req.params.service }).del();
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
  .get('/:service/user/:id/post/:post', async (req, res) => {
    const userPosts = await db('booru_posts')
      .where({ id: req.params.post, user: req.params.id, service: req.params.service })
      .orderBy('added', 'asc');
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  })
  .get('/:service/user/:id/post/:post/flag', async (req, res) => {
    res.setHeader('Cache-Control', 'max-age=60, public, no-cache');
    const flags = await db('booru_flags').where({ id: req.params.post, user: req.params.id, service: req.params.service });
    return flags.length ? res.sendStatus(200) : res.sendStatus(404);
  })
  .post('/:service/user/:id/post/:post/flag', async (req, res) => {
    const postExists = await db('booru_posts').where({
      id: req.params.post,
      user: req.params.id,
      service: req.params.service
    });
    if (!postExists.length) return res.sendStatus(404);
    const flagExists = await db('booru_flags').where({
      id: req.params.post,
      user: req.params.id,
      service: req.params.service
    });
    if (flagExists.length) return res.sendStatus(409); // flag already exists
    await db('booru_flags').insert({
      id: req.params.post,
      user: req.params.id,
      service: req.params.service
    });
    res.end();
  })
  .get('/:service/:entity/:id', async (req, res) => {
    const userPosts = await db('booru_posts')
      .where({ user: req.params.id, service: req.params.service })
      .orderBy('published', 'desc')
      .offset(Number(req.query.skip) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 50 ? Number(req.query.limit) : 25);
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userPosts);
  });

module.exports = router;
