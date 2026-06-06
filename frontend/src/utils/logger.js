/**
 * logger.js — Frontend Logging Utility
 *
 * - داخل Tauri: يستدعي أمر log_frontend_event للكتابة في ملف frontend.log
 * - داخل المتصفح العادي: يطبع في console فقط
 *
 * الملف يُحفظ في:
 *   Linux/macOS: ~/DarayyaClinicLogs/frontend.log
 *   Windows: %LOCALAPPDATA%\DarayyaClinicLogs\frontend.log
 */

const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI__;

/**
 * يرسل سجلاً للـ Rust لحفظه في الملف
 * @param {'INFO'|'WARN'|'ERROR'|'DEBUG'} level
 * @param {string} message
 */
const writeToFile = async (level, message) => {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_frontend_event', { level, message });
  } catch (_) {
    // fail silently — don't spam console with meta-errors
  }
};

/**
 * ينسق البيانات الإضافية لرسالة نصية مضغوطة
 * @param {any[]} args
 * @returns {string}
 */
const formatArgs = (...args) =>
  args
    .map((a) => {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (a instanceof Error) return `${a.message}${a.stack ? ' | ' + a.stack : ''}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (_) { return String(a); }
      }
      return String(a);
    })
    .join(' ');

const timestamp = () => new Date().toISOString();

const logger = {
  info(...args) {
    const msg = formatArgs(...args);
    console.log(`[INFO] ${timestamp()} ${msg}`);
    writeToFile('INFO', msg);
  },

  warn(...args) {
    const msg = formatArgs(...args);
    console.warn(`[WARN] ${timestamp()} ${msg}`);
    writeToFile('WARN', msg);
  },

  error(...args) {
    const msg = formatArgs(...args);
    console.error(`[ERROR] ${timestamp()} ${msg}`);
    writeToFile('ERROR', msg);
  },

  debug(...args) {
    if (import.meta.env.DEV) {
      const msg = formatArgs(...args);
      console.debug(`[DEBUG] ${timestamp()} ${msg}`);
      writeToFile('DEBUG', msg);
    }
  },

  /**
   * مختصر لتسجيل استجابات HTTP/Socket مع حالة الاستجابة
   * @param {string} label
   * @param {any} data
   */
  request(label, data) {
    const msg = `[REQUEST] ${label} → ${formatArgs(data)}`;
    console.log(`[INFO] ${timestamp()} ${msg}`);
    writeToFile('INFO', msg);
  },
};

// تثبيت global error handler لالتقاط الأخطاء غير المتوقعة وتسجيلها
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = `[UNCAUGHT ERROR] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
    writeToFile('ERROR', msg);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? `${event.reason.message} | ${event.reason.stack}`
      : String(event.reason);
    const msg = `[UNHANDLED PROMISE] ${reason}`;
    writeToFile('ERROR', msg);
  });
}

export default logger;
