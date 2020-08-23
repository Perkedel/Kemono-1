const { to } = require('await-to-js');

(async () => {
  const mongo = require('mongo-lazy-connect')(process.argv[2], { useUnifiedTopology: true });
  const postgres = require('knex')({
    client: 'pg',
    connection: {
      user: 'nano',
      password: 'shinonome',
      database: 'kemonodb',
      host: 'localhost'
    }
  });
  const db = {
    posts: mongo.collection('posts'),
    lookup: mongo.collection('lookup'),
    flags: mongo.collection('flags'),
    bans: mongo.collection('bans'),
    board: mongo.collection('board')
  };

  let err;
  [err] = await to(db.posts.find({
    service: { $ne: 'discord' }
  })
    .forEach(x => {
      postgres('booru_posts').insert({
        id: x.id,
        user: x.user,
        service: x.service || 'patreon',
        title: x.title || '',
        content: x.content || '',
        embed: x.embed || {},
        shared_file: x.shared_file || false,
        added: new Date(x.added_at).toISOString(),
        published: x.published_at || null,
        edited: x.edited_at || null,
        file: x.post_file || {},
        attachments: x.attachments || []
      }).asCallback(() => {});
    }));

  [err] = await to(db.bans.find({})
    .forEach(x => {
      postgres('dnp').insert({
        id: x.id,
        service: x.service
      }).asCallback(() => {});
    }));

  [err] = await to(db.posts.find({ service: 'discord' })
    .forEach(x => {
      postgres('discord_posts').insert({
        id: x.id,
        author: x.author,
        server: x.user,
        channel: x.channel,
        content: x.content,
        added: new Date().toISOString(),
        published: new Date(x.published_at).toISOString(),
        edited: x.edited_at || null,
        embeds: x.embeds,
        mentions: x.mentions,
        attachments: x.attachments
      }).asCallback(() => {});
    }));

  [err] = await to(db.flags.find({})
    .forEach(x => {
      postgres('booru_flags').insert({
        id: x.id,
        user: x.user,
        service: x.service
      }).asCallback(() => {});
    }));

  [err] = await to(db.lookup.find({})
    .forEach(x => {
      postgres('lookup').insert({
        id: x.id,
        name: x.name,
        service: x.service
      }).asCallback(() => {});
    }));

  [err] = await to(db.board.find({})
    .forEach(x => {
      postgres('board_replies').insert({
        reply: x.reply,
        in: x.in
      }).asCallback(() => {});
    }));
    
  if (err) throw err;
})();
