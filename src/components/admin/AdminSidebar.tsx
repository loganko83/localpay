import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { path: '/admin', icon: 'dashboard', label: 'Dashboard' },
  { path: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
  { path: '/admin/fds', icon: 'shield', label: 'Fraud Detection' },
  { path: '/admin/aml-center', icon: 'gavel', label: 'AML Center' },
  { path: '/admin/welfare', icon: 'volunteer_activism', label: 'Welfare Tracker' },
  { path: '/admin/users', icon: 'people', label: 'Users' },
  { path: '/admin/vouchers', icon: 'confirmation_number', label: 'Vouchers' },
  { path: '/admin/audit', icon: 'history', label: 'Audit Logs' },
  { path: '/admin/blockchain', icon: 'token', label: 'Blockchain' },
  { path: '/admin/policies', icon: 'policy', label: 'Policies' },
  { path: '/admin/settlements', icon: 'payments', label: 'Settlements' },
  { path: '/admin/carbon', icon: 'eco', label: 'Carbon' },
  { path: '/admin/donations', icon: 'favorite', label: 'Donations' },
  { path: '/admin/tokens', icon: 'generating_tokens', label: 'Token Issuance' },
];

const bottomNavItems: NavItem[] = [
  { path: '/admin/settings', icon: 'settings', label: 'Settings' },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => (
    <NavLink
      to={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
        isActive(item.path)
          ? 'bg-primary/10 text-primary'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
      {!collapsed && (
        <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
      )}
      {item.badge && item.badge > 0 && (
        <span
          className={`absolute ${collapsed ? 'top-1 right-1' : 'right-3'} min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1`}
        >
          {item.badge}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
          <span className="text-sm text-white">{item.label}</span>
        </div>
      )}
    </NavLink>
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0f1419 0%, #1a1f2e 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo Section */}
      <div
        className="flex items-center gap-3 px-4 h-16 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #2b8cee 0%, #1a5fb4 100%)' }}
        >
          <span className="material-symbols-outlined text-white text-[22px]">
            account_balance
          </span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-white font-bold text-lg leading-tight">LocalPay</h1>
            <p className="text-gray-500 text-xs">Admin Console</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div
        className="py-4 px-3 space-y-1 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {bottomNavItems.map((item) => (
          <NavItemComponent key={item.path} item={item} />
        ))}

        {/* Collapse Button */}
        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-200"
        >
          <span
            className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${
              collapsed ? 'rotate-180' : ''
            }`}
          >
            chevron_left
          </span>
          {!collapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>

      {/* Blockchain Status */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 mb-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-500">Xphere Connected</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">Block #12,404,200</p>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;
