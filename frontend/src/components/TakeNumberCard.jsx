/**
 * TakeNumberCard.jsx — بطاقة إصدار التذكرة الاحترافية
 * - لا تصدر تذكرة إلا إذا كان هناك مريض محدد (selectedPatient)
 * - تختار العيادة وتطبع التذكرة المرتبطة بـ patientId
 */
import '../styles/TakeNumberCard.css';

import React, { useState } from 'react';
import queueService from '../services/queueService';
import PrintService from '../services/PrintService';
import { useToast } from '../context/ToastContext';
import ThermalPrintPreview from './ThermalPrintPreview';

const TakeNumberCard = ({ 
  onTicketGenerated, 
  settings = {}, 
  clinics = [],
  selectedPatient = null, 
  onClearPatient = () => {} 
}) => {
  const [clinicId,        setClinicId]        = useState('');
  const [ticket,          setTicket]          = useState(null);
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [showThermalPreview, setShowThermalPreview] = useState(false);
  const { addToast } = useToast();

  const activeClinics = clinics.filter(c => c.isActive !== false);
  const selectedClinic = activeClinics.find(c => c.id === clinicId);

  const handleGenerate = async () => {
    if (!clinicId) return addToast('يرجى اختيار العيادة', 'warning');
    if (!selectedPatient) return addToast('يرجى البحث عن المريض واختياره أولاً', 'warning');

    try {
      setIsGenerating(true);
      
      // إرسال clinicId و patientId فقط كما يريد الباك إند
      const payload = { clinicId, patientId: selectedPatient.id };

      const data = await queueService.takeNumber(payload);
      if (!data?.ticket) throw new Error('لم يتم استلام بيانات التذكرة');

      const ticketData = {
        fullNumber:    data.ticket.fullNumber,
        clinicName:    selectedClinic?.name || data.ticket.clinicName || 'العيادة',
        patientName:   data.ticket.patientName || selectedPatient.fullName,
        waitingAhead:  data.waitingAhead,
      };

      setTicket(ticketData);
      addToast(`تذكرة ${data.ticket.fullNumber} صدرت بنجاح`, 'success');

      // محاولة الطباعة
      try {
        PrintService.setPrinterName(settings.printerName);
        const printResult = await PrintService.printQueueTicket(ticketData, settings);
        if (!printResult.success && printResult.reason === 'thermal-printer-requires-tauri') {
          addToast('تم الإصدار، الطباعة تتطلب تشغيل Tauri', 'warning');
        }
      } catch (printErr) {
        console.error('Print error:', printErr);
      }

      if (onTicketGenerated) onTicketGenerated(data.ticket);

      // تنظيف بعد الإصدار
      setClinicId('');
      if (onClearPatient) onClearPatient();

    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'فشل إصدار التذكرة', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="take-number-card">
      <div className="tnc-header">
        <div>
          <h3 className="tnc-title">إصدار تذكرة</h3>
          <p className="tnc-sub">
            {selectedPatient ? `المريض: ${selectedPatient.fullName} (${selectedPatient.fileNumber})` : '⚠️ لم يتم اختيار مريض بعد'}
          </p>
        </div>
      </div>

      {/* اختيار العيادة */}
      <div className="tnc-clinic-grid">
        {activeClinics.map(c => (
          <button
            key={c.id}
            type="button"
            className={`tnc-clinic-btn ${clinicId === c.id ? 'active' : ''}`}
            onClick={() => setClinicId(c.id)}
            disabled={isGenerating || !selectedPatient} // لا يمكن اختيار عيادة بدون مريض
          >
            <span className="tnc-prefix">{c.prefix}</span>
            <span className="tnc-cname">{c.name}</span>
          </button>
        ))}
      </div>

      {/* عرض بيانات المريض المختار */}
      {selectedPatient && (
        <div className="tnc-selected-patient-box">
          <div className="tnc-sp-info">
            <strong>{selectedPatient.fullName}</strong>
            <span className="tnc-sp-file">{selectedPatient.fileNumber}</span>
          </div>
          <button className="tnc-sp-clear" onClick={onClearPatient} title="إلغاء الربط">
            ✕
          </button>
        </div>
      )}

      <button
        className="tnc-submit-btn"
        onClick={handleGenerate}
        disabled={isGenerating || !clinicId || !selectedPatient} // زر معطل حتى يتم اختيار المريض والعيادة
      >
        {isGenerating ? (
          <><span className="tnc-spinner" /> جاري الإصدار...</>
        ) : (
          <>إصدار وطباعة التذكرة</>
        )}
      </button>

      {/* محاكاة الطباعة الحرارية */}
      {showThermalPreview && ticket && (
        <ThermalPrintPreview
          ticketData={ticket}
          settings={settings}
          onClose={() => setShowThermalPreview(false)}
        />
      )}

      {/* معاينة التذكرة */}
      {ticket && (
        <div className="tnc-preview">
          <div className="tnc-preview-header">
            <div className="tnc-preview-title">{settings.clinicTitle || 'مركز داريا الطبي'}</div>
            <div className="tnc-preview-clinic">{ticket.clinicName}</div>
          </div>
          <div className="tnc-preview-body">
            <div className="tnc-preview-label">رقم الحجز</div>
            <div className="tnc-preview-number">{ticket.fullNumber}</div>
          </div>
          {ticket.patientName && (
            <div className="tnc-preview-patient">
              <span className="tnc-preview-plabel">المريض: </span>
              <strong>{ticket.patientName}</strong>
            </div>
          )}
          <div className="tnc-preview-footer">
            <span>انتظر: <strong>{ticket.waitingAhead}</strong> قبلك</span>
            <div className="tnc-preview-btns">
              <button className="tnc-reprint-btn tnc-preview-sim-btn" onClick={() => setShowThermalPreview(true)}>
                معاينة الطباعة
              </button>
              <button className="tnc-reprint-btn" onClick={async () => {
                  PrintService.setPrinterName(settings.printerName);
                  const result = await PrintService.printQueueTicket(ticket, settings);
                  if (!result.success) addToast('الطباعة تتطلب تشغيل Tauri', 'warning');
              }}>
                إعادة الطباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeNumberCard;