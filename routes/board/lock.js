const util = require('util');
const lockfile = util.promisify(require('lockfile').lock);
const unlockfile = util.promisify(require('lockfile').unlock);
const fs = require('fs-extra');

const lock = async (file) => {
  await fs.ensureFile(file);
  const lockname = file + '.lock';
  await lockfile(lockname, {
    stale: 10000,
    retries: 1000,
    retryWait: 100
  });
};

const unlock = async (file) => {
  const lockname = file + '.lock';
  await unlockfile(lockname);
};

module.exports = { lock, unlock };
