const fs = require('fs');

const path = 'C:/Users/LAPTOP/Documents/cours/assurance/insurance-mobile/lib/attestationTemplate.ts';
let content = fs.readFileSync(path, 'utf8');

const leftImgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778758431641.png';
const rightImgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778757273444.png';
const bgImgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778838568980.jpg';

const base64Left = fs.readFileSync(leftImgPath).toString('base64');
const base64Right = fs.readFileSync(rightImgPath).toString('base64');
const base64Bg = fs.readFileSync(bgImgPath).toString('base64');

// 1. Replace LG and BG constants
const lgRegex = /const LG='data:image\/png;base64,[^']*';/;
content = content.replace(lgRegex, `const LG='data:image/png;base64,${base64Left}';`);

const bgRegex = /const BG='data:image\/jpeg;base64,[^']*';/;
content = content.replace(bgRegex, `const BG='data:image/jpeg;base64,${base64Bg}';`);

// 2. Add RG constant right after LG
if (!content.includes('const RG=')) {
    content = content.replace(/const LG=([^;]+);/, `const LG=$1;\nconst RG='data:image/png;base64,${base64Right}';`);
} else {
    const rgRegex = /const RG='data:image\/png;base64,[^']*';/;
    content = content.replace(rgRegex, `const RG='data:image/png;base64,${base64Right}';`);
}

// 3. Replace the header section HTML
const oldHeader = `<div class="hd">
  <div class="lg">
    <img src="\${LG}" alt="Medina Assurances"/>
    <div class="tg">Assure jusqu'au bout</div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;">
    <div class="qr">QR</div>
    <div style="font-size:4px;color:#777;text-align:center;margin-top:1px;">Code officiel</div>
  </div>
  <div class="an">
    <div class="n1">مدينة للتأمينات</div>
    <div class="n2">الـتـأمـيـن للـطـمـأنـيـنـاق</div>
  </div>
</div>`;

const newHeader = `<div class="hd">
  <div class="lg" style="flex:1;">
    <img src="\${LG}" style="height:35px; object-fit:contain;" alt="Medina Assurances"/>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center; flex:1;">
    <div class="qr">QR</div>
    <div style="font-size:4px;color:#777;text-align:center;margin-top:1px;">Code officiel</div>
  </div>
  <div class="an" style="flex:1; text-align:right;">
    <img src="\${RG}" style="height:35px; object-fit:contain;" alt="Medina Assurances Arabe"/>
  </div>
</div>`;

if (content.includes(oldHeader)) {
    content = content.replace(oldHeader, newHeader);
} else {
    console.log("Could not find the old header exactly as defined. Perhaps it was already updated?");
}

// 4. Update \`.bg img\` CSS for better display of background
// Current: .bg img{width:52%;opacity:0.11;margin-top:60px;margin-left:40px;}
const oldBgCSS = /\.bg img\{width:52%;opacity:0\.11;margin-top:60px;margin-left:40px;\}/g;
const newBgCSS = `.bg img{width:65%;opacity:0.08;margin-top:40px;margin-left:20px;}`;
content = content.replace(oldBgCSS, newBgCSS);


fs.writeFileSync(path, content);
console.log('Successfully updated template with new base64 images!');
