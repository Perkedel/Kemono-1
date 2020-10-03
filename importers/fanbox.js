const { workerData } = require('worker_threads');
const { db, failsafe } = require('../utils/db');
const request = require('request-promise');
const { to: pWrapper } = require('await-to-js');
const debug = require('../utils/debug');
const retry = require('p-retry');
const path = require('path');
const indexer = require('../init/indexer');
const { unraw } = require('unraw');
const nl2br = require('nl2br');
const checkForRequests = require('../checks/requests');
const checkForFlags = require('../checks/flags');
const downloadFile = require('../utils/download');
const Promise = require('bluebird');

const requestOptions = (key) => {
  return {
    json: true,
    headers: {
      cookie: `FANBOXSESSID=${key}`,
      origin: 'https://fanbox.cc'
    }
  };
};

const fileRequestOptions = (key) => {
  return {
    encoding: null,
    headers: {
      cookie: `FANBOXSESSID=${key}`,
      origin: 'https://fanbox.cc'
    }
  };
};

async function scraper (id, key, url = 'https://api.fanbox.cc/post.listSupporting?limit=50') {
  const log = debug('kemono:importer:fanbox:' + id);

  const [err1, fanbox] = await pWrapper(retry(() => request.get(url, requestOptions(key)), {
    onFailedAttempt: error => {
      if (error.statusCode === 401) throw error;
    }
  }));

  if (err1 && err1.statusCode === 401) {
    return log('Error: Invalid session key');
  } else if (err1 && err1.statusCode) {
    return log(`Error: Status code ${err1.statusCode} when contacting Pixiv Fanbox API.`);
  } else if (err1) {
    return log(err1);
  }
  Promise.map(fanbox.body.items, async (post) => {
    if (!post.body) return log(`Skipping ID ${post.id}: Locked`); // locked content; nothing to do
    const banExists = await db('dnp').where({ id: post.user.userId, service: 'fanbox' });
    if (banExists.length) return log(`Skipping ID ${post.id}: user ${post.user.userId} is banned`);

    await checkForFlags({
      service: 'fanbox',
      entity: 'user',
      entityId: post.user.userId,
      id: post.id
    });

    await checkForRequests({
      service: 'fanbox',
      userId: post.user.userId,
      id: post.id
    });

    const postExists = await db('booru_posts').where({ id: post.id, service: 'fanbox' });
    if (postExists.length) return;

    log(`Importing ID ${post.id}`);
    const inactivityTimer = setTimeout(() => log(`Warning: Post ${post.id} may be stalling`), 120000);

    const model = {
      id: post.id,
      user: post.user.userId,
      service: 'fanbox',
      title: unraw(post.title),
      content: nl2br(unraw(await parseBody(post.body, key, {
        id: post.id,
        user: post.user.userId
      }), true)),
      embed: {},
      shared_file: false,
      added: new Date().toISOString(),
      published: post.publishedDatetime,
      edited: null,
      file: {},
      attachments: []
    };

    const filesLocation = '/files/fanbox';
    const attachmentsLocation = '/attachments/fanbox';
    if (post.body.images) {
      await Promise.mapSeries(post.body.images, async (image, index) => {
        const location = index === 0 && !model.file.name ? filesLocation : attachmentsLocation;
        const store = index === 0 && !model.file.name ? fn => {
          model.file.name = `${image.id}.${image.extension}`;
          model.file.path = `${location}/${post.user.userId}/${post.id}/${fn}`;
        } : fn => {
          model.attachments.push({
            id: image.id,
            name: `${image.id}.${image.extension}`,
            path: `${attachmentsLocation}/${post.user.userId}/${post.id}/${fn}`
          });
        };
        await downloadFile({
          ddir: path.join(process.env.DB_ROOT, `${location}/${post.user.userId}/${post.id}`),
          name: `${image.id}.${image.extension}`
        }, Object.assign({
          url: unraw(image.originalUrl)
        }, fileRequestOptions(key)))
          .then(res => store(res.filename));
      });
    }

    if (post.body.files) {
      await Promise.mapSeries(post.body.files, async (file, index) => {
        const location = index === 0 && !model.file.name ? filesLocation : attachmentsLocation;
        const store = index === 0 && !model.file.name ? fn => {
          model.file.name = `${file.name}.${file.extension}`;
          model.file.path = `${location}/${post.user.userId}/${post.id}/${fn}`;
        } : fn => {
          model.attachments.push({
            id: file.id,
            name: `${file.name}.${file.extension}`,
            path: `${attachmentsLocation}/${post.user.userId}/${post.id}/${fn}`
          });
        };
        await downloadFile({
          ddir: path.join(process.env.DB_ROOT, `${location}/${post.user.userId}/${post.id}`),
          name: `${file.name}.${file.extension}`
        }, Object.assign({
          url: unraw(file.url)
        }, fileRequestOptions(key)))
          .then(res => store(res.filename));
      });
    }

    clearTimeout(inactivityTimer);
    log(`Finished importing ID ${post.id}`);
    await db('booru_posts').insert(model);
  }, { concurrency: 8 });

  if (fanbox.body.nextUrl) {
    scraper(id, key, fanbox.body.nextUrl);
  } else {
    log('Finished scanning posts.');
    indexer();
  }
}

