const Promise = require('bluebird');
const webpush = require('web-push');
const { db } = require('../utils/db');
const path = require('path');
/**
 * Checks for reimport flags and purges the database entries and files if found.
 * Intended to allow corrections for broken/corrupted files or incomplete data.
 * @constructor
 * @param {Object} data
 * @param {String} data.service - The service being checked.
 * @param {String} data.userId - The user ID being checked.
 * @param {String} data.id - The ID of the post being checked
 */
module.exports = async (data) => {
  await db.transaction(async trx => {
    const requests = await trx('requests')
      .where({ user: data.userId, service: data.service })
      .where({ status: 'open' });
    if (!requests.length) return;
    if (requests[0].post_id && requests[0].post_id !== data.id) return;
    await trx('requests')
      .where({ user: data.userId })
      .update({ status: 'fulfilled' });
    const subscriptions = await trx('request_subscriptions').where({ request_id: requests[0].id });
    await Promise.map(subscriptions, async subscription => {
      const payload = JSON.stringify({
        title: `Request #${requests[0].id} fulfilled`,
        body: 'Click to view the requested user/post.',
        url: path.join('/', data.service, 'user', data.userId, requests[0].post_id ? `post/${requests[0].post_id}` : '')
      });
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }, payload).catch(() => {});
    });
    await trx('request_subscriptions')
      .where({ request_id: requests[0].id })
      .del();
  });
};
