const { posts } = require('../../db');
const fs = require('fs-extra');
const request = require('request-promise');
const request2 = require('request')
  .defaults({ encoding: null });
const { slugify } = require('transliteration');
const { unraw } = require('unraw');
const nl2br = require('nl2br');
const Promise = require('bluebird');
const crypto = require('crypto');
const retry = require('retry');
const requestOptions = (key) => {
  return {
    json: true,
    headers: {
      cookie: `FANBOXSESSID=${key}`,
      origin: 'https://fanbox.cc'
    }
  };
};

const fileRequestOptions = (key) => {
  return {
    encoding: null,
    headers: {
      cookie: `FANBOXSESSID=${key}`,
      origin: 'https://fanbox.cc'
    }
  };
};

async function scraper (key) {
  const fanboxIndex = await request.get(`${process.env.PROXY || ''}https://api.fanbox.cc/plan.listSupporting`, requestOptions(key));
  Promise.map(fanboxIndex.body, async (artist) => {
    processFanbox(`${process.env.PROXY || ''}https://api.fanbox.cc/post.listCreator?userId=${artist.user.userId}&limit=100`, key);
  });
}

async function processFanbox (url, key) {
  const data = await request.get(unraw(url), requestOptions(key));
  await Promise.mapSeries(data.body.items, async (post) => {
    if (!post.body) return; // locked content; nothing to do
    const postModel = {
      version: 2,
      service: 'fanbox',
      title: unraw(post.title),
      content: nl2br(unraw(post.body.text || await concatenateArticle(post.body, key))),
      id: post.id,
      user: post.user.userId,
      post_type: post.type, // image, article, embed (undocumented) or file
      published_at: post.publishedDatetime,
      added_at: new Date().getTime(),
      embed: {},
      post_file: {},
      attachments: []
    };

    const postExists = await posts.findOne({ id: post.id, service: 'fanbox' });
    if (postExists) return;

    const filesLocation = '/files/fanbox';
    const attachmentsLocation = '/attachments/fanbox';
    if (post.body.images) {
      await Promise.mapSeries(post.body.images, async (image, index) => {
        if (index === 0 && !postModel.post_file.name) {
          const operation = retry.operation({
            retries: 10,
            factor: 1,
            minTimeout: 1000
          });
          operation.attempt(async () => {
            const randomKey = crypto.randomBytes(20).toString('hex');
            await fs.ensureFile(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`);
            request2.get(unraw(image.originalUrl), fileRequestOptions(key))
              .on('complete', () => {
                fs.rename(
                  `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                  `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${slugify(image.id, { lowercase: false })}.${image.extension}`
                );
              })
              .on('error', err => operation.retry(err))
              .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
          });

          postModel.post_file.name = `${image.id}.${image.extension}`;
          postModel.post_file.path = `${filesLocation}/${post.user.userId}/${post.id}/${slugify(image.id, { lowercase: false })}.${image.extension}`;
        } else {
          const operation = retry.operation({
            retries: 10,
            factor: 1,
            minTimeout: 1000
          });
          operation.attempt(async () => {
            const randomKey = crypto.randomBytes(20).toString('hex');
            await fs.ensureFile(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`);
            request2.get(unraw(image.originalUrl), fileRequestOptions(key))
              .on('complete', () => {
                fs.rename(
                  `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                  `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${slugify(image.id, { lowercase: false })}.${image.extension}`
                );
              })
              .on('error', err => operation.retry(err))
              .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
          });
          postModel.attachments.push({
            id: image.id,
            name: `${image.id}.${image.extension}`,
            path: `${attachmentsLocation}/${post.user.userId}/${post.id}/${slugify(image.id, { lowercase: false })}.${image.extension}`
          });
        }
      });
    }

    if (post.body.files) {
      await Promise.mapSeries(post.body.files, async (file, index) => {
        if (index === 0 && !postModel.post_file.name) {
          const operation = retry.operation({
            retries: 10,
            factor: 1,
            minTimeout: 1000
          });
          operation.attempt(async () => {
            const randomKey = crypto.randomBytes(20).toString('hex');
            await fs.ensureFile(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`);
            request2.get(unraw(file.url), fileRequestOptions(key))
              .on('complete', () => {
                fs.rename(
                  `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                  `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${slugify(file.name, { lowercase: false })}.${file.extension}`
                );
              })
              .on('error', err => operation.retry(err))
              .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
          });
          postModel.post_file.name = `${file.name}.${file.extension}`;
          postModel.post_file.path = `${filesLocation}/${post.user.userId}/${post.id}/${slugify(file.name, { lowercase: false })}.${file.extension}`;
        } else {
          const operation = retry.operation({
            retries: 10,
            factor: 1,
            minTimeout: 1000
          });
          operation.attempt(async () => {
            const randomKey = crypto.randomBytes(20).toString('hex');
            await fs.ensureFile(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`);
            request2.get(unraw(file.url), fileRequestOptions(key))
              .on('complete', () => {
                fs.rename(
                  `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                  `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${slugify(file.name, { lowercase: false })}.${file.extension}`
                );
              })
              .on('error', err => operation.retry(err))
              .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
          });
          postModel.attachments.push({
            id: file.id,
            name: `${file.name}.${file.extension}`,
            path: `${attachmentsLocation}/${post.user.userId}/${post.id}/${slugify(file.name, { lowercase: false })}.${file.extension}`
          });
        }
      });
    }

    await posts.insertOne(postModel);
  });

  if (data.body.nextUrl) {
    processFanbox(data.body.nextUrl, key);
  }
}

async function concatenateArticle (body, key) {
  let concatenatedString = '<p>';
  await Promise.mapSeries(body.blocks, async (block) => {
    if (block.type === 'image') {
      const imageInfo = body.imageMap[block.imageId];
      const operation = retry.operation({
        retries: 10,
        factor: 1,
        minTimeout: 1000
      });
      operation.attempt(async () => {
        const randomKey = crypto.randomBytes(20).toString('hex');
        await fs.ensureFile(`${process.env.DB_ROOT}/inline/fanbox/${randomKey}`);
        request2.get(unraw(imageInfo.originalUrl), fileRequestOptions(key))
          .on('complete', () => {
            fs.rename(
              `${process.env.DB_ROOT}/inline/fanbox/${randomKey}`,
              `${process.env.DB_ROOT}/inline/fanbox/${slugify(imageInfo.id, { lowercase: false })}.${imageInfo.extension}`
            );
          })
          .on('error', err => operation.retry(err))
          .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/inline/fanbox/${randomKey}`));
      });
      concatenatedString += `<img src="/inline/fanbox/${slugify(imageInfo.id, { lowercase: false })}.${imageInfo.extension}"><br>`;
    } else if (block.type === 'p') {
      concatenatedString += `${unraw(block.text)}<br>`;
    }
  }).catch(() => {});
  concatenatedString += '</p>';
  return concatenatedString;
}

module.exports = data => scraper(data);
