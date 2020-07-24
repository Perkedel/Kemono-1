const cloudscraper = require('cloudscraper');
const { posts, bans } = require('../../db');
const retry = require('p-retry');
const path = require('path');
const mime = require('mime');
const downloadFile = require('../../download');
const Promise = require('bluebird');
const { URL } = require('url');
const indexer = require('../../indexer');
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

async function scraper (users) {
  const userArray = users.split(',');
  await Promise.mapSeries(userArray, async (user) => {
    const yiff = await retry(() => cloudscraper.get(`https://yiff.party/${user}.json`, {
      json: true
    }));
    await Promise.map(yiff.posts, async (post) => {
      // intentionally doesn't support flags to prevent version downgrading and edit erasing
      const banExists = await bans.findOne({ id: post.id, service: 'patreon' });
      if (banExists) return;
      
      const postExists = await posts.findOne({
        id: post.id,
        $or: [
          { service: 'patreon' },
          { service: null }
        ]
      });
      if (postExists) return;

      const model = {
        version: 2,
        service: 'patreon',
        title: post.title || '',
        content: await sanitizePostContent(post.body),
        id: String(post.id),
        user: user,
        post_type: 'text_only',
        published_at: new Date(post.created * 1000).toISOString(),
        added_at: new Date().getTime(),
        embed: {},
        post_file: {},
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
            model.post_type = isImage(res.filename) ? 'image' : model.post_type;
            model.post_file.name = res.filename;
            model.post_file.path = `/files/${user}/${post.id}/${res.filename}`;
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
              id: attachment.id,
              name: res.filename,
              path: `/attachments/${user}/${post.id}/${res.filename}`
            });
          })
      })

      posts.insertOne(model);
    })
  })

  indexer();
}

module.exports = users => scraper(users);