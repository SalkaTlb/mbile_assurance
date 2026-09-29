const fs = require('fs');
const path = 'C:/Users/LAPTOP/Documents/cours/assurance/insurance-mobile/lib/attestationTemplate.ts';
let content = fs.readFileSync(path, 'utf8');

const bgImgPath = 'C:/Users/LAPTOP/.gemini/antigravity/brain/2c2136c7-b0ec-49e9-8c7d-e6a2c602268b/media__1778838568980.jpg';
const base64Bg = fs.readFileSync(bgImgPath).toString('base64');

const newConstants = `
const BG_IMAGE = 'data:image/jpeg;base64,' + '${base64Bg}';
`;

// Insert the BG_IMAGE constant if it's not there, otherwise update it
if (!content.includes('const BG_IMAGE')) {
    content = content.replace('export function generateAttestationHtml(d: GedData): string {', newConstants + '\nexport function generateAttestationHtml(d: GedData): string {');
}

// Update the body CSS to use the background image
// Current body CSS: body{font-family:'Roboto',Arial,sans-serif;font-size:9px;color:#212121;background:#fff;padding:8px;}
const oldBodyCSS = /body\{font-family:'Roboto',Arial,sans-serif;font-size:9px;color:#212121;background:#fff;padding:8px;\}/;
const newBodyCSS = "body{font-family:'Roboto',Arial,sans-serif;font-size:9px;color:#212121;background-color:#fff;background-image:url('${BG_IMAGE}');background-size:cover;background-position:center;background-repeat:no-repeat;padding:8px;}";

content = content.replace(oldBodyCSS, newBodyCSS);

// Also replace if the spaces are different
const oldBodyCSS2 = /body\s*\{\s*font-family:\s*'Roboto',\s*Arial,\s*sans-serif;\s*font-size:\s*10px;\s*color:\s*#1A1A1A;\s*background-color:\s*#fff;\s*padding:\s*20px;\s*\}/;
const newBodyCSS2 = "body { font-family: 'Roboto', Arial, sans-serif; font-size: 10px; color: #1A1A1A; background-color: #fff; background-image: url('${BG_IMAGE}'); background-size: cover; background-position: center; background-repeat: no-repeat; padding: 20px; }";

content = content.replace(oldBodyCSS2, newBodyCSS2);

fs.writeFileSync(path, content);
console.log('Successfully applied the background image!');
