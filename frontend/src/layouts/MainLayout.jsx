/**
 * MainLayout.jsx — التخطيط العام (بدون الـ display)
 * بسيط: يُظهر <Outlet /> فقط لأن كل صفحة لديها Sidebar خاصها
 */

import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </div>
  );
};

export default MainLayout;
