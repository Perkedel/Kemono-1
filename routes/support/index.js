const { list, mine } = require('./views');
const express = require('express');
const router = express.Router();

router
  .get('/', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(list()))

module.exports = router;