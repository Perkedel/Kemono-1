const { db, queue } = require('./db');
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
  const flagExists = await queue.add(() => db('booru_flags').where({ id: data.id, user: data.entityId, service: data.service }));
  if (!flagExists.length) return;

  await queue.add(() => {
    return db('booru_flags')
      .where({ id: data.id, user: data.entityId, service: data.service })
      .del();
  })
  await queue.add(() => {
    return db('booru_posts')
      .where({ id: data.id, user: data.entityId, service: data.service })
      .del();
  })
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
