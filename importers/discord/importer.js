const { posts, lookup } = require('../../db');
const Promise = require('bluebird');
const cloudscraper = require('cloudscraper');
const request = require('request').defaults({ encoding: null });
const fs = require('fs-extra');
const nl2br = require('nl2br');
const retry = require('p-retry');
const isImage = require('is-image');
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
        })
    })
  })
}
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
    const channelExists = await lookup.findOne({ id: channelData.body.id, service: 'discord-channel' });
    if (!channelExists) {
      await lookup.insertOne({
        version: 3,
        service: 'discord-channel',
        name: channelData.body.name,
        topic: channelData.body.topic,
        id: channelData.body.id,
        server: channelData.body.guild_id
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
    const indexExists = await lookup.findOne({ id: serverData.body.id, service: 'discord' });
    if (!indexExists) {
      await lookup.insertOne({
        version: 3,
        service: 'discord',
        id: serverData.body.id,
        name: serverData.body.name,
        icon: serverData.body.icon
      });
    }

    processChannel(channelData.body.id, serverData.body.id, key);
  })
}

async function processChannel(id, server, key, before) {
  const messages = await cloudscraperWithRateLimits(`https://discord.com/api/v6/channels/${id}/messages?limit=50${before ? '&before=' + before : ''}`, {
    json: true,
    headers: {
      authorization: key
    }
  })
  let lastMessageId = '';
  await Promise.mapSeries(messages, async (msg, i, len) => {
    if (i === len - 1) lastMessageId = msg.id;
    const attachmentsKey = `attachments/discord/${server}/${msg.channel_id}/${msg.id}`;
    const existing = await posts.findOne({ id: msg.id, service: 'discord' });
    if (existing) return;
    const model = {
      version: 3,
      service: 'discord',
      content: nl2br(msg.content),
      id: msg.id,
      author: msg.author,
      user: server,
      channel: id,
      published_at: msg.timestamp,
      edited_at: msg.edited_timestamp,
      added_at: new Date().getTime(),
      mentions: msg.mentions,
      embeds: [],
      attachments: []
    };

    await Promise.map(msg.embeds, async (embed) => model.embeds.push(embed));
    await Promise.map(msg.attachments, async (attachment) => {
      await fs.ensureFile(`${process.env.DB_ROOT}/${attachmentsKey}/${attachment.filename}`);
      await retry(() => {
        return new Promise((resolve, reject) => {
          request.get({ url: attachment.proxy_url, encoding: null })
            .on('complete', () => resolve())
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/${attachmentsKey}/${attachment.filename}`));
        });
      })
      model.attachments.push({
        isImage: isImage(attachment.filename),
        name: attachment.filename,
        path: `/${attachmentsKey}/${attachment.filename}`
      });
    });

    await posts.insertOne(model);
  });

  if (messages.length === 50) {
    await sleep(random(500, 1250));
    processChannel(id, server, key, lastMessageId)
  }
}

module.exports = data => scraper(data.key, data.channels);
