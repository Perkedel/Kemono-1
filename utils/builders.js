const { db } = require('./db');
const splitWithoutTruncation = (string, separator, n) => {
  var split = string.split(separator);
  if (split.length <= n)
      return split;
  var out = split.slice(0,n-1);
  out.push(split.slice(n-1).join(separator));
  return out;
}
const booruQueryFromString = str => {
  let query = db('booru_posts');
  let tags = str.replace(/\s\s+/g, ' ').trim().split(' ');
  let where = [];
  let whereBindings = [];
  console.log(tags)
  tags.map(tag => {
    if (!/:/.test(tag)) return console.log('aaaa ' + tag);
    tags.splice(tags.indexOf(tag), 1);
    console.log(tags)
    const [namespace, nametag] = splitWithoutTruncation(tag, ':', 2);
    const metatags = [
      'id',
      'user',
      'service',
      'added',
      'published',
      'edited',
      'rating'
    ];
    if (!metatags.includes(namespace.replace('-', ''))) return console.log('aaaa ' + tag);
    let not = namespace.startsWith('-');
    let wildcard = nametag.endsWith('*');
    if (not && wildcard) {
      where.push(`NOT ${namespace.replace('-', '')} ILIKE '?'`);
      whereBindings.push(nametag + '%')
    } else if (!not && wildcard) {
      where.push(`${namespace.replace('-', '')} ILIKE '?'`);
      whereBindings.push(nametag + '%')
    } else if (not && !wildcard) {
      where.push(`NOT ${namespace.replace('-', '')} = '?'`);
      whereBindings.push(nametag);
    } else {
      where.push(`${namespace.replace('-', '')} = '?'`);
      whereBindings.push(nametag);
    }
  });
  query.whereRaw(where.join(' AND '), whereBindings);
  if (tags.length) query.andWhereRaw('to_tsvector(tags) @@ websearch_to_tsquery(?)', [tags.join(' ')])
  return query;
}

module.exports = { booruQueryFromString };