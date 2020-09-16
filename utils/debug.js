const debug = require('debug');
const { db } = require('./db');
debug.log = (...args) => {
  process.stdout.write(args.map(x => x.trim()).join(' ') + '\n');
  db('logs').insert({
    log0: args[0].replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim(),
    log: args.map(x => x.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim())
  }).asCallback(() => {});
}
module.exports = debug;