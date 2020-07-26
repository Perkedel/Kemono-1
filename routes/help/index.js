const { list, about, bans, license, rules, posts } = require('./views');

const express = require('express');
const router = express.Router();

router
  .get('/', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(list()))
  .get('/posts', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(posts()))
  .get('/about', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(about()))
  .get('/bans', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(bans()))
  .get('/license', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(license()))
  .get('/rules', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(rules()))

module.exports = router;