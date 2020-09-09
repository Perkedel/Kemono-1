const { error, success } = require('../../views');
const { list, nu } = require('./views');
const { slugify } = require('transliteration');
const webpush = require('web-push');
const { db } = require('../../db');
const express = require('express');
const request = require('request-promise');
const multer = require('multer');
const router = express.Router();
const hasha = require('hasha');
const nl2br = require('nl2br');
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
          .offset(Number(req.query.o) || 0)
          .orderBy('votes', 'desc')
          .limit(25),
        query: req.query,
        url: req.originalUrl
      }));
    }
    const index = await db('requests')
      .select('*')
      .where(req.query.service ? { service: req.query.service } : {})
      .where('title', 'ILIKE', '%' + req.query.q + '%')
      .where('price', '<=', req.query.max_price || 1000000)
      .where({ status: req.query.status })
      .whereNot('service', 'discord-channel')
      .offset(Number(req.query.o) || 0)
      .orderBy(req.query.sort_by, req.query.order)
      .limit(Number(req.query.limit) && Number(req.query.limit) <= 250 ? Number(req.query.limit) : 25);
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
    await request.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage?chat_id=-1001273389670&parse_mode=markdown&text=${encodeURIComponent(`
*New request*
_${req.body.title}_ ($${req.body.price})
${req.body.description || ''}
[Link to requested user/post.](${({
  patreon: req.body.specific_id ? `https://www.patreon.com/posts/${req.body.specific_id}` : `https://www.patreon.com/user?u=${req.body.user_id}`,
  fanbox: req.body.specific_id ? `https://www.pixiv.net/fanbox/creator/${req.body.user_id}/post/${req.body.specific_id}` : `https://www.pixiv.net/fanbox/creator/${req.body.user_id}`,
  gumroad: req.body.specific_id ? `https://gumroad.com/l/${req.body.specific_id}` : `https://gumroad.com/${req.body.user_id}`,
  subscribestar: req.body.specific_id ? `https://subscribestar.adult/posts/${req.body.specific_id}` : `https://subscribestar.adult/${req.body.user_id}`,
  dlsite: req.body.specific_id ? `https://www.dlsite.com/ecchi-eng/work/=/product_id/${req.body.specific_id}` : `https://www.dlsite.com/eng/circle/profile/=/maker_id/${req.body.user_id}`
})[req.body.service]})
    `.trim())}`)
    await db('requests')
      .insert({
        service: xss(req.body.service),
        user: xss(req.body.user_id),
        post_id: xss(req.body.specific_id) || null,
        title: xss(req.body.title),
        description: xss(nl2br(req.body.description)),
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
        .update({ ips: requests[0].ips.concat([await hasha.async(ip)]) });
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
