const { to } = require('await-to-js');
const Promise = require('bluebird');

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

  const allPosts = await db.posts.find({
    service: { $ne: 'discord' }
  }).toArray();
  Promise.map(allPosts, x => {
    postgres('booru_posts').where({
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
    }).asCallback((err, rows) => {
      if (err) return console.error(err);
      if (!rows.length) return;
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
    })
  });

  const allBans = await db.bans.find({}).toArray();
  Promise.map(allBans, x => {
    postgres('dnp').where({
      id: x.id,
      service: x.service
    }).asCallback((err, rows) => {
      if (err) return console.error(err);
      if (!rows.length) return;
      postgres('dnp').insert({
        id: x.id,
        service: x.service
      }).asCallback(() => {});
    })
  });

  const allDiscord = await db.posts.find({ service: 'discord' }).toArray();
  Promise.map(allDiscord, x => {
    postgres('discord_posts').where({
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
    }).asCallback((err, rows) => {
      if (err) return console.error(err);
      if (!rows.length) return;
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
    });
  })

  const allFlags = await db.flags.find({}).toArray();
  Promise.map(allFlags, x => {
    postgres('booru_flags').where({
      id: x.id,
      user: x.user,
      service: x.service
    }).asCallback((err, rows) => {
      if (err) return console.error(err);
      if (!rows.length) return;
      postgres('booru_flags').insert({
        id: x.id,
        user: x.user,
        service: x.service
      }).asCallback(() => {});
    });
  })

  const allLookup = await db.lookup.find({}).toArray();
  Promise.map(allLookup, x => {
    postgres('lookup').where({
      id: x.id,
      name: x.name,
      service: x.service
    }).asCallback((err, rows) => {
      if (err) return console.error(err);
      if (!rows.length) return;
      postgres('lookup').insert({
        id: x.id,
        name: x.name,
        service: x.service
      }).asCallback(() => {});
    });
  })

  const allBoard = await db.board.find({}).toArray();
  Promise.map(allBoard, x => {
    postgres('board_replies').where({
      reply: x.reply,
      in: x.in
    }).asCallback((err, rows) => {
      if (err) return console.error(err);
      if (!rows.length) return;
      postgres('board_replies').insert({
        reply: x.reply,
        in: x.in
      }).asCallback(() => {});
    });
  })
})();
