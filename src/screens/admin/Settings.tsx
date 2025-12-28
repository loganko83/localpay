import React, { useState } from 'react';
import { XPHERE_CONFIG, DID_BAAS_CONFIG } from '../../services/blockchain/config';

interface SettingSection {
  id: string;
  title: string;
  icon: string;
}

const sections: SettingSection[] = [
  { id: 'general', title: 'General', icon: 'settings' },
  { id: 'blockchain', title: 'Blockchain', icon: 'token' },
  { id: 'did', title: 'DID-BaaS', icon: 'fingerprint' },
  { id: 'notifications', title: 'Notifications', icon: 'notifications' },
  { id: 'security', title: 'Security', icon: 'security' },
  { id: 'api', title: 'API Keys', icon: 'key' },
];

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    // General
    platformName: 'LocalPay Jeonbuk',
    timezone: 'Asia/Seoul',
    language: 'ko',
    currency: 'KRW',

    // Blockchain
    xphereEnabled: true,
    autoAnchor: true,
    anchorBatchSize: 100,
    anchorInterval: 300,

    // DID
    didBaasEnabled: true,
    autoVerify: true,
    credentialExpiry: 365,

    // Notifications
    emailNotifications: true,
    slackNotifications: false,
    alertThreshold: 1000000,

    // Security
    twoFactorRequired: true,
    sessionTimeout: 3600,
    ipWhitelist: '',
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChange = (key: keyof typeof settings, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure platform settings and integrations
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
                <span className="text-sm font-medium">{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'general' && (
            <SettingsCard title="General Settings" icon="settings">
              <SettingInput
                label="Platform Name"
                value={settings.platformName}
                onChange={(v) => handleChange('platformName', v)}
              />
              <SettingSelect
                label="Timezone"
                value={settings.timezone}
                options={[
                  { value: 'Asia/Seoul', label: 'Asia/Seoul (KST)' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                onChange={(v) => handleChange('timezone', v)}
              />
              <SettingSelect
                label="Language"
                value={settings.language}
                options={[
                  { value: 'ko', label: 'Korean' },
                  { value: 'en', label: 'English' },
                ]}
                onChange={(v) => handleChange('language', v)}
              />
              <SettingSelect
                label="Currency"
                value={settings.currency}
                options={[
                  { value: 'KRW', label: 'Korean Won (KRW)' },
                  { value: 'USD', label: 'US Dollar (USD)' },
                ]}
                onChange={(v) => handleChange('currency', v)}
              />
            </SettingsCard>
          )}

          {activeSection === 'blockchain' && (
            <div className="space-y-6">
              <SettingsCard title="Xphere Blockchain" icon="token">
                <SettingToggle
                  label="Enable Blockchain Integration"
                  description="Connect to Xphere network for audit anchoring"
                  enabled={settings.xphereEnabled}
                  onChange={() => handleToggle('xphereEnabled')}
                />
                <SettingToggle
                  label="Auto-Anchor Logs"
                  description="Automatically anchor audit logs to blockchain"
                  enabled={settings.autoAnchor}
                  onChange={() => handleToggle('autoAnchor')}
                />
                <SettingInput
                  label="Batch Size"
                  type="number"
                  value={settings.anchorBatchSize.toString()}
                  onChange={(v) => handleChange('anchorBatchSize', parseInt(v))}
                  suffix="logs"
                />
                <SettingInput
                  label="Anchor Interval"
                  type="number"
                  value={settings.anchorInterval.toString()}
                  onChange={(v) => handleChange('anchorInterval', parseInt(v))}
                  suffix="seconds"
                />
              </SettingsCard>

              <SettingsCard title="Network Configuration" icon="lan">
                <div className="space-y-3">
                  <InfoRow label="Chain ID" value={XPHERE_CONFIG.chainId.toString()} />
                  <InfoRow label="RPC URL" value={XPHERE_CONFIG.rpcUrl} copyable />
                  <InfoRow label="Explorer" value={XPHERE_CONFIG.explorerUrl} copyable />
                  <InfoRow label="Native Currency" value={XPHERE_CONFIG.nativeCurrency.symbol} />
                </div>
              </SettingsCard>
            </div>
          )}

          {activeSection === 'did' && (
            <div className="space-y-6">
              <SettingsCard title="DID-BaaS Integration" icon="fingerprint">
                <SettingToggle
                  label="Enable DID-BaaS"
                  description="Use DID-BaaS for identity management"
                  enabled={settings.didBaasEnabled}
                  onChange={() => handleToggle('didBaasEnabled')}
                />
                <SettingToggle
                  label="Auto-Verify Credentials"
                  description="Automatically verify credentials on creation"
                  enabled={settings.autoVerify}
                  onChange={() => handleToggle('autoVerify')}
                />
                <SettingInput
                  label="Credential Expiry"
                  type="number"
                  value={settings.credentialExpiry.toString()}
                  onChange={(v) => handleChange('credentialExpiry', parseInt(v))}
                  suffix="days"
                />
              </SettingsCard>

              <SettingsCard title="DID-BaaS Endpoints" icon="api">
                <div className="space-y-3">
                  <InfoRow label="Base URL" value={DID_BAAS_CONFIG.baseUrl} copyable />
                  <InfoRow label="Swagger UI" value={DID_BAAS_CONFIG.swaggerUrl} link />
                </div>
              </SettingsCard>
            </div>
          )}

          {activeSection === 'notifications' && (
            <SettingsCard title="Notification Settings" icon="notifications">
              <SettingToggle
                label="Email Notifications"
                description="Receive alerts via email"
                enabled={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
              />
              <SettingToggle
                label="Slack Notifications"
                description="Send alerts to Slack channel"
                enabled={settings.slackNotifications}
                onChange={() => handleToggle('slackNotifications')}
              />
              <SettingInput
                label="Alert Threshold"
                type="number"
                value={settings.alertThreshold.toString()}
                onChange={(v) => handleChange('alertThreshold', parseInt(v))}
                suffix="KRW"
                description="Notify for transactions above this amount"
              />
            </SettingsCard>
          )}

          {activeSection === 'security' && (
            <SettingsCard title="Security Settings" icon="security">
              <SettingToggle
                label="Require 2FA"
                description="Require two-factor authentication for all admins"
                enabled={settings.twoFactorRequired}
                onChange={() => handleToggle('twoFactorRequired')}
              />
              <SettingInput
                label="Session Timeout"
                type="number"
                value={settings.sessionTimeout.toString()}
                onChange={(v) => handleChange('sessionTimeout', parseInt(v))}
                suffix="seconds"
              />
              <SettingInput
                label="IP Whitelist"
                value={settings.ipWhitelist}
                onChange={(v) => handleChange('ipWhitelist', v)}
                placeholder="e.g., 192.168.1.0/24, 10.0.0.1"
                description="Comma-separated list of allowed IPs (empty = all)"
              />
            </SettingsCard>
          )}

          {activeSection === 'api' && (
            <SettingsCard title="API Keys" icon="key">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Production API Key</span>
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-gray-400 text-sm font-mono">
                      lpk_prod_****************************
                    </code>
                    <button className="text-primary hover:underline text-sm">Reveal</button>
                    <button className="text-primary hover:underline text-sm">Regenerate</button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Created: 2024-12-01</p>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Test API Key</span>
                    <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs">
                      Test Mode
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-gray-400 text-sm font-mono">
                      lpk_test_****************************
                    </code>
                    <button className="text-primary hover:underline text-sm">Reveal</button>
                    <button className="text-primary hover:underline text-sm">Regenerate</button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Created: 2024-12-01</p>
                </div>

                <button className="w-full py-3 rounded-lg border border-dashed border-white/20 text-gray-400 hover:border-primary hover:text-primary transition-colors">
                  + Create New API Key
                </button>
              </div>
            </SettingsCard>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end gap-3">
            <button className="px-6 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-colors">
              Reset
            </button>
            <button className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Card
interface SettingsCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, icon, children }) => (
  <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
    <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
    <div className="p-6 space-y-6">{children}</div>
  </div>
);

// Setting Input
interface SettingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  suffix?: string;
  description?: string;
}

const SettingInput: React.FC<SettingInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  suffix,
  description,
}) => (
  <div>
    <label className="block text-white text-sm font-medium mb-2">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50"
      />
      {suffix && <span className="text-gray-400 text-sm">{suffix}</span>}
    </div>
    {description && <p className="text-gray-500 text-xs mt-1">{description}</p>}
  </div>
);

// Setting Select
interface SettingSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const SettingSelect: React.FC<SettingSelectProps> = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-white text-sm font-medium mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-gray-900">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Setting Toggle
interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-white text-sm font-medium">{label}</p>
      <p className="text-gray-500 text-xs mt-0.5">{description}</p>
    </div>
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  </div>
);

// Info Row
interface InfoRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  link?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, copyable, link }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <span className="text-gray-400 text-sm">{label}</span>
    <div className="flex items-center gap-2">
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm hover:underline"
        >
          Open
        </a>
      ) : (
        <span className="text-white text-sm font-mono">{value}</span>
      )}
      {copyable && (
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">content_copy</span>
        </button>
      )}
    </div>
  </div>
);

export default Settings;
