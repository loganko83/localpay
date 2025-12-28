import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';

import { theme } from '../../styles/theme';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'info' | 'operations' | 'finance'>('info');
  const [isOpen, setIsOpen] = useState(true);
  const [busanCoinEnabled, setBusanCoinEnabled] = useState(true);
  const [qrPayEnabled, setQrPayEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{ color: theme.text }}
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10" style={{ color: theme.text }}>프로필 설정</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-6 px-4">
          <div className="relative mb-4">
            <div
              className="w-28 h-28 rounded-full bg-cover bg-center"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop")',
                border: `4px solid ${theme.border}`,
              }}
            />
            <button
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: theme.accent }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: theme.text }}>edit</span>
            </button>
          </div>
          <h2 className="text-2xl font-bold text-center" style={{ color: theme.text }}>부산 해산물 하우스</h2>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[16px]" style={{ color: theme.accent }}>verified</span>
            <p className="text-sm" style={{ color: theme.textSecondary }}>ID: 0x8F...2A | 인증된 가맹점</p>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div
          className="sticky top-[56px] z-40 px-4 py-3"
          style={{ background: `${theme.bg}F2`, backdropFilter: 'blur(8px)' }}
        >
          <div
            className="flex h-10 items-center justify-center rounded-lg p-1"
            style={{ background: theme.card }}
          >
            {(['info', 'operations', 'finance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 h-full rounded-md text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab ? theme.bg : 'transparent',
                  color: activeTab === tab ? theme.accent : theme.textSecondary,
                  boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Business Details Section */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>사업장 정보</h3>
        </div>

        <div className="px-4 flex flex-col gap-4">
          {/* Business Name */}
          <label className="flex flex-col">
            <p className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>상호명</p>
            <div className="relative">
              <input
                type="text"
                defaultValue="부산 해산물 하우스"
                className="w-full h-12 rounded-xl px-4 pr-10 focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                }}
              />
              <span
                className="material-symbols-outlined absolute right-3 top-3"
                style={{ color: theme.textMuted, fontSize: '20px' }}
              >
                storefront
              </span>
            </div>
          </label>

          {/* Store Address */}
          <label className="flex flex-col">
            <p className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>매장 주소</p>
            <div className="relative">
              <input
                type="text"
                defaultValue="123 Gwangan-ro, Suyeong-gu, Busan"
                className="w-full h-12 rounded-xl px-4 pr-10 focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                }}
              />
              <span
                className="material-symbols-outlined absolute right-3 top-3 cursor-pointer transition-colors"
                style={{ color: theme.textMuted, fontSize: '20px' }}
              >
                map
              </span>
            </div>
          </label>

          {/* Map Preview */}
          <div
            className="h-32 w-full rounded-xl overflow-hidden relative"
            style={{ border: `1px solid ${theme.border}` }}
          >
            <img
              src="https://maps.googleapis.com/maps/api/staticmap?center=Busan,Korea&zoom=14&size=400x200&maptype=roadmap&style=feature:all|element:labels|visibility:on&style=feature:all|element:geometry|color:0x242f3e"
              alt="Map"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.9)', color: theme.bg }}
              >
                <span className="material-symbols-outlined text-sm">edit_location</span>
                위치 수정
              </button>
            </div>
          </div>

          {/* Contact Number */}
          <label className="flex flex-col">
            <p className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>연락처</p>
            <div className="relative">
              <input
                type="tel"
                defaultValue="051-123-4567"
                className="w-full h-12 rounded-xl px-4 pr-10 focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                }}
              />
              <span
                className="material-symbols-outlined absolute right-3 top-3"
                style={{ color: theme.textMuted, fontSize: '20px' }}
              >
                call
              </span>
            </div>
          </label>
        </div>

        {/* Operations Section */}
        <div className="px-4 pt-6 pb-2">
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>운영</h3>
        </div>

        <div className="px-4 flex flex-col gap-3">
          {/* Operating Hours */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: theme.accentSoft }}
              >
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>schedule</span>
              </div>
              <div>
                <span className="font-medium" style={{ color: theme.text }}>영업시간</span>
                <p className="text-xs" style={{ color: theme.textSecondary }}>월-일: 오전 10:00 - 오후 10:00</p>
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ color: theme.textMuted }}>chevron_right</span>
          </div>

          {/* Currently Open Toggle */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: theme.accentSoft }}
              >
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>door_open</span>
              </div>
              <div>
                <span className="font-medium" style={{ color: theme.text }}>현재 영업 중</span>
                <p className="text-xs" style={{ color: theme.textSecondary }}>지도에 표시됨</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: isOpen ? theme.accent : theme.border }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: isOpen ? '22px' : '2px' }}
              />
            </button>
          </div>
        </div>

        {/* Financials Section */}
        <div className="px-4 pt-6 pb-2">
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>재정 및 정산</h3>
        </div>

        <div className="px-4 flex flex-col gap-3">
          {/* Settlement Account */}
          <div
            className="p-4 rounded-xl"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: theme.textMuted }}>account_balance</span>
                <span className="font-medium text-sm" style={{ color: theme.text }}>정산 계좌</span>
              </div>
              <button className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.accent }}>변경</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg" style={{ color: theme.text }}>부산은행</p>
                <p className="text-sm" style={{ color: theme.textSecondary }}>**** **** **** 8821</p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ background: theme.accentSoft, color: theme.accent, border: `1px solid ${theme.accent}` }}
              >
                활성
              </span>
            </div>
            <p className="text-xs mt-3 flex items-center gap-1" style={{ color: theme.textMuted }}>
              <span className="material-symbols-outlined text-[14px]">lock</span>
              블록체인 원장으로 보호됨
            </p>
          </div>

          {/* Payment Methods */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            {/* Busan Coin */}
            <div
              className="p-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${theme.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: theme.accentSoft }}
                >
                  <span className="material-symbols-outlined" style={{ color: theme.accent }}>currency_bitcoin</span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: theme.text }}>부산 코인</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>수수료 없음</p>
                </div>
              </div>
              <button
                onClick={() => setBusanCoinEnabled(!busanCoinEnabled)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: busanCoinEnabled ? theme.accent : theme.border }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: busanCoinEnabled ? '22px' : '2px' }}
                />
              </button>
            </div>

            {/* QR Pay */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: theme.accentSoft }}
                >
                  <span className="material-symbols-outlined" style={{ color: theme.accent }}>qr_code_scanner</span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: theme.text }}>QR 결제</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>기본 수수료</p>
                </div>
              </div>
              <button
                onClick={() => setQrPayEnabled(!qrPayEnabled)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: qrPayEnabled ? theme.accent : theme.border }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: qrPayEnabled ? '22px' : '2px' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="px-4 pt-6 pb-2">
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>알림</h3>
        </div>

        <div className="px-4 pb-4">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div
              className="p-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${theme.border}` }}
            >
              <span className="font-medium" style={{ color: theme.text }}>푸시 알림</span>
              <button
                onClick={() => setPushNotifications(!pushNotifications)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: pushNotifications ? theme.accent : theme.border }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: pushNotifications ? '22px' : '2px' }}
                />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-medium" style={{ color: theme.text }}>일일 매출 리포트</span>
              <button
                onClick={() => setDailyReport(!dailyReport)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: dailyReport ? theme.accent : theme.border }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: dailyReport ? '22px' : '2px' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 py-4">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            style={{ background: theme.accentSoft, color: theme.accent, border: `1px solid ${theme.accent}` }}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            로그아웃
          </button>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4 z-50 max-w-md mx-auto"
        style={{
          background: `${theme.bg}CC`,
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <button
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: theme.accent,
            color: theme.text,
            boxShadow: `0 8px 20px -4px ${theme.accentSoft}`,
          }}
        >
          변경사항 저장
          <span className="material-symbols-outlined text-[20px]">check</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
