const { db, failsafe } = require('../utils/db');
const request = require('request-promise');
const scrapeIt = require('scrape-it');
const retry = require('p-retry');
const fs = require('fs-extra');
const path = require('path');
const { to: pWrapper } = require('await-to-js');
const debug = require('../utils/debug');
const checkForRequests = require('../checks/requests');
const checkForFlags = require('../checks/flags');
const downloadFile = require('../utils/download');
const Promise = require('bluebird');
const indexer = require('../init/indexer');

const { default: pq } = require('p-queue');
const queue = new pq({ concurrency: 10 });

const requestOptions = (key, jp) => {
  return {
    json: true,
    headers: { cookie: `__DLsite_SID=${key}; vendor_design=normal; loginchecked=1${jp ? '; dlloginjp=1' : '; dlloginen=1'}` }
  };
};

const fileRequestOptions = (key, jp) => {
  return {
    encoding: null,
    headers: { cookie: `__DLsite_SID=${key}; vendor_design=normal; loginchecked=1${jp ? '; dlloginjp=1' : '; dlloginen=1'}` }
  };
};

async function scraper (importData, page = 1) {
  const log = debug('kemono:importer:status:' + importData.id);

  const [err1, auth] = await pWrapper(retry(() => request.get(`https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/authorize`, requestOptions(importData.key))));
  if (err1 && err1.statusCode) {
    return log(`Error: Status code ${err1.statusCode} when authenticating.`);
  } else if (err1) {
    return log(err1);
  }

  const key = auth.sid;
  const [err2, dlsite] = await pWrapper(retry(() => request.get(`https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/purchases?sync=true&limit=1000&page=${page}`, requestOptions(key))));
  if (err2 && err2.statusCode) {
    return log(`Error: Status code ${err2.statusCode} when contacting DLsite API.`);
  } else if (err2) {
    return log(err2);
  }

  Promise.map(dlsite.works, async (work) => {
    const banExists = await queue.add(() => db('dnp').where({ id: work.maker_id, service: 'dlsite' }));
    if (banExists.length) return log(`Skipping ID ${work.workno}: user ${work.maker_id} is banned`);

    await queue.add(() => checkForFlags({
      service: 'dlsite',
      entity: 'user',
      entityId: work.maker_id,
      id: work.workno
    }));

    await queue.add(() => checkForRequests({
      service: 'dlsite',
      userId: work.maker_id,
      id: work.workno
    }));

    const postExists = await queue.add(() => db('booru_posts').where({ id: work.workno, service: 'dlsite' }));
    if (postExists.length) return;

    log(`Importing ID ${work.workno}`);
    const inactivityTimer = setTimeout(() => log(`Warning: Post ${work.workno} may be stalling`), 120000);

    const model = {
      id: work.workno,
      user: work.maker_id,
      service: 'dlsite',
      title: work.work_name || work.work_name_kana,
      content: '',
      embed: {},
      shared_file: false,
      added: new Date().toISOString(),
      published: new Date(Date.parse(work.regist_date)).toISOString(),
      edited: null,
      file: {},
      attachments: []
    };

    const { data, response } = await scrapeIt(`https://www.dlsite.com/${importData.jp ? 'maniax' : 'ecchi-eng'}/work/=/product_id/${model.id}.html`, {
      drmTag: '.icon_PVA'
    });

    if (response.statusCode === 200 && data.drmTag) return; // DRMed product; skip

    if (Object.keys(work.work_files || {}).length) {
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, `/files/dlsite/${work.maker_id}/${work.workno}`)
      }, {
        url: work.work_files.main || work.work_files['sam@3x'] || work.work_files['sam@2x'] || work.work_files.sam || work.work_files.mini
      })
        .then(res => {
          model.file.name = res.filename;
          model.file.path = `/files/dlsite/${work.maker_id}/${work.workno}/${res.filename}`;
        });
    }

    /* eslint-disable no-unused-vars */
    const [err3, _] = await pWrapper(retry(() => request.get(`https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/download_token?workno=${work.workno}`, requestOptions(key))));
    if (err3 && err3.statusCode) {
      return log(`Error: Status code ${err1.statusCode} when refreshing download token.`);
    } else if (err3) {
      return log(err3);
    }
    /* eslint-enable no-unused-vars */

    const jar = request.jar(); // required for auth dance
    const res = await downloadFile({
      ddir: path.join(process.env.DB_ROOT, `/attachments/dlsite/${work.maker_id}/${work.workno}`)
    }, Object.assign({
      url: `https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/download?workno=${work.workno}`,
      jar: jar
    }, fileRequestOptions(key, importData.jp)));

    model.attachments.push({
      name: res.filename,
      path: `/attachments/dlsite/${work.maker_id}/${work.workno}/${res.filename}`
    });

    // handle split files
    if (res.filename.endsWith('.Untitled')) {
      log(`ID ${work.workno}: HTML/unknown file downloaded.`);
      log(`ID ${work.workno}: Scanning for multipart files...`);
      const splitFileData = scrapeIt.scrapeHTML(await fs.readFile(path.join(process.env.DB_ROOT, `/attachments/dlsite/${work.maker_id}/${work.workno}`, res.filename), 'utf8'), {
        parts: {
          listItem: '.work_download a',
          data: {
            id: {
              attr: 'href'
            }
          }
        }
      });

      if (splitFileData.parts.length) {
        log(`ID ${work.workno}: ${splitFileData.parts.length} parts found.`);
        await Promise.map(splitFileData.parts, async (part) => {
          await downloadFile({
            ddir: path.join(process.env.DB_ROOT, `/attachments/dlsite/${work.maker_id}/${work.workno}`)
          }, Object.assign({
            url: part.id,
            jar: jar
          }, fileRequestOptions(key, importData.jp)))
            .then(res => {
              model.attachments.push({
                name: res.filename,
                path: `/attachments/dlsite/${work.maker_id}/${work.workno}/${res.filename}`
              });
            });
        });
        await fs.remove(model.attachments[0].path);
        model.attachments.splice(0, 1); // remove untitled file
      }
    }

    clearTimeout(inactivityTimer);
    log(`Finished importing ${work.workno}.`);
    await queue.add(() => db('booru_posts').insert(model));
  }, { concurrency: 5 });

  if (dlsite.works.length) {
    scraper(importData, page + 1);
  } else {
    log('Finished scanning posts.');
    indexer();
  }
}

module.exports = data => {
  debug('kemono:importer:status:' + data.id)('Starting DLsite import...');
  failsafe.set(data.id, JSON.stringify({ importer: 'dlsite', data: data }), 'EX', 1800);
  scraper(data);
};
