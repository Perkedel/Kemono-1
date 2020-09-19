const request = require('request').defaults({ encoding: null });
const { slugify } = require('transliteration');
const cd = require('content-disposition');
const FileType = require('file-type');
const crypto = require('crypto');
const retry = require('p-retry');
const fs = require('fs-extra');
const path = require('path');
const { pool } = require('./worker');

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
            .on('complete', async (res) => {
              if (res.statusCode !== 200) return reject(new Error('Bad status code'));
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
              }

              pool.exec((data) => {
                process.on('disconnect', () => {
                  process.exit(0);
                });

                const JPEG = require('jpeg-js');
                const fs = require('fs-extra');
                const mime = require('mime');
                const path = require('path');
                const PNG = require('png-js');

                if (mime.getType(data.filename) === 'image/png') {
                  PNG.load(path.join(data.ddir, data.tempname));
                } else if (mime.getType(data.filename) === 'image/jpeg') {
                  JPEG.decode(fs.readFileSync(path.join(data.ddir, data.tempname)), {
                    tolerantDecoding: false
                  });
                }
              }, [{
                filename: filename,
                tempname: tempname,
                ddir: opts.ddir
              }])
                .then(() => {
                  fs.rename(path.join(opts.ddir, tempname), path.join(opts.ddir, filename))
                    .then(() => {
                      resolve({
                        filename: filename,
                        res: res
                      });
                    });
                })
                .catch(() => reject(new Error('Decode failed')));
            })
            .setMaxListeners(1000)
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(path.join(opts.ddir, tempname)));
        });
    });
  }, {
    retries: 25,
    onFailedAttempt: error => {
      if (error.message === 'Bad status code') throw error;
    }
  });
};
