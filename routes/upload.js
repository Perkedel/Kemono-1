const { slugify } = require('transliteration');
const auth = require('express-basic-auth');
const { db } = require('../utils/db');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const xss = require('xss');

const express = require('express');
const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _, cb) => {
      if (!req.body.user || !req.body.service) cb(new Error('Bad form data'), false);
      req.id = crypto.randomBytes(5).toString('hex');
      const dir = path.join(process.env.DB_ROOT, 'files', req.body.service === 'patreon' ? '' : req.body.service, req.body.user, req.id);
      fs.ensureDir(dir)
        .then(() => cb(null, dir));
    },
    filename: (_, file, cb) => cb(null, slugify(file.originalname, { lowercase: false }))
  }),
  limits: {
    files: 1,
    fileSize: 2000000000 // 2GB
  }
});

router
  .get('/new_key', auth({
    users: {
      admin: process.env.MASTER_KEY || ''
    },
    challenge: true
  }), (_, res) => {
    if (!process.env.MASTER_KEY) res.send('This instance does not use upload protection - nothing to do');
    const cipher = crypto.createCipher('aes192', process.env.MASTER_KEY); // eslint-disable-line node/no-deprecated-api
    let encrypted = cipher.update(String(new Date().getTime()), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    res.send(encrypted);
  })
  .post('/', upload.single('file'), async (req, res) => {
    if (!req.body.title || req.body.content.length > 50) return res.sendStatus(400);
    if (req.body.content && req.body.content.length > 5000) return res.sendStatus(400);
    if (!req.file) return res.sendStatus(400);
    if (process.env.MASTER_KEY && !req.body.token) return res.sendStatus(401);
    if (process.env.MASTER_KEY) {
      try {
        const decipher = crypto.createDecipher('aes192', process.env.MASTER_KEY); // eslint-disable-line node/no-deprecated-api
        var decrypted = decipher.update(req.body.token, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        if (new Date().getTime() - Number(decrypted) > 900000) return res.status(401).send('Expired token.'); // tokens expire in 15 minutes
      } catch (e) {
        return res.status(401).send('Invalid token.');
      }
    }

    const service = ({
      patreon: 'patreon',
      fanbox: 'fanbox',
      dlsite: 'dlsite',
      subscribestar: 'subscribestar',
      gumroad: 'gumroad'
    })[req.body.service];

    if (!service) return res.sendStatus(400);
    const banExists = await db('dnp').where({ id: xss(req.body.user), service: service });
    if (banExists.length) return res.status(401).send('This user is banned.');
    await db('booru_posts').insert({
      id: req.id,
      user: xss(req.body.user),
      service: service,
      title: xss(req.body.title),
      content: xss(req.body.content || ''),
      embed: {},
      shared_file: true,
      published: new Date().toISOString(),
      edited: null,
      file: {
        name: req.file.originalname,
        path: path.join('/files', req.body.service === 'patreon' ? '' : req.body.service, req.body.user, req.id, req.file.filename)
      },
      attachments: []
    });

    res.redirect(path.join('/', req.body.service === 'patreon' ? '' : req.body.service, 'user', req.body.user));
  })
  .use((err, req, res, _) => res.send(err.message));

module.exports = router;
