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
  let regtags = [];
  let where = [];
  let whereBindings = [];
  tags.map(tag => {
    if (!/:/.test(tag)) return regtags.push(tag);
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
    if (!metatags.includes(namespace.replace('-', ''))) return;
    let not = namespace.startsWith('-');
    let wildcard = nametag.endsWith('*');
    if (not && wildcard) {
      where.push(`NOT ${namespace.replace('-', '')} ILIKE '?'`);
      whereBindings.push(nametag.replace('*', '%'))
    } else if (!not && wildcard) {
      where.push(`${namespace.replace('-', '')} ILIKE '?'`);
      whereBindings.push(nametag.replace('*', '%'))
    } else if (not && !wildcard) {
      where.push(`NOT ${namespace.replace('-', '')} = '?'`);
      whereBindings.push(nametag);
    } else {
      where.push(`${namespace.replace('-', '')} = '?'`);
      whereBindings.push(nametag);
    }
  });
  query.whereRaw(where.join(' and '), whereBindings);
  if (regtags.length) query.andWhereRaw('to_tsvector(tags) @@ websearch_to_tsquery(?)', [regtags.join(' ')])
  return query;
}

module.exports = { booruQueryFromString };