const { error, success } = require('../../views');
const { list, nu } = require('./views');
const { slugify } = require('transliteration');
const webpush = require('web-push');
const { db } = require('../../db');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const hasha = require('hasha');
const path = require('path');
const xss = require('xss');

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(process.env.DB_ROOT, 'requests', 'images'),
    filename: (_, file, cb) => cb(null, slugify(file.originalname, { lowercase: false }))
  }),
  limits: {
    files: 1,
    fileSize: 1000000
  },
  fileFilter: (_, file, cb) => {
    if (/image\/(gif|jpeg|png)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('That wasn\'t an image.'), false);
    }
  }
});

router
  .use('/images', express.static(path.join(process.env.DB_ROOT, 'requests', 'images'), {
    setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600, no-cache')
  }))
  .get('/', async (req, res) => {
    res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000');
    if (!req.query.commit) {
      return res.send(list({
        requests: await db('requests')
          .where({ status: 'open' })
          .orderBy('votes', 'desc')
          .limit(50),
        query: {}
      }));
    }
    const index = await db('requests')
      .select('*')
      .where(req.query.service ? { service: req.query.service } : {})
      .where('title', 'ILIKE', '%' + req.query.q + '%')
      .where('price', '<=', req.query.max_price || 1000000)
      .where({ status: req.query.status })
      .whereNot('service', 'discord-channel')
      .orderBy(req.query.sort_by, req.query.order)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 250 ? Number(req.query.limit) : 50);
    res.type('html')
      .send(list({
        requests: index,
        query: req.query,
        url: req.originalUrl
      }));
  })
  .get('/new', (req, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(nu({
    query: req.query
  })))
  .post('/new', upload.single('image'), async (req, res) => {
    const newRequest = await db('requests')
      .insert({
        service: xss(req.body.service),
        user: xss(req.body.user_id),
        post_id: xss(req.body.specific_id) || null,
        title: xss(req.body.title),
        description: xss(req.body.description),
        image: req.file ? path.join('/requests', 'images', req.file.filename) : null,
        price: xss(req.body.price),
        ips: [await hasha.async(req.ip)]
      }, ['id']);
    res.send(success({
      currentPage: 'requests',
      redirect: '/requests'
    }));
  })
  .post('/:id/vote_up', async (req, res) => {
    const ip = req.headers['CF-Connecting-IP'] || req.ip
    await db.transaction(async trx => {
      const requests = await trx('requests')
        .where({ id: req.params.id });
      if (!requests.length) return res.sendStatus(404);
      if (requests[0].ips.includes(await hasha.async(ip))) {
        return res.status(401).send(error({
          currentPage: 'requests',
          message: 'You already voted on this request.'
        }));
      }
      await trx('requests')
        .where({ id: req.params.id })
        .increment('votes', 1);
      await trx('requests')
        .where({ id: req.params.id })
        .update({ ips: requests[0].ips.concat([ip]) });
      res.send(success({
        currentPage: 'requests',
        redirect: req.headers.referer || '/requests'
      }));
    });
  })
  .post('/:id/subscribe', async (req, res) => {
    await db.transaction(async trx => {
      const request = await trx('requests').where({ id: req.params.id });
      if (!request.length) return res.sendStatus(404);

      await trx('request_subscriptions')
        .insert({
          request_id: req.params.id,
          endpoint: req.body.endpoint,
          expirationTime: req.body.expirationTime || null,
          keys: req.body.keys
        })
      const payload = JSON.stringify({
        title: 'Success',
        body: `You'll be notified when request #${req.params.id} is fulfilled.`
      });
      await webpush.sendNotification(req.body, payload);
      res.status(201).json({});
    }) 
  });

module.exports = router;
