const fs = require('fs');
const file = 'c:/Users/LAPTOP/Documents/cours/assurance/insurance-mobile/lib/attestationTemplate.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove white background from logos by using mix-blend-mode: multiply
content = content.replace(/<img src="\$\{LG\}" style="height:35px; object-fit:contain;"/g, '<img src="${LG}" style="height:40px; object-fit:contain; mix-blend-mode: multiply;"');
content = content.replace(/<img src="\$\{RG\}" style="height:35px; object-fit:contain;"/g, '<img src="${RG}" style="height:40px; object-fit:contain; mix-blend-mode: multiply;"');

// 2. Change all text color from #12335E to #000
content = content.replace(/#12335E/g, '#000');

// 3. Increase font sizes globally by a small amount
content = content.replace(/font-size:7\.8px;/g, 'font-size:9px;');
content = content.replace(/font-size:5px;/g, 'font-size:6px;');
content = content.replace(/font-size:6px;/g, 'font-size:7px;');
content = content.replace(/font-size:7px;/g, 'font-size:8px;');
content = content.replace(/font-size:7\.5px;/g, 'font-size:8.5px;');
content = content.replace(/font-size:8px;/g, 'font-size:9px;');
content = content.replace(/font-size:9px;/g, 'font-size:10px;');
content = content.replace(/font-size:10px;/g, 'font-size:11px;');
content = content.replace(/font-size:11px;/g, 'font-size:12px;');
content = content.replace(/font-size:13px;/g, 'font-size:14px;');
content = content.replace(/font-size:15px;/g, 'font-size:16px;');
content = content.replace(/font-size:5\.5px;/g, 'font-size:6.5px;');
content = content.replace(/font-size:4\.5px;/g, 'font-size:5.5px;');
content = content.replace(/font-size:5\.8px;/g, 'font-size:6.8px;');

fs.writeFileSync(file, content, 'utf8');
console.log('Template fixed!');
