import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; //   مستورد جديد
import { SocketProvider }  from './context/SocketContext';
import { ToastProvider }   from './context/ToastContext';
import MainLayout          from './layouts/MainLayout';
import ReceptionPage       from './pages/ReceptionPage';
import DoctorPage          from './pages/DoctorPage';
import DisplayPage         from './pages/DisplayPage';
import SettingsPage        from './pages/SettingsPage';
import AllTicketsPage      from './pages/AllTicketsPage';
import LoginPage           from './pages/LoginPage'; //   مستورد جديد

//   مكون حماية المسارات
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
  return (
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/*   مسار تسجيل الدخول */}
              <Route path="/login" element={<LoginPage />} />

              {/* شاشة العرض — مستقلة تماماً بدون layout وبدون حماية (للتلفزيون) */}
              <Route path="/display" element={<DisplayPage />} />

              {/*   المسارات المحمية داخل الـ MainLayout */}
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
                
                <Route path="settings" element={
                  <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="tickets" element={
                  <ProtectedRoute roles={['RECEPTION', 'ADMIN', 'SUPER_ADMIN']}>
                    <AllTicketsPage />
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