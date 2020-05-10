const retry = require('p-retry');
// probably won't work with non-promise request libs
module.exports = (uri, options, wrap) => {
  return retry(i => {
    let proxy = process.env.PROXY ? process.env.PROXY : '';
    if (i > 1) proxy = '';
    return wrap.get(proxy + uri, options);
  });
};
