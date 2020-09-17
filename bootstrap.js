require('dotenv').config();
const webpush = require('./utils/push');
const { db, failsafe } = require('./utils/db');
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
  failsafe.scan(0, 1000, function (err, result) {
    if (err) return console.log(err);
    result.entries.map(entry => {
      switch (entry.data.importer) {
        case 'patreon':
          require('./importers/patreon')(entry.data.data);
          break;
        case 'fanbox':
          require('./importers/fanbox')(entry.data.data);
          break;
        case 'gumroad':
          require('./importers/gumroad')(entry.data.data);
          break;
        case 'subscribestar':
          require('./importers/subscribestar')(entry.data.data);
          break;
        case 'dlsite':
          require('./importers/dlsite')(entry.data.data);
          break;
        case 'yiffparty':
          require('./importers/yiffparty')(entry.data.data);
          break;
      }
    })
  });

  console.log('Building lookup index...');
  indexer();

  console.log('Starting webserver...');
  server();

  console.log('━━━━━━━━━━━━━━━');
  console.log('\nWelcome to Kemono! [2.0.0-Lain]\n');

  global.console.log = (...args) => require('./utils/debug')('kemono:global:log')(...args)
  global.console.error = (...args) => require('./utils/debug')('kemono:global:error')(...args)
})();
