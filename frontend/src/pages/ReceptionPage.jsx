import React, { useState, useEffect, useCallback } from 'react';
import TakeNumberCard from '../components/TakeNumberCard';
import QueueTable from '../components/QueueTable';
import queueService from '../services/queueService';
import patientService from '../services/patientService';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { getApiBaseURL } from '../config/network';
import logger from '../utils/logger';
import '../styles/ReceptionPage.css';

const API = getApiBaseURL();

const ReceptionPage = () => {
  const [clinicId, setClinicId] = useState('1');
  const [queueItems, setQueueItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState({});
  const [clinics, setClinics] = useState([]);
  const [stats, setStats] = useState({ waiting: 0, called: 0, completed: 0, total: 0 });

  const [activeTab, setActiveTab] = useState('booking');

  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]); 
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [currentFamilyId, setCurrentFamilyId] = useState(null); 
  const [isWalkIn, setIsWalkIn] = useState(false); // ✨ دخول مباشر بدون هاتف
  const [newPatientData, setNewPatientData] = useState({ 
    name: '',
    patientName: '',
    phone: '', 
    gender: 'MALE', 
    birthDate: '', 
    address: '', 
    relation: 'SELF',
    isPatientHead: true
  });

  const { joinClinic, subscribeTo, isConnected } = useSocket();
  const { addToast } = useToast();

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

  const handleSearchPatient = async () => {
    if (!patientSearch.trim()) return;
    setIsSearching(true);
    try {
      const families = await patientService.searchByPhone(patientSearch);
      setSearchResults(families);
      if (families.length === 0) {
        addToast('رقم جديد! قم بإنشاء ملف للعائلة والمريض.', 'info');
        setCurrentFamilyId(null);
        setIsWalkIn(false);
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

  // ✨ فتح نموذج الدخول المباشر (بدون هاتف)
  const handleWalkIn = () => {
    setCurrentFamilyId(null);
    setIsWalkIn(true);
    setSearchResults([]);
    setSelectedPatient(null);
    setNewPatientData({ name: '', patientName: '', phone: '', gender: 'MALE', birthDate: '', address: '', relation: 'SELF', isPatientHead: true });
    setShowNewPatientForm(true);
  };

  const handleOpenAddMember = (familyId) => {
    setCurrentFamilyId(familyId);
    setNewPatientData({ name: '', phone: '', gender: 'MALE', birthDate: '', relation: 'SON' });
    setShowNewPatientForm(true);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (currentFamilyId) {
        // إضافة فرد لعائلة موجودة
        const familyName = searchResults.find(family => family.id === currentFamilyId)?.primaryName;
        result = await patientService.addPatientToFamily({
          familyId: currentFamilyId, 
          patientName: newPatientData.patientName,
          relation: newPatientData.relation, 
          gender: newPatientData.gender, 
          birthDate: newPatientData.birthDate
        });
        setSelectedPatient({ ...result, fileDisplayName: familyName || result.fullName });
      } else {
        // إنشاء عائلة جديدة ومريض
        result = await patientService.createFamilyAndPatient({
          primaryPhone: newPatientData.phone, 
          primaryName: newPatientData.name, // اسم رب الأسرة
          address: newPatientData.address,
          patientName: newPatientData.isPatientHead ? newPatientData.name : newPatientData.patientName, // ✨ اسم المريض
          gender: newPatientData.gender, 
          birthDate: newPatientData.birthDate
        });
        setSelectedPatient({ ...result.patient, fileDisplayName: result.family?.primaryName || result.patient?.fullName });
      }
      setShowNewPatientForm(false);
      addToast(`تم إنشاء الملف بنجاح: ${result.patient?.fileNumber || result.fileNumber}`, 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'فشل إنشاء المريض', 'error');
    }
  };

  const handleQueueAction = async (actionFn, successMsg) => {
    try {
      setIsActionLoading(true);
      await actionFn(clinicId);
      addToast(successMsg, 'success');
      fetchQueueData();
    } catch (err) {
      addToast(err.response?.data?.message || 'فشلت العملية', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const tabStyle = (isActive) => ({
    padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 700, border: 'none',
    background: isActive ? 'var(--clr-primary)' : 'transparent',
    color: isActive ? '#fff' : 'var(--clr-text-muted)',
    borderBottom: isActive ? '3px solid var(--clr-primary)' : '3px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s'
  });

  // ✨ مكون فلتر العيادات الذي يظهر فوق الجدول
  const ClinicFilterBar = () => (
    <div style={{
      display: 'flex', gap: '0.4rem', padding: '0.75rem 1rem', background: 'var(--clr-bg-card)',
      borderRadius: 'var(--rad-md) var(--rad-md) 0 0', borderBottom: '2px solid var(--clr-border)',
      flexWrap: 'wrap', alignItems: 'center'
    }}>
      <span style={{ marginLeft: '1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>عرض طابور:</span>
      {clinics.map(c => (
        <button key={c.id} className={`rec-tab ${clinicId === c.id ? 'active' : ''}`} onClick={() => setClinicId(c.id)}>
          <span className="rec-tab-prefix">{c.prefix}</span>
          <span style={{fontSize: '0.8rem'}}>{c.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <header className="rec-header">
        <div>
          <h1 className="rec-page-title">لوحة الاستقبال</h1>
          <p className="rec-page-sub">إدارة دور المرضى وإصدار التذاكر</p>
        </div>
        {/* تم إزالة تبديل العيادات من هنا */}
      </header>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--clr-border)', marginBottom: '2rem' }}>
        <button style={tabStyle(activeTab === 'booking')} onClick={() => setActiveTab('booking')}>🎫 إصدار التذاكر</button>
        <button style={tabStyle(activeTab === 'queue')} onClick={() => setActiveTab('queue')}>📊 إدارة الطابور</button>
      </div>

      {activeTab === 'booking' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="rec-card rec-patient-search-card">
              <h3 className="rec-card-title">بحث برقم الهاتف</h3>
              <div className="rec-search-row">
                <input 
                  type="text" 
                  placeholder="رقم الهاتف أو الاسم" 
                  value={patientSearch} 
                  onChange={(e) => setPatientSearch(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                  className="rec-input" 
                  dir="ltr" 
                />
                <button onClick={handleSearchPatient} disabled={isSearching} className="rec-btn rec-btn-primary">{isSearching ? '...' : 'بحث'}</button>
              </div>
              {/* ✨ زر الدخول المباشر بدون هاتف */}
              <button
                onClick={handleWalkIn}
                className="rec-btn"
                style={{
                  width: '100%', marginTop: '0.5rem',
                  background: '#6b7280', color: '#fff',
                  border: '2px dashed #9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: 700, fontSize: '0.9rem'
                }}
                title="للمرضى الكبار بالسن أو من لا يملكون هاتفاً"
              >
                👤 دخول مباشر (بدون هاتف)
              </button>

              {searchResults.length > 0 && (
                <div className="rec-search-results">
                  {searchResults.map(family => (
                    <div key={family.id} className="rec-family-group">
                      <div className="rec-family-header">
                        <span>عائلة: {family.primaryName}</span>
                        <button className="rec-add-member-btn" onClick={() => handleOpenAddMember(family.id)}>+ إضافة فرد</button>
                      </div>
                      <div className="rec-family-members">
                        {family.patients.map(p => (
                          <div key={p.id} className={`rec-patient-item ${selectedPatient?.id === p.id ? 'selected' : ''}`}
                            onClick={() => { setSelectedPatient({ ...p, fileDisplayName: family.primaryName }); setPatientSearch(p.fullName); setSearchResults([]); }}>
                            <strong>{p.fullName}</strong> <span className="rec-relation-tag">({p.relation})</span>
                            <span className="rec-file-num">ملف: {family.primaryName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <div className="rec-selected-patient">
                  <span>الدور لـ: <strong>{selectedPatient.fullName}</strong> | ملف: {selectedPatient.fileDisplayName || selectedPatient.fullName} | مرجع: {selectedPatient.fileNumber}</span>
                  <button onClick={() => { setSelectedPatient(null); setPatientSearch(''); }} className="rec-remove-btn">✕</button>
                </div>
              )}

                            {showNewPatientForm && (
                <form onSubmit={handleCreatePatient} className="rec-new-patient-form">
                  <h4>
                    {currentFamilyId ? '➕ إضافة فرد للعائلة' :
                     isWalkIn ? '👤 دخول مباشر — إنشاء ملف جديد' :
                     'إنشاء ملف جديد'}
                  </h4>
                  {isWalkIn && (
                    <div style={{ background: '#1e293b', border: '1px solid #f59e0b', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#fbbf24' }}>
                      ⚠️ وضع الدخول المباشر: رقم الهاتف اختياري
                    </div>
                  )}
                  
                  {!currentFamilyId && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input 
                          type="checkbox" 
                          id="isHeadCheck"
                          checked={newPatientData.isPatientHead} 
                          onChange={(e) => setNewPatientData({...newPatientData, isPatientHead: e.target.checked, patientName: e.target.checked ? newPatientData.name : newPatientData.patientName})} 
                        />
                        <label htmlFor="isHeadCheck" style={{fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer'}}>
                          المريض هو نفسه رب الأسرة
                        </label>
                      </div>

                      {/* ✨ حقل الهاتف اختياري في وضع الدخول المباشر */}
                      <input
                        placeholder={isWalkIn ? 'رقم الهاتف (اختياري)' : 'رقم الهاتف'}
                        required={!isWalkIn}
                        value={newPatientData.phone}
                        onChange={(e) => setNewPatientData({...newPatientData, phone: e.target.value})}
                        className="rec-input"
                        dir="ltr"
                      />
                      
                      {/* حقل اسم رب الأسرة */}
                      <input 
                        placeholder="اسم رب الأسرة (الأب/الأم)" 
                        required 
                        value={newPatientData.name} 
                        onChange={(e) => {
                          const n = e.target.value;
                          // إذا كان المريض هو رب الأسرة، حدث الاسمين معاً
                          if (newPatientData.isPatientHead) {
                            setNewPatientData({...newPatientData, name: n, patientName: n});
                          } else {
                            setNewPatientData({...newPatientData, name: n});
                          }
                        }} 
                        className="rec-input" 
                      />

                      {/* إظهار حقل اسم المريض فقط إذا لم يكن هو رب الأسرة */}
                      {!newPatientData.isPatientHead && (
                        <input 
                          placeholder="اسم المريض (الابن/الزوجة...)" 
                          required 
                          value={newPatientData.patientName} 
                          onChange={(e) => setNewPatientData({...newPatientData, patientName: e.target.value})} 
                          className="rec-input" 
                        />
                      )}

                      <input placeholder="العنوان" value={newPatientData.address} onChange={(e) => setNewPatientData({...newPatientData, address: e.target.value})} className="rec-input" />
                    </>
                  )}

                  {/* إذا كنا نضيف لعائلة موجودة */}
                  {currentFamilyId && (
                    <input placeholder="اسم المريض" required value={newPatientData.patientName} onChange={(e) => setNewPatientData({...newPatientData, patientName: e.target.value})} className="rec-input" />
                  )}
                    
                  <select value={newPatientData.relation} onChange={(e) => {
                    const rel = e.target.value;
                    let gen = newPatientData.gender;
                    // ✨ مزامنة الجنس تلقائياً
                    if (rel === 'WIFE' || rel === 'DAUGHTER' || rel === 'MOTHER') gen = 'FEMALE';
                    else if (rel === 'HUSBAND' || rel === 'SON' || rel === 'FATHER') gen = 'MALE';
                    
                    setNewPatientData({...newPatientData, relation: rel, gender: gen});
                  }} className="rec-input">
                    <option value="SELF">رب الأسرة</option>
                    <option value="WIFE">زوجة</option>
                    <option value="HUSBAND">زوج</option>
                    <option value="SON">ابن</option>
                    <option value="DAUGHTER">ابنة</option>
                    <option value="FATHER">أب</option>      {/* ✨ تمت الإضافة */}
                    <option value="MOTHER">أم</option>     {/* ✨ تمت الإضافة */}
                    <option value="OTHER">آخر</option>
                  </select>
                  
                  <select value={newPatientData.gender} onChange={(e) => setNewPatientData({...newPatientData, gender: e.target.value})} className="rec-input">
                    <option value="MALE">ذكر</option><option value="FEMALE">أنثى</option>
                  </select>
                  
                  <input type="date" dir="ltr" value={newPatientData.birthDate} onChange={(e) => setNewPatientData({...newPatientData, birthDate: e.target.value})} className="rec-input" />
                  
                  <button type="submit" className="rec-btn rec-btn-primary" style={{marginTop: '10px'}}>
                    {currentFamilyId ? 'إضافة وتحديد' : 'إنشاء وتحديد'}
                  </button>
                </form>
              )}
            </div>

            <TakeNumberCard
              onTicketGenerated={fetchQueueData}
              settings={settings}
              clinics={clinics}
              selectedPatient={selectedPatient}
              onClearPatient={() => { setSelectedPatient(null); setPatientSearch(''); setSearchResults([]); }}
            />
          </div>

          {/* ✨ الجدول مع الفلتر فوقه مباشرة */}
          <div className="rec-queue-panel">
            <ClinicFilterBar />
            <div style={{ borderRadius: '0 0 var(--rad-md) var(--rad-md)', overflow: 'hidden' }}>
              <QueueTable items={queueItems} isLoading={isLoading} searchTerm={searchTerm} onSearchChange={setSearchTerm} clinicName={clinics.find(c => c.id === clinicId)?.name} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <>
          <section className="rec-stats">
            <div className="rec-stat-card waiting"><div className="rec-stat-num">{stats.waiting}</div><div className="rec-stat-label">قيد الانتظار</div></div>
            <div className="rec-stat-card called"><div className="rec-stat-num">{stats.called}</div><div className="rec-stat-label">يُخدَم الآن</div></div>
            <div className="rec-stat-card completed"><div className="rec-stat-num">{stats.completed}</div><div className="rec-stat-label">مكتمل</div></div>
            <div className="rec-stat-card total"><div className="rec-stat-num">{stats.total}</div><div className="rec-stat-label">إجمالي اليوم</div></div>
          </section>

          <div style={{ display: 'flex', gap: '0.5rem', marginBlock: '1.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={isActionLoading} onClick={() => handleQueueAction(queueService.nextPatient, 'تم استدعاء التالي')}>⏭ استدعاء التالي</button>
            <button className="btn" disabled={isActionLoading} onClick={() => handleQueueAction(queueService.recallCurrentPatient, 'إعادة النداء')} style={{background: '#f59e0b', color: '#fff'}}>🔊 إعادة نداء</button>
            <button className="btn btn-danger" disabled={isActionLoading} onClick={() => handleQueueAction(queueService.skipPatient, 'تم التخطي')}>⏩ تخطي المريض</button>
            <button className="btn" style={{background: '#10b981', color: '#fff'}} disabled={isActionLoading} onClick={() => handleQueueAction(queueService.completePatient, 'تم إتمام الزيارة')}>✅ إتمام الزيارة</button>
          </div>

          {/* ✨ الجدول مع الفلتر فوقه مباشرة */}
          <div className="rec-queue-panel" style={{maxWidth: '100%'}}>
            <ClinicFilterBar />
            <div style={{ borderRadius: '0 0 var(--rad-md) var(--rad-md)', overflow: 'hidden' }}>
              <QueueTable items={queueItems} isLoading={isLoading} searchTerm={searchTerm} onSearchChange={setSearchTerm} clinicName={clinics.find(c => c.id === clinicId)?.name} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ReceptionPage;
