import React, { useState, useEffect, useCallback, useRef } from 'react';
import QueueTable from '../components/QueueTable';
import SmartDropdown from '../components/SmartDropdown'; // ✨ المكون الجديد
import queueService from '../services/queueService';
import visitService from '../services/visitService';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import '../styles/DoctorPage.css';

const COMPLAINTS_LIST = [
  'حمى وارتفاع حرارة', 'تعب عام ووهن', 'صداع حاد', 'صداع نصفي متكرر', 'دوخة أو دوار',
  'ألم صدري', 'ضيق نفس', 'خفقان', 'سعال جاف', 'سعال مع بلغم', 'ألم حلق وصعوبة بلع',
  'سيلان أو احتقان أنف', 'ألم أذن', 'ألم بطن عام', 'ألم شرسوفي/حموضة', 'غثيان وقيء',
  'إسهال حاد', 'إمساك', 'ألم عند التبول', 'كثرة تبول', 'ألم أسفل الظهر',
  'ألم مفصلي', 'تورم مفصل', 'طفح جلدي', 'حكة جلدية', 'احمرار العين', 'نقص شهية',
  'أرق واضطراب نوم', 'قلق وتوتر', 'متابعة مرض مزمن', 'مراجعة نتائج تحاليل'
];

const DIAGNOSIS_LIST = [
  'التهاب طرق تنفسية علوية حاد', 'التهاب بلعوم/لوزات', 'التهاب جيوب أنفية', 'التهاب قصبات حاد',
  'ربو قصبي - نوبة خفيفة/متوسطة', 'ذات رئة مشتبهة', 'تحسس أنفي', 'التهاب أذن وسطى',
  'التهاب ملتحمة', 'صداع توتري', 'صداع نصفي', 'دوار دهليزي', 'ارتفاع ضغط شرياني',
  'سكري نمط 2 - متابعة', 'اضطراب شحوم الدم', 'فقر دم مشتبه', 'التهاب معدة وأمعاء حاد',
  'ارتجاع معدي مريئي', 'قولون عصبي', 'إمساك وظيفي', 'التهاب مسالك بولية',
  'مغص كلوي مشتبه', 'ألم قطني ميكانيكي', 'تشنج عضلي', 'خشونة مفاصل', 'التهاب مفصل',
  'التهاب جلد تحسسي', 'فطور جلدية', 'شرى/حساسية جلدية', 'قلق عام', 'اضطراب نوم',
  'متابعة حمل', 'متابعة طفل سليم', 'حاجة لاستكمال تقييم/تحاليل'
];

const EXAMINATION_LIST = [
  'الحالة العامة جيدة والوعي تام', 'علامات الجفاف غير موجودة', 'شحوب خفيف',
  'البلعوم محتقن دون قيح', 'اللوزتان متضخمتان مع مفرزات', 'الصدر صافي بالإصغاء',
  'أزيز منتشر ثنائي الجانب', 'خراخر قاعدية', 'أصوات القلب منتظمة دون نفخات',
  'البطن لين غير مؤلم', 'ألم شرسوفي بالجس', 'ألم بالربع السفلي الأيمن',
  'لا توجد علامات تهيج بريتواني', 'ألم زاوية كلوية', 'مدى حركة المفصل محدود',
  'تورم واحمرار موضعي بالمفصل', 'طفح جلدي منتشر', 'التهاب موضعي بالجلد',
  'فحص عصبي إجمالي ضمن الطبيعي', 'يحتاج تقييم إضافي حسب النتائج'
];

const PRESCRIPTION_TEMPLATES = [
  'باراسيتامول 500mg: حبة كل 8 ساعات عند اللزوم لمدة 3 أيام',
  'إيبوبروفين 400mg: حبة بعد الطعام كل 12 ساعة عند اللزوم',
  'محلول إماهة فموية ORS بعد كل إسهال مع الإكثار من السوائل',
  'غسول أنف بمحلول ملحي 3 مرات يومياً',
  'مراجعة خلال 48-72 ساعة أو فوراً عند تدهور الأعراض'
];

