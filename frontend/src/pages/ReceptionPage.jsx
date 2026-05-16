/**
 * ReceptionPage.jsx — لوحة تحكم الاستقبال الذكي (نظام العائلات)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import TakeNumberCard from '../components/TakeNumberCard';
import QueueTable from '../components/QueueTable';
import queueService from '../services/queueService';
import patientService from '../services/patientService';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import '../styles/ReceptionPage.css';

const getBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  if (typeof window !== 'undefined' && window.__TAURI__) return 'http://localhost:3000';
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3000`;
  return 'http://localhost:3000';
};
const API = `${getBackendUrl()}/api`;

const ReceptionPage = () => {
  const [clinicId, setClinicId] = useState('1');
  const [queueItems, setQueueItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState({});
  const [clinics, setClinics] = useState([]);
  const [stats, setStats] = useState({ waiting: 0, called: 0, completed: 0, total: 0 });

  // حالات نظام المرضى والعائلات
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]); 
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // حالات إنشاء مريض جديد
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [currentFamilyId, setCurrentFamilyId] = useState(null); 
  const [newPatientData, setNewPatientData] = useState({ 
    name: '', phone: '', gender: 'MALE', birthDate: '', address: '', relation: 'SELF' 
  });

  const { joinClinic, subscribeTo, isConnected } = useSocket();
  const { addToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetch(`${API}/settings`).then(r => r.json()).then(s => setSettings(s)).catch(() => {});
    queueService.getClinics()
      .then(data => {
        const activeClinics = (data.clinics || []).filter(c => c.isActive !== false);
        setClinics(activeClinics);
        if (!activeClinics.some(c => c.id === clinicId) && activeClinics[0]) setClinicId(activeClinics[0].id);
      }).catch(() => {});
  }, []);

  const fetchQueueData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await queueService.getDisplayData(clinicId);
      const tickets = data.tickets || [];
      const called = data.currentTicket ? 1 : 0;
      setQueueItems(tickets);
      setStats({
        waiting: data.stats?.waiting ?? tickets.filter(t => t.status === 'WAITING').length,
        called: data.stats?.called ?? called,
        completed: data.stats?.completed ?? 0,
        total: data.stats?.total ?? tickets.length,
      });
    } catch { addToast('فشل تحميل بيانات الطابور', 'error'); } 
    finally { setIsLoading(false); }
  }, [clinicId, addToast]);

  useEffect(() => {
    fetchQueueData();
    joinClinic(clinicId);
    const unsub = subscribeTo('queue-updated', (payload) => {
      if (!payload?.clinicId || payload.clinicId === clinicId) {
        setQueueItems(payload?.queue || []);
        fetchQueueData();
      }
    });
    const unsubClinics = subscribeTo('clinics-updated', (payload) => {
      const activeClinics = (payload?.clinics || []).filter(c => c.isActive !== false);
      setClinics(activeClinics);
    });
    return () => { unsub?.(); unsubClinics?.(); };
  }, [clinicId, fetchQueueData, joinClinic, subscribeTo]);

  // 🟢 دالة البحث عن عائلة بالهاتف
  const handleSearchPatient = async () => {
    if (!patientSearch.trim()) return;
    setIsSearching(true);
    try {
      const families = await patientService.searchByPhone(patientSearch);
      setSearchResults(families);
      
      if (families.length === 0) {
        addToast('رقم جديد! قم بإنشاء ملف للعائلة والمريض.', 'info');
        setCurrentFamilyId(null); 
        setNewPatientData(prev => ({ ...prev, phone: patientSearch, relation: 'SELF' }));
        setShowNewPatientForm(true);
      } else {
        setShowNewPatientForm(false);
      }
    } catch (error) {
      addToast('فشل البحث عن المريض', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // 🟢 فتح نموذج إضافة فرد لعائلة موجودة
  const handleOpenAddMember = (familyId) => {
    setCurrentFamilyId(familyId);
    setNewPatientData({ name: '', phone: '', gender: 'MALE', birthDate: '', relation: 'SON' });
    setShowNewPatientForm(true);
  };

  // 🟢 دالة إنشاء مريض (عائلة جديدة أو إضافة فرد)
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (currentFamilyId) {
        result = await patientService.addPatientToFamily({
          familyId: currentFamilyId,
          patientName: newPatientData.name,
          relation: newPatientData.relation,
          gender: newPatientData.gender,
          birthDate: newPatientData.birthDate
        });
        setSelectedPatient(result); // النتيجة هي المريض مباشرة من الباك إند
      } else {
        result = await patientService.createFamilyAndPatient({
          primaryPhone: newPatientData.phone,
          primaryName: newPatientData.name,
          address: newPatientData.address,
          patientName: newPatientData.name,
          gender: newPatientData.gender,
          birthDate: newPatientData.birthDate
        });
        setSelectedPatient(result.patient); // النتيجة تحتوي على { family, patient }
      }
      
      setShowNewPatientForm(false);
      addToast(`تم إنشاء الملف بنجاح: ${result.patient?.fileNumber || result.fileNumber}`, 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'فشل إنشاء المريض', 'error');
    }
  };

  return (
    <div className="reception-container" dir="rtl">
      {/* ——— Sidebar ——— */}
      <aside className="rec-sidebar">
        <div className="rec-logo"><span>مركز داريا الطبي</span></div>
        <nav className="rec-nav">
          <Link to="/reception" className="rec-nav-item active">الاستقبال</Link>
          <Link to="/doctor" className="rec-nav-item">الطبيب</Link>
          <Link to="/display" className="rec-nav-item" target="_blank">شاشة العرض</Link>
          <Link to="/tickets" className="rec-nav-item">كل التذاكر</Link>
          {['ADMIN', 'SUPER_ADMIN'].includes(user?.role) && <Link to="/settings" className="rec-nav-item">الإعدادات</Link>}
        </nav>
        <div className={`rec-conn-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="rec-conn-dot" />{isConnected ? 'متصل' : 'غير متصل'}
        </div>
      </aside>

      {/* ——— Main Content ——— */}
      <main className="rec-main">
        <header className="rec-header">
          <div>
            <h1 className="rec-page-title">لوحة الاستقبال</h1>
            <p className="rec-page-sub">إدارة دور المرضى وإصدار التذاكر</p>
          </div>
          <div className="rec-clinic-switch">
            <label>عرض طابور:</label>
            <div className="rec-clinic-tabs">
              {clinics.map(c => (
                <button key={c.id} className={`rec-tab ${clinicId === c.id ? 'active' : ''}`} onClick={() => setClinicId(c.id)}>
                  <span className="rec-tab-prefix">{c.prefix}</span>{c.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="rec-stats">
          <div className="rec-stat-card waiting"><div className="rec-stat-num">{stats.waiting}</div><div className="rec-stat-label">قيد الانتظار</div></div>
          <div className="rec-stat-card called"><div className="rec-stat-num">{stats.called}</div><div className="rec-stat-label">يُخدَم الآن</div></div>
          <div className="rec-stat-card completed"><div className="rec-stat-num">{stats.completed}</div><div className="rec-stat-label">مكتمل</div></div>
          <div className="rec-stat-card total"><div className="rec-stat-num">{stats.total}</div><div className="rec-stat-label">إجمالي اليوم</div></div>
        </section>

        <div className="rec-grid">
          <div className="rec-left-col">
            
            {/* 🟢 بطاقة البحث عن عائلة */}
            <div className="rec-card rec-patient-search-card">
              <h3 className="rec-card-title">بحث برقم الهاتف</h3>
              <div className="rec-search-row">
                <input
                  type="text"
                  placeholder="09XXXXXXXX"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="rec-input"
                  dir="ltr"
                />
                <button onClick={handleSearchPatient} disabled={isSearching} className="rec-btn rec-btn-primary">
                  {isSearching ? '...' : 'بحث'}
                </button>
              </div>

              {/* عرض نتائج العائلات */}
              {searchResults.length > 0 && (
                <div className="rec-search-results">
                  {searchResults.map(family => (
                    <div key={family.id} className="rec-family-group">
                      <div className="rec-family-header">
                        <span>عائلة: {family.primaryName} ({family.primaryPhone})</span>
                        <button className="rec-add-member-btn" onClick={() => handleOpenAddMember(family.id)}>
                          + إضافة فرد
                        </button>
                      </div>
                      <div className="rec-family-members">
                        {family.patients.map(p => (
                          <div 
                            key={p.id} 
                            className={`rec-patient-item ${selectedPatient?.id === p.id ? 'selected' : ''}`}
                            onClick={() => { setSelectedPatient(p); setPatientSearch(p.fullName); setSearchResults([]); }}
                          >
                            <strong>{p.fullName}</strong> 
                            <span className="rec-relation-tag">({p.relation})</span>
                            <span className="rec-file-num">ملف: {p.fileNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* المريض المختار الحالي */}
              {selectedPatient && (
                <div className="rec-selected-patient">
                  <span>الدور لـ: <strong>{selectedPatient.fullName}</strong> ({selectedPatient.fileNumber})</span>
                  <button onClick={() => { setSelectedPatient(null); setPatientSearch(''); }} className="rec-remove-btn">✕</button>
                </div>
              )}

              {/* نموذج إنشاء مريض / إضافة فرد */}
              {showNewPatientForm && (
                <form onSubmit={handleCreatePatient} className="rec-new-patient-form">
                  <h4>{currentFamilyId ? '➕ إضافة فرد للعائلة' : '🆕 إنشاء عائلة ومريض جديد'}</h4>
                  
                  {!currentFamilyId && (
                    <>
                      <input placeholder="رقم الهاتف" required value={newPatientData.phone} onChange={(e) => setNewPatientData({...newPatientData, phone: e.target.value})} className="rec-input" dir="ltr" />
                      <input placeholder="العنوان" value={newPatientData.address} onChange={(e) => setNewPatientData({...newPatientData, address: e.target.value})} className="rec-input" />
                    </>
                  )}
                  
                  <input placeholder="الاسم الكامل" required value={newPatientData.name} onChange={(e) => setNewPatientData({...newPatientData, name: e.target.value})} className="rec-input" />
                  
                  <select value={newPatientData.relation} onChange={(e) => setNewPatientData({...newPatientData, relation: e.target.value})} className="rec-input">
                    <option value="SELF">رب الأسرة (نفسه)</option>
                    <option value="WIFE">زوجة</option>
                    <option value="HUSBAND">زوج</option>
                    <option value="SON">ابن</option>
                    <option value="DAUGHTER">ابنة</option>
                    <option value="FATHER">أب</option>
                    <option value="MOTHER">أم</option>
                    <option value="OTHER">آخر</option>
                  </select>

                  <select value={newPatientData.gender} onChange={(e) => setNewPatientData({...newPatientData, gender: e.target.value})} className="rec-input">
                    <option value="MALE">ذكر</option>
                    <option value="FEMALE">أنثى</option>
                  </select>

                  <input type="date" value={newPatientData.birthDate} onChange={(e) => setNewPatientData({...newPatientData, birthDate: e.target.value})} className="rec-input" />
                  
                  <button type="submit" className="rec-btn rec-btn-primary" style={{marginTop: '10px'}}>
                    {currentFamilyId ? 'إضافة وتحديد' : 'إنشاء وتحديد'}
                  </button>
                </form>
              )}
            </div>

            {/* إصدار التذكرة */}
            <TakeNumberCard
              onTicketGenerated={fetchQueueData}
              settings={settings}
              clinics={clinics}
              selectedPatient={selectedPatient}
              onClearPatient={() => { setSelectedPatient(null); setPatientSearch(''); setSearchResults([]); }}
            />
          </div>

          {/* جدول الطابور */}
          <div className="rec-queue-panel">
            <QueueTable
              items={queueItems}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              clinicName={clinics.find(c => c.id === clinicId)?.name}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReceptionPage;