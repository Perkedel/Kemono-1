
const agentOptions = require('../utils/agent');
const cloudscraper = require('cloudscraper').defaults({ agentOptions });
const { to: pWrapper } = require('await-to-js');
const debug = require('../utils/debug');
const { db, failsafe } = require('../utils/db');
const entities = require('entities');
const retry = require('p-retry');
const crypto = require('crypto');
const mime = require('mime');
const path = require('path');
const checkForFlags = require('../checks/flags');
const checkForRequests = require('../checks/requests');
const downloadFile = require('../utils/download');
const Promise = require('bluebird');
const { URL } = require('url');
const indexer = require('../init/indexer');
const isImage = require('is-image');
const getUrls = require('get-urls');

const { default: pq } = require('p-queue');
const queue = new pq({ concurrency: 10 });

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
        url: entities.decodeHTML(val)
      })
        .then(() => {
          content = content.replace(val, `/inline/${filename}`);
        })
        .catch(() => {});
    }
  });
  return content;
};
async function scraper (id, key, uri = 'https://api.patreon.com/stream?json-api-version=1.0') {
  const log = debug('kemono:importer:status:' + id);

  const [err1, patreon] = await pWrapper(retry(() => {
    return cloudscraper.get(uri, {
      json: true,
      headers: {
        cookie: `session_id=${key}`
      }
    });
  }));

  if (err1 && err1.statusCode) {
    return log(`Error: Status code ${err1.statusCode} when contacting Patreon API.`);
  } else if (err1) {
    return log(err1);
  }

  Promise.map(patreon.data, async (post) => {
    const attr = post.attributes;
    const rel = post.relationships;
    let fileKey = `files/${rel.user.data.id}/${post.id}`;
    let attachmentsKey = `attachments/${rel.user.data.id}/${post.id}`;

    const banExists = await queue.add(() => db('dnp').where({ id: rel.user.data.id, service: 'patreon' }));
    if (banExists.length) return log(`Skipping ID ${post.id}: user ${rel.user.data.id} is banned`);

    await queue.add(() => checkForFlags({
      service: 'patreon',
      entity: 'user',
      entityId: rel.user.data.id,
      id: post.id
    }));

    await queue.add(() => checkForRequests({
      service: 'patreon',
      userId: rel.user.data.id,
      id: post.id
    }));

    const existingPosts = await queue.add(() => db('booru_posts')
      .where({ id: post.id, service: 'patreon' })
      .orderBy('edited', 'asc'));
    if (existingPosts.length && !existingPosts[0].edited) {
      return;
    } else if (existingPosts.length && new Date(existingPosts[existingPosts.length - 1].edited).getTime() >= new Date(attr.edited_at).getTime()) {
      return;
    } else if (existingPosts.length && new Date(existingPosts[existingPosts.length - 1].edited).getTime() < new Date(attr.edited_at).getTime()) {
      fileKey = `files/edits/${rel.user.data.id}/${post.id}/${crypto.randomBytes(5).toString('hex')}`;
      attachmentsKey = `files/edits/${rel.user.data.id}/${post.id}/${crypto.randomBytes(5).toString('hex')}`;
    }

    log(`Importing ID ${post.id}`);
    const inactivityTimer = setTimeout(() => log(`Warning: Post ${post.id} may be stalling`), 120000);

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

    await Promise.map(postData.body.included, async (includedFile) => {
      if (includedFile.attributes.state === 'expired') return;
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

    clearTimeout(inactivityTimer);
    log(`Finished importing ${post.id}`);
    await queue.add(() => db('booru_posts').insert(model));
  }, { concurrency: 5 });

  if (patreon.links.next) {
    scraper(id, key, 'https://' + patreon.links.next);
  } else {
    log('Finished scanning posts.');
    log('No posts detected? You either entered your session key incorrectly, or are not subscribed to any artists.');
    indexer();
  }
}

module.exports = data => {
  debug('kemono:importer:patreon:' + data.id)('Starting Patreon import...');
  failsafe.set(data.id, JSON.stringify({ importer: 'patreon', data: data }), 'EX', 1800);
  scraper(data.id, data.key);
};
