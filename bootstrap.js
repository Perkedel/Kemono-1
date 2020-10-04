require('dotenv').config();
const webpush = require('./utils/push');
const { db, failsafe } = require('./utils/db');
const { Worker } = require('worker_threads');
const blocked = require('blocked');
const fs = require('fs-extra');
const path = require('path');
const indexer = require('./init/indexer');
const server = require('./init/server');

const logfmt = str => str.trim();
(async () => {
  console.log('\nｷﾀ━━━(ﾟ∀ﾟ)━━━!!');

  console.log(logfmt('Preparing database...'));
  await db.raw(await fs.readFile(path.join(__dirname, 'database.sql'), 'utf8'));

  const vapidExists = await fs.pathExists(path.join(process.env.DB_ROOT, 'vapid.json'));
  if (!vapidExists) {
    console.log('Generating VAPID keys...');
    await fs.outputJSON(path.join(process.env.DB_ROOT, 'vapid.json'), webpush.generateVAPIDKeys());
  }
  console.log('Loading VAPID keys...');
  const vapid = await fs.readJSON(path.join(process.env.DB_ROOT, 'vapid.json'));
  webpush.setVapidDetails(process.env.PUBLIC_ORIGIN, vapid.publicKey, vapid.privateKey);
  process.env.VAPID_PUBLIC_KEY = vapid.publicKey;

  console.log('Restarting unfinished imports...');
  const stream = failsafe.scanStream({ match: 'importers:*' });
  stream.on('data', result => {
    result.map(key => {
      failsafe.get(key.replace('importers:', ''), function (err, val) {
        val = JSON.parse(val);
        if (err) return console.log(err);
        switch (val.importer) {
          case 'patreon':
            new Worker('./importers/patreon.js', {
              workerData: val.data
            });
            break;
          case 'fanbox':
            new Worker('./importers/fanbox.js', {
              workerData: val.data
            });
            break;
          case 'gumroad':
            new Worker('./importers/gumroad.js', {
              workerData: val.data
            });
            break;
          case 'subscribestar':
            new Worker('./importers/subscribestar.js', {
              workerData: val.data
            });
            break;
          case 'dlsite':
            new Worker('./importers/dlsite.js', {
              workerData: val.data
            });
            break;
          case 'yiffparty':
            new Worker('./importers/yiffparty.js', {
              workerData: val.data
            });
            break;
        }
      });
    });
  });

  console.log('Starting webserver...');
  server();

  console.log('Building lookup index...');
  indexer();

  console.log('━━━━━━━━━━━━━━━');
  console.log('\nWelcome to Kemono! [2.0.0-Lain]\n');

  global.console.log = (...args) => require('./utils/debug')('kemono:global:log')(...args);
  global.console.error = (...args) => require('./utils/debug')('kemono:global:error')(...args);

  blocked(ms => console.log('Blocked: ' + ms), {
    threshold: 100,
    interval: 1000
  })
})();
