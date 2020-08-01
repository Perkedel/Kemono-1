const merge = require('deepmerge');
const esc = require('escape-string-regexp');
module.exports = (str) => {
  let query = {}; // mongodb query
  const tags = str.replace(/\s\s+/g, ' ').trim().split(' ');
  for (var i = 0; i < tags.length; i++) {
    // TODO: Add negative queries
    // general tags
    if (!/:/.test(tags[i])) {
      query = merge(query, {
        'tags.general': {
          $all: [tags[i].endsWith('*') ? { $regex: '^' + esc(tags[i].slice(0, -1).replace(/_/, ' ')) } : tags[i].replace(/_/, ' ')]
        }
      });
      continue;
    }

    // metatags tags
    const [namespace, pretag] = tags[i].split(':');
    const tag = pretag.endsWith('*') ? { $regex: '^' + esc(pretag.slice(0, -1).replace(/_/, ' ')) } : pretag.replace(/_/, ' ')
    const metatags = ['id', 'user', 'service', 'added_at', 'published_at', 'edited_at'];
    if (metatags.includes(namespace)) {
      query[namespace] = tag;
      continue;
    }

    query = merge(query, {
      ['tags.' + namespace]: {
        $all: [tag]
      }
    });
  }
  return query;
};