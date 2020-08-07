const { posts, discord } = require('../utils/db');
const { to } = require('await-to-js')
module.exports = async () => {
  // v1.x -> v2.0
  // Introduces booru schema. Discord archives are moved to new collection to keep semantics separate.

  // silence mongo-lazy-connect errors
  await to(posts.find({
    service: { $ne: 'discord' }
  })
    .forEach(x => {
      posts.replaceOne({
        _id: x._id
      }, {
        _id: x._id,
        // metadata
        id: x.id,
        user: x.user,
        service: x.service || 'patreon',
        title: x.title || '',
        content: x.content || '',
        embed: x.embed || {},
        rating: x.rating || 'explicit',
        shared_file: x.shared_file || false,
        // dates
        added: new Date(x.added_at || x.added).toISOString(),
        published: x.published_at || x.published || null,
        edited: x.edited_at || x.edited || null,
        // files
        file: x.post_file || x.file || {},
        attachments: x.attachments || [],
        // tags
        tags: x.tags || {
          artist: [],
	        character: [],
	        copyright: [],
	        meta: ['tagme'],
	        general: []
        }
      });
    }));

  await to(posts.find({ service: 'discord' })
    .forEach(x => {
      posts.deleteOne({ _id: x._id });
      discord.save(x);
    }));
}