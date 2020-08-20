const { flags, posts } = require('./db');
const path = require('path');
const fs = require('fs-extra');
/**
 * Checks for reimport flags and purges the database entries and files if found.
 * Intended to allow corrections for broken/corrupted files or incomplete data.
 * @constructor
 * @param {Object} data
 * @param {String} data.service - The service being checked.
 * @param {String} data.entity - The type of entity the post belongs to (user, server)
 * @param {String} data.entityId - The ID of entity the post belongs to
 * @param {String} data.id - The ID of the post being checked
 */
module.exports = async (data) => {
  const query = { id: data.id, service: data.service };
  query[data.entity] = data.entityId;
  const flagExists = await flags.findOne(query);
  if (!flagExists) return;

  await flags.deleteOne(query);
  const postQuery = { id: data.id };
  postQuery[data.entity] = data.entityId;
  if (data.service === 'patreon') {
    postQuery.$or = [
      { service: 'patreon' },
      { service: { $exists: false } }
    ];
  } else {
    postQuery.service = data.service;
  }
  await posts.deleteMany(postQuery);
  await fs.remove(path.join(
    process.env.DB_ROOT,
    'attachments',
    data.service === 'patreon' ? '' : data.service,
    data.entityId,
    data.id
  ));
  await fs.remove(path.join(
    process.env.DB_ROOT,
    'files',
    data.service === 'patreon' ? '' : data.service,
    data.entityId,
    data.id
  ));
};
