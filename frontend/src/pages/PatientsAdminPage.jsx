import React, { useEffect, useMemo, useState } from 'react';
import patientService from '../services/patientService';
import { useToast } from '../context/ToastContext';
import '../styles/AdminMedicalPages.css';

const RELATIONS = [
  ['SELF', 'رب الأسرة'],
  ['WIFE', 'زوجة'],
  ['HUSBAND', 'زوج'],
  ['SON', 'ابن'],
  ['DAUGHTER', 'ابنة'],
  ['FATHER', 'أب'],
  ['MOTHER', 'أم'],
  ['OTHER', 'أخرى']
];

const relationLabel = (value) => RELATIONS.find(([key]) => key === value)?.[1] || value || '-';
const genderLabel = (value) => value === 'FEMALE' ? 'أنثى' : value === 'MALE' ? 'ذكر' : '-';

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' });
};

const Modal = ({ title, subtitle, children, onClose, large }) => (
  <div className="admin-modal-backdrop">
    <div className={`admin-modal ${large ? 'large' : ''}`}>
      <div className="admin-modal-head">
        <div>
          <h2 className="admin-modal-title">{title}</h2>
          {subtitle && <p className="admin-card-sub">{subtitle}</p>}
        </div>
        <button className="admin-btn soft" type="button" onClick={onClose}>إغلاق</button>
      </div>
      <div className="admin-modal-body">{children}</div>
    </div>
  </div>
);

