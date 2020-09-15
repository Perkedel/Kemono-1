const { op, reply } = require('./views/components');
const { thread, nu, list } = require('./views');
const replace = require('string-replace-async');
const { lock, unlock } = require('./lock');
const tripgen = require('tripcode');
const Promise = require('bluebird');
const { slugify } = require('transliteration');
const scrapeIt = require('scrape-it');
const { db } = require('../../utils/db');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const xss = require('xss');

const express = require('express');
const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(process.env.DB_ROOT, 'board', 'images'),
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

const getLatestModifiedFiles = async (dir) => {
  const files = await Promise.map(await fs.readdir(dir), async (filename) => {
    const stat = await fs.stat(path.join(dir, filename));
    return {
      name: filename.replace('.html', ''),
      time: stat.mtime.getTime()
    };
  });
  return files.sort((a, b) => b.time - a.time).map(v => v.name);
};
const tripcode = str => {
  if (str.indexOf('#') === -1) return str;
  let [name, trip] = str.split('#', 2);
  if (trip === process.env.ADMIN_CAPCODE) return `<span class="bbs-admin">${name || 'Anonymous'} ## Admin</span>`;
  trip = `<span class="bbs-trip">!${tripgen(trip || '')}</span>`;
  return name + ' ' + trip;
};
const url2a = str => str.replace(/(http|https):\/\/[^<\s]+/g, match => `<a target="_blank" href="${match}">${match}</a>`);
const quotes = str => replace(str, /&gt;&gt;\d+/g, async (match) => {
  const no = match.substring(8);
  const threadExists = await fs.pathExists(path.join(process.env.DB_ROOT, 'board', 'threads', `${no}.html`));
  if (threadExists) return `<a href="/board/thread/${no}">${match}</a>`;
  const reply = await db('board_replies').where({ reply: Number(no) });
  if (reply.length) return `<a href="/board/thread/${reply[0].in}#${no}">${match}</a>`;
  return '';
});
const greentext = str => str
  .split('\n')
  .map(line => line.replace(/^&gt;.*/g, match => `<span class="bbs-quote">${match}</span>`))
  .join('<br>');

router
  .use('/images', express.static(path.join(process.env.DB_ROOT, 'board', 'images'), {
    setHeaders: (res) => res.setHeader('Cache-Control', 's-maxage=31557600, no-cache')
  }))
  .get('/', async (_, res) => {
    await fs.ensureDir(path.join(process.env.DB_ROOT, 'board', 'threads'));
    const latest = await getLatestModifiedFiles(path.join(process.env.DB_ROOT, 'board', 'threads'));
    const latestData = await Promise.map(latest.slice(0, 25), async (threadId) => {
      const threadHtml = await fs.readFile(path.join(process.env.DB_ROOT, 'board', 'threads', `${threadId}.html`), 'utf8');
      return scrapeIt.scrapeHTML(threadHtml, {
        no: {
          selector: '.bbs-op',
          attr: 'id'
        },
        subject: '.bbs-op .bbs-header',
        name: {
          selector: '.bbs-op .bbs-post-name',
          how: 'html'
        }
      });
    });
    res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000')
      .type('html')
      .send(list({ threads: latestData }));
  })
  .get('/thread/:id', async (req, res) => {
    const threadFile = path.join(process.env.DB_ROOT, 'board', 'threads', `${req.params.id}.html`);
    const threadExists = await fs.pathExists(threadFile);
    if (!threadExists) return res.sendStatus(404);
    res.set('Cache-Control', 's-maxage=31557600, no-cache')
      .type('html')
      .send(thread(await fs.readFile(threadFile, 'utf8'), { id: req.params.id }));
  })
  .post('/thread/:id/reply', upload.single('image'), async (req, res) => {
    const thread = path.join(process.env.DB_ROOT, 'board', 'threads', `${req.params.id}.html`);
    const threadExists = await fs.pathExists(thread);
    if (!threadExists) return res.sendStatus(404);
    if (!req.body.body || req.body.body.length > 5000) return res.sendStatus(400);

    const id = path.join(process.env.DB_ROOT, 'board', '.id');
    await lock(id);
    const nextId = String(Number(await fs.readFile(id, 'utf8') || 0) + 1);
    await fs.outputFile(id, nextId);
    await unlock(id);

    fs.createWriteStream(thread, { flags: 'a' })
      .write(reply({
        id: nextId,
        image: req.file,
        name: tripcode(xss(req.body.name || 'Anonymous')),
        body: url2a(greentext(await quotes(xss(req.body.body))))
      }));

    db('board_replies')
      .insert({ reply: Number(nextId), in: Number(req.params.id) })
      .asCallback(() => {});

    res.redirect(`/board/thread/${req.params.id}`);
  })
  .get('/new', (_, res) => res.set('Cache-Control', 'max-age=60, public, stale-while-revalidate=2592000').send(nu()))
  .post('/new', upload.single('image'), async (req, res) => {
    if (!req.body.subject || req.body.subject.length > 50) return res.sendStatus(400);
    if (!req.body.body || req.body.body.length > 5000) return res.sendStatus(400);

    const id = path.join(process.env.DB_ROOT, 'board', '.id');
    await lock(id);
    const nextId = String(Number(await fs.readFile(id, 'utf8') || 0) + 1);
    const thread = path.join(process.env.DB_ROOT, 'board', 'threads', `${nextId}.html`);
    await fs.outputFile(id, nextId);
    await unlock(id);

    await fs.ensureFile(thread);
    fs.createWriteStream(thread)
      .write(op({
        id: nextId,
        image: req.file,
        name: tripcode(xss(req.body.name || 'Anonymous')),
        subject: xss(req.body.subject),
        body: url2a(greentext(await quotes(xss(req.body.body))))
      }));

    res.redirect(`/board/thread/${nextId}`);
  })
  .use((err, req, res, _) => res.send(err.message));

module.exports = router;
