const agentOptions = require('../utils/agent');
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
      return log(`Error: User ID ${user} not found.`)
    } else if (err1 && err1.statusCode) {
      return log(`Error: Status code ${err1.statusCode} when contacting yiff.party API.`)
    } else if (err1) {
      return log(err1);
    }

    log(`Importing user ${user}`)

    await Promise.map(yiff.posts, async (post) => {
      // intentionally doesn't support flags to prevent version downgrading and edit erasing
      const banExists = await db('dnp').where({ id: user, service: 'patreon' });
      if (banExists.length) return log(`Skipping ID ${post.id}: user ${user} is banned`);

      const postExists = await db('booru_posts').where({ id: String(post.id), service: 'patreon' });
      if (postExists.length) return;

      log(`Importing ID ${post.id}`)

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
          });
      }

      await Promise.map(post.attachments, async (attachment) => {
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
          });
      });

      log(`Finished importing ID ${post.id}`)
      await db('booru_posts').insert(model);
    });
  });

  log('Finished processing posts.')
  failsafe.del(id);
  indexer();
}

module.exports = data => {
  debug('kemono:importer:yiff:' + data.id)('Starting yiff.party import...')
  failsafe.set(data.id, { importer: 'yiffparty', data: data }, 1800, () => {})
  scraper(data.id, data.users);
}