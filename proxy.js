module.exports = (uri, options, wrap) => {
  let proxy = process.env.PROXY ? process.env.PROXY : '';
  let req = await wrap.get(proxy + uri, options)
    .catch(() => await wrap.get(uri, options));
  return req;
};