const { db, queue } = require('../db');
const request = require('request-promise');
const scrapeIt = require('scrape-it');
const retry = require('p-retry');
const fs = require('fs-extra');
const path = require('path');
const checkForFlags = require('../flagcheck');
const downloadFile = require('../download');
const Promise = require('bluebird');
const indexer = require('../indexer');

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
  const auth = await retry(() => request.get(`https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/dlsite/authorize`, requestOptions(importData.key)));
  const key = auth.sid;
  const dlsite = await retry(() => request.get(`https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/dlsite/purchases?sync=true&limit=1000&page=${page}`, requestOptions(key)));
  Promise.map(dlsite.works, async (work) => {
    const banExists = await queue.add(() => db('dnp').where({ id: work.maker_id, service: 'dlsite' }));
    if (banExists.length) return;

    await checkForFlags({
      service: 'dlsite',
      entity: 'user',
      entityId: work.maker_id,
      id: work.workno
    });

    const postExists = await queue.add(() => db('booru_posts').where({ id: work.workno, service: 'dlsite' }));
    if (postExists.length) return;

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

    await retry(() => request.get(`https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/dlsite/download_token?workno=${work.workno}`, requestOptions(key)));
    const jar = request.jar(); // required for auth dance
    const res = await downloadFile({
      ddir: path.join(process.env.DB_ROOT, `/attachments/dlsite/${work.maker_id}/${work.workno}`)
    }, Object.assign({
      url: `https://play.dlsite.com/${importData.jp ? '' : 'eng/'}api/dlsite/download?workno=${work.workno}`,
      jar: jar
    }, fileRequestOptions(key, importData.jp)));

    model.attachments.push({
      name: res.filename,
      path: `/attachments/dlsite/${work.maker_id}/${work.workno}/${res.filename}`
    });

    // handle split files
    if (res.filename.endsWith('.Untitled')) {
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

      if (splitFileData.parts) {
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

    await queue.add(() => db('booru_posts').insert(model));
  });

  if (dlsite.works.length) {
    scraper(importData, page + 1);
  } else {
    indexer();
  }
}

module.exports = data => scraper(data);
