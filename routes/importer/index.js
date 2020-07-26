const { list, ok, tutorial, yiff } = require('./views');

const express = require('express');
const router = express.Router();

router
  .get('/', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(list()))
  .get('/tutorial', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(tutorial()))
  .get('/ok', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(ok()))
  .get('/yiff', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(yiff()));

module.exports = router;
