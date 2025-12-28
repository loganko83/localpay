import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserType } from '../../types';
import { theme } from '../../styles/theme';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  isFab?: boolean;
}

const consumerNav: NavItem[] = [
  { icon: 'home', label: 'Home', path: '/consumer' },
  { icon: 'account_balance_wallet', label: 'Wallet', path: '/consumer/wallet' },
  { icon: 'qr_code_scanner', label: 'Scan', path: '/consumer/scan', isFab: true },
  { icon: 'map', label: 'Map', path: '/consumer/merchant-map' },
  { icon: 'settings', label: 'Settings', path: '/consumer/profile' },
];

const merchantNav: NavItem[] = [
  { icon: 'grid_view', label: 'Home', path: '/merchant' },
  { icon: 'account_balance_wallet', label: 'Wallet', path: '/merchant/wallet' },
  { icon: 'qr_code_scanner', label: 'Scan', path: '/merchant/scan', isFab: true },
  { icon: 'group', label: 'Staff', path: '/merchant/employees' },
  { icon: 'settings', label: 'Settings', path: '/merchant/settings' },
];

const adminNav: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'verified_user', label: 'Audit', path: '/admin/audit', isFab: true },
  { icon: 'payments', label: 'Settle', path: '/admin/settlements' },
  { icon: 'redeem', label: 'Vouchers', path: '/admin/vouchers' },
];

// Theme colors for bottom nav - unified dark theme
const themeStyles = {
  consumer: {
    background: theme.card,
    borderColor: theme.border,
    primary: theme.accent,
    inactive: theme.textMuted,
  },
  merchant: {
    background: theme.card,
    borderColor: theme.border,
    primary: theme.merchant,
    inactive: theme.textMuted,
  },
  admin: {
    background: theme.card,
    borderColor: theme.border,
    primary: theme.admin,
    inactive: theme.textMuted,
  },
};

interface BottomNavProps {
  userType: UserType;
}

const BottomNav: React.FC<BottomNavProps> = ({ userType }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = userType === 'consumer'
    ? consumerNav
    : userType === 'merchant'
      ? merchantNav
      : adminNav;

  const styles = themeStyles[userType] || themeStyles.consumer;

  const isActive = (path: string) => {
    if (path === `/${userType}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 max-w-md w-full backdrop-blur-lg z-50 border-t pb-5 pt-3 px-6"
      style={{
        background: styles.background,
        borderColor: styles.borderColor,
      }}
    >
      <div className="flex justify-between items-end">
        {navItems.map((item) => {
          const active = isActive(item.path);

          if (item.isFab) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative -top-6 flex flex-col items-center justify-center w-12"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{
                    background: styles.primary,
                    boxShadow: `0 8px 20px -4px ${styles.primary}80`,
                  }}
                >
                  <span className="material-symbols-outlined text-white text-[32px]">
                    {item.icon}
                  </span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 w-12 transition-colors"
              style={{ color: active ? styles.primary : styles.inactive }}
            >
              <span className={`material-symbols-outlined text-[26px] ${active ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
