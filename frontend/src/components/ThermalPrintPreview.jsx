/**
 * ThermalPrintPreview.jsx
 *
 * محاكاة بصرية لورق الطابعة الحرارية 80mm
 * - تُقلِّد مظهر الطابعة الحرارية الحقيقية: خط أحادي، ورق أبيض، محاذاة مركزية
 * - تعرض جميع عناصر التذكرة: العنوان، اسم العيادة، الرقم الكبير، اسم المريض، الوقت، التذييل
 * - زر طباعة المتصفح للمعاينة الفعلية
 * - modal overlay قابل للإغلاق
 */

import React, { useEffect } from 'react';
import '../styles/ThermalPrintPreview.css';

const divider = (char = '-', count = 32) => char.repeat(count);

const ThermalPrintPreview = ({ ticketData, settings = {}, onClose }) => {
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
  const date = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });

  // إغلاق بـ Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePrint = () => window.print();

  return (
    <div className="tpp-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="tpp-modal">

        {/* شريط التحكم */}
        <div className="tpp-toolbar">
          <span className="tpp-toolbar-title">محاكاة الطابعة الحرارية — 80mm</span>
          <div className="tpp-toolbar-actions">
            <button className="tpp-btn-print" onClick={handlePrint}>
              طباعة
            </button>
            <button className="tpp-btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ورق الطابعة الحرارية */}
        <div className="tpp-paper-wrap">
          {/* ورق يخرج من الطابعة */}
          <div className="tpp-printer-body">
            <div className="tpp-printer-slot" />
          </div>

          <div className="tpp-paper print-target" dir="rtl">

            {/* ——— رأس التذكرة ——— */}
            <div className="tpp-section tpp-center tpp-bold tpp-title-lg">
              {clinicTitle}
            </div>
            <div className="tpp-section tpp-center tpp-subtitle">
              {clinicSubtitle}
            </div>
            <div className="tpp-spacer" />

            {/* ——— اسم العيادة ——— */}
            <div className="tpp-section tpp-center tpp-bold tpp-clinic-name">
              {clinicName}
            </div>
            <div className="tpp-divider">{divider('=')}</div>
            <div className="tpp-spacer" />

            {/* ——— تسمية رقم الحجز ——— */}
            <div className="tpp-section tpp-center tpp-label-sm">
              رقم الحجز:
            </div>
            <div className="tpp-spacer" />

            {/* ——— الرقم الكبير ——— */}
            <div className="tpp-section tpp-center tpp-number-xl tpp-bold">
              {fullNumber}
            </div>
            <div className="tpp-spacer" />

            {/* ——— اسم المريض ——— */}
            {patientName && (
              <>
                <div className="tpp-divider">{divider('-')}</div>
                <div className="tpp-section tpp-right tpp-label-sm">اسم المريض:</div>
                <div className="tpp-section tpp-right tpp-bold">{patientName}</div>
              </>
            )}

            {/* ——— عدد المنتظرين ——— */}
            <div className="tpp-divider">{divider('-')}</div>
            <div className="tpp-section tpp-right">
              المنتظرون أمامك: <strong>{waitingAhead}</strong>
            </div>

            {/* ——— الوقت والتاريخ ——— */}
            <div className="tpp-divider">{divider('-')}</div>
            <div className="tpp-section tpp-center">{time}</div>
            <div className="tpp-section tpp-center">{date}</div>
            <div className="tpp-divider">{divider('-')}</div>
            <div className="tpp-spacer" />

            {/* ——— رسالة التذييل ——— */}
            <div className="tpp-section tpp-center tpp-footer-msg">
              {footerMsg}
            </div>
            <div className="tpp-spacer" />
            <div className="tpp-spacer" />

            {/* ——— خط القطع ——— */}
            <div className="tpp-cut-line">
              <span className="tpp-cut-icon">✂</span>
              <div className="tpp-cut-dashes" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ThermalPrintPreview;
