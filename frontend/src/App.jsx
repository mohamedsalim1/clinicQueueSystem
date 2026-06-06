import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider }  from './context/SocketContext';
import { ToastProvider }   from './context/ToastContext';
import PatientsAdminPage from './pages/PatientsAdminPage';
import AuditPage from './pages/AuditPage';
import MainLayout          from './layouts/MainLayout';
import ReceptionPage       from './pages/ReceptionPage';
import DoctorPage          from './pages/DoctorPage';
import DoctorMobilePage   from './pages/DoctorMobilePage';
import DisplayPage         from './pages/DisplayPage';
import SettingsPage        from './pages/SettingsPage';
import AllTicketsPage      from './pages/AllTicketsPage';
import LoginPage           from './pages/LoginPage';
import ReportsPage         from './pages/ReportsPage';
import SetupPage           from './pages/SetupPage';
import { getBrowserHostCandidate } from './config/network';

const ensureBrowserClientConfig = () => {
  if (window.location.pathname === '/setup') return false;

  const appType = localStorage.getItem('app_type');
  const appVariant = import.meta.env.VITE_APP_VARIANT || '';

  // إذا كان البيلد محدد النوع مسبقاً (reception أو host)، تحقق من التطابق
  if (appVariant === 'reception' && appType !== 'reception') return false;
  if (appVariant === 'host' && appType !== 'host') return false;

  // إذا كان المستخدم قد حدد النوع مسبقاً، تابع
  if (appType) return true;

  // لا يوجد إعداد محفوظ بعد → أرسل المستخدم لصفحة الإعداد
  return false;
};


// مكون حماية المسارات
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '20vh', fontSize: '1.2rem', color: '#0f766e' }}>جاري التحقق...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // التحقق من الصلاحيات (RBAC في الفرونت إند)
  if (roles && !roles.includes(user.role)) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20vh', color: '#dc2626', fontSize: '1.2rem' }}>
        ليست لديك صلاحية للوصول لهذه الصفحة
      </div>
    );
  }

  return children;
};



function App() {
  const isConfigured = ensureBrowserClientConfig();

  if (!isConfigured) {
    return <SetupPage />;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* مسار تسجيل الدخول */}
              <Route path="/login" element={<LoginPage />} />

              {/* شاشة العرض — مستقلة تماماً بدون layout وبدون حماية (للتلفزيون) */}
              <Route path="/display" element={<DisplayPage />} />

              {/* ✨ صفحة الطبيب PWA — مستقلة بدون MainLayout، مُحمَّلة للطبيب فقط */}
              <Route path="/doctor-pwa" element={
                <ProtectedRoute roles={['DOCTOR', 'ADMIN', 'SUPER_ADMIN']}>
                  <DoctorMobilePage />
                </ProtectedRoute>
              } />

              {/* المسارات المحمية داخل الـ MainLayout */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/reception" replace />} />
                
                <Route path="reception" element={
                  <ProtectedRoute roles={['RECEPTION', 'ADMIN', 'SUPER_ADMIN']}>
                    <ReceptionPage />
                  </ProtectedRoute>
                } />
                
                <Route path="doctor" element={
                  <ProtectedRoute roles={['DOCTOR', 'ADMIN', 'SUPER_ADMIN']}>
                    <DoctorPage />
                  </ProtectedRoute>
                } />
                
                {/* ✨ السماح للاستقبال بالدخول للإعدادات (لإدارة الطابعة والعيادات) */}
                <Route path="settings" element={
                  <ProtectedRoute roles={['RECEPTION', 'ADMIN', 'SUPER_ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="tickets" element={
                  <ProtectedRoute roles={['RECEPTION', 'ADMIN', 'SUPER_ADMIN']}>
                    <AllTicketsPage />
                  </ProtectedRoute>
                } />

                {/* ✨ المسارات الجديدة: إدارة المرضى وسجل المراجعة (للمدراء فقط) */}
                <Route path="patients" element={
                  <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                    <PatientsAdminPage />
                  </ProtectedRoute>
                } />

                <Route path="audit" element={
                  <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                    <AuditPage />
                  </ProtectedRoute>
                } />
                
                <Route path="reports" element={
                  <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                } />
                
              </Route>
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
