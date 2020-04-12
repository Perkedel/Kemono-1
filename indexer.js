const Promise = require('bluebird');
const request = require('request-promise');
const { unraw } = require('unraw');
const cloudscraper = require('cloudscraper');
const { posts, lookup } = require('./db');
async function indexer () {
  posts.createIndex({ added_at: -1 });
  const postsData = await posts
    .find({})
    .sort({ added_at: -1 })
    .project({ version: 1, user: 1, service: 1 })
    .toArray();
  Promise.mapSeries(postsData, async (post) => {
    const indexExists = await lookup.findOne({ id: post.user, service: post.service });
    if (indexExists) return;

    switch (post.service) {
      case 'patreon': {
        const api = 'https://www.patreon.com/api/user';
        const user = await cloudscraper.get(`${api}/${post.user}`, { json: true });
        await lookup.insertOne({
          version: post.version,
          service: 'patreon',
          id: post.user,
          name: user.data.attributes.vanity || user.data.attributes.full_name
        });
        break;
      }
      case 'fanbox': {
        const api = 'https://fanbox.pixiv.net/api/creator.get?userId';
        const user = await request.get(`${api}=${post.user}`, {
          json: true,
          headers: {
            origin: 'https://www.pixiv.net'
          }
        });
        await lookup.insertOne({
          version: post.version,
          service: 'fanbox',
          id: post.user,
          name: unraw(user.body.user.name)
        });
        break;
      }
      case 'gumroad': {
        const api = `${process.env.ORIGIN}/proxy/gumroad/user`;
        const user = await request.get(`${api}/${post.user}`, { json: true });
        await lookup.insertOne({
          version: post.version,
          service: 'gumroad',
          id: post.user,
          name: user.name
        });
        break;
      }
      default: {
        const api = 'https://www.patreon.com/api/user';
        const user = await cloudscraper.get(`${api}/${post.user}`, { json: true });
        await lookup.insertOne({
          version: post.version,
          service: 'patreon',
          id: post.user,
          name: user.data.attributes.vanity || user.data.attributes.full_name
        });
      }
    }
  });
}

module.exports = () => indexer();
