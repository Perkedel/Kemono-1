const request = require('request').defaults({ encoding: null });
const { slugify } = require('transliteration');
const cd = require('content-disposition');
const FileType = require('file-type');
const crypto = require('crypto');
const retry = require('p-retry');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime');
const { pool } = require('./worker');
const { to: pWrapper } = require('await-to-js');

/**
 * Wrapper for Request that automatically handles integrity checking and automatic retries when downloading files.
 * @constructor
 * @param {Object} opts
 * @param {String} opts.ddir - The directory where the file (and temps) will be saved.
 * @param {String} opts.name - The filename of the download. If unfilled, the name will be guessed from other headers.
 * @param {Object} requestOpts
 * @param {String} requestOpts.url - The URL to download from.
 */
module.exports = (opts, requestOpts = {}) => {
  Object.assign(requestOpts, { encoding: null });
  const tempname = crypto.randomBytes(20).toString('hex') + '.temp';
  return retry(() => {
    return new Promise((resolve, reject) => {
      fs.ensureFile(path.join(opts.ddir, tempname))
        .then(() => {
          request.get(requestOpts)
            .once('complete', async (res) => {
              const irrecoverableCodes = [
                400,
                401,
                404
              ];
              if (irrecoverableCodes.includes(res.statusCode)) return reject(new Error(`Irrecoverable status code: ${res.statusCode}`));
              if (res.statusCode !== 200) return reject(new Error(`Bad status code: ${res.statusCode}`));
              // filename guessing
              let extension = await FileType.fromFile(path.join(opts.ddir, tempname));
              extension = extension || {};
              let name = opts.name || res.headers['x-amz-meta-original-filename'];
              if (!name) {
                name = res.headers['content-disposition'] ? cd.parse(res.headers['content-disposition']).parameters.filename : `Untitled.${extension.ext || 'Untitled'}`;
              }
              const filename = slugify(name, { lowercase: false });
              // content integrity
              if (res.headers['content-length']) {
                const tempstats = await fs.stat(path.join(opts.ddir, tempname));
                if (tempstats.size !== Number(res.headers['content-length'])) return reject(new Error('Size differs from reported'));
              } else if (!res.headers['content-length'] && mime.getType(filename) === 'image/png') {
                /* eslint-disable no-unused-vars */
                const [err1, _jpg] = await pWrapper(pool.exec(data => {
                  const JPEG = require('jpeg-js');
                  const path = require('path');
                  const fs = require('fs-extra');
                  JPEG.decode(fs.readFileSync(path.join(data.ddir, data.tempname)), {
                    tolerantDecoding: false
                  });
                }, [{
                  tempname: tempname,
                  ddir: opts.ddir
                }]));
                if (err1) return reject(new Error('Decode failed'));
                /* eslint-enable no-unused-vars */
              } else if (!res.headers['content-length'] && mime.getType(filename) === 'image/jpeg') {
                /* eslint-disable no-unused-vars */
                const [err2, _png] = await pWrapper(pool.exec(data => {
                  const PNG = require('png-js');
                  const path = require('path');
                  PNG.load(path.join(data.ddir, data.tempname));
                }, [{
                  tempname: tempname,
                  ddir: opts.ddir
                }]));
                if (err2) return reject(new Error('Decode failed'));
                /* eslint-enable no-unused-vars */
              }

              await fs.rename(path.join(opts.ddir, tempname), path.join(opts.ddir, filename));
              resolve({
                filename: filename,
                res: res
              });
            })
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(path.join(opts.ddir, tempname)));
        });
    });
  }, {
    retries: 25,
    onFailedAttempt: error => {
      if ((/Irrecoverable status code/).test(error.message)) throw error;
    }
  });
};
