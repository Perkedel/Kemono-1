const {
  bans,
  posts,
  flags,
  lookup,
  revisions
} = require('../utils/db');
const { ObjectID } = require('mongodb');
const upload = require('./upload');
const { parseBooruString, stringifyBooruObject, buildBooruQueryFromString } = require('../utils/builders');
const esc = require('escape-string-regexp');

const express = require('express');
const router = express.Router();

router
  .use('/upload', upload)
  .post('/edit_rating', async (req, res) => {
    if (!req.body.rating) return res.sendStatus(400);
    const ratings = ['safe', 'questionable', 'explicit'];
    if (!ratings.includes(req.body.rating)) return res.sendStatus(400);

    await posts.updateMany({
      id: req.body.id,
      service: req.body.service
    }, {
      $set: {
        rating: req.body.rating
      }
    });
    const post = await posts.findOne({
      id: req.body.id,
      service: req.body.service
    });
    await revisions.insertOne({
      id: req.body.id,
      date: new Date().toISOString(),
      service: req.body.service,
      rating: req.body.rating,
      tags: stringifyBooruObject(post.tags)
    });

    res.redirect('back');
  })
  .post('/edit_tags', async (req, res) => {
    if (!req.body.tags) return res.sendStatus(400);
    await posts.updateMany({
      id: req.body.id,
      service: req.body.service
    }, {
      $set: {
        tags: parseBooruString(req.body.tags)
      }
    });
    const post = await posts.findOne({
      id: req.body.id,
      service: req.body.service
    });
    await revisions.insertOne({
      id: req.body.id,
      date: new Date().toISOString(),
      service: req.body.service,
      rating: post.rating,
      tags: req.body.tags
    });

    res.redirect('back');
  })
  .post('/revert', async (req, res) => {
    if (!req.body._id) return res.sendStatus(400);
    const revision = await revisions.findOne({ _id: new ObjectID(req.body._id) });
    await posts.updateMany({
      id: revision.id,
      service: revision.service
    }, {
      $set: {
        rating: revision.rating,
        tags: parseBooruString(revision.tags)
      }
    });
    await revisions.deleteMany({ _id: { $gt: new ObjectID(req.body._id) } });
    res.redirect('back');
  })
  .post('/flag', async (req, res) => {
    const postExists = await posts.findOne({ id: req.body.id, service: req.body.service });
    if (!postExists) return res.sendStatus(404);
    const flagExists = await flags.findOne({ id: req.body.id, service: req.body.service });
    if (flagExists) return res.status(409).send('Flag already exists.'); // flag already exists
    await flags.insertOne({ id: req.body.id, service: req.body.service });
    res.redirect('back');
  })
  .get('/bans', async (_, res) => {
    const userBans = await bans.find({}).toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(userBans);
  })
  .get('/posts', async (req, res) => {
    const recentPosts = await posts.find(req.query.tags ? buildBooruQueryFromString(req.query.tags) : {})
      .sort({ added_at: -1 })
      .skip(Number(req.query.o) || 0)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 100 ? Number(req.query.limit) : 50)
      .project({ _id: 0 })
      .toArray();
    res.setHeader('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    res.json(recentPosts);
  })
  .get('/posts/:service/:id', async (req, res) => {
    const idPosts = await posts.find({ id: req.params.id, service: req.params.service }).toArray();
    if (!idPosts.length) return res.sendStatus(404);
    res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
      .json(idPosts);
  })
  .post('/import', (req, res) => {
    if (!req.body.session_key) return res.sendStatus(401);
    switch (req.body.service) {
      case 'patreon':
        require('../importers/patreon')(req.body.session_key);
        break;
      case 'fanbox':
        require('../importers/fanbox')(req.body.session_key);
        break;
      case 'gumroad':
        require('../importers/gumroad')(req.body.session_key);
        break;
      case 'subscribestar':
        require('../importers/subscribestar')(req.body.session_key);
        break;
      case 'dlsite':
        require('../importers/dlsite')({ key: req.body.session_key });
        break;
      case 'dlsite-jp':
        require('../importers/dlsite')({
          key: req.body.session_key,
          jp: true
        });
        break;
      case 'yiffparty':
        if (!req.body.users) return res.sendStatus(400);
        require('../importers/yiffparty')(req.body.users);
        break;
      case 'discord':
        if (!req.body.channel_ids) return res.sendStatus(400);
        require('../importers/discord')({
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
  });

module.exports = router;
