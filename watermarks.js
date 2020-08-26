const crypto = require('crypto');
const fs = require('fs-extra');
const mergePdfs = require('./pdfmerge');
const getEmails = require('get-emails');
const { PDFDocument } = require('pdf-lib');
const { Readable } = require('stream');
const Inkscape = require('inkscape');
const Promise = require('bluebird');
module.exports = (ddir, file) => {
  return new Promise(resolve => {
    let svg = '';
    const pdfToSvgConverter = new Inkscape([
      '--import-pdf',
      '--export-plain-svg'
    ]);
    fs.createReadStream(path.join(ddir, file))
      .pipe(pdfToSvgConverter)
      .on('data', chunk => {
        svg += chunk;
      })
      .on('end', async () => {
        await Promise.map(getEmails(svg), email => svg.replace(email, ''));
        const data = await fs.readFile(path.join(ddir, file))
        const document = await PDFDocument.load(data);
        document.removePage(0);
        const truncated = await document.save();

        const svgToPdfConverter = new Inkscape([
          '--import-plain-svg',
          '--export-pdf'
        ])
        const tempname = crypto.randomBytes(20).toString('hex') + '.temp';
        let count = 0;
        const svgStream = new Readable({
          read(size) {
            this.push(svg)
            if (count > 0) this.push(null);
            count++;
          }
        });
        await fs.ensureFile(path.join(ddir, tempname));
        svgStream
          .pipe(svgToPdfConverter)
          .pipe(fs.createWriteStream(path.join(ddir, tempname)))
          .on('end', async () => {
            await fs.outputFile(path.join(ddir, tempname), await mergePdfs([
              truncated,
              await fs.readFile(path.join(ddir, tempname))
            ]))
            resolve();
          })
      });
  })
}