const PatientsAdminPage = () => {
  const [families, setFamilies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFamilies, setExpandedFamilies] = useState({});

  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [familyForm, setFamilyForm] = useState({ primaryName: '', primaryPhone: '', address: '' });
  const [patientForm, setPatientForm] = useState({ fullName: '', fileNumber: '', relation: 'SELF', gender: 'MALE', birthDate: '' });
  const [addMemberForm, setAddMemberForm] = useState({ patientName: '', relation: 'SON', gender: 'MALE', birthDate: '' });
  const [modal, setModal] = useState(null);
  const [medicalRecordData, setMedicalRecordData] = useState(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);

  const limit = 10;
  const { addToast } = useToast();

  const fetchFamilies = async (query = searchQuery, pageNum = page) => {
    try {
      setIsLoading(true);
      const data = await patientService.getAllFamilies(query, pageNum, limit);
      setFamilies(Array.isArray(data?.families) ? data.families : []);
      setTotalPages(data?.totalPages || 1);
      setTotalCount(data?.totalCount || 0);
      setPage(data?.page || pageNum);
    } catch {
      addToast('فشل تحميل بيانات العائلات', 'error');
      setFamilies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies(searchQuery, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const stats = useMemo(() => {
    const patientsCount = families.reduce((sum, family) => sum + (family.patients?.length || 0), 0);
    return { patientsCount };
  }, [families]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchFamilies(searchQuery, 1);
  };

  const openEditFamily = (family) => {
    setSelectedFamily(family);
    setFamilyForm({
      primaryName: family.primaryName || '',
      primaryPhone: family.primaryPhone || '',
      address: family.address || ''
    });
    setModal('editFamily');
  };

  const saveFamily = async (event) => {
    event.preventDefault();
    try {
      await patientService.updateFamily(selectedFamily.id, familyForm);
      addToast('تم حفظ بيانات العائلة', 'success');
      setModal(null);
      fetchFamilies();
    } catch (err) {
      addToast(err.response?.data?.message || 'فشل حفظ العائلة', 'error');
    }
  };

  const deleteFamily = async (family) => {
    if (!window.confirm(`هل تريد حذف ملف عائلة "${family.primaryName}"؟`)) return;
    try {
      await patientService.deleteFamily(family.id);
      addToast('تم حذف العائلة', 'success');
      fetchFamilies();
    } catch {
      addToast('فشل حذف العائلة', 'error');
    }
  };

  const openEditPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientForm({
      fullName: patient.fullName || '',
      fileNumber: patient.fileNumber || '',
      relation: patient.relation || 'OTHER',
      gender: patient.gender || 'MALE',
      birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : ''
    });
    setModal('editPatient');
  };

  const savePatient = async (event) => {
    event.preventDefault();
    try {
      await patientService.updatePatient(selectedPatient.id, patientForm);
      addToast('تم حفظ بيانات المريض', 'success');
      setModal(null);
      fetchFamilies();
    } catch (err) {
      addToast(err.response?.data?.message || 'فشل حفظ المريض', 'error');
    }
  };

  const deletePatient = async (patient) => {
    if (!window.confirm(`هل تريد حذف المريض "${patient.fullName}"؟`)) return;
    try {
      await patientService.deletePatient(patient.id);
      addToast('تم حذف المريض', 'success');
      fetchFamilies();
    } catch {
      addToast('فشل حذف المريض', 'error');
    }
  };

  const openAddMember = (family) => {
    setSelectedFamily(family);
    setAddMemberForm({ patientName: '', relation: 'SON', gender: 'MALE', birthDate: '' });
    setModal('addMember');
  };

  const addMember = async (event) => {
    event.preventDefault();
    try {
      await patientService.addPatientToFamily({ familyId: selectedFamily.id, ...addMemberForm });
      addToast('تمت إضافة فرد جديد', 'success');
      setModal(null);
      fetchFamilies();
    } catch (err) {
      addToast(err.response?.data?.message || 'فشل إضافة فرد', 'error');
    }
  };

  const openMedicalRecord = async (patient) => {
    try {
      setSelectedPatient(patient);
      setMedicalRecordData(null);
      setIsLoadingRecord(true);
      setModal('medicalRecord');
      const record = await patientService.getMedicalRecord(patient.id);
      setMedicalRecordData(record);
    } catch {
      addToast('فشل تحميل السجل الطبي', 'error');
      setModal(null);
    } finally {
      setIsLoadingRecord(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-hero">
        <div className="admin-hero-row">
          <div>
            <h1 className="admin-title">المرضى والعائلات</h1>
            <p className="admin-subtitle">إدارة ملفات العائلات، أفراد الأسرة، والسجل الطبي لكل مريض من مكان واحد.</p>
          </div>
          <div className="family-meta">
            <span className="admin-badge blue">{totalCount} عائلة</span>
            <span className="admin-badge teal">{stats.patientsCount} فرد في الصفحة</span>
          </div>
        </div>

        <form className="admin-toolbar" onSubmit={handleSearch}>
          <div className="admin-field grow">
            <label className="admin-label">بحث</label>
            <input
              className="admin-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="اسم رب الأسرة، اسم المريض، أو رقم الهاتف"
            />
          </div>
          <button className="admin-btn primary" type="submit">بحث</button>
          <button className="admin-btn soft" type="button" onClick={() => { setSearchQuery(''); setPage(1); fetchFamilies('', 1); }}>
            مسح
          </button>
        </form>
      </header>

      {isLoading ? (
        <div className="admin-loading">جاري تحميل ملفات المرضى...</div>
      ) : families.length === 0 ? (
        <div className="admin-empty">لا توجد عائلات مطابقة للبحث.</div>
      ) : (
        <div className="family-list">
          {families.map((family) => {
            const patients = family.patients || [];
            const isExpanded = expandedFamilies[family.id];
            const visiblePatients = isExpanded ? patients : patients.slice(0, 4);

            return (
              <article className="family-card" key={family.id}>
                <div className="family-head">
                  <div>
                    <h2 className="family-title">ملف {family.primaryName}</h2>
                    <div className="family-meta">
                      <span className="admin-badge teal">{patients.length} أفراد</span>
                      <span className="admin-badge blue" dir="ltr">{family.primaryPhone}</span>
                      {family.address && <span className="admin-badge">{family.address}</span>}
                    </div>
                  </div>
                  <div className="family-actions">
                    <button className="admin-btn primary" type="button" onClick={() => openAddMember(family)}>إضافة فرد</button>
                    <button className="admin-btn soft" type="button" onClick={() => openEditFamily(family)}>تعديل الملف</button>
                    <button className="admin-btn danger" type="button" onClick={() => deleteFamily(family)}>حذف</button>
                  </div>
                </div>

                <div className="patient-grid">
                  {visiblePatients.map((patient) => (
                    <div className="patient-card" key={patient.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}>
                        <div className="patient-name">{patient.fullName}</div>
                        <span className={`admin-badge ${patient.relation === 'SELF' ? 'amber' : ''}`}>{relationLabel(patient.relation)}</span>
                      </div>
                      <div className="patient-facts">
                        <div>اسم الملف: <strong>{family.primaryName}</strong></div>
                        <div>رقم المرجع: <strong>{patient.fileNumber}</strong></div>
                        <div>الجنس: <strong>{genderLabel(patient.gender)}</strong></div>
                        <div>الميلاد: <strong>{formatDate(patient.birthDate)}</strong></div>
                      </div>
                      <div className="patient-actions">
                        <button className="admin-btn primary" type="button" onClick={() => openMedicalRecord(patient)}>السجل الطبي</button>
                        <button className="admin-btn soft" type="button" onClick={() => openEditPatient(patient)}>تعديل</button>
                        <button className="admin-btn danger" type="button" onClick={() => deletePatient(patient)}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>

                {patients.length > 4 && (
                  <div style={{ padding: '0 1rem 1rem', textAlign: 'center' }}>
                    <button
                      className="admin-btn soft"
                      type="button"
                      onClick={() => setExpandedFamilies((prev) => ({ ...prev, [family.id]: !prev[family.id] }))}
                    >
                      {isExpanded ? 'عرض أقل' : `عرض كل الأفراد (${patients.length})`}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '.75rem', marginTop: '1rem', alignItems: 'center' }}>
        <button className="admin-btn" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>السابق</button>
        <span className="admin-badge blue">صفحة {page} من {totalPages}</span>
        <button className="admin-btn" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>التالي</button>
      </div>

      {modal === 'editFamily' && (
        <Modal title="تعديل ملف العائلة" subtitle={selectedFamily?.primaryName} onClose={() => setModal(null)}>
          <form className="admin-form" onSubmit={saveFamily}>
            <div className="admin-field">
              <label className="admin-label">اسم رب الأسرة</label>
              <input className="admin-input" value={familyForm.primaryName} onChange={(event) => setFamilyForm((prev) => ({ ...prev, primaryName: event.target.value }))} required />
            </div>
            <div className="admin-field">
              <label className="admin-label">رقم التواصل</label>
              <input className="admin-input" value={familyForm.primaryPhone} onChange={(event) => setFamilyForm((prev) => ({ ...prev, primaryPhone: event.target.value }))} required />
            </div>
            <div className="admin-field">
              <label className="admin-label">العنوان</label>
              <input className="admin-input" value={familyForm.address} onChange={(event) => setFamilyForm((prev) => ({ ...prev, address: event.target.value }))} />
            </div>
            <button className="admin-btn primary" type="submit">حفظ</button>
          </form>
        </Modal>
      )}

      {modal === 'editPatient' && (
        <Modal title="تعديل بيانات المريض" subtitle={selectedPatient?.fullName} onClose={() => setModal(null)}>
          <form className="admin-form" onSubmit={savePatient}>
            <div className="admin-field">
              <label className="admin-label">الاسم الكامل</label>
              <input className="admin-input" value={patientForm.fullName} onChange={(event) => setPatientForm((prev) => ({ ...prev, fullName: event.target.value }))} required />
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label className="admin-label">رقم المرجع (غير قابل للتعديل)</label>
                {/* ✨ تم جعل الحقل للقراءة فقط ولا يمكن التعديل عليه */}
                <input className="admin-input" style={{ background: '#f3f4f6', cursor: 'not-allowed' }} value={patientForm.fileNumber} readOnly />
              </div>
              <div className="admin-field">
                <label className="admin-label">صلة القرابة</label>
                <select className="admin-select" value={patientForm.relation} onChange={(event) => {
                  const rel = event.target.value;
                  let gen = patientForm.gender;
                  // ✨ مزامنة الجنس مع صلة القرابة تلقائياً
                  if (rel === 'WIFE' || rel === 'DAUGHTER' || rel === 'MOTHER') gen = 'FEMALE';
                  else if (rel === 'HUSBAND' || rel === 'SON' || rel === 'FATHER') gen = 'MALE';
                  
                  setPatientForm((prev) => ({ ...prev, relation: rel, gender: gen }));
                }}>
                  {RELATIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">الجنس</label>
                <select className="admin-select" value={patientForm.gender} onChange={(event) => setPatientForm((prev) => ({ ...prev, gender: event.target.value }))}>
                  <option value="MALE">ذكر</option>
                  <option value="FEMALE">أنثى</option>
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">تاريخ الميلاد</label>
                <input className="admin-input" type="date" dir="ltr" value={patientForm.birthDate} onChange={(event) => setPatientForm((prev) => ({ ...prev, birthDate: event.target.value }))} />
              </div>
            </div>
            <button className="admin-btn primary" type="submit">حفظ</button>
          </form>
        </Modal>
      )}

      {modal === 'addMember' && (
        <Modal title="إضافة فرد للعائلة" subtitle={selectedFamily?.primaryName} onClose={() => setModal(null)}>
          <form className="admin-form" onSubmit={addMember}>
            <div className="admin-field">
              <label className="admin-label">اسم الفرد</label>
              <input className="admin-input" value={addMemberForm.patientName} onChange={(event) => setAddMemberForm((prev) => ({ ...prev, patientName: event.target.value }))} required />
            </div>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label className="admin-label">صلة القرابة</label>
                <select className="admin-select" value={addMemberForm.relation} onChange={(event) => {
                  const rel = event.target.value;
                  let gen = addMemberForm.gender;
                  // ✨ مزامنة الجنس مع صلة القرابة تلقائياً
                  if (rel === 'WIFE' || rel === 'DAUGHTER' || rel === 'MOTHER') gen = 'FEMALE';
                  else if (rel === 'HUSBAND' || rel === 'SON' || rel === 'FATHER') gen = 'MALE';
                  
                  setAddMemberForm((prev) => ({ ...prev, relation: rel, gender: gen }));
                }}>
                  {RELATIONS.filter(([key]) => key !== 'SELF').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">الجنس</label>
                <select className="admin-select" value={addMemberForm.gender} onChange={(event) => setAddMemberForm((prev) => ({ ...prev, gender: event.target.value }))}>
                  <option value="MALE">ذكر</option>
                  <option value="FEMALE">أنثى</option>
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">تاريخ الميلاد</label>
                <input className="admin-input" type="date" dir="ltr" value={addMemberForm.birthDate} onChange={(event) => setAddMemberForm((prev) => ({ ...prev, birthDate: event.target.value }))} />
              </div>
            </div>
            <button className="admin-btn primary" type="submit">إضافة</button>
          </form>
        </Modal>
      )}

      {modal === 'medicalRecord' && (
        <Modal
          title="السجل الطبي"
          subtitle={`${selectedPatient?.fullName || ''} - ${selectedPatient?.fileNumber || ''}`}
          onClose={() => setModal(null)}
          large
        >
          {isLoadingRecord ? (
            <div className="admin-loading">جاري تحميل السجل الطبي...</div>
          ) : !medicalRecordData?.visits?.length ? (
            <div className="admin-empty">لا توجد زيارات طبية محفوظة لهذا المريض.</div>
          ) : (
            medicalRecordData.visits.map((visit, index) => (
              <div className="record-card" key={visit.id}>
                <div className="record-head">
                  <strong>زيارة رقم {medicalRecordData.visits.length - index}</strong>
                  <span className="admin-badge blue">{new Date(visit.visitDate).toLocaleString('ar-SY')}</span>
                </div>
                <div className="record-grid">
                  <div className="record-box">
                    <div className="record-label">العلامات الحيوية</div>
                    <div>ضغط: {visit.vitalsBp || '-'}</div>
                    <div>نبض: {visit.vitalsPulse || '-'}</div>
                    <div>حرارة: {visit.vitalsTemp || '-'}</div>
                  </div>
                  <div className="record-box">
                    <div className="record-label">التشخيص</div>
                    <strong>{visit.diagnosis || '-'}</strong>
                  </div>
                  <div className="record-box">
                    <div className="record-label">الوصفة</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{visit.prescription || '-'}</div>
                  </div>
                </div>
                {(visit.complaint || visit.examination || visit.notes) && (
                  <div className="record-box" style={{ marginTop: '.75rem' }}>
                    {visit.complaint && <div><strong>الشكوى:</strong> {visit.complaint}</div>}
                    {visit.examination && <div><strong>الفحص:</strong> {visit.examination}</div>}
                    {visit.notes && <div><strong>ملاحظات:</strong> {visit.notes}</div>}
                  </div>
                )}
              </div>
            ))
          )}
        </Modal>
      )}
    </div>
  );
};

export default PatientsAdminPage;
