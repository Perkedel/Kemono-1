require('dotenv').config();
const { posts, lookup, flags } = require('./utils/db');
const migrations = require('./init/migrations');
const indexer = require('./init/indexer');
const server = require('./init/server');

const logfmt = str => str.trim();
(async () => {
  console.log('\nｷﾀ━━━(ﾟ∀ﾟ)━━━!!');

  console.log(logfmt('Creating indexes...'));
  await posts.createIndex({ title: 'text', content: 'text' });
  await posts.createIndex({ id: 1 });
  await posts.createIndex({ user: 1 });
  await posts.createIndex({ service: 1 });
  await posts.createIndex({ id: 1, service: 1 });
  await posts.createIndex({ id: 1, user: 1, service: 1 });
  await posts.createIndex({ 'tags.artist': 1 });
  await posts.createIndex({ 'tags.character': 1 });
  await posts.createIndex({ 'tags.copyright': 1 });
  await posts.createIndex({ 'tags.meta': 1 });
  await posts.createIndex({ 'tags.general': 1 });
  await posts.createIndex({ published: -1 });
  await lookup.createIndex({ service: 1, name: 1 });
  await lookup.createIndex({ id: 1, service: 1 });
  await flags.createIndex({ id: 1, service: 1, user: 1 });

  console.log('Performing database migrations...');
  await migrations();

  console.log('Building lookup index...');
  indexer();

  console.log('Starting webserver...');
  server();

  console.log('━━━━━━━━━━━━━━━');
  console.log('\nWelcome to Kemono! [2.0.0-Lain]\n');
})();
