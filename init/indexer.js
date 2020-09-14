const Promise = require('bluebird');
const request = require('request-promise');
const retry = require('p-retry');
const { unraw } = require('unraw');
// const cloudscraper = require('cloudscraper').defaults({
//   agentOptions: {
//     ciphers: [
//       'TLS_AES_128_GCM_SHA256',
//       'TLS_CHACHA20_POLY1305_SHA256',
//       'TLS_AES_256_GCM_SHA384',
//       'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256'
//     ].join(':')
//   }
// });
const agentOptions = require('../utils/agent');
const cloudscraper = require('cloudscraper').defaults({ agentOptions });
const { db } = require('../utils/db');
async function indexer () {
  await db.transaction(async trx => {
    const postsData = await trx('booru_posts')
      .select('user', 'service')
      .orderBy('added', 'desc')
      .limit(10000);
    await Promise.mapSeries(postsData, async (post) => {
      const indexExists = await trx('lookup')
        .where({ id: post.user, service: post.service });
      if (indexExists.length) return;

      switch (post.service) {
        case 'patreon': {
          const api = 'https://www.patreon.com/api/user';
          const user = await retry(() => cloudscraper.get(`${api}/${post.user}`, { json: true }));
          await trx('lookup')
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
          await trx('lookup')
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
          await trx('lookup')
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
          await trx('lookup')
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
          await trx('lookup')
            .insert({
              id: post.user,
              name: user.name,
              service: 'dlsite'
            });
          break;
        }
      }
    });
  });
}

module.exports = () => indexer();
