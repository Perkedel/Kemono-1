const cloudscraper = require('cloudscraper');
const { posts, bans } = require('../../db');
const striptags = require('striptags');
const scrapeIt = require('scrape-it');
const entities = require('entities');
const path = require('path');
const indexer = require('../../indexer');
const ellipsize = require('ellipsize');
const { unraw } = require('unraw');
const checkForFlags = require('../../flagcheck');
const downloadFile = require('../../download');
const Promise = require('bluebird');
async function scraper (key, uri = 'https://www.subscribestar.com/feed/page.json') {
  const subscribestar = await cloudscraper.get(uri, {
    json: true,
    headers: {
      cookie: `auth_token=${key}`
    }
  });
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

  await Promise.mapSeries(data.posts, async (post) => {
    const banExists = await bans.findOne({ id: post.user, service: 'subscribestar' });
    if (banExists) return;

    await checkForFlags({
      service: 'subscribestar',
      entity: 'user',
      entityId: post.user,
      id: post.id
    });
    const postExists = await posts.findOne({ id: post.id, service: 'subscribestar' });
    if (postExists) return;

    const model = {
      version: 2,
      service: 'subscribestar',
      title: ellipsize(striptags(post.content), 60),
      content: post.content,
      id: post.id,
      user: post.user,
      post_type: 'text_only',
      added_at: new Date().getTime(),
      published_at: post.published_at,
      post_file: {},
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
          if (!Object.keys(model.post_file).length) {
            model.post_file.path = `/attachments/subscribestar/${post.user}/${post.id}/${res.filename}`;
            model.post_type = attachment.type;
          } else {
            model.attachments.push({
              id: String(attachment.id),
              name: res.filename,
              path: `/attachments/subscribestar/${post.user}/${post.id}/${res.filename}`
            });
          }
        });
    });

    posts.insertOne(model);
  });

  if (data.next_url) {
    scraper(key, data.next_url);
  } else {
    indexer();
  }
}

module.exports = data => scraper(data);
