// const mongo = require('mongo-lazy-connect')(process.env.MONGO_URL, { useUnifiedTopology: true });
// const db = {
//   posts: mongo.collection('posts'),
//   lookup: mongo.collection('lookup'),
//   flags: mongo.collection('flags'),
//   bans: mongo.collection('bans'),
//   board: mongo.collection('board'),
//   revisions: mongo.collection('revisions'),
//   discord: mongo.collection('discord')
// };

module.exports = {
  db: require('knex')({
    client: 'pg',
    connection: {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    },
    pool: {
      acquireTimeoutMillis: 1000000, // never timeout
      max: 10
    }
  })
};
