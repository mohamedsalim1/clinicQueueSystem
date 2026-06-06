/**
 * DoctorMobilePage.jsx — صفحة الطبيب على الموبايل (PWA)
 * بسيطة، خفيفة، مُحسَّنة للمس، تعمل offline
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../services/apiClient';
import { useSocket } from '../context/SocketContext';
import '../styles/DoctorMobilePage.css';

// ─────────────────────────────────────────────────────────
const DoctorMobilePage = () => {
  const { isConnected, joinClinic, subscribeTo } = useSocket();
  const [clinics, setClinics] = useState([]);
  const [clinicId, setClinicId] = useState('');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [stats, setStats] = useState({ waiting: 0, serving: 0, done: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [recallLocked, setRecallLocked] = useState(false);
  const [actionMsg, setActionMsg] = useState(null); // {text, type}

  const recallTimerRef = useRef(null);
  const msgTimerRef = useRef(null);

  // ── Toast-like message ──────────────────────────────────
  const showMsg = (text, type = 'info') => {
    setActionMsg({ text, type });
    clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setActionMsg(null), 2500);
  };

  // ── PWA install prompt ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Online/Offline  ──────────────────────────────────────
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Load clinics ────────────────────────────────────────
  useEffect(() => {
    const loadDoctorClinics = async () => {
      try {
        const res = await apiClient.get('/settings/clinics');
        const active = (res.data.clinics || []).filter(c => c.isActive !== false);

        setClinics(active);
        if (active.length > 0) {
          const saved = localStorage.getItem('dm_clinicId');
          const found = active.find(c => String(c.id) === String(saved));
          setClinicId(found ? found.id : active[0].id);
        } else {
          setClinicId('');
          showMsg('لا توجد عيادة مربوطة بهذا الطبيب', 'error');
        }
      } catch {
        showMsg('فشل تحميل عيادات الطبيب', 'error');
      }
    };

    loadDoctorClinics();
  }, []);

  // ── Fetch queue data ────────────────────────────────────
  const refreshData = useCallback(async () => {
    if (!clinicId) return;
    try {
      const { data } = await apiClient.get(`/queue/current/${clinicId}`);
      setCurrentTicket(data.currentTicket || null);
      const tickets = data.tickets || [];
      setWaitingList(tickets.filter(t => t.status === 'WAITING').slice(0, 8));
      setStats({
        waiting: data.stats?.waiting ?? tickets.filter(t => t.status === 'WAITING').length,
        serving: data.stats?.called ?? (data.currentTicket ? 1 : 0),
        done: data.stats?.completed ?? 0,
      });
    } catch { /* offline — keep last state */ }
  }, [clinicId]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // ── Socket.io ───────────────────────────────────────────
  useEffect(() => {
    if (!clinicId) return;
    localStorage.setItem('dm_clinicId', clinicId);
    joinClinic(clinicId);
    const unsubscribe = subscribeTo('queue-updated', (payload) => {
      if (!payload?.clinicId || String(payload.clinicId) === String(clinicId)) refreshData();
    });
    return unsubscribe;
  }, [clinicId, refreshData, joinClinic, subscribeTo, isConnected]);

  // ── Queue actions ───────────────────────────────────────
  const doAction = async (path, method = 'POST', successMsg) => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      await apiClient({ url: path, method, data: { clinicId } });
      showMsg(successMsg, 'success');
      await refreshData();
    } catch {
      showMsg('فشلت العملية، تحقق من الاتصال', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => doAction('/queue/next', 'POST', '✅ تم استدعاء التالي');
  const handleSkip = () => doAction('/queue/skip', 'POST', '⏩ تم التخطي');
  const handleComplete = () => doAction('/queue/complete', 'POST', '✅ تم إتمام الزيارة');

  const handleRecall = async () => {
    if (!currentTicket || recallLocked || isLoading) return;
    setRecallLocked(true);
    try {
      await apiClient.post('/queue/recall', { clinicId });
      showMsg('🔊 تم إرسال النداء', 'success');
    } catch {
      showMsg('فشل النداء', 'error');
    }
    clearTimeout(recallTimerRef.current);
    recallTimerRef.current = setTimeout(() => setRecallLocked(false), 7000);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const selectedClinic = clinics.find(c => c.id === clinicId);
  const patientName = currentTicket?.patientName || currentTicket?.patient?.fullName || '';
  const fileNumber = currentTicket?.patient?.fileNumber || '';

  return (
    <div className="dm-page">

      {/* ── Offline Banner ── */}
      {!isOnline && (
        <div className="dm-offline-bar">⚠️ لا يوجد اتصال بالإنترنت — عرض آخر بيانات</div>
      )}

      {/* ── Toast Message ── */}
      {actionMsg && (
        <div style={{
          position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, background: actionMsg.type === 'error' ? '#ef4444' : '#22c55e',
          color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '999px',
          fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap', animation: 'fadeIn 0.2s',
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* ── Header ── */}
      <header className="dm-header">
        <span className="dm-header-title">
          🏥 {selectedClinic?.name || 'طابور الطبيب'}
        </span>
        <div className={`dm-conn-badge ${isConnected ? 'on' : ''}`}>
          <span className="dm-conn-dot" />
          {isConnected ? 'متصل' : 'غير متصل'}
        </div>
      </header>

      {/* ── Clinic Selector ── */}
      {clinics.length > 1 && (
        <div className="dm-clinic-bar">
          <select
            id="dm-clinic-select"
            className="dm-clinic-select"
            value={clinicId}
            onChange={e => setClinicId(e.target.value)}
          >
          {clinics.map(c => (
              <option key={c.id} value={c.id}>
                {c.prefix} — {c.nameAr || c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {clinics.length === 0 && (
        <div className="dm-queue-section">
          <div className="dm-queue-title">لا توجد عيادة متاحة لهذا الحساب</div>
        </div>
      )}

      {/* ── Current Patient Card ── */}
      <div className="dm-current-card">
        {currentTicket ? (
          <>
            <div className="dm-ticket-num">{currentTicket.fullNumber}</div>
            {patientName && <div className="dm-patient-name">{patientName}</div>}
            {fileNumber && <div className="dm-patient-file">ملف: {fileNumber}</div>}
          </>
        ) : (
          <>
            <div className="dm-ticket-num idle">—</div>
            <div className="dm-idle-hint">اضغط «التالي» لاستدعاء أول مريض</div>
          </>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="dm-stats-row">
        <div className="dm-stat waiting">
          <div className="dm-stat-num">{stats.waiting}</div>
          <div className="dm-stat-label">انتظار</div>
        </div>
        <div className="dm-stat serving">
          <div className="dm-stat-num">{stats.serving}</div>
          <div className="dm-stat-label">يُخدَم</div>
        </div>
        <div className="dm-stat done">
          <div className="dm-stat-num">{stats.done}</div>
          <div className="dm-stat-label">أُنجز</div>
        </div>
      </div>

      {/* ── Control Buttons ── */}
      <div className="dm-controls">
        <button
          id="dm-btn-next"
          className="dm-btn next"
          onClick={handleNext}
          disabled={isLoading || !clinicId}
        >
          <span className="dm-btn-icon">⏭</span>
          التالي
        </button>

        <button
          id="dm-btn-recall"
          className="dm-btn recall"
          onClick={handleRecall}
          disabled={!clinicId || !currentTicket || recallLocked || isLoading}
        >
          <span className="dm-btn-icon">🔊</span>
          {recallLocked ? 'نداء...' : 'نداء'}
        </button>

        <button
          id="dm-btn-skip"
          className="dm-btn skip"
          onClick={handleSkip}
          disabled={isLoading || !clinicId}
        >
          <span className="dm-btn-icon">⏩</span>
          تخطي
        </button>

        <button
          id="dm-btn-complete"
          className="dm-btn complete"
          onClick={handleComplete}
          disabled={isLoading || !clinicId}
        >
          <span className="dm-btn-icon">✅</span>
          إتمام الزيارة
        </button>
      </div>

      {/* ── PWA Install Banner ── */}
      {installPrompt && (
        <div className="dm-install-bar">
          <span className="dm-install-text">📲 ثبّت التطبيق على هاتفك للاستخدام السريع</span>
          <button className="dm-install-btn" onClick={handleInstall}>تثبيت</button>
        </div>
      )}

      {/* ── Waiting Queue Preview ── */}
      {waitingList.length > 0 && (
        <div className="dm-queue-section">
          <div className="dm-queue-title">قائمة الانتظار ({stats.waiting})</div>
          <div className="dm-queue-list">
            {waitingList.map(t => (
              <div key={t.id} className="dm-queue-item">
                <span className="dm-queue-num">{t.fullNumber}</span>
                <span className="dm-queue-name">
                  {t.patientName || t.patient?.fullName || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorMobilePage;
