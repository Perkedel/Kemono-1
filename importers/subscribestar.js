const agentOptions = require('../utils/agent');
const cloudscraper = require('cloudscraper').defaults({ agentOptions });
const retry = require('p-retry');
const { to: pWrapper } = require('await-to-js');
const debug = require('../utils/debug');
const { db, failsafe } = require('../utils/db');
const striptags = require('striptags');
const scrapeIt = require('scrape-it');
const entities = require('entities');
const path = require('path');
const indexer = require('../init/indexer');
const ellipsize = require('ellipsize');
const { unraw } = require('unraw');
const checkForFlags = require('../checks/flags');
const checkForRequests = require('../checks/requests');
const downloadFile = require('../utils/download');
const Promise = require('bluebird');
async function scraper (id, key, uri = 'https://www.subscribestar.com/feed/page.json') {
  const log = debug('kemono:importer:subscribestar:' + id);

  const [err1, subscribestar] = await pWrapper(retry(() => cloudscraper.get(uri, {
    json: true,
    headers: {
      cookie: `auth_token=${key}`
    }
  })));

  if (err1 && err1.statusCode) {
    return log(`Error: Status code ${err1.statusCode} when contacting SubscribeStar API.`)
  } else if (err1) {
    return log(err1)
  }

  const data = await scrapeIt.scrapeHTML(unraw(subscribestar.html), {
    posts: {
      listItem: '.post',
      data: {
        id: {
          attr: 'data-id'
        },
        user: {
          selector: '.post-user',
          attr: 'href',
          convert: x => x.replace('/', '')
        },
        content: {
          selector: '.post-content',
          how: 'html',
          convert: x => entities.decodeHTML(x)
        },
        attachments: {
          selector: '.uploads-images',
          attr: 'data-gallery',
          convert: x => {
            try {
              return JSON.parse(x);
            } catch (err) {
              return [];
            }
          }
        },
        published_at: '.post-date a'
      }
    },
    next_url: {
      selector: '.posts-more',
      attr: 'href',
      convert: x => x ? 'https://www.subscribestar.com' + x : null
    }
  });

  await Promise.map(data.posts, async (post) => {
    const banExists = await db('dnp').where({ id: post.user, service: 'subscribestar' });
    if (banExists.length) return log(`Skipping ID ${post.id}: user ${post.user} is banned`);

    await checkForFlags({
      service: 'subscribestar',
      entity: 'user',
      entityId: post.user,
      id: post.id
    });

    await checkForRequests({
      service: 'subscribestar',
      userId: post.user,
      id: post.id
    });

    const postExists = await db('booru_posts').where({ id: post.id, service: 'subscribestar' });
    if (postExists.length) return;

    log(`Importing ID ${post.id}`)

    const model = {
      id: post.id,
      user: post.user,
      service: 'subscribestar',
      title: ellipsize(striptags(post.content), 60),
      content: post.content,
      embed: {},
      shared_file: false,
      added: new Date().toISOString(),
      published: new Date(Date.parse(post.published_at)).toISOString(),
      edited: null,
      file: {},
      attachments: []
    };

    if (model.title === 'Extend Subscription') return;
    if ((/This post belongs to a locked/i).test(model.content)) return;
    await Promise.mapSeries(post.attachments, async (attachment) => {
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, `/attachments/subscribestar/${post.user}/${post.id}`)
      }, {
        url: attachment.url
      })
        .then(res => {
          if (!Object.keys(model.file).length) {
            model.file.name = res.filename;
            model.file.path = `/attachments/subscribestar/${post.user}/${post.id}/${res.filename}`;
          } else {
            model.attachments.push({
              id: String(attachment.id),
              name: res.filename,
              path: `/attachments/subscribestar/${post.user}/${post.id}/${res.filename}`
            });
          }
        });
    });

    log(`Finished importing ${post.id}`)
    await db('booru_posts').insert(model);
  });

  if (data.next_url) {
    scraper(id, key, data.next_url);
  } else {
    log('Finished processing posts.')
    log('No posts imported? You either entered your session key incorrectly, or are not subscribed to any artists.')
    failsafe.del(id);
    indexer();
  }
}

module.exports = data => {
  debug('kemono:importer:subscribestar:' + data.id)('Starting SubscribeStar import...')
  failsafe.set(data.id, { importer: 'subscribestar', data: data }, 1800, () => {})
  scraper(data.id, data.key);
}