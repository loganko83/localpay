import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';
import AdminBreadcrumbs from './AdminBreadcrumbs';

const AdminLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #0a0e13 0%, #101922 50%, #0f1419 100%)',
      }}
    >
      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* TopBar */}
      <AdminTopBar sidebarCollapsed={sidebarCollapsed} />

      {/* Main Content */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'pl-[72px]' : 'pl-[260px]'
        }`}
      >
        <div className="p-6">
          <AdminBreadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
