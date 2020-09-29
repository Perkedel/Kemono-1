const Redis = require('cacheman-redis');
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
    }
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
    }
  }),
  cache: new Redis({
    host: process.env.RDHOST || 'localhost',
    port: process.env.RDPORT || 6379
  }),
  failsafe: new Redis({
    host: process.env.RDHOST || 'localhost',
    port: process.env.RDPORT || 6379,
    prefix: 'importers:'
  })
};
