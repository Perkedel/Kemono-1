const request = require('request').defaults({ encoding: null });
const { slugify } = require('transliteration');
const cd = require('content-disposition');
const crypto = require('crypto');
const retry = require('p-retry');
const fs = require('fs-extra');
const path = require('path');

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
  Object.assign(opts, { encoding: null });
  const tempname = crypto.randomBytes(20).toString('hex') + '.temp';
  return retry(() => {
    return new Promise((resolve, reject) => {
      fs.ensureFile(path.join(opts.ddir, tempname))
        .then(() => {
          request.get(requestOpts)
            .on('complete', async (res) => {
              // content integrity
              if (res.statusCode !== 200) reject(new Error(`Status code: ${res.statusCode}`));
              if (res.headers['content-length']) {
                const tempstats = await fs.stat(path.join(opts.ddir, tempname));
                if (tempstats.size !== Number(res.headers['content-length'])) return reject(new Error('Size differ from reported'));
              }
              // filename guessing
              const [name, ext] = opts.name ? opts.name.split('.') : (
                res.headers['x-amz-meta-original-filename'] ? res.headers['x-amz-meta-original-filename'].split('.') : (
                  res.headers['content-disposition'] ? cd.parse(res.headers['content-disposition']).parameters.filename.split('.') : ['Untitled', 'Untitled']
                )
              );
              const filename = `${slugify(name, { lowercase: false })}.${ext}`;
              // move to final location
              await fs.rename(
                path.join(opts.ddir, tempname),
                path.join(opts.ddir, filename)
              );
              resolve({
                filename: filename,
                res: res
              });
            })
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(path.join(opts.ddir, tempname)));
        });
    });
  }, { retries: 25 });
};
