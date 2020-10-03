require('dotenv').config();
const webpush = require('./utils/push');
const { db, failsafe } = require('./utils/db');
const blocked = require('blocked-at')
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
            require('./importers/patreon')(val.data);
            break;
          case 'fanbox':
            require('./importers/fanbox')(val.data);
            break;
          case 'gumroad':
            require('./importers/gumroad')(val.data);
            break;
          case 'subscribestar':
            require('./importers/subscribestar')(val.data);
            break;
          case 'dlsite':
            require('./importers/dlsite')(val.data);
            break;
          case 'yiffparty':
            require('./importers/yiffparty')(val.data);
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

  // debug
  blocked((time, stack) => {
    console.log(`Blocked for ${time}ms, operation started here:`, stack)
  }, {
    trimFalsePositives: true,
    threshold: 50
  })
})();
