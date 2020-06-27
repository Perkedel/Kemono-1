const { posts, bans } = require('../../db');
const fs = require('fs-extra');
const request = require('request-promise');
const request2 = require('request')
  .defaults({ encoding: null });
const { slugify } = require('transliteration');
const { unraw } = require('unraw');
const nl2br = require('nl2br');
const Promise = require('bluebird');
const crypto = require('crypto');
const retry = require('p-retry');
const proxy = require('../../proxy');
const checkForFlags = require('../../flagcheck');
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
  const fanboxIndex = await proxy('https://api.fanbox.cc/plan.listSupporting', requestOptions(key), request);
  Promise.map(fanboxIndex.body, async (artist) => {
    processFanbox(`https://api.fanbox.cc/post.listCreator?userId=${artist.user.userId}&limit=100`, key);
  });
}

async function processFanbox (url, key) {
  const proxyaddr = process.env.PROXY ? process.env.PROXY : '';
  const data = await proxy(unraw(url), requestOptions(key), request);
  await Promise.mapSeries(data.body.items, async (post) => {
    if (!post.body) return; // locked content; nothing to do
    const banExists = await bans.findOne({ id: post.user.userId, service: 'fanbox' })
    if (banExists) return;

    await checkForFlags({
      service: 'fanbox',
      entity: 'user',
      entityId: post.user.userId,
      id: post.id
    });
    const postModel = {
      version: 2,
      service: 'fanbox',
      title: unraw(post.title),
      content: nl2br(unraw(post.body.text || await concatenateArticle(post.body, key), true)),
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
          await retry(() => {
            return new Promise((resolve, reject) => {
              const randomKey = crypto.randomBytes(20).toString('hex');
              fs.ensureFile(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`)
                .then(() => {
                  request2.get(proxyaddr + unraw(image.originalUrl), fileRequestOptions(key))
                    .on('complete', () => {
                      fs.rename(
                        `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                        `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${slugify(image.id, { lowercase: false })}.${image.extension}`
                      );
                      resolve();
                    })
                    .on('error', err => reject(err))
                    .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
                });
            });
          });
          postModel.post_file.name = `${image.id}.${image.extension}`;
          postModel.post_file.path = `${filesLocation}/${post.user.userId}/${post.id}/${slugify(image.id, { lowercase: false })}.${image.extension}`;
        } else {
          await retry(() => {
            return new Promise((resolve, reject) => {
              const randomKey = crypto.randomBytes(20).toString('hex');
              fs.ensureFile(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`)
                .then(() => {
                  request2.get(proxyaddr + unraw(image.originalUrl), fileRequestOptions(key))
                    .on('complete', () => {
                      fs.rename(
                        `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                        `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${slugify(image.id, { lowercase: false })}.${image.extension}`
                      );
                      resolve();
                    })
                    .on('error', err => reject(err))
                    .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
                });
            });
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
          await retry(() => {
            return new Promise((resolve, reject) => {
              const randomKey = crypto.randomBytes(20).toString('hex');
              fs.ensureFile(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`)
                .then(() => {
                  request2.get(proxyaddr + unraw(file.url), fileRequestOptions(key))
                    .on('complete', () => {
                      fs.rename(
                        `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                        `${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${slugify(file.name, { lowercase: false })}.${file.extension}`
                      );
                      resolve();
                    })
                    .on('error', err => reject(err))
                    .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/files/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
                });
            });
          });

          postModel.post_file.name = `${file.name}.${file.extension}`;
          postModel.post_file.path = `${filesLocation}/${post.user.userId}/${post.id}/${slugify(file.name, { lowercase: false })}.${file.extension}`;
        } else {
          await retry(() => {
            return new Promise((resolve, reject) => {
              const randomKey = crypto.randomBytes(20).toString('hex');
              fs.ensureFile(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`)
                .then(() => {
                  request2.get(proxyaddr + unraw(file.url), fileRequestOptions(key))
                    .on('complete', () => {
                      fs.rename(
                        `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`,
                        `${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${slugify(file.name, { lowercase: false })}.${file.extension}`
                      );
                      resolve();
                    })
                    .on('error', err => reject(err))
                    .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/attachments/fanbox/${post.user.userId}/${post.id}/${randomKey}`));
                });
            });
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
  const proxyaddr = process.env.PROXY ? process.env.PROXY : '';
  await Promise.mapSeries(body.blocks, async (block) => {
    if (block.type === 'image') {
      const imageInfo = body.imageMap[block.imageId];
      await retry(() => {
        return new Promise((resolve, reject) => {
          const randomKey = crypto.randomBytes(20).toString('hex');
          fs.ensureFile(`${process.env.DB_ROOT}/inline/fanbox/${randomKey}`)
            .then(() => {
              request2.get(proxyaddr + unraw(imageInfo.originalUrl), fileRequestOptions(key))
                .on('complete', () => {
                  fs.rename(
                    `${process.env.DB_ROOT}/inline/fanbox/${randomKey}`,
                    `${process.env.DB_ROOT}/inline/fanbox/${slugify(imageInfo.id, { lowercase: false })}.${imageInfo.extension}`
                  );
                  resolve();
                })
                .on('error', err => reject(err))
                .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/inline/fanbox/${randomKey}`));
            });
        });
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
