const { posts, bans } = require('../db');
const request = require('request-promise');
const retry = require('p-retry');
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

async function scraper (data, page = 1) {
  const auth = await retry(() => request.get(`https://play.dlsite.com/${data.jp ? '' : 'eng/'}api/dlsite/authorize`, requestOptions(data.key)));
  const key = auth.sid;
  const dlsite = await retry(() => request.get(`https://play.dlsite.com/${data.jp ? '' : 'eng/'}api/dlsite/purchases?sync=true&limit=1000&page=${page}`, requestOptions(key)));
  Promise.map(dlsite.works, async (work) => {
    const banExists = await bans.findOne({ id: work.maker_id, service: 'dlsite' });
    if (banExists) return;

    await checkForFlags({
      service: 'dlsite',
      entity: 'user',
      entityId: work.maker_id,
      id: work.workno
    });

    const postExists = await posts.findOne({ id: work.workno, service: 'dlsite' });
    if (postExists) return;

    const model = {
      version: 2,
      service: 'dlsite',
      title: work.work_name || work.work_name_kana,
      content: '',
      id: work.workno,
      user: work.maker_id,
      post_type: 'image',
      added_at: new Date().getTime(),
      published_at: new Date(Date.parse(work.regist_date)).toISOString(),
      post_file: {},
      attachments: []
    };

    const { scrape, scrapeRes } = await scrapeIt(`https://www.dlsite.com/${data.jp ? 'maniax' : 'ecchi-eng'}/work/=/product_id/${model.id}.html`, {
      drmTag: '.icon_PVA'
    })

    if (scrapeRes.statusCode === 200 && scrape.drmTag) return; // DRMed product; skip

    if (Object.keys(work.work_files || {}).length) {
      await downloadFile({
        ddir: path.join(process.env.DB_ROOT, `/files/dlsite/${work.maker_id}/${work.workno}`)
      }, {
        url: work.work_files.main || work.work_files['sam@3x'] || work.work_files['sam@2x'] || work.work_files.sam || work.work_files.mini
      })
        .then(res => {
          model.post_file.name = res.filename;
          model.post_file.path = `/files/dlsite/${work.maker_id}/${work.workno}/${res.filename}`;
        });
    }

    await retry(() => request.get(`https://play.dlsite.com/${data.jp ? '' : 'eng/'}api/dlsite/download_token?workno=${work.workno}`, requestOptions(key)));
    const jar = request.jar(); // required for auth dance
    const res = await downloadFile({
      ddir: path.join(process.env.DB_ROOT, `/attachments/dlsite/${work.maker_id}/${work.workno}`)
    }, Object.assign({
      url: `https://play.dlsite.com/${data.jp ? '' : 'eng/'}api/dlsite/download?workno=${work.workno}`,
      jar: jar
    }, fileRequestOptions(key, data.jp)))

    model.attachments.push({
      name: res.filename,
      path: `/attachments/dlsite/${work.maker_id}/${work.workno}/${res.filename}`
    });

    // handle split files
    if (res.filename.endsWith('.Untitled')) {
      const splitFileData = scrapeIt.scrapeHtml(await fs.readFile(path.join(process.env.DB_ROOT, `/attachments/dlsite/${work.maker_id}/${work.workno}`, res.filename), 'utf8'), {
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
            url: part,
            jar: jar
          }, fileRequestOptions(key, data.jp)))
            .then(res => {
              model.attachments.push({
                name: res.filename,
                path: `/attachments/dlsite/${work.maker_id}/${work.workno}/${res.filename}`
              });
            });
        })
      }
    }

    posts.insertOne(model);
  });

  if (dlsite.works.length) {
    scraper(data, page + 1);
  } else {
    indexer();
  }
}

module.exports = data => scraper(data);
