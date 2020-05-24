const retry = require('p-retry');
module.exports = (uri, options, wrap) => {
  const proxies = process.env.PROXY ? process.env.PROXY.split(',') : [];
  return retry(i => {
    let proxy = i > proxies.length ? '' : proxies[i - 1];
    return wrap.get(proxy + uri, options);
  });
};
