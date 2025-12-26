import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';

// Unified Dark Theme
const theme = {
  bg: '#111111',
  card: '#1a1a1a',
  cardHover: '#222222',
  border: '#2a2a2a',
  accent: '#ff4757',
  accentSoft: 'rgba(255,71,87,0.15)',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const copyWalletAddress = () => {
    navigator.clipboard.writeText('0x3f8a...8a9b');
  };

  interface MenuItem {
    icon: string;
    label: string;
    color: string;
    toggle?: boolean;
    badge?: string;
    value?: string;
  }

  interface MenuSection {
    title: string;
    items: MenuItem[];
  }

  const menuSections: MenuSection[] = [
    {
      title: 'Account & Security',
      items: [
        { icon: 'person_edit', label: 'Edit Profile', color: '#f97316' },
        { icon: 'face', label: 'Biometric Login', color: '#3b82f6', toggle: true },
        { icon: 'lock', label: 'Change PIN', color: '#a855f7' },
        { icon: 'shield', label: 'Wallet Backup', color: theme.accent, badge: 'Required' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications', label: 'Notifications', color: '#eab308' },
        { icon: 'payments', label: 'Currency Display', color: '#14b8a6', value: 'KRW' },
        { icon: 'language', label: 'Language', color: '#6366f1', value: 'Korean' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'info', label: 'Terms of Service', color: theme.textMuted },
        { icon: 'privacy_tip', label: 'Privacy Policy', color: theme.textMuted },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Profile & Settings</h1>
        <button onClick={handleLogout}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.accent }}>logout</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Profile Card */}
        <div className="px-5 py-6">
          <div
            className="rounded-2xl p-6 flex flex-col items-center"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            {/* Avatar */}
            <div className="relative mb-4">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: theme.accentSoft, border: `2px solid ${theme.accent}` }}
              >
                <span className="material-symbols-outlined text-4xl" style={{ color: theme.accent }}>person</span>
              </div>
              <div
                className="absolute bottom-0 right-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: theme.accent, color: '#fff' }}
              >
                Lvl 2
              </div>
            </div>

            <h2 className="text-xl font-bold" style={{ color: theme.text }}>Ji-min Kim</h2>
            <p className="text-sm mb-3" style={{ color: theme.textMuted }}>Busan Citizen</p>

            <button
              onClick={copyWalletAddress}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: theme.cardHover }}
            >
              <span className="text-xs font-mono" style={{ color: theme.textSecondary }}>0x3f...8a9</span>
              <span className="material-symbols-outlined text-[14px]" style={{ color: theme.textMuted }}>content_copy</span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: 'qr_code_2', label: 'My QR', color: theme.accent, path: '/consumer/scan' },
              { icon: 'support_agent', label: 'Support', color: '#3b82f6' },
              { icon: 'share', label: 'Share', color: '#22c55e' },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => action.path && navigate(action.path)}
                className="flex flex-col items-center gap-2 py-4 rounded-xl"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: `${action.color}15` }}
                >
                  <span className="material-symbols-outlined" style={{ color: action.color }}>{action.icon}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: theme.text }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section, sIdx) => (
          <div key={sIdx} className="px-5 mb-6">
            <h3 className="text-xs font-bold mb-2 uppercase tracking-wider px-1" style={{ color: theme.textMuted }}>
              {section.title}
            </h3>
            <div className="rounded-xl overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              {section.items.map((item, iIdx) => (
                <div
                  key={iIdx}
                  className="flex items-center justify-between p-4"
                  style={{ borderBottom: iIdx < section.items.length - 1 ? `1px solid ${theme.border}` : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: `${item.color}15` }}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ color: item.color }}>{item.icon}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: theme.text }}>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: theme.accentSoft, color: theme.accent }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.toggle ? (
                    <button
                      onClick={() => setBiometricEnabled(!biometricEnabled)}
                      className="relative w-10 h-6 rounded-full transition-colors"
                      style={{ background: biometricEnabled ? theme.accent : theme.cardHover }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                        style={{ left: biometricEnabled ? '18px' : '2px' }}
                      />
                    </button>
                  ) : item.value ? (
                    <span className="text-xs" style={{ color: theme.textMuted }}>{item.value}</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]" style={{ color: theme.textMuted }}>chevron_right</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Version & Logout */}
        <div className="flex flex-col items-center pb-8 gap-4">
          <p className="text-xs font-mono" style={{ color: theme.textMuted }}>Busan B-Pass v2.1.0</p>
          <button onClick={handleLogout} className="text-sm font-medium py-2 px-6 rounded-full" style={{ color: theme.accent }}>
            Log Out
          </button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
