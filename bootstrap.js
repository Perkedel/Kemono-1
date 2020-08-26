require('dotenv').config();
const { db } = require('./db');
const fs = require('fs-extra');
const path = require('path');
const isInstalled = require('prgm-installed');
const indexer = require('./indexer');
const server = require('./server');

const logfmt = str => str.trim();
(async () => {
  console.log('\nｷﾀ━━━(ﾟ∀ﾟ)━━━!!');

  console.log(logfmt('Preparing database...'));
  await db.raw(await fs.readFile(path.join(__dirname, 'database.sql'), 'utf8'));

  console.log('Building lookup index...');
  indexer();

  console.log('Checking for external dependencies...')
  process.stdout.write(isInstalled('inkscape') ? '' : '[!] Inkscape is not installed. Gumroad watermark removal will be disabled.\n');

  console.log('Starting webserver...');
  server();

  console.log('━━━━━━━━━━━━━━━');
  console.log('\nWelcome to Kemono! [2.0.0-Lain]\n');
})();
