const { Jimp, rgbaToInt } = require('jimp');
const fs = require('fs');

async function processImage(imagePath) {
  const image = await Jimp.read(imagePath);
  
  // Iterate over all pixels
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // If it's very close to white, make it transparent
    if (r > 235 && g > 235 && b > 235) {
      this.bitmap.data[idx + 3] = 0; // Set alpha to 0
    }
  });

  const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
  return 'data:image/png;base64,' + buffer.toString('base64');
}

async function main() {
  console.log('Processing logos...');
  const lgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778837873448.png';
  const rgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778837905180.png';

  const newLg = await processImage(lgPath);
  const newRg = await processImage(rgPath);

  const jsonPath = 'lib/assetsBase64.json';
  const assets = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  assets.LG = newLg;
  assets.RG = newRg;
  
  fs.writeFileSync(jsonPath, JSON.stringify(assets));
  console.log('Done! assetsBase64.json updated with transparent logos.');
}

main().catch(console.error);
