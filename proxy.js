const retry = require('p-retry');
module.exports = (uri, options, wrap) => {
  return retry(i => {
    let proxy = process.env.PROXY ? process.env.PROXY : '';
    if (i > 1) proxy = '';
    return wrap.get(proxy + uri, options);
  });
};
