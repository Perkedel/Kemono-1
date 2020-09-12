const JPEG = require('jpeg-js');
const fs = require('fs-extra');
const mime = require('mime');
const path = require('path');
const PNG = require('png-js');

module.exports = ({ filename, ddir, tempname }) => {
  if (mime.getType(filename) === 'image/png') {
    PNG.load(path.join(ddir, tempname));
  } else if (mime.getType(filename) === 'image/jpeg') {
    JPEG.decode(fs.readFileSync(path.join(ddir, tempname)), {
      tolerantDecoding: false
    });
  }
}