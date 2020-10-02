const agentOptions = require('../utils/agent');
const request = require('request-promise');
const cloudscraper = require('cloudscraper').defaults({ agentOptions });
const { to: pWrapper } = require('await-to-js');
const debug = require('../utils/debug');
const { db, failsafe } = require('../utils/db');
const retry = require('p-retry');
const path = require('path');
const mime = require('mime');
const downloadFile = require('../utils/download');
const Promise = require('bluebird');
const indexer = require('../init/indexer');
const scrapeIt = require('scrape-it');

const sanitizePostContent = async (content) => {
  // mirror and replace any inline images
  if (!content) return '';
  const urls = content.match(/(((http|https|ftp):\/\/([\w-\d]+\.)+[\w-\d]+){0,1}(\/[\w~,;\-./?%&+#=]*))/ig) || [];
  await Promise.mapSeries(urls, async (val) => {
    if ((/\.(gif|jpe?g|png|webp)$/i).test(val) && (/\/patreon_inline\//i).test(val)) {
      const downloadUrl = val.startsWith('/') ? 'https://data.yiff.party' + val : val;
      const imageMime = mime.getType(val);
      const filename = new Date().getTime() + '.' + mime.getExtension(imageMime);
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, 'inline'),
        name: filename
      }, {
        url: downloadUrl
      })
        .then(() => {
          content = content.replace(val, `/inline/${filename}`);
        })
        .catch(() => {});
    }
  });
  return content;
};

async function scraper (id, users) {
  const userArray = users.split(',');
  const log = debug('kemono:importer:yiff:' + id);

  await Promise.map(userArray, async (user) => {
    const [err1, yiff] = await pWrapper(retry(() => cloudscraper.get(`https://yiff.party/${user}.json`, {
      json: true
    }), {
      onFailedAttempt: error => {
        if (error.statusCode === 404) throw error;
      }
    }));
    if (err1 && err1.statusCode === 404) {
      return log(`Error: User ID ${user} not found.`);
    } else if (err1 && err1.statusCode) {
      return log(`Error: Status code ${err1.statusCode} when contacting yiff.party JSON API.`);
    } else if (err1) {
      return log(err1);
    }

    const jar = request.jar();
    /* eslint-disable no-unused-vars */
    const [err2, _config] = await pWrapper(retry(() => cloudscraper.post('https://yiff.party/config', {
      form: {
        a: 'post_view_limit',
        d: 'all'
      },
      jar: jar
    })));
    if (err2 && err2.statusCode) {
      return log(`Error: Status code ${err1.statusCode} when contacting yiff.party config API.`);
    } else if (err2) {
      return log(err2);
    }
    /* eslint-enable no-unused-vars */

    const [err3, html] = await pWrapper(retry(() => cloudscraper.get(`https://yiff.party/render_posts?s=patreon&c=${user}`, {
      jar: jar
    })));
    if (err3 && err3.statusCode) {
      return log(`Error: Status code ${err1.statusCode} when contacting yiff.party config API.`);
    } else if (err3) {
      return log(err3);
    }

    log(`Importing user ${user}`);

    await Promise.map(yiff.posts, async (post) => {
      // intentionally doesn't support flags to prevent version downgrading and edit erasing
      const banExists = await db('dnp').where({ id: user, service: 'patreon' });
      if (banExists.length) return log(`Skipping ID ${post.id}: user ${user} is banned`);

      const postExists = await db('booru_posts').where({ id: String(post.id), service: 'patreon' });
      if (postExists.length) return;

      log(`Importing ID ${post.id}`);
      const inactivityTimer = setTimeout(() => log(`Warning: Post ${post.id} may be stalling`), 120000);
      
      const model = {
        id: String(post.id),
        user: user,
        service: 'patreon',
        title: post.title || '',
        content: await sanitizePostContent(post.body),
        embed: {},
        shared_file: false,
        published: new Date(post.created * 1000).toISOString(),
        edited: null,
        file: {},
        attachments: []
      };

      if (Object.keys(post.embed || {}).length) {
        model.embed.subject = post.embed.subject;
        model.embed.description = post.embed.description;
        model.embed.url = post.embed.url;
      }

      if (Object.keys(post.post_file || {}).length) {
        await downloadFile({
          ddir: path.join(process.env.DB_ROOT, `files/${user}/${post.id}`),
          name: post.post_file.file_name
        }, {
          url: post.post_file.file_url
        })
          .then(res => {
            model.file.name = res.filename;
            model.file.path = `/files/${user}/${post.id}/${res.filename}`;
          })
          .catch(() => {});
      }

      await Promise.mapSeries(post.attachments, async (attachment) => {
        await downloadFile({
          ddir: path.join(process.env.DB_ROOT, `attachments/${user}/${post.id}`),
          name: attachment.file_name
        }, {
          url: attachment.file_url
        })
          .then(res => {
            model.attachments.push({
              name: res.filename,
              path: `/attachments/${user}/${post.id}/${res.filename}`
            });
          })
          .catch(() => {});
      });

      const media = scrapeIt.scrapeHTML(html, {
        attachments: {
          listItem: `.yp-post#p${String(post.id)} .card-attachments a`,
          data: {
            filename: '',
            downloadUrl: {
              attr: 'href'
            }
          }
        }
      });

      await Promise.mapSeries(media.attachments, async (attachment) => {
        await downloadFile({
          ddir: path.join(process.env.DB_ROOT, `attachments/${user}/${post.id}`),
          name: attachment.filename
        }, {
          url: attachment.downloadUrl
        })
          .then(res => {
            model.attachments.push({
              name: res.filename,
              path: `/attachments/${user}/${post.id}/${res.filename}`
            });
          })
          .catch(() => {});
      });

      clearTimeout(inactivityTimer);
      log(`Finished importing ID ${post.id}`);
      await db('booru_posts').insert(model);
    });
  }, { concurrency: 8 });

  log('Finished processing posts.');
  indexer();
}

module.exports = data => {
  debug('kemono:importer:yiff:' + data.id)('Starting yiff.party import...');
  failsafe.set(data.id, JSON.stringify({ importer: 'yiffparty', data: data }), 'EX', 1800);
  scraper(data.id, data.users);
};
