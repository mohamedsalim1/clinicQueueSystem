/**
 * DoctorPage.jsx
 *
 * واجهة الطبيب:
 * - عرض المريض الحالي بخط كبير واضح
 * - أزرار التحكم: التالي / إعادة نداء / تخطي / إتمام
 * - اختصارات لوحة المفاتيح
 * - تحديث لحظي
 */

import React, { useState, useEffect, useCallback } from 'react';
import DoctorControls from '../components/DoctorControls';
import queueService from '../services/queueService';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import '../styles/DoctorPage.css';

const DEFAULT_CLINICS = [
  { id: '1', name: 'العيادة العامة',  prefix: 'A' },
  { id: '2', name: 'عيادة الأطفال',  prefix: 'B' },
  { id: '3', name: 'عيادة الجلدية',  prefix: 'C' },
  { id: '4', name: 'عيادة القلبية',  prefix: 'D' },
];

const DoctorPage = () => {
  const [clinicId,      setClinicId]      = useState('1');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [waitingList,   setWaitingList]   = useState([]);
  const [clinics,       setClinics]       = useState(DEFAULT_CLINICS);
  const [isLoading,     setIsLoading]     = useState(false);

  const { joinClinic, subscribeTo, isConnected } = useSocket();
  const { addToast } = useToast();

  const selectedClinic = clinics.find(c => c.id === clinicId);

  const refreshData = useCallback(async () => {
    try {
      const data = await queueService.getDisplayData(clinicId);
      setCurrentTicket(data.currentTicket || null);
      setWaitingList(data.tickets || []);
    } catch (err) {
      console.error('Doctor refresh error:', err);
    }
  }, [clinicId]);

  useEffect(() => {
    queueService.getClinics()
      .then(data => {
        const activeClinics = (data.clinics || DEFAULT_CLINICS).filter(c => c.isActive !== false);
        setClinics(activeClinics);
        if (!activeClinics.some(c => c.id === clinicId) && activeClinics[0]) {
          setClinicId(activeClinics[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshData();
    joinClinic(clinicId);

    const unsub = subscribeTo('queue-updated', (payload) => {
      if (!payload?.clinicId || payload.clinicId === clinicId) {
        refreshData();
      }
    });

    const unsubCall = subscribeTo('current-number', (payload) => {
      if (payload && (!payload.clinicId || payload.clinicId === clinicId)) {
        setCurrentTicket(payload);
      }
    });

    const unsubClinics = subscribeTo('clinics-updated', (payload) => {
      const activeClinics = (payload?.clinics || DEFAULT_CLINICS).filter(c => c.isActive !== false);
      setClinics(activeClinics);
      if (!activeClinics.some(c => c.id === clinicId) && activeClinics[0]) {
        setClinicId(activeClinics[0].id);
      }
    });

    return () => { unsub?.(); unsubCall?.(); unsubClinics?.(); };
  }, [clinicId, refreshData, joinClinic, subscribeTo]);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case 'n': handleAction(queueService.nextPatient,    'تم استدعاء التالي'); break;
        case 'r': handleAction(queueService.recallCurrentPatient,  'تمت إعادة النداء'); break;
        case 's': handleAction(queueService.skipPatient,    'تم تخطي المريض');   break;
        case 'c': handleAction(queueService.completePatient,'تمت الزيارة');       break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clinicId]); // eslint-disable-line

  const handleAction = async (actionFn, successMsg) => {
    try {
      setIsLoading(true);
      await actionFn(clinicId);
      addToast(successMsg, 'success');
      await refreshData();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'فشلت العملية', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="doctor-layout" dir="rtl">
      {/* ——— Clinic Selector ——— */}
      <div className="dr-clinic-bar">
        {clinics.map(c => (
          <button
            key={c.id}
            className={`dr-clinic-tab ${clinicId === c.id ? 'active' : ''}`}
            onClick={() => setClinicId(c.id)}
          >
            <span className="dr-tab-prefix">{c.prefix}</span>
            <span className="dr-tab-name">{c.name}</span>
          </button>
        ))}

        <div className={`dr-conn-badge ${isConnected ? 'ok' : 'err'}`}>
          {isConnected ? 'متصل' : 'غير متصل'}
        </div>
      </div>

      {/* ——— Main Area ——— */}
      <div className="dr-main">
        {/* Current Patient Hero */}
        <section className="dr-hero">
          <div className="dr-hero-label">
            {selectedClinic?.name}
          </div>

          <div className="dr-number-display">
            {currentTicket ? (
              <>
                <div className="dr-now-label">المريض الحالي</div>
                <div className="dr-big-number">{currentTicket.fullNumber}</div>
                {currentTicket.patientName && (
                  <div className="dr-patient-name">{currentTicket.patientName}</div>
                )}
              </>
            ) : (
              <>
                <div className="dr-now-label">لا يوجد مريض حالياً</div>
                <div className="dr-big-number dr-idle">--</div>
              </>
            )}
          </div>

          <DoctorControls
            isLoading={isLoading}
            hasCurrentPatient={!!currentTicket}
            onNext={()     => handleAction(queueService.nextPatient,    'تم استدعاء التالي')}
            onRecall={()   => handleAction(queueService.recallCurrentPatient,  'تمت إعادة النداء')}
            onSkip={()     => handleAction(queueService.skipPatient,    'تم تخطي المريض')}
            onComplete={() => handleAction(queueService.completePatient,'تمت الزيارة')}
          />
        </section>

        {/* ——— Sidebar ——— */}
        <aside className="dr-sidebar">
          {/* إحصائيات */}
          <div className="dr-stat-panel">
            <div className="dr-stat-num">{waitingList.length}</div>
            <div className="dr-stat-label">قيد الانتظار</div>
          </div>

          {/* قائمة الانتظار المصغرة */}
          <div className="dr-waiting-panel">
            <div className="dr-panel-title">الطابور</div>
            {waitingList.length === 0 ? (
              <div className="dr-empty">لا يوجد انتظار</div>
            ) : (
              <div className="dr-waiting-list">
                {waitingList.slice(0, 8).map((t, i) => (
                  <div key={t.id} className={`dr-waiting-item ${i === 0 ? 'next' : ''}`}>
                    <span className="dr-w-num">{t.fullNumber}</span>
                    {t.patientName && <span className="dr-w-name">{t.patientName}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* اختصارات */}
          <div className="dr-shortcuts-panel">
            <div className="dr-panel-title">اختصارات</div>
            <div className="dr-shortcuts">
              <div className="dr-shortcut"><kbd>N</kbd> التالي</div>
              <div className="dr-shortcut"><kbd>R</kbd> إعادة نداء</div>
              <div className="dr-shortcut"><kbd>S</kbd> تخطي</div>
              <div className="dr-shortcut"><kbd>C</kbd> إتمام</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DoctorPage;
