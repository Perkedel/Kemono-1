const { favorites } = require('./favorites');
const { updated } = require('./updated');
const { artists } = require('./artists');
const { success } = require('./success');
const { upload } = require('./upload');
const { server } = require('./server');
const { recent } = require('./recent');
const { error } = require('./error');
const { post } = require('./post');
const { user } = require('./user');

module.exports = {
  favorites,
  success,
  error,
  updated,
  artists,
  upload,
  server,
  recent,
  post,
  user
};
