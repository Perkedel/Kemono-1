const { default: pq } = require('p-queue');
module.exports = {
  db: require('knex')({
    client: 'pg',
    connection: {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    },
    pool: { min: 2, max: 99 }
  }),
  queue: new pq({ concurrency: 99 })
};