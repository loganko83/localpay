import React, { useState } from 'react';
import { XPHERE_CONFIG, DID_BAAS_CONFIG } from '../../services/blockchain/config';

interface SettingSection {
  id: string;
  title: string;
  icon: string;
}

const sections: SettingSection[] = [
  { id: 'general', title: '일반', icon: 'settings' },
  { id: 'blockchain', title: '블록체인', icon: 'token' },
  { id: 'did', title: 'DID-BaaS', icon: 'fingerprint' },
  { id: 'notifications', title: '알림', icon: 'notifications' },
  { id: 'security', title: '보안', icon: 'security' },
  { id: 'api', title: 'API 키', icon: 'key' },
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
        <h1 className="text-2xl font-bold text-white">설정</h1>
        <p className="text-gray-400 text-sm mt-1">
          플랫폼 설정 및 연동 구성
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
            <SettingsCard title="일반 설정" icon="settings">
              <SettingInput
                label="플랫폼 이름"
                value={settings.platformName}
                onChange={(v) => handleChange('platformName', v)}
              />
              <SettingSelect
                label="시간대"
                value={settings.timezone}
                options={[
                  { value: 'Asia/Seoul', label: '아시아/서울 (KST)' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                onChange={(v) => handleChange('timezone', v)}
              />
              <SettingSelect
                label="언어"
                value={settings.language}
                options={[
                  { value: 'ko', label: '한국어' },
                  { value: 'en', label: '영어' },
                ]}
                onChange={(v) => handleChange('language', v)}
              />
              <SettingSelect
                label="통화"
                value={settings.currency}
                options={[
                  { value: 'KRW', label: '원화 (KRW)' },
                  { value: 'USD', label: '미국 달러 (USD)' },
                ]}
                onChange={(v) => handleChange('currency', v)}
              />
            </SettingsCard>
          )}

          {activeSection === 'blockchain' && (
            <div className="space-y-6">
              <SettingsCard title="Xphere 블록체인" icon="token">
                <SettingToggle
                  label="블록체인 연동 활성화"
                  description="감사 앵커링을 위해 Xphere 네트워크에 연결"
                  enabled={settings.xphereEnabled}
                  onChange={() => handleToggle('xphereEnabled')}
                />
                <SettingToggle
                  label="로그 자동 앵커링"
                  description="감사 로그를 블록체인에 자동으로 앵커링"
                  enabled={settings.autoAnchor}
                  onChange={() => handleToggle('autoAnchor')}
                />
                <SettingInput
                  label="배치 크기"
                  type="number"
                  value={settings.anchorBatchSize.toString()}
                  onChange={(v) => handleChange('anchorBatchSize', parseInt(v))}
                  suffix="로그"
                />
                <SettingInput
                  label="앵커링 간격"
                  type="number"
                  value={settings.anchorInterval.toString()}
                  onChange={(v) => handleChange('anchorInterval', parseInt(v))}
                  suffix="초"
                />
              </SettingsCard>

              <SettingsCard title="네트워크 구성" icon="lan">
                <div className="space-y-3">
                  <InfoRow label="체인 ID" value={XPHERE_CONFIG.chainId.toString()} />
                  <InfoRow label="RPC URL" value={XPHERE_CONFIG.rpcUrl} copyable />
                  <InfoRow label="탐색기" value={XPHERE_CONFIG.explorerUrl} copyable />
                  <InfoRow label="네이티브 통화" value={XPHERE_CONFIG.nativeCurrency.symbol} />
                </div>
              </SettingsCard>
            </div>
          )}

          {activeSection === 'did' && (
            <div className="space-y-6">
              <SettingsCard title="DID-BaaS 연동" icon="fingerprint">
                <SettingToggle
                  label="DID-BaaS 활성화"
                  description="신원 관리에 DID-BaaS 사용"
                  enabled={settings.didBaasEnabled}
                  onChange={() => handleToggle('didBaasEnabled')}
                />
                <SettingToggle
                  label="자격증명 자동 검증"
                  description="생성 시 자격증명 자동 검증"
                  enabled={settings.autoVerify}
                  onChange={() => handleToggle('autoVerify')}
                />
                <SettingInput
                  label="자격증명 만료"
                  type="number"
                  value={settings.credentialExpiry.toString()}
                  onChange={(v) => handleChange('credentialExpiry', parseInt(v))}
                  suffix="일"
                />
              </SettingsCard>

              <SettingsCard title="DID-BaaS 엔드포인트" icon="api">
                <div className="space-y-3">
                  <InfoRow label="기본 URL" value={DID_BAAS_CONFIG.baseUrl} copyable />
                  <InfoRow label="Swagger UI" value={DID_BAAS_CONFIG.swaggerUrl} link />
                </div>
              </SettingsCard>
            </div>
          )}

          {activeSection === 'notifications' && (
            <SettingsCard title="알림 설정" icon="notifications">
              <SettingToggle
                label="이메일 알림"
                description="이메일로 경고 수신"
                enabled={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
              />
              <SettingToggle
                label="Slack 알림"
                description="Slack 채널로 경고 전송"
                enabled={settings.slackNotifications}
                onChange={() => handleToggle('slackNotifications')}
              />
              <SettingInput
                label="경고 임계값"
                type="number"
                value={settings.alertThreshold.toString()}
                onChange={(v) => handleChange('alertThreshold', parseInt(v))}
                suffix="원"
                description="이 금액 이상의 거래 시 알림"
              />
            </SettingsCard>
          )}

          {activeSection === 'security' && (
            <SettingsCard title="보안 설정" icon="security">
              <SettingToggle
                label="2단계 인증 필수"
                description="모든 관리자에게 2단계 인증 필수"
                enabled={settings.twoFactorRequired}
                onChange={() => handleToggle('twoFactorRequired')}
              />
              <SettingInput
                label="세션 타임아웃"
                type="number"
                value={settings.sessionTimeout.toString()}
                onChange={(v) => handleChange('sessionTimeout', parseInt(v))}
                suffix="초"
              />
              <SettingInput
                label="IP 화이트리스트"
                value={settings.ipWhitelist}
                onChange={(v) => handleChange('ipWhitelist', v)}
                placeholder="예: 192.168.1.0/24, 10.0.0.1"
                description="허용된 IP 목록, 쉼표로 구분 (비어 있으면 전체 허용)"
              />
            </SettingsCard>
          )}

          {activeSection === 'api' && (
            <SettingsCard title="API 키" icon="key">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">운영 API 키</span>
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs">
                      활성
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-gray-400 text-sm font-mono">
                      lpk_prod_****************************
                    </code>
                    <button className="text-primary hover:underline text-sm">표시</button>
                    <button className="text-primary hover:underline text-sm">재생성</button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">생성일: 2024-12-01</p>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">테스트 API 키</span>
                    <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs">
                      테스트 모드
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-gray-400 text-sm font-mono">
                      lpk_test_****************************
                    </code>
                    <button className="text-primary hover:underline text-sm">표시</button>
                    <button className="text-primary hover:underline text-sm">재생성</button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">생성일: 2024-12-01</p>
                </div>

                <button className="w-full py-3 rounded-lg border border-dashed border-white/20 text-gray-400 hover:border-primary hover:text-primary transition-colors">
                  + 새 API 키 생성
                </button>
              </div>
            </SettingsCard>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end gap-3">
            <button className="px-6 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-colors">
              초기화
            </button>
            <button className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              변경사항 저장
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
          열기
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
