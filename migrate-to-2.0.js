const MongoClient = require('mongodb').MongoClient;
(async () => {
  const mongoConn = await MongoClient.connect(process.argv[2]).catch(err => console.error(err));
  const mongoDatabase = mongoConn.db();
  const mongo = {
    posts: mongoDatabase.collection('posts'),
    lookup: mongoDatabase.collection('lookup'),
    flags: mongoDatabase.collection('flags'),
    bans: mongoDatabase.collection('bans'),
    board: mongoDatabase.collection('board')
  };
  const postgres = require('knex')({
    client: 'pg',
    connection: {
      user: process.env.PGUSER || 'nano',
      password: process.env.PGPASSWORD || 'shinonome',
      database: process.env.PGDATABASE || 'kemonodb',
      host: process.env.PGHOST || 'localhost'
    }
  });

  await postgres.transaction(async trx => {
    await mongo.posts.find({
      service: { $ne: 'discord' }
    })
      .forEach(x => {
        trx('booru_posts').insert({
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
        }).asCallback(() => {});
      });

    await mongo.bans.find({})
      .forEach(x => {
        trx('dnp').insert({
          id: x.id,
          service: x.service
        }).asCallback(() => {});
      });

    await mongo.posts.find({ service: 'discord' })
      .forEach(x => {
        trx('discord_posts').insert({
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

    await mongo.flags.find({})
      .forEach(x => {
        trx('booru_flags').insert({
          id: x.id,
          user: x.user,
          service: x.service
        }).asCallback(() => {});
      });

    await mongo.lookup.find({})
      .forEach(x => {
        trx('lookup').insert({
          id: x.id,
          name: x.name,
          service: x.service
        }).asCallback(() => {});
      });

    await mongo.board.find({})
      .forEach(x => {
        trx('board_replies').insert({
          reply: x.reply,
          in: x.in
        }).asCallback(() => {});
      });
  });
})();
