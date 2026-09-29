const fs = require('fs');
const path = 'C:/Users/LAPTOP/Documents/cours/assurance/insurance-mobile/lib/attestationTemplate.ts';
let content = fs.readFileSync(path, 'utf8');

const leftImgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778758431641.png';
const rightImgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778757273444.png';

const base64Left = fs.readFileSync(leftImgPath).toString('base64');
const base64Right = fs.readFileSync(rightImgPath).toString('base64');

// We need to inject the base64 images into the TS file. We can define them as constants at the top.
const newConstants = `
const LOGO_LEFT = 'data:image/png;base64,' + '${base64Left}';
const LOGO_RIGHT = 'data:image/png;base64,' + '${base64Right}';
`;

content = content.replace('export function generateAttestationHtml(d: GedData): string {', newConstants + '\nexport function generateAttestationHtml(d: GedData): string {');

// Replace the header div
const oldHeader = `<div class="header">
  <div class="logo-left">MEDIN<span>A</span>ssurances<br/><small style="font-size:7px;color:#666;font-weight:400">Assure jusqu'au bout</small></div>
  <div class="logo-right">مـديـنـة للتأمينات<br/><small>التأمينات للمعادن — خاص</small></div>
</div>`;

const newHeader = `<div class="header">
  <div class="logo-left"><img src="\${LOGO_LEFT}" height="30" /></div>
  <div class="logo-right"><img src="\${LOGO_RIGHT}" height="30" /></div>
</div>`;

content = content.replace(oldHeader, newHeader);

// Ensure the background is white
content = content.replace(/background:#C5D9E8/g, 'background:#fff');
content = content.replace(/background-color:\s*#C5D9E8/g, 'background-color:#fff');

fs.writeFileSync(path, content);
console.log('Successfully updated the template with base64 logos!');