const DoctorPage = () => {
  const [clinicId, setClinicId] = useState('1');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recallLockedTicketId, setRecallLockedTicketId] = useState(null);
  const recallUnlockTimerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('queue');

  const [patientVisits, setPatientVisits] = useState([]);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [visitForm, setVisitForm] = useState({ 
    vitalsBp: '', vitalsPulse: '', vitalsTemp: '', 
    complaint: '', examination: '', diagnosis: '', prescription: '', notes: '' 
  });
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  const { joinClinic, subscribeTo, isConnected } = useSocket();
  const { addToast } = useToast();

  const selectedClinic = clinics.find(c => c.id === clinicId);

  const refreshData = useCallback(async () => {
    try {
      const data = await queueService.getDisplayData(clinicId);
      setCurrentTicket(data.currentTicket || null);
      setWaitingList(data.tickets || []);
    } catch (err) { console.error(err); }
  }, [clinicId]);

  // ✨ جلب العيادات وتصفيتها حسب صلاحيات الطبيب
  useEffect(() => {
    queueService.getClinics()
      .then(data => {
        let activeClinics = (data.clinics || []).filter(c => c.isActive !== false);
        
        //  تصفية العيادات: إذا كان المستخدم طبيباً، اعرض فقط عياداته
        if (user?.role === 'DOCTOR' && user?.doctor?.clinics) {
          const myClinicIds = user.doctor.clinics.map(c => c.clinicId);
          activeClinics = activeClinics.filter(c => myClinicIds.includes(c.id));
        }
        // (الأدمن والسوبر أدمن يرون كل العيادات بفضل الشرط أعلاه)

        setClinics(activeClinics);
        
        // تعيين أول عيادة متاحة كافتراضي
        if (!activeClinics.some(c => c.id === clinicId) && activeClinics[0]) {
          setClinicId(activeClinics[0].id);
        } else if (activeClinics.length === 0) {
          setClinicId(''); // مسح الـ clinicId إذا لم يكن لديه عيادات
        }
      })
      .catch(() => {});
  }, [user]); //  إضافة user كـ dependency ليعيد التحميل إذا تغيرت الصلاحيات

  useEffect(() => {
    refreshData(); joinClinic(clinicId);
    const unsub = subscribeTo('queue-updated', () => refreshData());
    return () => { unsub?.(); };
  }, [clinicId, refreshData, joinClinic, subscribeTo]);

  useEffect(() => {
    return () => {
      if (recallUnlockTimerRef.current) clearTimeout(recallUnlockTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentTicket?.patientId) {
      setViewingPatient({
        id: currentTicket.patientId,
        name: currentTicket.patientName || currentTicket.patient?.fullName || '',
        fileNumber: currentTicket.patient?.fileNumber || ''
      });
      setVisitForm({ vitalsBp: '', vitalsPulse: '', vitalsTemp: '', complaint: '', examination: '', diagnosis: '', prescription: '', notes: '' });
    } else {
      setViewingPatient(null);
    }
  }, [currentTicket]);

  useEffect(() => {
    if (viewingPatient?.id) {
      visitService.getVisits(viewingPatient.id).then(setPatientVisits).catch(() => {});
    } else {
      setPatientVisits([]);
    }
  }, [viewingPatient]);

  const handleAction = async (actionFn, successMsg) => {
    try { setIsLoading(true); await actionFn(clinicId); addToast(successMsg, 'success'); await refreshData(); }
    catch (err) { addToast(err.response?.data?.message || 'فشلت العملية', 'error'); } 
    finally { setIsLoading(false); }
  };

  const handleRecall = async () => {
    if (!currentTicket || recallLockedTicketId === currentTicket.id) return;

    try {
      const ticketId = currentTicket.id;
      setRecallLockedTicketId(ticketId);
      const result = await queueService.recallCurrentPatient(clinicId);

      if (result?.ignored) {
        addToast(result.message || 'إعادة النداء قيد التنفيذ', 'info');
      } else {
        addToast('تم إرسال إعادة النداء', 'success');
      }

      if (recallUnlockTimerRef.current) clearTimeout(recallUnlockTimerRef.current);
      recallUnlockTimerRef.current = setTimeout(() => {
        setRecallLockedTicketId((lockedId) => lockedId === ticketId ? null : lockedId);
        recallUnlockTimerRef.current = null;
      }, 7000);
      refreshData();
    } catch (err) {
      setRecallLockedTicketId(null);
      addToast(err.response?.data?.message || 'فشل إعادة النداء', 'error');
    }
  };

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!visitForm.diagnosis.trim()) return addToast('حقل التشخيص مطلوب', 'warning');
    try {
      setIsSavingVisit(true);
      await visitService.addVisit({ ticketId: currentTicket.id, patientId: currentTicket.patientId, ...visitForm });
      addToast('تم حفظ الزيارة بنجاح', 'success');
      setVisitForm({ 
        vitalsBp: '', vitalsPulse: '', vitalsTemp: '', 
        complaint: '', examination: '', diagnosis: '', prescription: '', notes: '' 
      });
      visitService.getVisits(currentTicket.patientId).then(setPatientVisits);
    } catch (err) { addToast('فشل حفظ الزيارة', 'error'); }
    finally { setIsSavingVisit(false); }
  };

  const patientName = currentTicket?.patientName || currentTicket?.patient?.fullName || '';
  const fileNumber = currentTicket?.patient?.fileNumber || '';

  return (
    <div className="doc-container" dir="rtl">
      <header className="doc-header">
        <div className="doc-clinics">
          {clinics.map(c => (
            <button key={c.id} className={`doc-clinic-btn ${clinicId === c.id ? 'active' : ''}`} onClick={() => setClinicId(c.id)}>
              <span className="doc-prefix">{c.prefix}</span> {c.name}
            </button>
          ))}
        </div>
        <div className={`doc-conn ${isConnected ? 'on' : 'off'}`}><span className="doc-conn-dot"></span> {isConnected ? 'متصل' : 'غير متصل'}</div>
      </header>

      <main className="doc-main">
        <aside className="doc-sidebar">
          <div className="doc-current-card">
            <div className="doc-patient-row">
              {currentTicket ? (
                <>
                  <div className="doc-ticket-badge">{currentTicket.fullNumber}</div>
                  <div className="doc-patient-info">
                    <h2 className="doc-patient-name">{patientName}</h2>
                    {fileNumber && <span className="doc-file-num">ملف: {fileNumber}</span>}
                  </div>
                </>
              ) : <div className="doc-idle">اضغط "التالي" لاستدعاء مريض</div>}
            </div>
          </div>
          <div className="doc-controls">
             <button className="doc-ctrl-btn next" onClick={() => handleAction(queueService.nextPatient, 'التالي')} disabled={isLoading}><span className="doc-ctrl-icon">⏭</span><span className="doc-ctrl-text">التالي</span><span className="doc-ctrl-key">N</span></button>
             <button className="doc-ctrl-btn recall" onClick={handleRecall} disabled={!currentTicket || recallLockedTicketId === currentTicket.id}><span className="doc-ctrl-icon">🔊</span><span className="doc-ctrl-text">نداء</span><span className="doc-ctrl-key">R</span></button>
             <button className="doc-ctrl-btn skip" onClick={() => handleAction(queueService.skipPatient, 'تخطي')} disabled={isLoading}><span className="doc-ctrl-icon">⏩</span><span className="doc-ctrl-text">تخطي</span><span className="doc-ctrl-key">S</span></button>
             <button className="doc-ctrl-btn complete" onClick={() => handleAction(queueService.completePatient, 'إتمام')} disabled={isLoading}><span className="doc-ctrl-icon">✅</span><span className="doc-ctrl-text">إتمام</span><span className="doc-ctrl-key">C</span></button>
          </div>
        </aside>

        <section className="doc-workspace">
          <div className="doc-tabs-header">
            <button className={`doc-tab-btn ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>📋 الطابور</button>
            <button className={`doc-tab-btn ${activeTab === 'visit' ? 'active' : ''}`} onClick={() => currentTicket ? setActiveTab('visit') : addToast('لا يوجد دور حالي', 'warning')} disabled={!currentTicket}>🩺 الزيارة الحالية</button>
            <button 
              className={`doc-tab-btn ${activeTab === 'history' ? 'active' : ''}`} 
              onClick={() => {
                if (viewingPatient) {
                  setActiveTab('history');
                } else if (currentTicket?.patientId) {
                  setViewingPatient({
                    id: currentTicket.patientId,
                    name: patientName,
                    fileNumber: fileNumber
                  });
                  setActiveTab('history');
                } else {
                  addToast('لا يوجد ملف', 'warning');
                }
              }} 
              disabled={!viewingPatient && !currentTicket?.patientId}
            >
              📜 الملف الطبي
            </button>
          </div>

          <div className="doc-tab-content">
            {activeTab === 'queue' && (
              <QueueTable 
                items={waitingList} 
                isLoading={isLoading} 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                clinicName={selectedClinic?.name} 
                onViewPatientFile={(ticket) => {
                  setViewingPatient({
                    id: ticket.patientId,
                    name: ticket.patientName || ticket.patient?.fullName || '',
                    fileNumber: ticket.patient?.fileNumber || ''
                  });
                  setActiveTab('history');
                }}
              />
            )}

            {/* ✨ تبويب الزيارة مع القوائم الذكية */}
            {activeTab === 'visit' && currentTicket && !currentTicket.patientId && (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--clr-bg-card)', borderRadius: 'var(--rad-md)', marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--clr-text-main)' }}>دور سريع (بدون ملف مريض)</h3>
                <p style={{ color: 'var(--clr-text-muted)', marginBottom: '2rem' }}>هذا الدور لا يحتوي على ملف طبي. لا يمكن حفظ تفاصيل الزيارة، ولكن يمكنك إتمام الدور مباشرة.</p>
                <button type="button" className="doc-save-btn" onClick={() => handleAction(queueService.completePatient, 'تم إتمام الزيارة')} disabled={isLoading} style={{ maxWidth: '300px', margin: '0 auto' }}>
                  {isLoading ? 'جاري الإتمام...' : '✅ إتمام/إنهاء الدور السريع'}
                </button>
              </div>
            )}

            {activeTab === 'visit' && currentTicket?.patientId && (
              <form onSubmit={handleSaveVisit} className="doc-visit-form">
                <div className="doc-form-section">
                  <h4>🩸 العلامات الحيوية</h4>
                  <div className="doc-vitals-grid">
                    <div className="doc-field small">
                      <label>ضغط الدم (BP)</label>
                      <input type="text" value={visitForm.vitalsBp} onChange={(e) => setVisitForm({...visitForm, vitalsBp: e.target.value})} placeholder="120/80" />
                    </div>
                    <div className="doc-field small">
                      <label>النبض (Pulse)</label>
                      <input type="text" value={visitForm.vitalsPulse} onChange={(e) => setVisitForm({...visitForm, vitalsPulse: e.target.value})} placeholder="75" />
                    </div>
                    <div className="doc-field small">
                      <label>الحرارة (Temp)</label>
                      <input type="text" value={visitForm.vitalsTemp} onChange={(e) => setVisitForm({...visitForm, vitalsTemp: e.target.value})} placeholder="37.0" />
                    </div>
                  </div>
                </div>

                <div className="doc-form-section">
                  <h4>🩻 الشكوى والفحص السريري</h4>
                  <div className="doc-field">
                    <SmartDropdown 
                      options={COMPLAINTS_LIST} value={visitForm.complaint} 
                      onChange={(val) => setVisitForm({...visitForm, complaint: val})} 
                      placeholder="ابدأ الكتابة أو اختر الشكوى..." label="الشكوى الرئيسية" 
                    />
                  </div>
                  <div className="doc-field">
                    <SmartDropdown 
                      options={EXAMINATION_LIST} value={visitForm.examination} 
                      onChange={(val) => setVisitForm({...visitForm, examination: val})} 
                      placeholder="أدخل نتيجة الفحص..." label="الفحص السريري" 
                    />
                  </div>
                </div>

                <div className="doc-form-section highlight">
                  <h4>📝 التشخيص والخطة العلاجية</h4>
                  <div className="doc-field required">
                    <SmartDropdown 
                      options={DIAGNOSIS_LIST} value={visitForm.diagnosis} 
                      onChange={(val) => setVisitForm({...visitForm, diagnosis: val})} 
                      placeholder="ابدأ الكتابة أو اختر التشخيص..." label="التشخيص الطبي" required={true}
                    />
                  </div>
                  <div className="doc-field">
                    <label>الوصفة الطبية / الأدوية</label>
                    <div className="doc-template-row">
                      {PRESCRIPTION_TEMPLATES.map((template) => (
                        <button
                          key={template}
                          type="button"
                          className="doc-template-chip"
                          onClick={() => setVisitForm((prev) => ({
                            ...prev,
                            prescription: prev.prescription ? `${prev.prescription}\n${template}` : template
                          }))}
                        >
                          {template.split(':')[0]}
                        </button>
                      ))}
                    </div>
                    <textarea rows={3} value={visitForm.prescription} onChange={(e) => setVisitForm({...visitForm, prescription: e.target.value})} placeholder="اسم الدواء - الجرعة - المدة..." />
                  </div>
                  <div className="doc-field">
                    <label>ملاحظات ومتابعة</label>
                    <input type="text" value={visitForm.notes} onChange={(e) => setVisitForm({...visitForm, notes: e.target.value})} placeholder="تعليمات عامة، موعد متابعة..." />
                  </div>
                </div>

                <button type="submit" className="doc-save-btn" disabled={isSavingVisit}>
                  {isSavingVisit ? 'جاري الحفظ...' : '💾 حفظ الزيارة وإغلاق التذكرة'}
                </button>
              </form>
            )}

            {/* ✨ تبويب الملف الطبي الاحترافي */}
            {activeTab === 'history' && viewingPatient && (
              <div className="doc-history-full">
                <div className="ehr-patient-header">
                  <h2>{viewingPatient.name}</h2>
                  <span className="doc-file-num">ملف: {viewingPatient.fileNumber}</span>
                </div>

                {patientVisits.length === 0 ? (
                  <div className="doc-empty-history">لا توجد زيارات سابقة لهذا المريض</div>
                ) : (
                  patientVisits.map(v => (
                    <div key={v.id} className="ehr-record">
                      <div className="ehr-record-header">
                        <div className="ehr-date">
                          📅 {new Date(v.visitDate).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="ehr-doctor">🩺 {v.doctor?.name || 'غير محدد'}</div>
                      </div>
                      
                      <div className="ehr-record-body">
                        {/* قسم العلامات الحيوية */}
                        {(v.vitalsBp || v.vitalsPulse || v.vitalsTemp) && (
                          <div className="ehr-section ehr-vitals">
                            <div className="ehr-section-title">العلامات الحيوية</div>
                            <div className="ehr-vitals-grid">
                              {v.vitalsBp && <div className="ehr-vital-item"><span>ضغط الدم</span><strong>{v.vitalsBp}</strong></div>}
                              {v.vitalsPulse && <div className="ehr-vital-item"><span>النبض</span><strong>{v.vitalsPulse}</strong></div>}
                              {v.vitalsTemp && <div className="ehr-vital-item"><span>الحرارة</span><strong>{v.vitalsTemp}</strong></div>}
                            </div>
                          </div>
                        )}

                        {/* قسم الشكوى والفحص */}
                        {(v.complaint || v.examination) && (
                          <div className="ehr-section ehr-clinical">
                            <div className="ehr-section-title">الشكوى والفحص</div>
                            {v.complaint && <div className="ehr-row"><label>الشكوى:</label><span>{v.complaint}</span></div>}
                            {v.examination && <div className="ehr-row"><label>الفحص السريري:</label><span>{v.examination}</span></div>}
                          </div>
                        )}

                        {/* قسم التشخيص والخطة (الأهم) */}
                        <div className="ehr-section ehr-plan">
                          <div className="ehr-section-title">التشخيص والخطة</div>
                          <div className="ehr-row ehr-dx-row">
                            <label>التشخيص:</label>
                            <strong className="ehr-dx-text">{v.diagnosis}</strong>
                          </div>
                          {v.prescription && (
                            <div className="ehr-row ehr-rx-row">
                              <label>الوصفة:</label>
                              <span>{v.prescription}</span>
                            </div>
                          )}
                          {v.notes && <div className="ehr-row"><label>ملاحظات:</label><span>{v.notes}</span></div>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DoctorPage;
