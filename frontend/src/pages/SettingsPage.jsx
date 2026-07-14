/**
 * SettingsPage.jsx — إعدادات النظام الكاملة (مع إدارة المستخدمين)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import queueService from '../services/queueService';
import userService from '../services/userService'; // ✨ المستورد الجديد
import apiClient from '../services/apiClient';
import { getApiBaseURL } from '../config/network';
import logger from '../utils/logger';

const API = getApiBaseURL();


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

// ✨ خريطة الأدوار بالعربي
const ROLE_MAP = {
  SUPER_ADMIN: 'مدير النظام',
  ADMIN: 'مدير',
  DOCTOR: 'طبيب',
  RECEPTION: 'استقبال',
  DISPLAY: 'شاشة عرض'
};

const Field = ({ label, value, onChange, placeholder, type = 'text', hint, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>{label}</label>
    {type === 'textarea' ? (
      <textarea
        rows={3}
        className="form-input"
        style={{ resize: 'vertical', fontFamily: 'var(--font-main)' }}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    ) : (
      <input
        type="text"
        className="form-input"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    )}
    {hint && <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-light)' }}>{hint}</p>}
  </div>
);

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
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);
  
  // ✨ حالات إدارة المستخدمين
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', name: '', password: '', role: 'RECEPTION', isActive: true });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const { addToast } = useToast();
  const { user: currentUser } = useAuth();
  const { isConnected } = useSocket();

  useEffect(() => {
    apiClient.get('/settings')
      .then(res => {
        setSettings(s => ({ ...s, ...res.data }));
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

    // ✨ جلب المستخدمين فقط للمدراء
    if (['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role)) {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch {
      addToast('فشل تحميل المستخدمين', 'error');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await apiClient.put('/settings', settings);
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

  const handleExportBackup = async () => {
    try {
      addToast('جاري تصدير النسخة الاحتياطية...', 'info');
      const response = await apiClient.get('/settings/backup', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `darayya_clinic_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('تم تحميل النسخة الاحتياطية لقاعدة البيانات بنجاح', 'success');
    } catch (error) {
      addToast('فشل تصدير النسخة الاحتياطية', 'error');
    }
  };

  const handleRestoreBackup = () => {
    if (!window.confirm(
      '⚠️ تحذير: سيتم حذف جميع البيانات الحالية واستبدالها بمحتوى ملف النسخة الاحتياطية.\n\n' +
      'هذا الإجراء لا يمكن التراجع عنه.\n\n' +
      'هل أنت متأكد من المتابعة؟'
    )) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        addToast('جاري قراءة ملف النسخة الاحتياطية...', 'info');
        const text = await file.text();
        const backup = JSON.parse(text);
        addToast('جاري استعادة قاعدة البيانات... قد يستغرق هذا دقيقة.', 'info');
        await apiClient.post('/settings/restore', backup);
        addToast('✅ تمت استعادة قاعدة البيانات بنجاح. سيتم إعادة تحميل الصفحة.', 'success');
        setTimeout(() => window.location.reload(), 2500);
      } catch (err) {
        const msg = err.response?.data?.message || 'فشل استعادة النسخة الاحتياطية';
        addToast(`❌ ${msg}`, 'error');
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

    // ✨ تغيير كلمة المرور
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      return addToast('كلمة المرور الجديدة وتأكيدها غير متطابقتين', 'warning');
    }
    if (passForm.newPassword.length < 6) {
      return addToast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'warning');
    }

    try {
      setIsChangingPass(true);
      await authService.changePassword({
        oldPassword: passForm.oldPassword,
        newPassword: passForm.newPassword
      });
      addToast('تم تغيير كلمة المرور بنجاح', 'success');
      setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast(err.response?.data?.message || 'فشل تغيير كلمة المرور', 'error');
    } finally {
      setIsChangingPass(false);
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



  // ✨ دوال إدارة المستخدمين
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', name: '', password: '', role: 'RECEPTION', isActive: true, clinicIds: [] });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    // استخراج الـ clinicIds من بيانات الطبيب إذا كانت موجودة
    const existingClinicIds = user.doctor?.clinics?.map(c => c.clinicId) || [];
    setUserForm({ 
      username: user.username, 
      name: user.name, 
      password: '', 
      role: user.role, 
      isActive: user.isActive,
      clinicIds: existingClinicIds
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser && !userForm.password) return addToast('كلمة المرور مطلوبة للحساب الجديد', 'warning');
    
    try {
      setIsSavingUser(true);
      if (editingUser) {
        await userService.updateUser(editingUser.id, userForm);
        addToast('تم تحديث الحساب بنجاح', 'success');
      } else {
        await userService.createUser(userForm);
        addToast('تم إنشاء الحساب بنجاح', 'success');
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (err) {
      addToast(err.response?.data?.message || 'فشل حفظ الحساب', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleUserActive = async (user) => {
    try {
      await userService.updateUser(user.id, { isActive: !user.isActive });
      addToast(`تم ${user.isActive ? 'تعطيل' : 'تفعيل'} الحساب`, 'success');
      fetchUsers();
    } catch {
      addToast('فشل تحديث حالة الحساب', 'error');
    }
  };



  return (
    <div className="reception-container" dir="rtl">

      {/* Main */}
      <main className="rec-main">
        <header className="rec-header">
          <div>
            <h1 className="rec-page-title">إعدادات النظام</h1>
            <p className="rec-page-sub">تخصيص مركز داريا الطبي وإدارة الصلاحيات</p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Card: الهوية */}
          <div className="clinic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 0 }}>هوية المركز</h3>
            <Field label="اسم المركز (عربي)"    value={settings.clinicTitle} onChange={e => setSettings(s => ({ ...s, clinicTitle: e.target.value }))} disabled={isLoading}    placeholder="مركز داريا الطبي" />
            <Field label="اسم المركز (إنجليزي)" value={settings.clinicSubtitle} onChange={e => setSettings(s => ({ ...s, clinicSubtitle: e.target.value }))} disabled={isLoading} placeholder="Daraya Medical Center" />
          </div>

          {/* Card: الطابعة */}
          <div className="clinic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 0 }}>إعدادات الطابعة</h3>
            <Field
              label="اسم الطابعة الحرارية"
              value={settings.printerName}
              onChange={e => setSettings(s => ({ ...s, printerName: e.target.value }))}
              disabled={isLoading}
              placeholder="Thermal_Printer"
              hint="يجب أن يطابق اسم الطابعة في نظام التشغيل"
            />
          </div>


          {/* Card: شريط الأخبار */}
          <div className="clinic-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 0 }}>شريط الأخبار (شاشة التلفزيون)</h3>
            <Field
              label="نص الشريط"
              value={settings.tickerText}
              onChange={e => setSettings(s => ({ ...s, tickerText: e.target.value }))}
              disabled={isLoading}
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
              value={settings.footerMsg}
              onChange={e => setSettings(s => ({ ...s, footerMsg: e.target.value }))}
              disabled={isLoading}
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

        {['ADMIN', 'SUPER_ADMIN', 'RECEPTION'].includes(currentUser?.role) && (
          <button
            className="btn btn-danger"
            onClick={handleReset}
            disabled={isResetting}
            style={{ minWidth: '200px' }}
          >
            {isResetting ? 'جاري الإعادة...' : 'إعادة ضبط جميع الطوابير'}
          </button>
          )}

          {['ADMIN', 'SUPER_ADMIN', 'RECEPTION'].includes(currentUser?.role) && (
            <button
              className="btn"
              onClick={handleExportBackup}
              style={{ 
                minWidth: '200px', 
                background: '#10b981', 
                color: '#fff', 
                border: 'none',
                borderRadius: 'var(--rad-sm)',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              💾 تصدير نسخة احتياطية (Backup)
            </button>
          )}

          {['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role) && (
            <button
              className="btn"
              onClick={handleRestoreBackup}
              style={{ 
                minWidth: '200px', 
                background: '#d97706', 
                color: '#fff', 
                border: 'none',
                borderRadius: 'var(--rad-sm)',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              ♻️ استعادة نسخة احتياطية
            </button>
          )}

          <button
            className="btn"
            onClick={() => {
              if (window.confirm('هل أنت متأكد من إعادة تهيئة اتصالات الشبكة؟\nسيقوم التطبيق بالرجوع لشاشة التهيئة الأولى لإعداد دور الجهاز أو تغيير الـ IP.')) {
                localStorage.removeItem('app_type');
                localStorage.removeItem('host_ip');
                window.location.href = '/';
              }
            }}
            style={{ 
              minWidth: '220px', 
              background: '#f1f5f9', 
              color: '#334155', 
              border: '1px solid #cbd5e1',
              borderRadius: 'var(--rad-sm)',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            🔌 إعادة تهيئة اتصالات الشبكة
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

        {/* ========== إدارة العيادات ========== */}
        <section className="clinic-card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>إدارة العيادات</h3>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.85rem', margin: 0 }}>
              أي تعديل هنا ينعكس فوراً على الاستقبال والطبيب وشاشة العرض.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {clinics.map(clinic => (
              <div
                key={clinic.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 1fr 120px 110px',
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
                    disabled={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>اسم العيادة</label>
                  <input
                    className="form-input"
                    value={clinic.name || ''}
                    onChange={e => handleClinicChange(clinic.id, 'name', e.target.value)}
                    disabled={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>الاسم الإنجليزي</label>
                  <input
                    className="form-input"
                    value={clinic.nameAr || ''}
                    onChange={e => handleClinicChange(clinic.id, 'nameAr', e.target.value)}
                    dir="ltr"
                    disabled={true}
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

              </div>
            ))}
          </div>
        </section>

        {/* ========== ✨ إدارة المستخدمين (للمدراء فقط) ========== */}
        {['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && (
          <section className="clinic-card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>إدارة المستخدمين والصلاحيات</h3>
                <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  إنشاء حسابات للأطباء والاستقبال وتحديد صلاحياتهم.
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleOpenCreateUser}>
                + إنشاء حساب جديد
              </button>
            </div>

          <table className="qt-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>الاسم الكامل</th>
                <th>اسم المستخدم</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{u.username}</td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                      background: u.role === 'DOCTOR' ? '#dbeafe' : u.role === 'RECEPTION' ? '#fef3c7' : '#ede9fe',
                      color: u.role === 'DOCTOR' ? '#1e40af' : u.role === 'RECEPTION' ? '#92400e' : '#5b21b6',
                    }}>
                      {ROLE_MAP[u.role]}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                      background: u.isActive ? '#d1fae5' : '#fee2e2',
                      color: u.isActive ? '#065f46' : '#991b1b',
                    }}>
                      {u.isActive ? 'مفعّل' : 'معطّل'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* إخفاء زر التعديل للسوبر أدمن */}
                      {u.role !== 'SUPER_ADMIN' && (
                        <button className="btn" style={{fontSize: '0.8rem', padding: '0.3rem 0.8rem'}} onClick={() => handleOpenEditUser(u)}>تعديل</button>
                      )}
                      {/* إخفاء زر التعطيل للسوبر أدمن أو للحساب الحالي */}
                      {u.role !== 'SUPER_ADMIN' && u.id !== currentUser.id && (
                        <button 
                          className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                          style={{fontSize: '0.8rem', padding: '0.3rem 0.8rem'}}
                          onClick={() => handleToggleUserActive(u)}
                        >
                          {u.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
        </section>
        )}
      </main>

        {/* ✨ نافذة إنشاء/تعديل المستخدم (Modal) - بتصميم شبكي احترافي */}
      {showUserModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }} onClick={() => setShowUserModal(false)}>
          
          <div style={{
            background: 'var(--clr-bg-card)', 
            borderRadius: 'var(--rad-md)',
            width: '100%', maxWidth: '550px', // وسعنا النافذة قليلاً لاستيعاب العمودين
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* رأس النافذة */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {editingUser ? 'تعديل حساب' : 'إنشاء حساب جديد'}
              </h3>
            </div>

            {/* منطقة المحتوى (قابلة للتمرير) */}
            <form onSubmit={handleSaveUser} style={{ 
              display: 'flex', flexDirection: 'column', gap: '1rem', 
              overflowY: 'auto',
              padding: '1.25rem 1.5rem', 
              flex: 1, minHeight: 0
            }}>
              
              {/* صف مزدوج: الاسم واسم المستخدم */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>الاسم الكامل</label>
                  <input className="form-input" type="text" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>اسم المستخدم</label>
                  <input className="form-input" type="text" value={userForm.username} onChange={(e) => setUserForm({...userForm, username: e.target.value})} required disabled={!!editingUser} />
                </div>
              </div>

              {/* صف مزدوج: كلمة المرور والدور */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>
                    {editingUser ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
                  </label>
                  <input className="form-input" type="password" placeholder={editingUser ? 'اتركها فارغة للثبات' : ''} value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} required={!editingUser} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>الدور / الصلاحية</label>
                  <select className="form-input" value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value, clinicIds: []})}>
                    <option value="RECEPTION">استقبال</option>
                    <option value="DOCTOR">طبيب</option>
                    <option value="ADMIN">مدير</option>
                  </select>
                </div>
              </div>

              {/* اختيار العيادات بتصميم شبكي (عمودين) */}
              {userForm.role === 'DOCTOR' && (
                <div style={{ 
                  background: 'var(--clr-bg-page)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  border: '1px solid var(--clr-border)'
                }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-muted)', display: 'block', marginBottom: '0.75rem' }}>
                    العيادات المسموح للطبيب دخولها:
                  </label>
                  
                  {/* ✨ السر هنا: شبكة من عمودين لتوفير 50% من المساحة العمودية */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '0.4rem 1rem', // مسافة أفقية بين العمودين
                    maxHeight: '160px', // ارتفاع مناسب جداً يكفي لـ 5 صفوف
                    overflowY: 'auto' 
                  }}>
                    {clinics.map(clinic => (
                      <label key={clinic.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.2rem 0' }}>
                        <input
                          type="checkbox"
                          checked={userForm.clinicIds?.includes(clinic.id) || false}
                          onChange={(e) => {
                            const currentIds = userForm.clinicIds || [];
                            const newIds = e.target.checked 
                              ? [...currentIds, clinic.id]
                              : currentIds.filter(id => id !== clinic.id);
                            setUserForm({...userForm, clinicIds: newIds});
                          }}
                          style={{accentColor: 'var(--clr-primary)'}}
                        />
                        <span style={{ fontSize: '0.85rem' }}>{clinic.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
                            
            </form>

            {/* أزرار التحكم (ثابتة في الأسفل) */}
            <div style={{ 
              display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid var(--clr-border)', 
              flexShrink: 0, 
              background: 'var(--clr-bg-card)',
              borderBottomLeftRadius: 'var(--rad-md)', borderBottomRightRadius: 'var(--rad-md)'
            }}>
              <button type="button" className="btn" onClick={() => setShowUserModal(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary" onClick={handleSaveUser} disabled={isSavingUser}>
                {isSavingUser ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
