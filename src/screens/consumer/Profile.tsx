import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';
import { Card, Toggle, Button, Badge } from '../../components/common';
import { useAuthStore } from '../../store';

interface MenuItem {
  icon: string;
  label: string;
  action?: () => void;
  arrow?: boolean;
  toggle?: boolean;
  value?: boolean;
  onChange?: (value: boolean) => void;
  badge?: string;
  subtitle?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface DIDCredential {
  id: string;
  type: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  status: 'valid' | 'expired' | 'revoked';
  verified: boolean;
}

const mockCredentials: DIDCredential[] = [
  {
    id: 'vc-resident-001',
    type: 'ResidentCredential',
    issuer: 'Jeonbuk Provincial Government',
    issuedAt: '2024-01-15',
    expiresAt: '2029-01-15',
    status: 'valid',
    verified: true,
  },
  {
    id: 'vc-age-001',
    type: 'AgeVerificationCredential',
    issuer: 'Ministry of Interior',
    issuedAt: '2024-06-01',
    expiresAt: '2025-06-01',
    status: 'valid',
    verified: true,
  },
  {
    id: 'vc-welfare-001',
    type: 'WelfareEligibilityCredential',
    issuer: 'Jeonju City Welfare Office',
    issuedAt: '2024-03-01',
    expiresAt: '2025-03-01',
    status: 'valid',
    verified: true,
  },
];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showCredentialDetail, setShowCredentialDetail] = useState<DIDCredential | null>(null);

  const userDID = 'did:xphere:jeonbuk:0x8a7b...3f2e';
  const credentials = mockCredentials;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Quick Actions',
      items: [
        { icon: 'qr_code_2', label: 'My QR Code', action: () => navigate('/consumer/scan') },
        { icon: 'support_agent', label: 'Customer Support', action: () => {} },
        { icon: 'share', label: 'Invite Friends', action: () => {} },
      ],
    },
    {
      title: 'Account & Security',
      items: [
        { icon: 'person', label: 'Edit Profile', action: () => {}, arrow: true },
        { icon: 'fingerprint', label: 'Biometric Login', toggle: true, value: biometricEnabled, onChange: setBiometricEnabled },
        { icon: 'pin', label: 'Change PIN', action: () => {}, arrow: true },
        { icon: 'backup', label: 'Wallet Backup', action: () => {}, arrow: true, badge: 'Required' },
      ],
    },
    {
      title: 'Linked Accounts',
      items: [
        { icon: 'account_balance', label: 'Bank Accounts', action: () => {}, arrow: true, subtitle: '2 accounts linked' },
        { icon: 'credit_card', label: 'Prepaid Cards', action: () => {}, arrow: true, subtitle: '1 card linked' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications', label: 'Notifications', toggle: true, value: notificationsEnabled, onChange: setNotificationsEnabled },
        { icon: 'language', label: 'Language', action: () => {}, arrow: true, subtitle: 'Korean' },
        { icon: 'currency_exchange', label: 'Currency Display', action: () => {}, arrow: true, subtitle: 'KRW' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'description', label: 'Terms of Service', action: () => {}, arrow: true },
        { icon: 'privacy_tip', label: 'Privacy Policy', action: () => {}, arrow: true },
        { icon: 'info', label: 'App Version', subtitle: 'v1.0.0' },
      ],
    },
  ];

  return (
    <div className="flex flex-col pb-4">
      <Header title="Profile" />

      {/* Profile Header */}
      <div className="px-4 py-6 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface-highlight border-2 border-primary overflow-hidden">
          <div className="h-full w-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">person</span>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">LocalPay User</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
              Silver Member
            </span>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-surface-highlight transition-colors">
          <span className="material-symbols-outlined text-text-secondary">edit</span>
        </button>
      </div>

      {/* DID Identity Section */}
      <div className="px-4 mb-6">
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">fingerprint</span>
              <h3 className="font-semibold text-white">Digital Identity (DID)</h3>
            </div>
            <Badge variant="success">Verified</Badge>
          </div>

          {/* DID Address */}
          <div className="bg-surface-highlight rounded-lg p-3 mb-4">
            <p className="text-xs text-text-secondary mb-1">Your DID</p>
            <div className="flex items-center justify-between">
              <code className="text-sm text-white font-mono">{userDID}</code>
              <button className="p-1 hover:bg-surface rounded transition-colors">
                <span className="material-symbols-outlined text-text-secondary text-sm">content_copy</span>
              </button>
            </div>
          </div>

          {/* Verifiable Credentials */}
          <div className="space-y-2">
            <p className="text-xs text-text-secondary font-medium">Verifiable Credentials ({credentials.length})</p>
            {credentials.map((credential) => (
              <button
                key={credential.id}
                onClick={() => setShowCredentialDetail(credential)}
                className="w-full flex items-center justify-between p-3 bg-surface-highlight rounded-lg hover:bg-surface-highlight/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    credential.status === 'valid' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <span className={`material-symbols-outlined text-sm ${
                      credential.status === 'valid' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {credential.status === 'valid' ? 'verified_user' : 'error'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      {credential.type.replace('Credential', '')}
                    </p>
                    <p className="text-xs text-text-secondary">{credential.issuer}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
              </button>
            ))}
          </div>

          {/* Add Credential Button */}
          <button className="w-full mt-4 flex items-center justify-center gap-2 p-3 border border-dashed border-primary/50 rounded-lg text-primary hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="text-sm font-medium">Add New Credential</span>
          </button>
        </Card>
      </div>

      {/* Credential Detail Modal */}
      {showCredentialDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
          <div className="bg-surface w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Credential Details</h3>
              <button
                onClick={() => setShowCredentialDetail(null)}
                className="p-2 rounded-full hover:bg-surface-highlight"
              >
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                  showCredentialDetail.status === 'valid' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  <span className={`material-symbols-outlined text-3xl ${
                    showCredentialDetail.status === 'valid' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {showCredentialDetail.status === 'valid' ? 'verified' : 'cancel'}
                  </span>
                </div>
              </div>

              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-white">
                  {showCredentialDetail.type.replace('Credential', '')}
                </h4>
                <p className="text-text-secondary">{showCredentialDetail.issuer}</p>
              </div>

              <div className="bg-surface-highlight rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Status</span>
                  <Badge variant={showCredentialDetail.status === 'valid' ? 'success' : 'error'}>
                    {showCredentialDetail.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Credential ID</span>
                  <span className="text-white text-sm font-mono">{showCredentialDetail.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Issued</span>
                  <span className="text-white text-sm">{showCredentialDetail.issuedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Expires</span>
                  <span className="text-white text-sm">{showCredentialDetail.expiresAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Verified</span>
                  <span className="text-green-500 text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Blockchain Verified
                  </span>
                </div>
              </div>

              <Button variant="secondary" fullWidth onClick={() => setShowCredentialDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Sections */}
      <div className="px-4 space-y-6">
        {menuSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title !== 'Quick Actions' && (
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">
                {section.title}
              </h3>
            )}

            {section.title === 'Quick Actions' ? (
              <div className="grid grid-cols-3 gap-3 mb-2">
                {section.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="flex flex-col items-center gap-2 p-4 bg-surface rounded-xl border border-surface-highlight hover:bg-surface-highlight transition-colors"
                  >
                    <span className="material-symbols-outlined text-2xl text-primary">{item.icon}</span>
                    <span className="text-xs text-white font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Card padding="none">
                <div className="divide-y divide-surface-highlight">
                  {section.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 ${
                        item.action && !item.toggle ? 'hover:bg-surface-highlight/50 cursor-pointer' : ''
                      }`}
                      onClick={item.action && !item.toggle ? item.action : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-text-secondary">{item.icon}</span>
                        <div>
                          <span className="text-sm font-medium text-white">{item.label}</span>
                          {item.subtitle && (
                            <p className="text-xs text-text-secondary">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-medium rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {item.toggle ? (
                          <Toggle checked={item.value!} onChange={item.onChange!} />
                        ) : item.arrow ? (
                          <span className="material-symbols-outlined text-text-secondary text-sm">chevron_right</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ))}

        {/* Logout Button */}
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

export default Profile;
