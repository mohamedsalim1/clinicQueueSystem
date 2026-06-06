/**
 * generate-pwa-icons.cjs
 * ينشئ أيقونات PWA بشكل هلال أحمر في public/icons/
 * التشغيل: node generate-pwa-icons.cjs (من مجلد frontend)
 */
const fs   = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// رسم هلال أحمر: دائرتان متداخلتان (الثانية بلون الخلفية لإخفاء الجزء)
const makeSVG = (s) => {
  const cx = s / 2, cy = s / 2;
  const r1 = s * 0.30;        // نصف قطر الهلال الخارجي
  const r2 = s * 0.24;        // نصف قطر الدائرة الداخلية (تُشكّل الفراغ)
  const ox = s * 0.07;        // إزاحة الدائرة الداخلية لليسار
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <!-- خلفية داكنة -->
  <rect width="${s}" height="${s}" rx="${s * 0.18}" fill="#0d1117"/>
  <!-- الهلال الأحمر: دائرة حمراء تُطرح منها دائرة بلون الخلفية -->
  <circle cx="${cx}" cy="${cy}" r="${r1}" fill="#dc2626"/>
  <circle cx="${cx - ox}" cy="${cy - s*0.03}" r="${r2}" fill="#0d1117"/>
  <!-- نجمة صغيرة بجانب الهلال -->
  <polygon
    points="${cx + r1*0.45},${cy - r1*0.65}
            ${cx + r1*0.55},${cy - r1*0.38}
            ${cx + r1*0.82},${cy - r1*0.38}
            ${cx + r1*0.62},${cy - r1*0.18}
            ${cx + r1*0.72},${cy + r1*0.10}
            ${cx + r1*0.45},${cy - r1*0.05}
            ${cx + r1*0.18},${cy + r1*0.10}
            ${cx + r1*0.28},${cy - r1*0.18}
            ${cx + r1*0.08},${cy - r1*0.38}
            ${cx + r1*0.35},${cy - r1*0.38}"
    fill="#dc2626"
    transform="scale(0.7) translate(${s*0.22},${s*0.2})"
  />
</svg>`;
};

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), makeSVG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), makeSVG(512));

console.log('✅ أيقونات الهلال الأحمر تم إنشاؤها في public/icons/');
