import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const routeLabels: Record<string, string> = {
  admin: 'Dashboard',
  analytics: 'Analytics',
  users: 'Users',
  merchants: 'Merchants',
  vouchers: 'Vouchers',
  audit: 'Audit Logs',
  blockchain: 'Blockchain',
  policies: 'Policies',
  settlements: 'Settlements',
  aml: 'AML Dashboard',
  carbon: 'Carbon Points',
  donations: 'Donations',
  tokens: 'Token Issuance',
  settings: 'Settings',
  security: 'Security',
  notifications: 'Notifications',
};

const AdminBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const breadcrumbs: BreadcrumbItem[] = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    return { label, path };
  });

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      <Link
        to="/admin"
        className="text-gray-500 hover:text-white transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[16px]">home</span>
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path || index}>
          <span className="material-symbols-outlined text-gray-600 text-[16px]">
            chevron_right
          </span>
          {index === breadcrumbs.length - 1 ? (
            <span className="text-white font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path!}
              className="text-gray-500 hover:text-white transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default AdminBreadcrumbs;
