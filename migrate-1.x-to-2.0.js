const MongoClient = require('mongodb').MongoClient;
const { default: pq } = require('p-queue');
const queue = new pq({concurrency: 10});
(async () => {
  // const mongo = require('mongo-lazy-connect')(process.argv[2], { useUnifiedTopology: true });
  const mongo = await MongoClient.connect(process.argv[2]).catch(err => console.error(err));
  const database = mongo.db();
  const postgres = require('knex')({
    client: 'pg',
    connection: {
      user: 'nano',
      password: 'shinonome',
      database: 'kemonodb',
      host: 'localhost'
    },
    pool: { min: 2, max: 99 }
  });
  const db = {
    posts: database.collection('posts'),
    lookup: database.collection('lookup'),
    flags: database.collection('flags'),
    bans: database.collection('bans'),
    board: database.collection('board')
  };

  await db.posts.find({
    service: { $ne: 'discord' }
  })
    .forEach(x => {
      queue.add(async () => {
        const rows = await postgres('booru_posts').where({
          id: x.id,
          user: x.user,
          service: x.service || 'patreon',
          title: x.title || '',
          content: x.content || '',
          embed: x.embed || {},
          shared_file: x.shared_file || false,
          added: new Date(x.added_at).toISOString(),
          published: x.published_at ? new Date(x.published_at).toISOString() : null,
          edited: x.edited_at || null,
          file: x.post_file || {},
          attachments: x.attachments || []
        })
        if (rows.length) return;
        postgres('booru_posts').insert({
          id: x.id,
          user: x.user,
          service: x.service || 'patreon',
          title: x.title || '',
          content: x.content || '',
          embed: x.embed || {},
          shared_file: x.shared_file || false,
          added: new Date(x.added_at).toISOString(),
          published: x.published_at ? new Date(x.published_at).toISOString() : null,
          edited: x.edited_at || null,
          file: x.post_file || {},
          attachments: x.attachments || []
        }).asCallback(() => {})
      })
    })

  await db.bans.find({})
    .forEach(x => {
      queue.add(async () => {
        await postgres('dnp').insert({
          id: x.id,
          service: x.service
        })
      })
    })

  await db.posts.find({ service: 'discord' })
    .forEach(x => {
      queue.add(async () => {
        await postgres('discord_posts').insert({
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
        })
      })
    })

  await db.flags.find({})
    .forEach(x => {
      queue.add(async () => {
        await postgres('booru_flags').insert({
          id: x.id,
          user: x.user,
          service: x.service
        })
      })
    });

  await db.lookup.find({})
    .forEach(x => {
      queue.add(async () => {
        await postgres('lookup').insert({
          id: x.id,
          name: x.name,
          service: x.service
        })
      })
    });

  await db.board.find({})
    .forEach(x => {
      queue.add(async () => {
        await postgres('board_replies').insert({
          reply: x.reply,
          in: x.in
        })
      })
    });

})();