async function parseBody (body, key, opts) {
  // https://github.com/Nandaka/PixivUtil2/blob/master/PixivModelFanbox.py#L213
  const bodyText = body.text || body.html || '';
  let concatenatedText = '';
  if (body.video) {
    concatenatedText += ({
      youtube: `
        <a href="https://www.youtube.com/watch?v=${body.video.videoId}" target="_blank">
          <div class="embed-view">
            <h3 class="subtitle">(YouTube)</h3>
          </div>
        </a>
        <br>
      `,
      vimeo: `
        <a href="https://vimeo.com/${body.video.videoId}" target="_blank">
          <div class="embed-view">
            <h3 class="subtitle">(Vimeo)</h3>
          </div>
        </a>
        <br>
      `,
      soundcloud: `
        <a href="https://soundcloud.com/${body.video.videoId}" target="_blank">
          <div class="embed-view">
            <h3 class="subtitle">(Soundcloud)</h3>
          </div>
        </a>
        <br>
      `
    })[body.video.serviceProvider];
  }
  if (body.blocks) {
    await Promise.mapSeries(body.blocks, async (block) => {
      switch (block.type) {
        case 'p': {
          concatenatedText += block.text ? `${unraw(block.text)}<br>` : '';
          break;
        }
        case 'image': {
          const imageInfo = body.imageMap[block.imageId];
          await downloadFile({
            ddir: path.join(process.env.DB_ROOT, '/inline/fanbox'),
            name: `${imageInfo.id}.${imageInfo.extension}`
          }, Object.assign({
            url: unraw(imageInfo.originalUrl)
          }, fileRequestOptions(key)))
            .then(res => {
              concatenatedText += `<img src="/inline/fanbox/${res.filename}"><br>`;
            });
          break;
        }
        case 'file': {
          const fileInfo = body.fileMap[block.fileId];
          await downloadFile({
            ddir: path.join(process.env.DB_ROOT, `/attachments/fanbox/${opts.user}/${opts.id}`),
            name: unraw(`${fileInfo.name || fileInfo.id}.${fileInfo.extension}`)
          }, Object.assign({
            url: unraw(fileInfo.url)
          }, fileRequestOptions(key)))
            .then(res => {
              concatenatedText += `<a href="/attachments/fanbox/${opts.user}/${opts.id}/${res.filename}" target="_blank">Download ${res.filename}</a><br>`;
            });
          break;
        }
        case 'embed': {
          const embedInfo = body.embedMap[block.embedId];
          const embed = ({
            twitter: `
              <a href="https://twitter.com/_/status/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Twitter)</h3>
                </div>
              </a>
              <br>
            `,
            youtube: `
              <a href="https://www.youtube.com/watch?v=${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(YouTube)</h3>
                </div>
              </a>
              <br>
            `,
            fanbox: `
              <a href="https://www.pixiv.net/fanbox/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Fanbox)</h3>
                </div>
              </a>
              <br>
            `,
            vimeo: `
              <a href="https://vimeo.com/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Vimeo)</h3>
                </div>
              </a>
              <br>
            `,
            google_forms: `
              <a href="https://docs.google.com/forms/d/e/${embedInfo.contentId}/viewform?usp=sf_link" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Google Forms)</h3>
                </div>
              </a>
              <br>
            `,
            soundcloud: `
              <a href="https://soundcloud.com/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Soundcloud)</h3>
                </div>
              </a>
              <br>
            `
          })[embedInfo.serviceProvider];
          concatenatedText += embed;
          break;
        }
      }
    });
  }

  return `${bodyText}<br>${concatenatedText}`;
}

debug('kemono:importer:fanbox:' + workerData.id)('Starting Pixiv Fanbox import...');
failsafe.set(workerData.id, JSON.stringify({ importer: 'fanbox', data: workerData }), 'EX', 1800);
scraper(workerData.id, workerData.key);