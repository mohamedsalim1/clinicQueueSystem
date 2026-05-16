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

  /** ——— طباعة ESC/POS عبر Tauri ——— */
  async _printViaTauri(ticketData, settings) {
    const escposData = formatTicket({ ...ticketData, settings });
    const invoke = window.__TAURI__.core?.invoke || window.__TAURI__.invoke;

    await invoke('print_raw_data', {
      printerName: this.printerName,
      data: escposData,
    });

    return { success: true, mode: 'tauri-escpos' };
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
