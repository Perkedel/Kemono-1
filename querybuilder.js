const merge = require('deepmerge');
module.exports = (str) => {
  let query = {}; // mongodb query
  const tags = str.replace(/\s\s+/g, ' ').trim().split(' ');
  for (var i = 0; i < tags.length; i++) {
    // general tags
    if (!/:/.test(tags[i])) {
      query = merge(query, {
        'tags.general': {
          $all: [tags[i].endsWith('*') ? { $regex: '^' + tags[i].slice(0, -1), $options: '' } : tags[i]]
        }
      });
      continue;
    }

    // metatags tags
    const [namespace, tag] = tags[i].split(':');
    const metatags = ['id', 'user', 'service', 'added_at', 'published_at', 'edited_at'];
    if (metatags.includes(namespace)) {
      query[namespace] = tag.endsWith('*') ? { $regex: '^' + tag.slice(0, -1), $options: '' } : tag;
      continue;
    }

    query = merge(query, {
      ['tags.' + namespace]: {
        $all: [tag.endsWith('*') ? { $regex: '^' + tag.slice(0, -1), $options: '' } : tag]
      }
    });
  }
  return query;
};