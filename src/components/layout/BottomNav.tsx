import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserType } from '../../types';

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
  { icon: 'receipt_long', label: 'History', path: '/consumer/history' },
  { icon: 'person', label: 'Profile', path: '/consumer/profile' },
];

const merchantNav: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/merchant' },
  { icon: 'account_balance_wallet', label: 'Wallet', path: '/merchant/wallet' },
  { icon: 'qr_code_scanner', label: 'Scan', path: '/merchant/scan', isFab: true },
  { icon: 'receipt_long', label: 'Payments', path: '/merchant/payments' },
  { icon: 'settings', label: 'Settings', path: '/merchant/settings' },
];

const adminNav: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'verified_user', label: 'Audit', path: '/admin/audit', isFab: true },
  { icon: 'payments', label: 'Settlements', path: '/admin/settlements' },
  { icon: 'redeem', label: 'Vouchers', path: '/admin/vouchers' },
];

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

  const isActive = (path: string) => {
    if (path === `/${userType}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 max-w-md w-full bg-background/95 backdrop-blur-lg border-t border-surface pb-6 pt-2 px-6 z-50">
      <div className="flex justify-between items-center h-14">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <div key={item.path} className="relative -top-6">
                <button
                  onClick={() => navigate(item.path)}
                  className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-background text-[32px]">
                    {item.icon}
                  </span>
                </button>
              </div>
            );
          }

          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex flex-col items-center gap-1 transition-all duration-200
                ${active ? 'text-primary scale-110' : 'text-text-secondary hover:text-white'}
              `}
            >
              <span className="material-symbols-outlined text-[26px]">
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
