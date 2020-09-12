const { workerData } = require('worker_threads');
const sharp = require('sharp');
sharp(workerData.file, { failOnError: false })
  .jpeg({
    quality: 60,
    chromaSubsampling: '4:2:0',
    progressive: true
  })
  .resize({ width: Number(workerData.size) && Number(workerData.size) <= 800 ? Number(workerData.size) : 800, withoutEnlargement: true })
  .pipe(process.stdout);