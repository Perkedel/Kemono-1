const { artists } = require('./artists');
const { upload } = require('./upload');
const { server } = require('./server');
const { recent } = require('./recent');
const { post } = require('./post');
const { user } = require('./user');

module.exports = {
  artists,
  upload,
  server,
  recent,
  post,
  user
};
