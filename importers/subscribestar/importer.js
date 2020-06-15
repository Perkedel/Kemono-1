const cloudscraper = require('cloudscraper');
const { posts } = require('../../db');
const scrapeIt = require('scrape-it');
const entities = require('entities');
const request = require('request');
const retry = require('p-retry');
const fs = require('fs-extra');
const crypto = require('crypto');
const ellipsize = require('ellipsize');
const striptags = require('striptags');
const indexer = require('../../indexer');
const { slugify } = require('transliteration');
const { unraw } = require('unraw');
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
    await Promise.mapSeries(post.attachments, async (attachment) => {
      await retry(() => {
        return new Promise((resolve, reject) => {
          const randomKey = crypto.randomBytes(20).toString('hex');
          fs.ensureFile(`${process.env.DB_ROOT}/attachments/subscribestar/${post.user}/${post.id}/${randomKey}`)
            .then(() => {
              request.get(attachment.url, { encoding: null })
                .on('complete', data => {
                  const filename = slugify(data.headers['x-amz-meta-original-filename'], { lowercase: false });
                  fs.rename(
                    `${process.env.DB_ROOT}/attachments/subscribestar/${post.user}/${post.id}/${randomKey}`,
                    `${process.env.DB_ROOT}/attachments/subscribestar/${post.user}/${post.id}/${filename}`
                  );
                  if (!Object.keys(model.post_file).length) {
                    model.post_file.name = data.headers['x-amz-meta-original-filename'];
                    model.post_file.path = `/attachments/subscribestar/${post.user}/${post.id}/${filename}`;
                    model.post_type = attachment.type;
                  } else {
                    model.attachments.push({
                      id: String(attachment.id),
                      name: data.headers['x-amz-meta-original-filename'],
                      path: `/attachments/subscribestar/${post.user}/${post.id}/${filename}`
                    });
                  }
                  resolve();
                })
                .on('error', err => reject(err))
                .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/attachments/subscribestar/${post.user}/${post.id}/${randomKey}`));
            });
        });
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
