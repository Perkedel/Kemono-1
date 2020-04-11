const Datastore = require('nedb-promise');
const db = new Datastore({ filename: 'test.db' });
const cloudscraper = require('cloudscraper').defaults({ onCaptcha: require('./captcha')() });
const cd = require('content-disposition');
const Promise = require('bluebird');
const request = require('request-promise');
const fs = require('fs-extra');
const isImage = require('is-image');
const mime = require('mime');
const getUrls = require('get-urls');
const sanitizePostContent = async (content) => {
  let contentToSanitize = content;
  const urls = getUrls(contentToSanitize, {
    sortQueryParameters: false,
    stripWWW: false
  });
  await Promise.map(urls, async (val) => {
    const url = new URL(val);
    if (isImage(url.origin + url.pathname)) {
      const imageMime = mime.getType(url.origin + url.pathname);
      const filename = new Date().getTime() + '.' + mime.getExtension(imageMime);
      const data = await request.get({ url: val, encoding: 'binary' });
      fs.outputFile(`${__dirname}/downloads/inline/${filename}`, data, 'binary');
      contentToSanitize = contentToSanitize.replace(val, `https://kemono.party/inline/${filename}`);
    }
  });
  return contentToSanitize;
};
let counter = 0;
async function scraper (key, uri = 'https://api.patreon.com/stream?json-api-version=1.0') {
  const options = cloudscraper.defaultParams;
  options.headers.cookie = `session_id=${key}`;
  options.resolveWithFullResponse = true;
  options.json = true;

  const patreon = await cloudscraper.get(uri, options);
  await patreon.body.data.map(async (post) => {
    const attr = post.attributes;
    const rel = post.relationships;
    const fileKey = `files/${rel.user.data.id}/${post.id}`;
    const attachmentsKey = `attachments/${rel.user.data.id}/${post.id}`;

    const postDb = {
      version: 1,
      title: attr.title,
      content: await sanitizePostContent(attr.content),
      id: post.id,
      user: rel.user.data.id,
      post_type: attr.post_type,
      published_at: attr.published_at,
      added_at: new Date().getTime(),
      embed: {},
      post_file: {},
      attachments: []
    };

    await db.loadDatabase();
    const postExists = await db.findOne({ id: post.id });
    if (postExists) return;

    if (attr.post_file) {
      const fileData = await request.get({ url: attr.post_file.url, encoding: 'binary' });
      await fs.outputFile(`${__dirname}/downloads/${fileKey}/${attr.post_file.name}`, fileData, 'binary');
      postDb.post_file.name = attr.post_file.name;
      postDb.post_file.path = `${__dirname}/downloads/${fileKey}/${attr.post_file.name}`;
    }

    if (attr.embed) {
      postDb.embed.subject = attr.embed.subject;
      postDb.embed.description = attr.embed.description;
      postDb.embed.url = attr.embed.url;
    }

    Promise
      .map(rel.attachments.data, async (attachment) => {
        // use content disposition
        const attachmentOptions = options;
        attachmentOptions.encoding = 'binary';

        const attachmentData = await cloudscraper.get(`https://www.patreon.com/file?h=${post.id}&i=${attachment.id}`, attachmentOptions);
        const info = cd.parse(attachmentData.headers['content-disposition']);
        await fs.outputFile(`${__dirname}/downloads/${attachmentsKey}/${info.parameters.filename}`, attachmentData.body, 'binary');
        postDb.attachments.push({
          id: attachment.id,
          name: info.parameters.filename,
          path: `${__dirname}/downloads/${attachmentsKey}/${info.parameters.filename}`
        });
      })
      .then(() => db.insert(postDb));
  });

  // change value here to limit the amount of pages scraped
  if (patreon.body.links.next && counter != 0) {
    counter += 1;
    scraper(key, 'https://' + patreon.body.links.next);
  }
}

scraper(process.argv[2]);
