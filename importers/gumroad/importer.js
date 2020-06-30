const { posts, bans } = require('../../db');
const scrapeIt = require('scrape-it');
const Promise = require('bluebird');
const fs = require('fs-extra');
const crypto = require('crypto');
const request = require('request');
const request2 = require('request').defaults({ encoding: null });
const { slugify } = require('transliteration');
const indexer = require('../../indexer');
const { URL } = require('url');
const checkForFlags = require('../../flagcheck');
const cloudscraper = require('cloudscraper');
const proxy = require('../../proxy');
const retry = require('p-retry');
const apiOptions = key => {
  return {
    json: true,
    headers: {
      cookie: `_gumroad_session=${key}`
    }
  };
};
const scrapeOptions = key => {
  return {
    headers: {
      cookie: `_gumroad_session=${key}`
    }
  };
};

async function scraper (key) {
  const gumroad = await proxy('https://gumroad.com/discover_search?from=1&user_purchases_only=true', apiOptions(key), cloudscraper);
  if (gumroad.total > 500000) return; // not logged in
  const data = await scrapeIt.scrapeHTML(gumroad.products_html, {
    products: {
      listItem: '.product-card',
      data: {
        id: {
          attr: 'data-permalink'
        },
        title: '.description-container h1 strong',
        userHref: {
          selector: '.description-container .js-creator-profile-link',
          attr: 'href'
        },
        previews: {
          selector: '.preview-container',
          attr: 'data-asset-previews',
          convert: x => JSON.parse(x)
        }
      }
    }
  });
  await Promise.map(data.products, async (product) => {
    const userId = new URL(product.userHref).pathname.replace('/', '');
    const banExists = await bans.findOne({ id: userId, service: 'gumroad' });
    if (banExists) return;
    await checkForFlags({
      service: 'gumroad',
      entity: 'user',
      entityId: userId,
      id: product.id
    });
    const postExists = await posts.findOne({ id: product.id, service: 'gumroad' });
    if (postExists) return;

    const model = {
      version: 2,
      service: 'gumroad',
      title: product.title,
      content: '',
      id: product.id,
      user: userId,
      post_type: 'image',
      added_at: new Date().getTime(),
      published_at: '',
      post_file: {},
      attachments: []
    };
    const productInfo = await proxy(`https://gumroad.com/links/${product.id}/user_info?fetch_purchase=true`, apiOptions(key), cloudscraper);
    const downloadPage = await proxy(productInfo.purchase.content_url, scrapeOptions(key), cloudscraper);
    const downloadData = await scrapeIt.scrapeHTML(downloadPage, {
      thumbnail: {
        selector: '.image-preview-container img',
        attr: 'src'
      },
      data: {
        selector: 'div[data-react-class="DownloadPage/FileList"]',
        attr: 'data-react-props',
        convert: x => {
          try {
            return JSON.parse(x);
          } catch (err) {
            return {
              files: [],
              download_info: {}
            };
          }
        }
      }
    });

    if (downloadData.thumbnail) {
      const urlBits = new URL(downloadData.thumbnail).pathname.split('/');
      const filename = urlBits[urlBits.length - 1].replace(/%20/g, '_');
      await fs.ensureFile(`${process.env.DB_ROOT}/files/gumroad/${userId}/${product.id}/${filename}`);
      await retry(() => {
        return new Promise((resolve, reject) => {
          request.get({ url: downloadData.thumbnail, encoding: null })
            .on('complete', () => resolve())
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/files/gumroad/${userId}/${product.id}/${filename}`));
        });
      });

      model.post_file.name = filename;
      model.post_file.path = `/files/gumroad/${userId}/${product.id}/${filename}`;
    }

    await Promise.map(downloadData.data.files, async (file) => {
      const randomKey = crypto.randomBytes(20).toString('hex');
      await fs.ensureFile(`${process.env.DB_ROOT}/attachments/gumroad/${userId}/${product.id}/${randomKey}`);
      await retry(() => {
        return new Promise((resolve, reject) => {
          request2
            .get('https://gumroad.com' + downloadData.data.download_info[file.id].download_url, scrapeOptions(key))
            .on('complete', async () => {
              const ext = file.extension.toLowerCase();
              const filename = slugify(file.file_name, { lowercase: false });
              model.attachments.push({
                name: `${filename}.${ext}`,
                path: `/attachments/gumroad/${userId}/${product.id}/${filename}.${ext}`
              });
              await fs.move(
                `${process.env.DB_ROOT}/attachments/gumroad/${userId}/${product.id}/${randomKey}`,
                `${process.env.DB_ROOT}/attachments/gumroad/${userId}/${product.id}/${filename}.${ext}`
              );
              resolve();
            })
            .on('error', err => reject(err))
            .pipe(fs.createWriteStream(`${process.env.DB_ROOT}/attachments/gumroad/${userId}/${product.id}/${randomKey}`));
        });
      });
    });

    posts.insertOne(model);
  });

  indexer();
}

module.exports = data => scraper(data);
