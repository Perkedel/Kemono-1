const { workerData, parentPort } = require('worker_threads');
const JPEG = require('jpeg-js');
const fs = require('fs-extra');
const mime = require('mime');
const path = require('path');
const PNG = require('png-js');

if (mime.getType(workerData.filename) === 'image/png') {
  PNG.load(path.join(workerData.ddir, workerData.tempname));
} else if (mime.getType(workerData.filename) === 'image/jpeg') {
  JPEG.decode(fs.readFileSync(path.join(workerData.ddir, workerData.tempname)), {
    tolerantDecoding: false
  });
}

parentPort.postMessage('done');