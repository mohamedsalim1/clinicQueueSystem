/**
 * AllTicketsPage.jsx — سجل جميع التذاكر مع البحث والتصفية
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import '../styles/QueueTable.css';
import '../styles/ReceptionPage.css';

const getBackendUrl = () => {
  const savedHost = typeof window !== 'undefined' ? localStorage.getItem('host_ip') : null;
  if (savedHost) return `http://${savedHost}:3000`;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  if (typeof window !== 'undefined' && window.__TAURI__) return 'http://localhost:3000';
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3000`;
  return 'http://localhost:3000';
};

const API = `${getBackendUrl()}/api`;

const DEFAULT_CLINICS = [
  { id: '1', name: 'العيادة العامة' },
  { id: '2', name: 'عيادة الأطفال' },
  { id: '3', name: 'عيادة الجلدية' },
  { id: '4', name: 'عيادة القلبية' },
];

const STATUS_MAP = {
  waiting:     { label: 'انتظار',    cls: 'badge-waiting'   },
  called:      { label: 'تم النداء', cls: 'badge-called'    },
  in_progress: { label: 'قيد الفحص',cls: 'badge-progress'  },
  completed:   { label: 'مكتمل',    cls: 'badge-completed' },
  skipped:     { label: 'تخطي',     cls: 'badge-skipped'   },
  cancelled:   { label: 'ملغي',     cls: 'badge-cancelled' },
};

const AllTicketsPage = () => {
  const [tickets,   setTickets]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clinicId,  setClinicId]  = useState('1');
  const [clinics,   setClinics]   = useState(DEFAULT_CLINICS);
  const [search,    setSearch]    = useState('');
  const { addToast } = useToast();

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API}/queue/${clinicId}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      addToast('فشل تحميل التذاكر', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, addToast]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    fetch(`${API}/settings/clinics`)
      .then(r => r.json())
      .then(data => {
        const activeClinics = (data.clinics || DEFAULT_CLINICS).filter(c => c.isActive !== false);
        setClinics(activeClinics);
        if (!activeClinics.some(c => c.id === clinicId) && activeClinics[0]) {
          setClinicId(activeClinics[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = tickets.filter(t =>
    !search ||
    t.fullNumber?.toLowerCase().includes(search.toLowerCase()) ||
    t.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    t.patientPhone?.includes(search)
  );

  return (
    <div className="reception-container" dir="rtl">
      <aside className="rec-sidebar">
        <div className="rec-logo"><span>مركز داريا الطبي</span></div>
        <nav className="rec-nav">
          <Link to="/reception" className="rec-nav-item">الاستقبال</Link>
          <Link to="/doctor"    className="rec-nav-item">الطبيب</Link>
          <Link to="/display"   className="rec-nav-item" target="_blank">شاشة العرض</Link>
          <Link to="/tickets"   className="rec-nav-item active">كل التذاكر</Link>
          <Link to="/settings"  className="rec-nav-item">الإعدادات</Link>
        </nav>
      </aside>

      <main className="rec-main">
        <header className="rec-header">
          <div>
            <h1 className="rec-page-title">سجل التذاكر</h1>
            <p className="rec-page-sub">جميع تذاكر اليوم الحالي</p>
          </div>
          <div className="rec-clinic-switch">
            <label>العيادة:</label>
            <div className="rec-clinic-tabs">
              {clinics.map(c => (
                <button
                  key={c.id}
                  className={`rec-tab ${clinicId === c.id ? 'active' : ''}`}
                  onClick={() => setClinicId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="qt-wrapper">
          <div className="qt-header">
            <div>
              <span className="qt-title">التذاكر</span>
              <span className="qt-count">{filtered.length}</span>
            </div>
            <input
              className="qt-search"
              type="search"
              placeholder="بحث بالاسم أو رقم التذكرة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-outline" onClick={fetchTickets} style={{ fontSize: '0.8rem' }}>
              تحديث
            </button>
          </div>

          {isLoading ? (
            <div className="qt-loading"><div className="qt-spinner" /><span>جاري التحميل...</span></div>
          ) : filtered.length === 0 ? (
            <div className="qt-empty">
              <p>لا توجد تذاكر</p>
            </div>
          ) : (
            <div className="qt-table-wrap">
              <table className="qt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>رقم التذكرة</th>
                    <th>اسم المريض</th>
                    <th>رقم الهاتف</th>
                    <th>العنوان</th>
                    <th>الحالة</th>
                    <th>وقت الإصدار</th>
                    <th>وقت النداء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const s = STATUS_MAP[t.status] || { label: t.status, cls: '' };
                    return (
                      <tr key={t.id} className={t.status === 'called' ? 'qt-row-called' : ''}>
                        <td className="qt-idx">{i + 1}</td>
                        <td className="qt-num">{t.fullNumber || `#${t.number}`}</td>
                        <td className="qt-name">{t.patientName || '—'}</td>
                        <td className="qt-phone" dir="ltr">{t.patientPhone || '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)' }}>{t.patientAddress || '—'}</td>
                        <td><span className={`qt-badge ${s.cls}`}>{s.label}</span></td>
                        <td className="qt-time">
                          {t.createdAt ? new Date(t.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="qt-time">
                          {t.calledAt ? new Date(t.calledAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AllTicketsPage;
