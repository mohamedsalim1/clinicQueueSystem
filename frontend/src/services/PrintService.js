/**
 * PrintService.js
 *
 * خدمة الطباعة الحرارية المنتجة
 * - في بيئة Tauri: يرسل أوامر ESC/POS مباشرة للطابعة بدون حوار طباعة
 * - في المتصفح العادي: لا يستخدم browser print، ويعيد حالة واضحة للإعداد/الاختبار فقط
 * - تمنع الطباعة المتكررة بواسطة isPrinting flag
 */

import { formatTicket } from './ThermalFormatter';

class PrintService {
  constructor() {
    this.isPrinting  = false;
    this.printerName = 'Thermal_Printer'; // سيُحدَّث من الإعدادات
  }

  isTauri() {
    return typeof window !== 'undefined' && !!window.__TAURI__;
  }

  /** تحديث اسم الطابعة من إعدادات النظام */
  setPrinterName(name) {
    if (name) this.printerName = name;
  }

  /**
   * الطباعة الرئيسية
   * @param {Object} ticketData - بيانات التذكرة
   * @param {Object} settings   - إعدادات النظام (clinicTitle, footerMsg...)
   */
  async printQueueTicket(ticketData, settings = {}) {
    if (this.isPrinting) {
      console.warn('[Print] طباعة جارية بالفعل، تم تجاهل الطلب');
      return { success: false, reason: 'busy' };
    }

    this.isPrinting = true;

    try {
      if (this.isTauri()) {
        return await this._printViaTauri(ticketData, settings);
      }

      return this._thermalPrinterUnavailable(ticketData, settings);
    } finally {
      this.isPrinting = false;
    }
  }

/** ——— طباعة ESC/POS عبر Tauri باستخدام طريقة الصورة (Raster Graphics) ——— */
  async _printViaTauri(ticketData, settings) {
    const printerWidth = settings.printerWidth || '80mm';

    // 1. رسم التذكرة بالكامل على Canvas لمعالجة النصوص واللغة العربية
    const canvas = renderTicketToCanvas(ticketData, settings, printerWidth);

    // 2. تحويل الـ Canvas إلى بايتات صورة طابعة حرارية (ESC/POS GS v 0)
    const imageBytes = canvasToEscPosBytes(canvas);

    // 3. دمج أمر التهيئة (ESC @) وبايتات الصورة وأوامر التغذية والقطع
    const initBytes = new Uint8Array([0x1B, 0x40]);
    const cutBytes = new Uint8Array([0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x01]); // 3 أسطر فراغ ثم قطع

    const combinedBytes = new Uint8Array(initBytes.length + imageBytes.length + cutBytes.length);
    combinedBytes.set(initBytes, 0);
    combinedBytes.set(imageBytes, initBytes.length);
    combinedBytes.set(cutBytes, initBytes.length + imageBytes.length);

    const invoke = window.__TAURI__.core?.invoke || window.__TAURI__.invoke;

    // إرسال البايتات كمصفوفة أرقام لضمان تسلسلها السليم في Tauri JSON-RPC
    await invoke('print_raw_data', {
      printerName: this.printerName,
      data: Array.from(combinedBytes),
    });

    return { success: true, mode: 'tauri-escpos-image' };
  }

  _thermalPrinterUnavailable(ticketData, settings = {}) {
    const {
      fullNumber   = '?-000',
      clinicName   = 'العيادة',
      patientName  = '',
      waitingAhead = 0,
    } = ticketData;

    const clinicTitle = settings.clinicTitle    || 'مركز داريا الطبي';
    const footerMsg   = settings.footerMsg      || 'يرجى انتظار ظهور رقمك على شاشة العرض';
    const now         = new Date();
    const date        = now.toLocaleDateString('ar-SA');
    const time        = now.toLocaleTimeString('ar-SA', { hour12: false });

    return {
      success: false,
      mode: 'browser-preview-only',
      reason: 'thermal-printer-requires-tauri',
      preview: {
        clinicTitle,
        clinicName,
        fullNumber,
        patientName,
        waitingAhead,
        time,
        date,
        footerMsg,
      }
    };
  }
}

export default new PrintService();

