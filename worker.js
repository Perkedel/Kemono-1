const workerpool = require('workerpool');
module.exports = {
  pool: workerpool.pool({ maxWorkers: 10 })
};
