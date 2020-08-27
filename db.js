const { default: Pq } = require('p-queue');
module.exports = {
  db: require('knex')({
    client: 'pg',
    connection: {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    },
    pool: { min: 2, max: 200 }
  }),
  queue: new Pq({ concurrency: 100 })
};
