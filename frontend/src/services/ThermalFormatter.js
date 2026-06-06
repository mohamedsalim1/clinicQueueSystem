/**
 * ThermalFormatter.js
 *
 * يُحوِّل بيانات التذكرة إلى أوامر ESC/POS للطابعة الحرارية 80mm
 * الدعم: محاذاة RTL عربية، خط كبير للرقم، قطع تلقائي، QR code اختياري
 *
 * مبدأ الترميز:
 * - نطلب صفحة CP864 العربية من الطابعة عبر ESC/POS
 * - بعض تعريفات الطابعات تختلف في رقم صفحة الترميز، لذلك يبقى ضبطها من Tauri ضرورياً
 * - يتم تقطيع النصوص الطويلة حتى لا تتجاوز عرض 80mm
 */

const ESC  = '\x1B';
const GS   = '\x1D';
const LF   = '\x0A';
const INIT = ESC + '@';         // إعادة تهيئة الطابعة
const CODEPAGE_ARABIC = ESC + 't\x22'; // WPC1256 (Arabic Page 34) على كثير من طابعات ESC/POS

// ——— المحاذاة ———
const ALIGN_CENTER = ESC + 'a\x01';
const ALIGN_RIGHT  = ESC + 'a\x02';
const ALIGN_LEFT   = ESC + 'a\x00';

// ——— الخط ———
const BOLD_ON      = ESC + 'E\x01';
const BOLD_OFF     = ESC + 'E\x00';
const UNDERLINE_ON = ESC + '-\x01';
const UNDERLINE_OFF= ESC + '-\x00';

// ——— حجم الخط ———
// GS ! n: bits 0-3 = عرض (0=عادي,1=ضعف), bits 4-7 = ارتفاع
const SIZE_NORMAL    = GS + '!\x00';  // عادي
const SIZE_2X        = GS + '!\x11';  // ضعف (ارتفاع+عرض)
const SIZE_3X        = GS + '!\x22';  // ثلاثة أضعاف
const SIZE_4X        = GS + '!\x33';  // أربعة أضعاف — للرقم الكبير

// ——— القطع التلقائي ———
const CUT_FULL       = GS + 'V\x00';
const CUT_PARTIAL    = GS + 'V\x01';

// ——— الفاصل ———
const divider = (char = '-', count = 32) => char.repeat(count);

const normalizeArabic = (value = '') =>
  String(value)
    .normalize('NFKC')
    .replace(/\u0640/g, '')
    .trim();

const chunkText = (value, max = 28) => {
  const words = normalizeArabic(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

/**
 * تنسيق التذكرة الكاملة بأوامر ESC/POS
 * @param {Object} ticketData
 * @param {string} ticketData.fullNumber     - مثال: A-001
 * @param {string} ticketData.clinicName     - اسم العيادة
 * @param {string} ticketData.patientName    - اسم المريض
 * @param {number} ticketData.waitingAhead   - عدد المنتظرين قبله
 * @param {Object} ticketData.settings       - إعدادات النظام (clinicTitle, footerMsg...)
 * @param {string} [printerWidth='80mm']
 */
export const formatTicket = (ticketData, printerWidth = '80mm') => {
  const {
    fullNumber   = '?-000',
    clinicName   = 'العيادة',
    patientName  = '',
    waitingAhead = 0,
    settings     = {},
  } = ticketData;

  const clinicTitle    = settings.clinicTitle    || 'مركز داريا الطبي';
  const clinicSubtitle = settings.clinicSubtitle || 'Daraya Medical Center';
  const footerMsg      = settings.footerMsg      || 'يرجى انتظار ظهور رقمك على شاشة العرض';

  const now  = new Date();
  const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY بأرقام إنجليزية
  const time = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS بأرقام إنجليزية

  const cols = printerWidth === '80mm' ? 32 : 24;

  let cmds = [];

  // ——— 1. تهيئة الطابعة ———
  cmds.push(INIT);
  cmds.push(CODEPAGE_ARABIC);

  // ——— 2. رأس التذكرة ———
  cmds.push(ALIGN_CENTER);
  cmds.push(BOLD_ON);
  cmds.push(SIZE_2X);
  cmds.push(normalizeArabic(clinicTitle) + LF);
  cmds.push(SIZE_NORMAL);
  cmds.push(clinicSubtitle + LF);
  cmds.push(BOLD_OFF);
  cmds.push(LF);

  // ——— 3. اسم العيادة / القسم ———
  cmds.push(ALIGN_CENTER);
  cmds.push(BOLD_ON);
  cmds.push(normalizeArabic(clinicName) + LF);
  cmds.push(BOLD_OFF);
  cmds.push(divider('=', cols) + LF);
  cmds.push(LF);

  // ——— 4. تسمية رقم الحجز ———
  cmds.push(ALIGN_CENTER);
  cmds.push('رقم الحجز:' + LF);
  cmds.push(LF);

  // ——— 5. الرقم الكبير ———
  cmds.push(SIZE_4X);
  cmds.push(BOLD_ON);
  cmds.push(ALIGN_CENTER);
  cmds.push(fullNumber + LF);
  cmds.push(BOLD_OFF);
  cmds.push(SIZE_NORMAL);
  cmds.push(LF);

  // ——— 6. اسم المريض (إن وجد) ———
  if (patientName) {
    cmds.push(divider('-', cols) + LF);
    cmds.push(ALIGN_CENTER);
    cmds.push('اسم المريض:' + LF);
    cmds.push(BOLD_ON);
    chunkText(patientName, cols - 4).forEach((line) => cmds.push(line + LF));
    cmds.push(BOLD_OFF);
  }

  // ——— 7. عدد المنتظرين ———
  cmds.push(divider('-', cols) + LF);
  cmds.push(ALIGN_CENTER);
  cmds.push(`المنتظرون أمامك: ${waitingAhead}` + LF);

  // ——— 8. الوقت والتاريخ ———
  cmds.push(divider('-', cols) + LF);
  cmds.push(ALIGN_CENTER);
  cmds.push(time + LF);
  cmds.push(date + LF);
  cmds.push(divider('-', cols) + LF);
  cmds.push(LF);

  // ——— 9. رسالة التذييل ———
  cmds.push(ALIGN_CENTER);
  chunkText(footerMsg, cols - 2).forEach((line) => cmds.push(line + LF));
  cmds.push(LF + LF + LF);

  // ——— 10. القطع التلقائي ———
  cmds.push(CUT_PARTIAL);

  return cmds.join('');
};
