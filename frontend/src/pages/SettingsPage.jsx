/**
 * SettingsPage.jsx — إعدادات النظام الكاملة
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import queueService from '../services/queueService';

const getBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
  if (typeof window !== 'undefined' && window.__TAURI__) return 'http://localhost:3000';
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3000`;
  return 'http://localhost:3000';
};

const API = `${getBackendUrl()}/api`;

const sortClinics = (items) => {
  return [...items].sort((a, b) => {
    const aNum = Number(a.id);
    const bNum = Number(b.id);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return String(a.id).localeCompare(String(b.id));
  });
};

const suggestNextPrefix = (items) => {
  const used = new Set(items.map(clinic => clinic.prefix));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return letters.find(letter => !used.has(letter)) || `C${items.length + 1}`;
};

const SettingsPage = () => {
  const [settings,  setSettings]  = useState({
    tickerText:    '',
    clinicTitle:   '',
    clinicSubtitle:'',
    footerMsg:     '',
    printerName:   '',
  });
  const [clinics, setClinics] = useState([]);
  const [newClinic, setNewClinic] = useState({ name: '', nameAr: '', prefix: '', isActive: true });
  const [savingClinicId, setSavingClinicId] = useState(null);
  const [deletingClinicId, setDeletingClinicId] = useState(null);
  const [isAddingClinic, setIsAddingClinic] = useState(false);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isResetting,setIsResetting]= useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(data => {
        setSettings(s => ({ ...s, ...data }));
        setIsLoading(false);
      })
      .catch(() => {
        addToast('فشل تحميل الإعدادات', 'error');
        setIsLoading(false);
      });

    queueService.getClinics()
      .then(data => {
        const loadedClinics = sortClinics(data.clinics || []);
        setClinics(loadedClinics);
        setNewClinic(clinic => ({ ...clinic, prefix: clinic.prefix || suggestNextPrefix(loadedClinics) }));
      })
      .catch(() => addToast('فشل تحميل العيادات', 'error'));
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      addToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch {
      addToast('فشل حفظ الإعدادات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة ضبط جميع الطوابير؟\nهذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      setIsResetting(true);
      await queueService.resetAll();
      addToast('تم إعادة ضبط جميع الطوابير', 'success');
    } catch {
      addToast('فشل إعادة الضبط', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleClinicChange = (clinicId, field, value) => {
    setClinics(items => items.map(clinic =>
      clinic.id === clinicId ? { ...clinic, [field]: value } : clinic
    ));
  };

  const handleClinicSave = async (clinic) => {
    try {
      setSavingClinicId(clinic.id);
      const res = await queueService.updateClinic(clinic.id, {
        name: clinic.name,
        nameAr: clinic.nameAr || '',
        prefix: clinic.prefix,
        isActive: clinic.isActive,
      });
      setClinics(items => items.map(item => item.id === clinic.id ? res.clinic : item));
      addToast('تم حفظ العيادة وتحديث الشاشات', 'success');
    } catch (err) {
      addToast(err.message || 'فشل حفظ العيادة', 'error');
    } finally {
      setSavingClinicId(null);
    }
  };

  const handleAddClinic = async () => {
    try {
      setIsAddingClinic(true);
      const res = await queueService.createClinic({
        name: newClinic.name,
        nameAr: newClinic.nameAr || '',
        prefix: newClinic.prefix,
        isActive: newClinic.isActive,
      });

      const nextClinics = sortClinics([...clinics, res.clinic]);
      setClinics(nextClinics);
      setNewClinic({ name: '', nameAr: '', prefix: suggestNextPrefix(nextClinics), isActive: true });
      addToast('تمت إضافة العيادة وتحديث الشاشات', 'success');
    } catch (err) {
      addToast(err.message || 'فشل إضافة العيادة', 'error');
    } finally {
      setIsAddingClinic(false);
    }
  };

  const handleClinicDelete = async (clinic) => {
    if (!window.confirm(`هل تريد حذف ${clinic.name}؟\nستختفي العيادة من الاستقبال والطبيب وشاشة العرض، مع بقاء التذاكر القديمة محفوظة.`)) return;

    try {
      setDeletingClinicId(clinic.id);
      await queueService.deleteClinic(clinic.id);
      const nextClinics = sortClinics(clinics.filter(item => item.id !== clinic.id));
      setClinics(nextClinics);
      setNewClinic(current => ({
        ...current,
        prefix: current.prefix || suggestNextPrefix(nextClinics),
      }));
      addToast('تم حذف العيادة وتحديث الشاشات', 'success');
    } catch (err) {
      addToast(err.message || 'فشل حذف العيادة', 'error');
    } finally {
      setDeletingClinicId(null);
    }
  };

  const Field = ({ label, field, placeholder, type = 'text', hint }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>{label}</label>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          className="form-input"
          style={{ resize: 'vertical', fontFamily: 'var(--font-main)' }}
          value={settings[field] || ''}
          onChange={e => setSettings(s => ({ ...s, [field]: e.target.value }))}
          placeholder={placeholder}
          disabled={isLoading}
        />
      ) : (
        <input
          type="text"
          className="form-input"
          value={settings[field] || ''}
          onChange={e => setSettings(s => ({ ...s, [field]: e.target.value }))}
          placeholder={placeholder}
          disabled={isLoading}
        />
      )}
      {hint && <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-light)' }}>{hint}</p>}
    </div>
  );

  return (
    <div className="reception-container" dir="rtl">
      {/* Sidebar */}
      <aside className="rec-sidebar">
        <div className="rec-logo"><span>مركز داريا الطبي</span></div>
        <nav className="rec-nav">
          <Link to="/reception" className="rec-nav-item">الاستقبال</Link>
          <Link to="/doctor"    className="rec-nav-item">الطبيب</Link>
          <Link to="/display"   className="rec-nav-item" target="_blank">شاشة العرض</Link>
          <Link to="/tickets"   className="rec-nav-item">كل التذاكر</Link>
          <Link to="/settings"  className="rec-nav-item active">الإعدادات</Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="rec-main">
        <header className="rec-header">
          <div>
            <h1 className="rec-page-title">إعدادات النظام</h1>
            <p className="rec-page-sub">تخصيص مركز داريا الطبي</p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Card: الهوية */}
          <div className="clinic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 0 }}>هوية المركز</h3>
            <Field label="اسم المركز (عربي)"    field="clinicTitle"    placeholder="مركز داريا الطبي" />
            <Field label="اسم المركز (إنجليزي)" field="clinicSubtitle" placeholder="Daraya Medical Center" />
          </div>

          {/* Card: الطابعة */}
          <div className="clinic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 0 }}>إعدادات الطابعة</h3>
            <Field
              label="اسم الطابعة الحرارية"
              field="printerName"
              placeholder="Thermal_Printer"
              hint="يجب أن يطابق اسم الطابعة في نظام التشغيل"
            />
          </div>

          {/* Card: شريط الأخبار */}
          <div className="clinic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 0 }}>شريط الأخبار (شاشة التلفزيون)</h3>
            <Field
              label="نص الشريط"
              field="tickerText"
              type="textarea"
              placeholder="مركز داريا الطبي يرحب بكم • يرجى الالتزام بالدور"
              hint="يظهر أسفل شاشة العرض بشكل متحرك — استخدم • للفصل بين الجمل"
            />
          </div>

          {/* Card: رسالة التذكرة */}
          <div className="clinic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 0 }}>تذييل التذكرة الحرارية</h3>
            <Field
              label="رسالة التذييل"
              field="footerMsg"
              placeholder="يرجى انتظار ظهور رقمك على شاشة العرض"
              hint="تظهر في أسفل التذكرة المطبوعة"
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            style={{ minWidth: '180px' }}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>

          <button
            className="btn btn-danger"
            onClick={handleReset}
            disabled={isResetting}
            style={{ minWidth: '200px' }}
          >
            {isResetting ? 'جاري الإعادة...' : 'إعادة ضبط جميع الطوابير'}
          </button>
        </div>

        <div style={{
          marginTop: '2rem', padding: '1rem 1.5rem',
          background: 'var(--clr-warning-light)', borderRadius: 'var(--rad-sm)',
          borderRight: '4px solid var(--clr-warning)',
          color: 'var(--clr-warning)', fontSize: '0.85rem', fontWeight: 600
        }}>
          إعادة ضبط الطوابير تحذف جميع التذاكر وتصفّر العدادات. يُنصح بالتنفيذ في بداية كل يوم عمل.
        </div>

        <section className="clinic-card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>إدارة العيادات</h3>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.85rem', margin: 0 }}>
              أي تعديل هنا ينعكس فوراً على الاستقبال والطبيب وشاشة العرض.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 1fr 120px 130px',
                gap: '0.75rem',
                alignItems: 'end',
                padding: '1rem',
                border: '1px solid var(--clr-primary)',
                borderRadius: 'var(--rad-sm)',
                background: 'var(--clr-bg-card)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>البادئة</label>
                <input
                  className="form-input"
                  value={newClinic.prefix}
                  onChange={e => setNewClinic(clinic => ({ ...clinic, prefix: e.target.value.toUpperCase() }))}
                  maxLength={3}
                  dir="ltr"
                  placeholder="E"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>اسم العيادة الجديدة</label>
                <input
                  className="form-input"
                  value={newClinic.name}
                  onChange={e => setNewClinic(clinic => ({ ...clinic, name: e.target.value }))}
                  placeholder="عيادة العيون"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>الاسم الإنجليزي</label>
                <input
                  className="form-input"
                  value={newClinic.nameAr}
                  onChange={e => setNewClinic(clinic => ({ ...clinic, nameAr: e.target.value }))}
                  placeholder="Ophthalmology"
                  dir="ltr"
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.65rem', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={newClinic.isActive}
                  onChange={e => setNewClinic(clinic => ({ ...clinic, isActive: e.target.checked }))}
                />
                مفعلة
              </label>
              <button
                className="btn btn-primary"
                onClick={handleAddClinic}
                disabled={isAddingClinic || !newClinic.name.trim() || !newClinic.prefix.trim()}
              >
                {isAddingClinic ? 'إضافة...' : 'إضافة عيادة'}
              </button>
            </div>

            {clinics.map(clinic => (
              <div
                key={clinic.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 1fr 120px 110px 110px',
                  gap: '0.75rem',
                  alignItems: 'end',
                  padding: '1rem',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--rad-sm)',
                  background: 'var(--clr-bg-page)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>البادئة</label>
                  <input
                    className="form-input"
                    value={clinic.prefix || ''}
                    onChange={e => handleClinicChange(clinic.id, 'prefix', e.target.value.toUpperCase())}
                    maxLength={3}
                    dir="ltr"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>اسم العيادة</label>
                  <input
                    className="form-input"
                    value={clinic.name || ''}
                    onChange={e => handleClinicChange(clinic.id, 'name', e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>الاسم الإنجليزي</label>
                  <input
                    className="form-input"
                    value={clinic.nameAr || ''}
                    onChange={e => handleClinicChange(clinic.id, 'nameAr', e.target.value)}
                    dir="ltr"
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.65rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={clinic.isActive !== false}
                    onChange={e => handleClinicChange(clinic.id, 'isActive', e.target.checked)}
                  />
                  مفعلة
                </label>
                <button
                  className="btn btn-primary"
                  onClick={() => handleClinicSave(clinic)}
                  disabled={savingClinicId === clinic.id || deletingClinicId === clinic.id}
                >
                  {savingClinicId === clinic.id ? 'حفظ...' : 'حفظ'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleClinicDelete(clinic)}
                  disabled={deletingClinicId === clinic.id || savingClinicId === clinic.id}
                >
                  {deletingClinicId === clinic.id ? 'حذف...' : 'حذف'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
