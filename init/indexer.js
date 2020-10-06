const Promise = require('bluebird');
const request = require('request-promise');
const retry = require('p-retry');
const { unraw } = require('unraw');
const agentOptions = require('../utils/agent');
const cloudscraper = require('cloudscraper').defaults({ agentOptions });
const { db } = require('../utils/db');
async function indexer () {
  const postsData = await db.select('user', 'service')
    .from({ post: 'booru_posts' })
    .whereNotExists(db.select().from('lookup').whereRaw('id = post.user'))
    .groupBy('user', 'service');
  await Promise.map(postsData, async (post) => {
    switch (post.service) {
      case 'patreon': {
        const api = 'https://www.patreon.com/api/user';
        const user = await retry(() => cloudscraper.get(`${api}/${post.user}`, { json: true }));
        await db('lookup')
          .insert({
            id: post.user,
            name: user.data.attributes.vanity || user.data.attributes.full_name,
            service: 'patreon'
          });
        break;
      }
      case 'fanbox': {
        const api = 'https://api.fanbox.cc/creator.get?userId';
        const user = await request.get(`${api}=${post.user}`, {
          json: true,
          headers: {
            origin: 'https://fanbox.cc'
          }
        });
        await db('lookup')
          .insert({
            id: post.user,
            name: unraw(user.body.user.name),
            service: 'fanbox'
          });
        break;
      }
      case 'gumroad': {
        const api = `${process.env.ORIGIN}/proxy/gumroad/user`;
        const user = await request.get(`${api}/${post.user}`, { json: true });
        await db('lookup')
          .insert({
            id: post.user,
            name: user.name,
            service: 'gumroad'
          });
        break;
      }
      case 'subscribestar': {
        const api = `${process.env.ORIGIN}/proxy/subscribestar/user`;
        const user = await request.get(`${api}/${post.user}`, { json: true });
        await db('lookup')
          .insert({
            id: post.user,
            name: user.name,
            service: 'subscribestar'
          });
        break;
      }
      case 'dlsite': {
        const api = `${process.env.ORIGIN}/proxy/dlsite/user`;
        const user = await request.get(`${api}/${post.user}`, { json: true });
        await db('lookup')
          .insert({
            id: post.user,
            name: user.name,
            service: 'dlsite'
          });
        break;
      }
    }
  });
}

module.exports = () => indexer();
