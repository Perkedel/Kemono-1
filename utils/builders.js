const merge = require('deepmerge');
const esc = require('escape-string-regexp');
const splitWithoutTruncation = (string, separator, n) => {
  var split = string.split(separator);
  if (split.length <= n) { return split; }
  var out = split.slice(0, n - 1);
  out.push(split.slice(n - 1).join(separator));
  return out;
};
const buildBooruQueryFromString = (str) => {
  let query = {}; // mongodb query
  const tags = str.replace(/\s\s+/g, ' ').trim().split(' ');
  for (var i = 0; i < tags.length; i++) {
    // general tags
    if (!/:/.test(tags[i]) && tags[i].startsWith('-')) {
      query = merge(query, {
        'tags.general': {
          $nin: [tags[i].endsWith('*') ? {
            $regex: '^' + esc(tags[i].slice(0, -1).replace('-', '').replace(/_/g, ' '))
          } : tags[i].replace('-', '').replace(/_/g, ' ')]
        }
      });
      continue;
    } else if (!/:/.test(tags[i])) {
      query = merge(query, {
        'tags.general': {
          $all: [tags[i].endsWith('*') ? {
            $regex: '^' + esc(tags[i].slice(0, -1).replace(/_/g, ' '))
          } : tags[i].replace(/_/g, ' ')]
        }
      });
      continue;
    }

    // metatags tags
    const [namespace, pretag] = splitWithoutTruncation(tags[i], ':', 2);
    const tag = pretag.endsWith('*') ? {
      $regex: '^' + esc(pretag.slice(0, -1).replace(/_/g, ' '))
    } : pretag.replace(/_/g, ' ');
    const metatags = [
      'id',
      'user',
      'service',
      'added',
      'published',
      'edited',
      'rating'
    ];
    if (metatags.includes(namespace.replace('-', '')) && namespace.startsWith('-')) {
      query[namespace.replace('-', '')] = { $ne: tag };
      continue;
    } else if (metatags.includes(namespace)) {
      query[namespace] = tag;
      continue;
    }

    const namespaces = [
      'artist',
      'character',
      'copyright',
      'meta'
    ];
    if (namespaces.includes(namespace.replace('-', '')) && namespace.startsWith('-')) {
      query = merge(query, {
        ['tags.' + namespace.replace('-', '')]: {
          $nin: [tag]
        }
      });
      continue;
    } else if (namespaces.includes(namespace)) {
      query = merge(query, {
        ['tags.' + namespace]: {
          $all: [tag]
        }
      });
    }
  }
  return query;
};

const stringifyBooruObject = obj => {
  let tags = '';
  obj.artist.map(tag => (tags += `artist:${tag.replace(/ +/g, '_')} `));
  obj.character.map(tag => (tags += `character:${tag.replace(/ +/g, '_')} `));
  obj.copyright.map(tag => (tags += `copyright:${tag.replace(/ +/g, '_')} `));
  obj.meta.map(tag => (tags += `meta:${tag.replace(/ +/g, '_')} `));
  obj.general.map(tag => (tags += `${tag.replace(/ +/g, '_')} `));
  return tags.trim();
};

const parseBooruString = (str) => {
  const obj = {
    artist: [],
    character: [],
    copyright: [],
    meta: [],
    general: []
  };
  const tags = str.replace(/\s\s+/g, ' ').trim().split(' ');
  for (var i = 0; i < tags.length; i++) {
    // general tags
    if (!/:/.test(tags[i])) {
      obj.general.push(tags[i].replace(/_/g, ' '));
      continue;
    }

    const [namespace, tag] = splitWithoutTruncation(tags[i], ':', 2);
    const namespaces = [
      'artist',
      'character',
      'copyright',
      'meta'
    ];
    if (namespaces.includes(namespace)) {
      obj[namespace].push(tag.replace(/_/g, ' '));
    }
  }
  return obj;
};

module.exports = {
  buildBooruQueryFromString,
  stringifyBooruObject,
  parseBooruString
};
