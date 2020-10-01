const Redis = require('ioredis');
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
      max: 100
    },
    acquireConnectionTimeout: 1000000
  }),
  logdb: require('knex')({
    client: 'pg',
    connection: {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    },
    pool: {
      acquireTimeoutMillis: 1000000, // never timeout
      min: 0,
      max: 1
    },
    acquireConnectionTimeout: 1000000
  }),
  cache: new Redis({
    host: process.env.RDHOST || 'localhost',
    port: process.env.RDPORT || 6379,
    keyPrefix: 'cacheman:'
  }),
  failsafe: new Redis({
    host: process.env.RDHOST || 'localhost',
    port: process.env.RDPORT || 6379,
    keyPrefix: 'importers:'
  })
};
