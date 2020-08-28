const Promise = require('bluebird');
const request = require('request-promise');
const { unraw } = require('unraw');
const cloudscraper = require('cloudscraper');
const { db, queue } = require('./db');
async function indexer () {
  const postsData = await queue.add(() => {
    return db('booru_posts')
      .select('user', 'service')
      .orderBy('added', 'desc')
      .limit(5000)
  });
  await Promise.mapSeries(postsData, async (post) => {
    const indexExists = await queue.add(() => db('lookup').where({ id: post.user, service: post.service }), {
      priority: 0
    });
    if (indexExists.length) return;

    switch (post.service) {
      case 'patreon': {
        const api = 'https://www.patreon.com/api/user';
        const user = await cloudscraper.get(`${api}/${post.user}`, { json: true });
        await queue.add(() => {
          return db('lookup')
            .insert({
              id: post.user,
              name: user.data.attributes.vanity || user.data.attributes.full_name,
              service: 'patreon'
            });
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
        await queue.add(() => {
          return db('lookup')
            .insert({
              id: post.user,
              name: unraw(user.body.user.name),
              service: 'fanbox'
            });
        });
        break;
      }
      case 'gumroad': {
        const api = `${process.env.ORIGIN}/proxy/gumroad/user`;
        const user = await request.get(`${api}/${post.user}`, { json: true });
        await queue.add(() => {
          return db('lookup')
            .insert({
              id: post.user,
              name: user.name,
              service: 'gumroad'
            });
        });
        break;
      }
      case 'subscribestar': {
        const api = `${process.env.ORIGIN}/proxy/subscribestar/user`;
        const user = await request.get(`${api}/${post.user}`, { json: true });
        await queue.add(() => {
          return db('lookup')
            .insert({
              id: post.user,
              name: user.name,
              service: 'subscribestar'
            });
        });
        break;
      }
      case 'dlsite': {
        const api = `${process.env.ORIGIN}/proxy/dlsite/user`;
        const user = await request.get(`${api}/${post.user}`, { json: true });
        await queue.add(() => {
          return db('lookup')
            .insert({
              id: post.user,
              name: user.name,
              service: 'dlsite'
            });
        });
        break;
      }
    }
  });
}

module.exports = () => indexer();