// ——— دالة رسم التذكرة كصورة على الـ Canvas ———
function renderTicketToCanvas(ticketData, settings = {}, printerWidth = '80mm') {
  const canvas = document.createElement('canvas');
  canvas.width = printerWidth === '58mm' ? 384 : 576; // عرض الطابعة بالبكسل
  canvas.height = 2000; // ارتفاع مؤقت كبير

  const ctx = canvas.getContext('2d');
  
  // خلفية بيضاء
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // إعدادات الفرشاة والكتابة
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  ctx.direction = 'rtl';

  const width = canvas.width;
  const margin = 12;
  let y = 16; // تقليص الهامش العلوي

  const {
    fullNumber   = '?-000',
    clinicName   = 'العيادة',
    patientName  = '',
    waitingAhead = 0,
  } = ticketData || {};

  const clinicTitle    = settings.clinicTitle    || 'مركز داريا الطبي';
  const clinicSubtitle = settings.clinicSubtitle || 'Daraya Medical Center';
  const footerMsg      = settings.footerMsg      || 'يرجى انتظار ظهور رقمك على شاشة العرض';

  const now  = new Date();
  const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const time = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS

  // دالة رسم النصوص مع التفاف الأسطر
  function drawText(text, fontSize, fontWeight = 'normal', align = 'center') {
    ctx.font = `${fontWeight} ${fontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.direction = 'rtl';

    const maxWidth = width - 2 * margin;
    const words = String(text).split(' ');
    let lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    const x = align === 'center' ? width / 2 : (align === 'right' ? width - margin : margin);

    lines.forEach((line) => {
      ctx.fillText(line, x, y);
      y += fontSize + 8; // تقليص تباعد الأسطر قليلاً
    });
  }

  // دالة رسم خطوط فاصلة قصيرة ومسنترة بالمنتصف
  function drawDivider() {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#444444';
    ctx.beginPath();
    const lineLength = width * 0.45; // الخط يغطي 45% فقط من عرض الورقة
    ctx.moveTo(width / 2 - lineLength / 2, y);
    ctx.lineTo(width / 2 + lineLength / 2, y);
    y += 2;
    ctx.stroke();
    y += 10;
  }

  // 1. اسم المركز الطبي الرئيسي والترجمة
  drawText(clinicTitle, 32, 'bold', 'center');
  y += 4;
  drawText(clinicSubtitle, 19, 'normal', 'center');
  y += 14;

  // 2. اسم العيادة
  drawText(clinicName, 30, 'bold', 'center');
  y += 6;
  drawDivider(); // الخط القصير الأول

  // 3. عبارة رقم الحجز ورقم الحجز (بولد خفيف)
  drawText('رقم الحجز:', 21, 'normal', 'center');
  y += 4;
  drawText(fullNumber, 70, '600', 'center'); // وسط بين 60 القديم و80 الجديد
  y += 14;

  // 4. اسم المريض والمنتظرون أمامك
  if (patientName) {
    drawText(`اسم المريض: ${patientName}`, 23, 'bold', 'center');
    y += 4;
  }
  drawText(`المنتظرون أمامك: ${waitingAhead}`, 21, 'bold', 'center');
  y += 6;
  drawDivider(); // الخط القصير الثاني

  // 5. التاريخ والوقت بجوار بعضهما
  drawText(`${date}   -   ${time}`, 20, 'normal', 'center');
  y += 6;

  // 6. رسالة التذييل
  drawText(footerMsg, 18, 'normal', 'center');
  y += 40;

  const finalHeight = y;

  // إنشاء الـ Canvas النهائي بالارتفاع الحقيقي المقاس
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvas.width;
  finalCanvas.height = finalHeight;
  const finalCtx = finalCanvas.getContext('2d');

  finalCtx.fillStyle = '#FFFFFF';
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  
  // إعادة تعيين y والرسم النهائي
  y = 16;

  function drawTextFinal(text, fontSize, fontWeight = 'normal', align = 'center') {
    finalCtx.font = `${fontWeight} ${fontSize}px "Segoe UI", Arial, sans-serif`;
    finalCtx.textAlign = align;
    finalCtx.fillStyle = '#000000';
    finalCtx.textBaseline = 'top';
    finalCtx.direction = 'rtl';

    const maxWidth = width - 2 * margin;
    const words = String(text).split(' ');
    let lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
      const metrics = finalCtx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    const x = align === 'center' ? width / 2 : (align === 'right' ? width - margin : margin);

    lines.forEach((line) => {
      finalCtx.fillText(line, x, y);
      y += fontSize + 8;
    });
  }

  function drawDividerFinal() {
    finalCtx.lineWidth = 2;
    finalCtx.strokeStyle = '#444444';
    finalCtx.beginPath();
    const lineLength = width * 0.45;
    finalCtx.moveTo(width / 2 - lineLength / 2, y);
    finalCtx.lineTo(width / 2 + lineLength / 2, y);
    y += 2;
    finalCtx.stroke();
    y += 10;
  }

  // الرسم الفعلي النهائي
  drawTextFinal(clinicTitle, 32, 'bold', 'center');
  y += 4;
  drawTextFinal(clinicSubtitle, 19, 'normal', 'center');
  y += 14;

  drawTextFinal(clinicName, 30, 'bold', 'center');
  y += 6;
  drawDividerFinal();

  drawTextFinal('رقم الحجز:', 21, 'normal', 'center');
  y += 4;
  drawTextFinal(fullNumber, 70, '600', 'center');
  y += 14;

  if (patientName) {
    drawTextFinal(`اسم المريض: ${patientName}`, 23, 'bold', 'center');
    y += 4;
  }
  drawTextFinal(`المنتظرون أمامك: ${waitingAhead}`, 21, 'bold', 'center');
  y += 6;
  drawDividerFinal();

  drawTextFinal(`${date}   -   ${time}`, 20, 'normal', 'center');
  y += 6;

  drawTextFinal(footerMsg, 18, 'normal', 'center');
  y += 40;

  return finalCanvas;
}

// ——— دالة تحويل الـ Canvas لبايتات ESC/POS كصورة ———
function canvasToEscPosBytes(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height).data;

  const widthBytes = Math.ceil(width / 8);
  const dataBytes = [];

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        let isBlack = 0;
        if (x < width) {
          const idx = (y * width + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];

          // إذا لم يكن البكسل شفافاً، افحص مدى دكانته
          if (a > 50) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            if (gray < 200) { // بكسل أسود
              isBlack = 1;
            }
          }
        }
        byteVal = (byteVal << 1) | isBlack;
      }
      dataBytes.push(byteVal);
    }
  }

  // صياغة أمر طباعة الرسومات النقطية GS v 0
  const xL = widthBytes % 256;
  const xH = Math.floor(widthBytes / 256);
  const yL = height % 256;
  const yH = Math.floor(height / 256);

  const header = [0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH];
  const result = new Uint8Array(header.length + dataBytes.length);
  result.set(header, 0);
  result.set(dataBytes, header.length);
  return result;
}
