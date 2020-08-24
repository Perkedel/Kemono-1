
const cloudscraper = require('cloudscraper');
const { db, queue } = require('../db');
const retry = require('p-retry');
const hasha = require('hasha');
const mime = require('mime');
const path = require('path');
const checkForFlags = require('../flagcheck');
const downloadFile = require('../download');
const Promise = require('bluebird');
const { URL } = require('url');
const indexer = require('../indexer');
const isImage = require('is-image');
const getUrls = require('get-urls');

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
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, 'inline'),
        name: filename
      }, {
        url: val
      })
        .then(() => {
          content = content.replace(val, `/inline/${filename}`);
        })
        .catch(() => {});
    }
  });
  return content;
};
async function scraper (key, uri = 'https://api.patreon.com/stream?json-api-version=1.0') {
  const patreon = await retry(() => {
    return cloudscraper.get(uri, {
      resolveWithFullResponse: true,
      json: true,
      headers: {
        cookie: `session_id=${key}`
      }
    });
  });
  Promise.mapSeries(patreon.body.data, async (post) => {
    const attr = post.attributes;
    const rel = post.relationships;
    let fileKey = `files/${rel.user.data.id}/${post.id}`;
    let attachmentsKey = `attachments/${rel.user.data.id}/${post.id}`;

    const banExists = await queue.add(() => db('dnp').where({ id: rel.user.data.id, service: 'patreon' }));
    if (banExists.length) return;

    await checkForFlags({
      service: 'patreon',
      entity: 'user',
      entityId: rel.user.data.id,
      id: post.id
    });
    const existingPosts = await queue.add(() => db('booru_posts').where({ id: post.id, service: 'patreon' }));
    if (existingPosts.length && !existingPosts[0].edited) {
      return;
    } else if (existingPosts.length && existingPosts[existingPosts.length - 1].edited > attr.edited) {
      return;
    } else if (existingPosts.length && existingPosts[existingPosts.length - 1].edited < attr.edited) {
      fileKey = `files/edits/${rel.user.data.id}/${post.id}/${hasha(attr.edited)}`;
      attachmentsKey = `files/edits/${rel.user.data.id}/${post.id}/${hasha(attr.edited)}`;
    }

    const model = {
      id: post.id,
      user: rel.user.data.id,
      service: 'patreon',
      title: attr.title || '',
      content: await sanitizePostContent(attr.content),
      embed: {},
      shared_file: false,
      added: new Date().toISOString(),
      published: attr.published_at,
      edited: attr.edited_at,
      file: {},
      attachments: []
    };

    if (attr.post_file) {
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, fileKey),
        name: attr.post_file.name
      }, {
        url: attr.post_file.url
      })
        .then(res => {
          model.file.name = attr.post_file.name;
          model.file.path = `/${fileKey}/${res.filename}`;
        });
    }

    if (attr.embed) {
      model.embed.subject = attr.embed.subject;
      model.embed.description = attr.embed.description;
      model.embed.url = attr.embed.url;
    }

    await Promise.map(rel.attachments.data, async (attachment) => {
      const res = await retry(() => {
        return cloudscraper.get({
          url: `https://www.patreon.com/file?h=${post.id}&i=${attachment.id}`,
          followRedirect: false,
          followAllRedirects: false,
          resolveWithFullResponse: true,
          simple: false,
          headers: {
            cookie: `session_id=${key}`
          }
        });
      });
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, attachmentsKey)
      }, {
        url: res.headers.location
      })
        .then(res => {
          model.attachments.push({
            id: attachment.id,
            name: res.filename,
            path: `/${attachmentsKey}/${res.filename}`
          });
        });
    });

    const postData = await retry(() => {
      return cloudscraper.get(`https://www.patreon.com/api/posts/${post.id}?include=images.null,audio.null&json-api-use-default-includes=false&json-api-version=1.0`, {
        resolveWithFullResponse: true,
        json: true,
        headers: {
          cookie: `session_id=${key}`
        }
      });
    });

    await Promise.map(postData.body.included, async (includedFile, i) => {
      if (i === 0 && JSON.stringify(model.file) !== '{}') return;
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, attachmentsKey),
        name: includedFile.attributes.file_name
      }, {
        url: includedFile.attributes.download_url
      })
        .then(res => {
          model.attachments.push({
            name: res.filename,
            path: `/${attachmentsKey}/${res.filename}`
          });
        });
    }).catch(() => {});

    await queue.add(() => db('booru_posts').insert(model));
  });

  if (patreon.body.links.next) {
    scraper(key, 'https://' + patreon.body.links.next);
  } else {
    indexer();
  }
}

module.exports = data => scraper(data);
