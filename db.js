const mongo = require('mongo-lazy-connect')(process.env.MONGO_URL, { useUnifiedTopology: true });
const db = {
  posts: mongo.collection('posts'),
  lookup: mongo.collection('lookup'),
  flags: mongo.collection('flags'),
  bans: mongo.collection('bans'),
  board: mongo.collection('board')
};

module.exports = db;
