const { posts, bans } = require('./db');
const request = require('request');
const cloudscraper = require('cloudscraper');
const { slugify } = require('transliteration');
const cd = require('content-disposition');
const Promise = require('bluebird');
const indexer = require('./indexer');
const fs = require('fs-extra');
const isImage = require('is-image');
const mime = require('mime');
const getUrls = require('get-urls');
const crypto = require('crypto');
const hasha = require('hasha');
const { URL } = require('url');
const retry = require('p-retry');
const proxy = require('./proxy');
const checkForFlags = require('./flagcheck');
const sanitizePostContent = async (content) => {
  // mirror and replace any inline images
  if (!content) return '';
  const urls = getUrls(content, {
    sortQueryParameters: false,
    stripWWW: false
  });
  await Promise.mapSeries(urls, async (val) => {
    const url = new URL(val);
    if (isImage(url.origin + url.pathname)) {
      const imageMime = mime.getType(url.origin + url.pathname);
      const filename = new Date().getTime() + '.' + mime.getExtension(imageMime);
      await fs.ensureFile(`${process.env.DB_ROOT}/inline/${filename}`);
      await retry(() => {
        return new Promise(resolve => {
          request.get({ url: val, encoding: null })
            .on('complete', () => {
              content = content.replace(val, `/inline/${filename}`);
              resolve();
            })
            .on('error', () => resolve())
            .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/inline/${filename}`));
        });
      });
    }
  });
  return content;
};
async function scraper (key, uri = 'https://api.patreon.com/stream?json-api-version=1.0') {
  const patreon = await proxy(uri, {
    resolveWithFullResponse: true,
    json: true,
    headers: {
      cookie: `session_id=${key}`
    }
  }, cloudscraper);
  Promise.map(patreon.body.data, async (post) => {
    const attr = post.attributes;
    const rel = post.relationships;
    let fileKey = `files/${rel.user.data.id}/${post.id}`;
    let attachmentsKey = `attachments/${rel.user.data.id}/${post.id}`;

    const banExists = await bans.findOne({ id: rel.user.data.id, service: 'patreon' });
    if (banExists) return;

    await checkForFlags({
      service: 'patreon',
      entity: 'user',
      entityId: rel.user.data.id,
      id: post.id
    });
    const existingPosts = await posts.find({ id: post.id }).toArray();
    if (existingPosts.length && existingPosts[0].version === 1) {
      return;
    } else if (existingPosts.length && existingPosts[existingPosts.length - 1].edited_at === attr.edited_at) {
      return;
    } else if (existingPosts.length && existingPosts[existingPosts.length - 1].edited_at !== attr.edited_at) {
      fileKey = `files/edits/${rel.user.data.id}/${post.id}/${hasha(attr.edited_at)}`;
      attachmentsKey = `files/edits/${rel.user.data.id}/${post.id}/${hasha(attr.edited_at)}`;
    }

    const postDb = {
      version: 3,
      service: 'patreon',
      title: attr.title || '',
      content: await sanitizePostContent(attr.content),
      id: post.id,
      user: rel.user.data.id,
      post_type: attr.post_type,
      published_at: attr.published_at,
      edited_at: attr.edited_at,
      added_at: new Date().getTime(),
      embed: {},
      post_file: {},
      attachments: []
    };

    if (attr.post_file) {
      const fileBits = attr.post_file.name.split('.');
      const filename = slugify(fileBits[0], { lowercase: false });
      const ext = fileBits[fileBits.length - 1];
      await fs.ensureFile(`${process.env.DB_ROOT}/${fileKey}/${filename}.${ext}`);
      await retry(() => {
        return new Promise((resolve, reject) => {
          request.get({ url: attr.post_file.url, encoding: null })
            .on('complete', () => resolve())
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/${fileKey}/${filename}.${ext}`));
        });
      });
      postDb.post_file.name = attr.post_file.name;
      postDb.post_file.path = `/${fileKey}/${filename}.${ext}`;
    }

    if (attr.embed) {
      postDb.embed.subject = attr.embed.subject;
      postDb.embed.description = attr.embed.description;
      postDb.embed.url = attr.embed.url;
    }

    await Promise.map(rel.attachments.data, async (attachment) => {
      // use content disposition
      const randomKey = crypto.randomBytes(20).toString('hex');
      await fs.ensureFile(`${process.env.DB_ROOT}/${attachmentsKey}/${randomKey}`);
      const res = await proxy(`https://www.patreon.com/file?h=${post.id}&i=${attachment.id}`, {
        followRedirect: false,
        followAllRedirects: false,
        resolveWithFullResponse: true,
        simple: false,
        headers: {
          cookie: `session_id=${key}`
        }
      }, cloudscraper);
      await retry(() => {
        return new Promise((resolve, reject) => {
          request.get({ url: res.headers.location, encoding: null })
            .on('complete', async (attachmentData) => {
              const info = cd.parse(attachmentData.headers['content-disposition']);
              const fileBits = info.parameters.filename.split('.');
              const filename = slugify(fileBits[0], { lowercase: false });
              const ext = fileBits[fileBits.length - 1];
              postDb.attachments.push({
                id: attachment.id,
                name: info.parameters.filename,
                path: `/${attachmentsKey}/${filename}.${ext}`
              });
              await fs.rename(
                `${process.env.DB_ROOT}/${attachmentsKey}/${randomKey}`,
                `${process.env.DB_ROOT}/${attachmentsKey}/${filename}.${ext}`
              );
              resolve();
            })
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/${attachmentsKey}/${randomKey}`));
        });
      });
    });

    const postData = await proxy(`https://www.patreon.com/api/posts/${post.id}?include=images.null,audio.null&json-api-use-default-includes=false&json-api-version=1.0`, {
      resolveWithFullResponse: true,
      json: true,
      headers: {
        cookie: `session_id=${key}`
      }
    }, cloudscraper);

    await Promise.map(postData.body.included, async (includedFile, i) => {
      if (i === 0 && JSON.stringify(postDb.post_file) !== '{}') return;
      const fileBits = includedFile.attributes.file_name.split('.');
      const filename = slugify(fileBits[0], { lowercase: false });
      const ext = fileBits[fileBits.length - 1];
      await fs.ensureFile(`${process.env.DB_ROOT}/${attachmentsKey}/${filename}.${ext}`);
      await retry(() => {
        return new Promise((resolve, reject) => {
          request.get({ url: includedFile.attributes.download_url, encoding: null })
            .on('complete', () => resolve())
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/${attachmentsKey}/${filename}.${ext}`));
        });
      });
      postDb.attachments.push({
        name: includedFile.attributes.file_name,
        path: `/${attachmentsKey}/${filename}.${ext}`
      });
    }).catch(() => {});

    await posts.insertOne(postDb);
  });

  if (patreon.body.links.next) {
    scraper(key, 'https://' + patreon.body.links.next);
  } else {
    indexer();
  }
}

module.exports = data => scraper(data);
