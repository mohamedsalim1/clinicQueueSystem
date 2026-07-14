import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import apiClient from '../services/apiClient';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { addToast } = useToast();
  const location = useLocation();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // دالة لتحديد الرابط النشط
  const isActive = (path) => location.pathname === path ? 'rec-nav-item active' : 'rec-nav-item';
  const isActiveWithClass = (path, extraClass) => `${isActive(path)} ${extraClass}`.trim();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.oldPassword || !passwordForm.newPassword) return;
    try {
      setIsChangingPassword(true);
      await apiClient.put('/auth/change-password', passwordForm);
      addToast('تم تغيير كلمة المرور بنجاح', 'success');
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: '', newPassword: '' });
    } catch (err) {
      addToast(err.response?.data?.message || 'فشل تغيير كلمة المرور', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="reception-container" dir="rtl">
      {/* === السايدبار الموحد === */}
      <aside className="rec-sidebar">
        <div className="rec-logo"><span>مركز داريا الطبي</span></div>
        <nav className="rec-nav">
          {/* الاستقبال: يظهر للجميع */}
          {['RECEPTION', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
            <Link to="/reception" className={isActive('/reception')}>الاستقبال</Link>
          )}
          
          {/* الطبيب: يظهر للطبيب والمدراء */}
          {['DOCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
            <Link to="/doctor" className={isActive('/doctor')}>الطبيب</Link>
          )}

          {['DOCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
            <Link to="/doctor-pwa" className={isActiveWithClass('/doctor-pwa', 'doctor-mobile-entry')}>واجهة الطبيب للموبايل</Link>
          )}

          {/* شاشة العرض: للجميع */}
          <Link to="/display" className={isActive('/display')} target="_blank">شاشة العرض</Link>

          {/* إدارة المرضى: للمدراء فقط */}
          {['ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
            <Link to="/patients" className={isActive('/patients')}>المرضى والعائلات</Link>
          )}

          {/* سجل المراجعة: للمدراء فقط */}
          {['ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
            <Link to="/audit" className={isActive('/audit')}>سجل المراجعة</Link>
          )}

          {/* التقارير: للمدراء فقط */}
          {['ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
            <Link to="/reports" className={isActive('/reports')}>التقارير والإحصائيات</Link>
          )}

          {/* الإعدادات: للجميع (لكن محتواها يختلف بالفرونت إند) */}
          <Link to="/settings" className={isActive('/settings')}>الإعدادات</Link>
        </nav>
        <div className={`rec-conn-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="rec-conn-dot" />{isConnected ? 'متصل' : 'غير متصل'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem' }}>
          <button 
            onClick={() => setShowPasswordModal(true)} 
            style={{ padding: '0.5rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            تغيير كلمة المرور
          </button>
          <button 
            onClick={logout} 
            style={{ padding: '0.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* === المحتوى الرئيسي (الصفحات) === */}
      <main className="rec-main">
        <Outlet />
      </main>

      {/* مودال تغيير كلمة المرور */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#0f172a' }}>تغيير كلمة المرور</h3>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="password" 
                placeholder="كلمة المرور الحالية" 
                className="form-input" 
                value={passwordForm.oldPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                required
              />
              <input 
                type="password" 
                placeholder="كلمة المرور الجديدة" 
                className="form-input" 
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                required
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isChangingPassword}>
                  {isChangingPassword ? 'جاري الحفظ...' : 'تغيير'}
                </button>
                <button type="button" className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0' }} onClick={() => setShowPasswordModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
