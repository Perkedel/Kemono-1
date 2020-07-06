const { slugify } = require('transliteration');
const { posts, bans } = require('../../db');
const request = require('request-promise');
const path = require('path');
const { unraw } = require('unraw');
const nl2br = require('nl2br');
const checkForFlags = require('../../flagcheck');
const downloadFile = require('../../download');
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

async function scraper (key) {
  const fanboxIndex = await request.get('https://api.fanbox.cc/plan.listSupporting', requestOptions(key));
  Promise.map(fanboxIndex.body, async (artist) => {
    processFanbox(`https://api.fanbox.cc/post.listCreator?userId=${artist.user.userId}&limit=100`, key);
  });
}

async function processFanbox (url, key) {
  const data = await request.get(unraw(url), requestOptions(key));
  await Promise.mapSeries(data.body.items, async (post) => {
    if (!post.body) return; // locked content; nothing to do
    const banExists = await bans.findOne({ id: post.user.userId, service: 'fanbox' });
    if (banExists) return;

    await checkForFlags({
      service: 'fanbox',
      entity: 'user',
      entityId: post.user.userId,
      id: post.id
    });
    const postModel = {
      version: 2,
      service: 'fanbox',
      title: unraw(post.title),
      content: nl2br(unraw(post.body.text || await concatenateArticle(post.body, key), true)),
      id: post.id,
      user: post.user.userId,
      post_type: post.type, // image, article, embed (undocumented) or file
      published_at: post.publishedDatetime,
      added_at: new Date().getTime(),
      embed: {},
      post_file: {},
      attachments: []
    };

    const postExists = await posts.findOne({ id: post.id, service: 'fanbox' });
    if (postExists) return;

    const filesLocation = '/files/fanbox';
    const attachmentsLocation = '/attachments/fanbox';
    if (post.body.images) {
      await Promise.mapSeries(post.body.images, async (image, index) => {
        const location = index === 0 && !postModel.post_file.name ? filesLocation : attachmentsLocation;
        const store = index === 0 && !postModel.post_file.name ? fn => {
          postModel.post_file.name = `${image.id}.${image.extension}`;
          postModel.post_file.path = `${location}/${post.user.userId}/${post.id}/${fn}`;
        } : fn => {
          postModel.attachments.push({
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
        const location = index === 0 && !postModel.post_file.name ? filesLocation : attachmentsLocation;
        const store = index === 0 && !postModel.post_file.name ? fn => {
          postModel.post_file.name = `${file.name}.${file.extension}`;
          postModel.post_file.path = `${location}/${post.user.userId}/${post.id}/${fn}`;
        } : fn => {
          postModel.attachments.push({
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

    await posts.insertOne(postModel);
  });

  if (data.body.nextUrl) {
    processFanbox(data.body.nextUrl, key);
  }
}

async function concatenateArticle (body, key) {
  let concatenatedString = '<p>';
  await Promise.mapSeries(body.blocks, async (block) => {
    if (block.type === 'image') {
      const imageInfo = body.imageMap[block.imageId];
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, '/inline/fanbox'),
        name: `${imageInfo.id}.${imageInfo.extension}`
      }, Object.assign({
        url: unraw(imageInfo.originalUrl)
      }, fileRequestOptions(key)))
        .then(res => {
          concatenatedString += `<img src="/inline/fanbox/${res.filename}"><br>`;
        });
      concatenatedString += `<img src="/inline/fanbox/${slugify(imageInfo.id, { lowercase: false })}.${imageInfo.extension}"><br>`;
    } else if (block.type === 'p') {
      concatenatedString += `${unraw(block.text)}<br>`;
    }
  }).catch(() => {});
  concatenatedString += '</p>';
  return concatenatedString;
}

module.exports = data => scraper(data);
