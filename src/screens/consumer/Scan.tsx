import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { theme } from '../../styles/theme';

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scan' | 'myqr'>('scan');
  const [flashOn, setFlashOn] = useState(false);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden select-none" style={{ background: theme.bg }}>
      {/* Simulated Camera Feed Background */}
      <div className="absolute inset-0 z-0" style={{ background: '#0a0a0a' }}>
        <img
          src="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=800&auto=format&fit=crop"
          alt="Camera Feed"
          className="w-full h-full object-cover"
          style={{ opacity: 0.4, filter: 'blur(2px)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.8) 100%)' }}
        />
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Top Section */}
        <div style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }} className="pt-4 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-2">
            <button onClick={() => navigate(-1)}>
              <span className="material-symbols-outlined text-3xl" style={{ color: theme.text }}>close</span>
            </button>
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>스캔하여 결제</h2>
            <button onClick={() => setFlashOn(!flashOn)}>
              <span className="material-symbols-outlined text-2xl" style={{ color: flashOn ? theme.accent : theme.text }}>
                {flashOn ? 'flashlight_on' : 'flashlight_off'}
              </span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-8 mt-4">
            {[
              { id: 'scan', label: 'QR 스캔' },
              { id: 'myqr', label: '내 QR코드' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'scan' | 'myqr')}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: activeTab === tab.id ? theme.text : theme.textMuted }}
                >
                  {tab.label}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: activeTab === tab.id ? theme.accent : 'transparent',
                    boxShadow: activeTab === tab.id ? `0 0 8px ${theme.accent}` : 'none',
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Middle Section */}
        {activeTab === 'scan' ? (
          <div className="flex-1 flex flex-col items-center justify-center -mt-10">
            <p className="text-lg font-medium text-center mb-8" style={{ color: theme.text, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              프레임 안에 QR코드를 맞춰주세요
            </p>

            {/* Scanner Frame */}
            <div className="relative w-72 h-72 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 rounded-3xl" style={{ border: `1px solid ${theme.border}` }} />

              {/* Scan Line */}
              <div
                className="absolute left-0 right-0 h-0.5"
                style={{
                  background: `linear-gradient(to right, transparent, ${theme.accent}, transparent)`,
                  boxShadow: `0 0 15px ${theme.accent}`,
                  animation: 'scanLine 2.5s linear infinite',
                }}
              />

              {/* Corners */}
              <div className="absolute top-0 left-0 w-8 h-8 rounded-tl-xl" style={{ borderLeft: `4px solid ${theme.accent}`, borderTop: `4px solid ${theme.accent}` }} />
              <div className="absolute top-0 right-0 w-8 h-8 rounded-tr-xl" style={{ borderRight: `4px solid ${theme.accent}`, borderTop: `4px solid ${theme.accent}` }} />
              <div className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-xl" style={{ borderLeft: `4px solid ${theme.accent}`, borderBottom: `4px solid ${theme.accent}` }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-br-xl" style={{ borderRight: `4px solid ${theme.accent}`, borderBottom: `4px solid ${theme.accent}` }} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
            <div
              className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: theme.accentSoft }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: theme.accent }}>person</span>
              </div>

              <h2 className="text-xl font-bold" style={{ color: theme.text }}>내 결제 QR</h2>
              <p className="text-sm mb-6" style={{ color: theme.textMuted }}>결제를 받으려면 스캔하세요</p>

              <div className="p-4 rounded-2xl mb-6" style={{ background: '#fff' }}>
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=busan-localpay-user-payment&color=111111&bgcolor=ffffff&margin=10"
                  alt="My QR Code"
                  className="w-48 h-48"
                />
              </div>

              <div className="flex gap-3 w-full">
                <button className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: theme.cardHover, color: theme.text }}>
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  공유
                </button>
                <button className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: theme.cardHover, color: theme.text }}>
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div
          className="pb-10 pt-12 px-6 flex flex-col items-center gap-6"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}
        >
          <button
            onClick={() => navigate('/consumer/merchant-code')}
            className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl h-12"
            style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
          >
            <span className="material-symbols-outlined text-xl">keyboard</span>
            <span className="text-sm font-bold">가맹점 코드 직접 입력</span>
          </button>

          <div className="flex items-center justify-between w-full max-w-xs px-4">
            <button onClick={() => navigate('/consumer/history')} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>photo_library</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>갤러리</span>
            </button>

            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: '3px solid white' }}>
              <div className="w-14 h-14 rounded-full" style={{ background: 'white' }} />
            </div>

            <button onClick={() => navigate('/consumer/history')} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>history</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>내역</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Scan;
