const agentOptions = require('../utils/agent');
const cloudscraper = require('cloudscraper').defaults({ agentOptions });
const retry = require('p-retry');
const { to: pWrapper } = require('await-to-js');
const debug = require('../utils/debug');
const { db, failsafe } = require('../utils/db');
const scrapeIt = require('scrape-it');
const path = require('path');
const checkForRequests = require('../checks/requests');
const checkForFlags = require('../checks/flags');
const downloadFile = require('../utils/download');
const Promise = require('bluebird');
const { URL } = require('url');
const indexer = require('../init/indexer');

const { default: pq } = require('p-queue');
const queue = new pq({ concurrency: 10 });

const apiOptions = key => {
  return {
    json: true,
    headers: {
      cookie: `_gumroad_app_session=${key}`
    }
  };
};
const scrapeOptions = key => {
  return {
    headers: {
      cookie: `_gumroad_app_session=${key}`
    }
  };
};

async function scraper (id, key, from = 1) {
  const log = debug('kemono:importer:status:' + id);

  const [err1, gumroad] = await pWrapper(retry(() => cloudscraper.get(`https://gumroad.com/discover_search?from=${from}&user_purchases_only=true`, apiOptions(key))));

  if (err1 && err1.statusCode) {
    return log(`Error: Status code ${err1.statusCode} when contacting Gumroad API.`);
  } else if (err1) {
    return log(err1);
  }

  if (gumroad.total > 100000) return log('Error: Can\'t log in; is your session key correct?'); // not logged in
  const data = await scrapeIt.scrapeHTML(gumroad.products_html, {
    products: {
      listItem: '.product-card',
      data: {
        id: {
          attr: 'data-permalink'
        },
        purchaseId: {
          selector: '.js-product',
          attr: 'data-purchase-id'
        },
        title: '.description-container h1 strong',
        userHref: {
          selector: '.description-container .js-creator-profile-link',
          attr: 'href'
        },
        userId: {
          selector: '.preview-container',
          attr: 'data-asset-previews',
          convert: x => {
            const numberArr = x.match(/\d+/g).filter(el => el.length === 13);
            return numberArr[0];
          }
        },
        previews: {
          selector: '.preview-container',
          attr: 'data-asset-previews',
          convert: x => JSON.parse(x)
        }
      }
    }
  });
  Promise.map(data.products, async (product) => {
    const userId = product.userId;
    const banExists = await queue.add(() => db('dnp').where({ id: userId, service: 'gumroad' }));
    if (banExists.length) return log(`Skipping ID ${product.id}: user ${userId} is banned`);
    await queue.add(() => checkForFlags({
      service: 'gumroad',
      entity: 'user',
      entityId: userId,
      id: product.id
    }));
    await queue.add(() => checkForRequests({
      service: 'gumroad',
      userId: userId,
      id: product.id
    }));
    const postExists = await queue.add(() => db('booru_posts').where({ id: product.id, service: 'gumroad' }));
    if (postExists.length) return;

    log(`Importing ID ${product.id}`);
    const inactivityTimer = setTimeout(() => log(`Warning: Post ${product.id} may be stalling`), 120000);

    const model = {
      id: product.id,
      user: userId,
      service: 'gumroad',
      title: product.title,
      content: '',
      embed: {},
      shared_file: false,
      added: new Date().toISOString(),
      published: null,
      edited: null,
      file: {},
      attachments: []
    };

    const productPage = await retry(() => cloudscraper.get(`https://gumroad.com/library/purchases/${product.purchaseId}`, scrapeOptions(key)));
    const productData = await scrapeIt.scrapeHTML(productPage, {
      contentUrl: {
        selector: '.button.button-primary.button-block',
        attr: 'href'
      }
    });
    const downloadPage = await retry(() => cloudscraper.get(productData.contentUrl, scrapeOptions(key)));
    const downloadData = await scrapeIt.scrapeHTML(downloadPage, {
      thumbnail1: {
        selector: '.image-preview-container img',
        attr: 'src'
      },
      thumbnail2: {
        selector: '.image-preview-container img',
        attr: 'data-cfsrc'
      },
      thumbnail3: {
        selector: '.image-preview-container noscript img',
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

    const thumbnail = downloadData.thumbnail1 || downloadData.thumbnail2 || downloadData.thumbnail3;
    if (thumbnail) {
      const urlBits = new URL(thumbnail).pathname.split('/');
      const filename = urlBits[urlBits.length - 1].replace(/%20/g, '_');
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, `/files/gumroad/${userId}/${product.id}`),
        name: filename
      }, {
        url: thumbnail
      });
      model.file.name = filename;
      model.file.path = `/files/gumroad/${userId}/${product.id}/${filename}`;
    }

    await Promise.map(downloadData.data.files, async (file) => {
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, `/attachments/gumroad/${userId}/${product.id}`),
        name: `${file.file_name}.${file.extension.toLowerCase()}`
      }, Object.assign({
        url: 'https://gumroad.com' + downloadData.data.download_info[file.id].download_url
      }, scrapeOptions(key)))
        .then(res => {
          model.attachments.push({
            name: res.filename,
            path: `/attachments/gumroad/${userId}/${product.id}/${res.filename}`
          });
        });
    });

    clearTimeout(inactivityTimer);
    log(`Finished importing ${product.id}`);
    await queue.add(() => db('booru_posts').insert(model));
  }, { concurrency: 5 });

  if (data.products.length) {
    scraper(id, key, from + gumroad.result_count);
  } else {
    log('Finished scanning posts.');
    indexer();
  }
}

module.exports = data => {
  debug('kemono:importer:gumroad:' + data.id)('Starting Gumroad import...');
  failsafe.set(data.id, JSON.stringify({ importer: 'gumroad', data: data }), 'EX', 1800);
  scraper(data.id, data.key);
};
