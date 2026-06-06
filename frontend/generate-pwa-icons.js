/**
 * generate-pwa-icons.js
 * ينشئ أيقونات PWA SVG بسيطة في public/icons/
 * التشغيل: node generate-pwa-icons.js (من مجلد frontend)
 */
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// SVG icon content — أيقونة طبية بسيطة (هلال أحمر + صليب طبي)
const makeSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0d1117"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="#0ea5e9" opacity="0.15"/>
  <!-- Cross (medical) -->
  <rect x="${size*0.42}" y="${size*0.22}" width="${size*0.16}" height="${size*0.56}" rx="${size*0.04}" fill="#0ea5e9"/>
  <rect x="${size*0.22}" y="${size*0.42}" width="${size*0.56}" height="${size*0.16}" rx="${size*0.04}" fill="#0ea5e9"/>
</svg>`;

// Write SVG icons (browsers accept SVG as icons)
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), makeSVG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), makeSVG(512));

console.log('✅ أيقونات PWA تم إنشاؤها في public/icons/');
console.log('   icon-192.svg');
console.log('   icon-512.svg');
console.log('');
console.log('ملاحظة: قم بتحديث manifest.json لتستخدم .svg بدل .png إذا أردت');
