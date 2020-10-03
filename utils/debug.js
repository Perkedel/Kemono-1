const debug = require('debug');
const { logdb } = require('./db');

debug.dlog = debug.log;
debug.log = (...args) => {
  try {
    process.stdout.write(args.map(x => x.trim()).join(' ') + '\n');
    /* eslint-disable no-control-regex */
    logdb('logs').insert({
      log0: args[0].replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim(),
      log: args.map(x => x.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim())
    }).asCallback(() => {});
    /* eslint-enable no-control-regex */
  } catch {
    debug.dlog(...args)
  }
};
module.exports = debug;
