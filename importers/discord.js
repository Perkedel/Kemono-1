const { db } = require('../utils/db');
const Promise = require('bluebird');
const agentOptions = require('../utils/agent');
const cloudscraper = require('cloudscraper').defaults({ agentOptions });
const nl2br = require('nl2br');
const retry = require('p-retry');
const isImage = require('is-image');
const path = require('path');
const downloadFile = require('../utils/download');
const random = (min, max) => Math.floor(Math.random() * (max - min) + min);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const cloudscraperWithRateLimits = (url, opts) => {
  return retry(() => {
    return new Promise((resolve, reject) => {
      cloudscraper.get(url, opts)
        .then(res => resolve(res))
        .catch(async (err) => {
          if (err.statusCode === 429) await sleep(err.error.retry_after);
          return reject(err);
        });
    });
  });
};
async function scraper (key, channels) {
  const channelArray = channels.split(',');
  Promise.mapSeries(channelArray, async (channel) => {
    const channelData = await cloudscraperWithRateLimits(`https://discordapp.com/api/v6/channels/${channel}`, {
      json: true,
      simple: false,
      resolveWithFullResponse: true,
      headers: {
        authorization: key,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/0.0.305 Chrome/69.0.3497.128 Electron/4.0.8 Safari/537.36'
      }
    });
    if (channelData.statusCode !== 200) return;
    const channelExists = await db('lookup').where({ id: channelData.body.id, service: 'discord-channel' });
    if (!channelExists.length) {
      await db('lookup').insert({
        id: channelData.body.id,
        name: channelData.body.name,
        service: 'discord-channel'
      });
    }

    const serverData = await cloudscraperWithRateLimits(`https://discordapp.com/api/v6/guilds/${channelData.body.guild_id}`, {
      json: true,
      simple: false,
      resolveWithFullResponse: true,
      headers: {
        authorization: key,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/0.0.305 Chrome/69.0.3497.128 Electron/4.0.8 Safari/537.36'
      }
    });
    const indexExists = await db('lookup').where({ id: serverData.body.id, service: 'discord' });
    if (!indexExists.length) {
      await db('lookup').insert({
        id: serverData.body.id,
        name: serverData.body.name,
        service: 'discord'
      });
    }

    processChannel(channelData.body.id, serverData.body.id, key);
  });
}

async function processChannel (id, server, key, before) {
  const messages = await cloudscraperWithRateLimits(`https://discord.com/api/v6/channels/${id}/messages?limit=50${before ? '&before=' + before : ''}`, {
    json: true,
    headers: {
      authorization: key
    }
  });
  let lastMessageId = '';
  await Promise.mapSeries(messages, async (msg, i, len) => {
    if (i === len - 1) lastMessageId = msg.id;
    const attachmentsKey = `attachments/discord/${server}/${msg.channel_id}/${msg.id}`;
    const existing = await db('discord_posts').where({ id: msg.id });
    if (existing.length) return;
    const model = {
      id: msg.id,
      author: msg.author,
      server: server,
      channel: id,
      content: nl2br(msg.content),
      published: msg.timestamp,
      edited: msg.edited_timestamp,
      embeds: [],
      mentions: msg.mentions,
      attachments: []
    };

    await Promise.map(msg.embeds, async (embed) => model.embeds.push(embed));
    await Promise.map(msg.attachments, async (attachment) => {
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, attachmentsKey),
        name: attachment.filename
      }, {
        url: attachment.url || attachment.proxy_url
      });

      model.attachments.push({
        isImage: isImage(attachment.filename),
        name: attachment.filename,
        path: `/${attachmentsKey}/${attachment.filename}`
      });
    });

    db('discord_posts').insert(model);
  });

  if (messages.length === 50) {
    await sleep(random(500, 1250));
    processChannel(id, server, key, lastMessageId);
  }
}

module.exports = data => scraper(data.key, data.channels);
