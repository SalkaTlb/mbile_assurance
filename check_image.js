 const Jimp = require('jimp');

Jimp.read('C:/Users/LAPTOP/.gemini/antigravity/brain/489563c2-8a2b-45a9-92d9-62b06f89fc6e/media__1780573237888.jpg')
  .then(img => {
    console.log('Image dimensions:', img.bitmap.width, 'x', img.bitmap.height);
    const leftPixel = Jimp.intToRGBA(img.getPixelColor(5, img.bitmap.height / 2));
    const rightPixel = Jimp.intToRGBA(img.getPixelColor(img.bitmap.width - 5, img.bitmap.height / 2));
    const topPixel = Jimp.intToRGBA(img.getPixelColor(img.bitmap.width / 2, 5));
    const bottomPixel = Jimp.intToRGBA(img.getPixelColor(img.bitmap.width / 2, img.bitmap.height - 5));
    console.log({ leftPixel, rightPixel, topPixel, bottomPixel });
  })
  .catch(err => {
    console.error('Error reading image:', err.message);
  });
