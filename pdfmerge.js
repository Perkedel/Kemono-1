const Promise = require('bluebird');
const { PDFDocument } = require('pdf-lib')

// https://github.com/Richienb/combine-pdfs
module.exports = async pdfs => {
  const result = await PDFDocument.create()

  await Promise.mapSeries(pdfs, async(pdf) => {
    const newPdf = await PDFDocument.load(pdf)
    await Promise.mapSeries(await result.copyPages(newPdf, newPdf.getPageIndices()), page => result.addPage(page))
  })
  
  return result.save()
}