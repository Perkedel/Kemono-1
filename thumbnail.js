const sharp = require('sharp');
module.exports = ({ file, size }) => {
  return sharp(file, { failOnError: false })
    .jpeg({
      quality: 60,
      chromaSubsampling: '4:2:0',
      progressive: true
    })
    .resize({ width: Number(size) && Number(size) <= 800 ? Number(size) : 800, withoutEnlargement: true })
    .toBuffer();
}
