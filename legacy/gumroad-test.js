const Datastore = require('nedb-promise');
const db = new Datastore({ filename: 'test.db' });
const scrapeIt = require('scrape-it');
const Promise = require('bluebird');
const fs = require('fs-extra');
const mime = require('mime');
const crypto = require('crypto');
const request = require('request');
const request2 = require('request').defaults({ encoding: null });
const cloudscraper = require('cloudscraper');
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
  const gumroad = await cloudscraper.get('https://gumroad.com/discover_search?from=1&user_purchases_only=true', apiOptions(key));
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
  Promise.map(data.products, async (product) => {
    const postExists = await db.findOne({ id: product.id });
    if (postExists) return;

    const userId = new URL(product.userHref).pathname.replace('/', '');
    const model = {
      version: 2,
      service: 'gumroad',
      title: product.title,
      content: '',
      id: product.id,
      user: userId,
      post_type: 'image',
      added_at: new Date().getTime(),
      post_file: {},
      attachments: []
    };
    const productInfo = await cloudscraper.get(`https://gumroad.com/links/${product.id}/user_info`, apiOptions(key));
    const downloadPage = await cloudscraper.get(productInfo.purchase.redirect_url, scrapeOptions(key));
    const downloadData = await scrapeIt.scrapeHTML(downloadPage, {
      thumbnail: {
        selector: '.image-preview-container img',
        attr: 'src'
      },
      files: {
        listItem: '.file-row',
        data: {
          filename: '.file-row-left span',
          link: {
            selector: '.js-download-trigger',
            attr: 'data-url',
            convert: x => 'https://gumroad.com' + x
          }
        }
      }
    });

    if (downloadData.thumbnail) {
      const urlBits = new URL(downloadData.thumbnail).pathname.split('/');
      const filename = urlBits[urlBits.length - 1].replace(/%20/g, '_');
      await fs.ensureFile(`${__dirname}/files/${userId}/${product.id}/${filename}`);
      request.get({ url: downloadData.thumbnail, encoding: null })
        .pipe(fs.createWriteStream(`${__dirname}/files/${userId}/${product.id}/${filename}`));
      model.post_file.name = filename;
      model.post_file.path = `/gumroad/files/${userId}/${product.id}/${filename}`;
    }

    await Promise.map(downloadData.files, async (file) => {
      const randomKey = crypto.randomBytes(20).toString('hex');
      await fs.ensureFile(`${__dirname}/attachments/${userId}/${product.id}/${randomKey}`);
      await new Promise(resolve => {
        request2
          .get(file.link, scrapeOptions(key))
          .on('complete', async (res) => {
            const ext = mime.getExtension(res.headers['content-type']);
            const filename = file.filename.replace(/ /g, '_');
            model.attachments.push({
              name: `${filename}.${ext}`,
              path: `/gumroad/attachments/${userId}/${product.id}/${filename}.${ext}`
            });
            await fs.move(
              `${__dirname}/attachments/${userId}/${product.id}/${randomKey}`,
              `${__dirname}/attachments/${userId}/${product.id}/${filename}.${ext}`
            );
            resolve();
          })
          .pipe(fs.createWriteStream(`${__dirname}/attachments/${userId}/${product.id}/${randomKey}`));
      });
    });

    db.insert(model);
  });
}

db.loadDatabase();
scraper(process.argv[2]);
