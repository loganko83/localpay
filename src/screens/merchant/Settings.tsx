import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';
import { Card, Toggle, Button } from '../../components/common';
import { useAuthStore } from '../../store';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [autoSettlement, setAutoSettlement] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const storeInfo = {
    name: 'Jeonju Store #42',
    businessNumber: '123-45-67890',
    category: 'Restaurant',
    address: '123 Hanok Village Road, Jeonju',
    phone: '063-123-4567',
    hours: '11:00 AM - 10:00 PM',
  };

  return (
    <div className="flex flex-col pb-4">
      <Header title="Settings" />

      {/* Store Profile */}
      <div className="px-4 py-4 flex items-center gap-4 border-b border-surface">
        <div className="h-16 w-16 rounded-xl bg-surface-highlight border border-primary/30 overflow-hidden flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-2xl">storefront</span>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">{storeInfo.name}</h2>
          <p className="text-sm text-text-secondary">{storeInfo.category}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-primary text-[14px] filled">verified</span>
            <span className="text-xs text-primary">Verified Merchant</span>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-surface-highlight transition-colors">
          <span className="material-symbols-outlined text-text-secondary">edit</span>
        </button>
      </div>

      {/* Settings Sections */}
      <div className="px-4 py-4 space-y-6">
        {/* Store Information */}
        <section>
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">
            Store Information
          </h3>
          <Card padding="none">
            <div className="divide-y divide-surface-highlight">
              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">badge</span>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white">Business Number</span>
                    <p className="text-xs text-text-secondary">{storeInfo.businessNumber}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">location_on</span>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white">Address</span>
                    <p className="text-xs text-text-secondary">{storeInfo.address}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">schedule</span>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white">Business Hours</span>
                    <p className="text-xs text-text-secondary">{storeInfo.hours}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">call</span>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white">Phone</span>
                    <p className="text-xs text-text-secondary">{storeInfo.phone}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>
            </div>
          </Card>
        </section>

        {/* Payment Settings */}
        <section>
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">
            Payment Settings
          </h3>
          <Card padding="none">
            <div className="divide-y divide-surface-highlight">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">autorenew</span>
                  <div>
                    <span className="text-sm font-medium text-white">Auto Settlement</span>
                    <p className="text-xs text-text-secondary">Daily automatic transfers</p>
                  </div>
                </div>
                <Toggle checked={autoSettlement} onChange={setAutoSettlement} />
              </div>

              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">account_balance</span>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white">Settlement Account</span>
                    <p className="text-xs text-text-secondary">IBK ****4402</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">qr_code</span>
                  <span className="text-sm font-medium text-white">QR Code Settings</span>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>
            </div>
          </Card>
        </section>

        {/* Notifications */}
        <section>
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">
            Notifications
          </h3>
          <Card padding="none">
            <div className="divide-y divide-surface-highlight">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">notifications</span>
                  <span className="text-sm font-medium text-white">Push Notifications</span>
                </div>
                <Toggle checked={notifications} onChange={setNotifications} />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">volume_up</span>
                  <span className="text-sm font-medium text-white">Payment Sound</span>
                </div>
                <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
              </div>
            </div>
          </Card>
        </section>

        {/* Team */}
        <section>
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">
            Team
          </h3>
          <Card padding="none">
            <button
              onClick={() => navigate('/merchant/employees')}
              className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-text-secondary">group</span>
                <div className="text-left">
                  <span className="text-sm font-medium text-white">Team Members</span>
                  <p className="text-xs text-text-secondary">5 members</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
            </button>
          </Card>
        </section>

        {/* About */}
        <section>
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">
            About
          </h3>
          <Card padding="none">
            <div className="divide-y divide-surface-highlight">
              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">description</span>
                  <span className="text-sm font-medium text-white">Terms of Service</span>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 hover:bg-surface-highlight/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">privacy_tip</span>
                  <span className="text-sm font-medium text-white">Privacy Policy</span>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-text-secondary">info</span>
                  <span className="text-sm font-medium text-white">App Version</span>
                </div>
                <span className="text-sm text-text-secondary">v1.0.0</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Logout */}
        <Button
          variant="danger"
          fullWidth
          icon={<span className="material-symbols-outlined">logout</span>}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Settings;
