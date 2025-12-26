import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scan' | 'myqr'>('myqr');
  const [flashOn, setFlashOn] = useState(false);
  const [zoom, setZoom] = useState<'1x' | '2x'>('1x');
  const [amount, setAmount] = useState('');

  const formatAmount = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    if (numeric) {
      return new Intl.NumberFormat('ko-KR').format(parseInt(numeric));
    }
    return '';
  };

  const handleAmountChange = (value: string) => {
    setAmount(formatAmount(value));
  };

  const numericAmount = parseInt(amount.replace(/,/g, '')) || 0;
  const qrData = `busan-merchant-42-pay-${numericAmount}`;

  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden select-none"
      style={{ background: theme.bg }}
    >
      {/* Simulated Camera Feed Background */}
      <div className="absolute inset-0 z-0" style={{ background: theme.card }}>
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop"
          alt="Camera Feed"
          className="w-full h-full object-cover"
          style={{ opacity: 0.5, filter: 'blur(2px)' }}
        />
        {/* Vignette Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, transparent 65%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.9) 100%)',
          }}
        />
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Top Section */}
        <div
          className="pt-4 pb-8"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}
        >
          {/* Top AppBar */}
          <div className="flex items-center p-4 justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex w-12 h-12 shrink-0 items-center justify-center rounded-full transition-colors"
              style={{ background: 'transparent', color: theme.text }}
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center" style={{ color: theme.text }}>
              Receive Payment
            </h2>
            <div className="flex w-12 items-center justify-end">
              <button
                onClick={() => setFlashOn(!flashOn)}
                className="flex w-12 h-12 cursor-pointer items-center justify-center rounded-full transition-colors"
                style={{ color: theme.text }}
              >
                <span className="material-symbols-outlined text-2xl">
                  {flashOn ? 'flashlight_on' : 'flashlight_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-2 px-6">
            <div className="flex justify-center items-center gap-8">
              <button
                onClick={() => setActiveTab('myqr')}
                className="flex flex-col items-center justify-center gap-2 px-4"
                style={{ opacity: activeTab === 'myqr' ? 1 : 0.5 }}
              >
                <span className="text-sm font-bold tracking-wide" style={{ color: theme.text }}>Show QR</span>
                <div
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: activeTab === 'myqr' ? theme.accent : 'transparent',
                    boxShadow: activeTab === 'myqr' ? `0 0 8px ${theme.accent}` : 'none',
                  }}
                />
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className="flex flex-col items-center justify-center gap-2 px-4 transition-opacity"
                style={{ opacity: activeTab === 'scan' ? 1 : 0.5 }}
              >
                <span className="text-sm font-medium tracking-wide" style={{ color: theme.text }}>Scan QR</span>
                <div
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: activeTab === 'scan' ? theme.accent : 'transparent',
                    boxShadow: activeTab === 'scan' ? `0 0 8px ${theme.accent}` : 'none',
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Section */}
        {activeTab === 'scan' ? (
          <div className="flex-1 flex flex-col items-center justify-center -mt-10">
            {/* Instruction Text */}
            <h3
              className="tracking-wide text-lg font-medium text-center mb-8"
              style={{ color: theme.text, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >
              Scan customer's QR code
            </h3>

            {/* Scanner Frame */}
            <div className="relative w-72 h-72 rounded-3xl overflow-hidden">
              {/* Frame Border */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{ border: `1px solid ${theme.border}` }}
              />

              {/* Animated Scan Line */}
              <div
                className="absolute left-0 right-0 h-0.5"
                style={{
                  background: `linear-gradient(to right, transparent, ${theme.accent}, transparent)`,
                  boxShadow: `0 0 15px ${theme.accent}`,
                  opacity: 0.8,
                  animation: 'scanLine 2.5s linear infinite',
                }}
              />

              {/* Corner Markers */}
              <div
                className="absolute top-0 left-0 w-8 h-8 rounded-tl-xl"
                style={{ borderLeft: `4px solid ${theme.accent}`, borderTop: `4px solid ${theme.accent}` }}
              />
              <div
                className="absolute top-0 right-0 w-8 h-8 rounded-tr-xl"
                style={{ borderRight: `4px solid ${theme.accent}`, borderTop: `4px solid ${theme.accent}` }}
              />
              <div
                className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-xl"
                style={{ borderLeft: `4px solid ${theme.accent}`, borderBottom: `4px solid ${theme.accent}` }}
              />
              <div
                className="absolute bottom-0 right-0 w-8 h-8 rounded-br-xl"
                style={{ borderRight: `4px solid ${theme.accent}`, borderBottom: `4px solid ${theme.accent}` }}
              />
            </div>

            {/* Zoom Control */}
            <div
              className="mt-8 flex items-center gap-4 rounded-full px-4 py-1.5"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${theme.border}`,
              }}
            >
              <button
                onClick={() => setZoom('1x')}
                className="text-xs font-bold"
                style={{ color: zoom === '1x' ? theme.text : theme.textSecondary }}
              >
                1x
              </button>
              <div className="w-px h-3" style={{ background: theme.border }} />
              <button
                onClick={() => setZoom('2x')}
                className="text-xs font-bold"
                style={{ color: zoom === '2x' ? theme.text : theme.textSecondary }}
              >
                2x
              </button>
            </div>
          </div>
        ) : (
          /* My QR Code View */
          <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
            <div
              className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center"
              style={{
                background: theme.card,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${theme.border}`,
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: theme.accentSoft }}
              >
                <span className="material-symbols-outlined text-3xl" style={{ color: theme.accent }}>storefront</span>
              </div>

              <h2 className="text-xl font-bold" style={{ color: theme.text }}>Busan Store #42</h2>
              <p className="text-sm mb-4" style={{ color: theme.textMuted }}>
                ID: 8821-4402
              </p>

              {/* Amount Input */}
              <div className="w-full mb-4">
                <label className="block text-xs font-medium mb-2 text-center" style={{ color: theme.textMuted }}>
                  Enter Amount (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: theme.textMuted }}>
                    ₩
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-full h-12 rounded-xl text-xl font-bold text-center px-10 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      background: theme.cardHover,
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                    }}
                  />
                </div>
              </div>

              <div
                className="p-4 rounded-2xl mb-4"
                style={{ background: 'white', boxShadow: `0 0 30px ${theme.accentSoft}` }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&color=111111&bgcolor=ffffff&margin=10`}
                  alt="My QR Code"
                  className="w-48 h-48"
                />
              </div>

              {numericAmount > 0 && (
                <div
                  className="px-4 py-2 rounded-full mb-4"
                  style={{ background: theme.accentSoft }}
                >
                  <span className="text-sm font-bold" style={{ color: theme.accent }}>
                    Amount: ₩{formatAmount(amount)}
                  </span>
                </div>
              )}

              <p className="text-sm text-center px-4 mb-4" style={{ color: theme.textMuted }}>
                Customer scans this code to pay you
              </p>

              <div className="flex gap-3 w-full">
                <button
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  style={{ background: theme.cardHover, color: theme.text }}
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  Share
                </button>
                <button
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  style={{ background: theme.cardHover, color: theme.text }}
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div
          className="pb-10 pt-12 px-6 flex flex-col items-center gap-6"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.5), transparent)' }}
        >
          {/* Manual Entry Button */}
          <button
            className="flex w-full max-w-sm cursor-pointer items-center justify-center gap-2 rounded-xl h-12 transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${theme.border}`,
              color: theme.text,
            }}
          >
            <span className="material-symbols-outlined text-xl">keyboard</span>
            <span className="text-sm font-bold tracking-wide">Enter Amount Manually</span>
          </button>

          {/* Camera Controls */}
          <div className="flex items-center justify-between w-full max-w-xs px-4">
            <button
              onClick={() => navigate('/merchant/history')}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className="flex items-center justify-center rounded-full w-12 h-12 transition-colors"
                style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}`, color: theme.text }}
              >
                <span className="material-symbols-outlined text-2xl">photo_library</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>Gallery</span>
            </button>

            {/* Shutter Button */}
            <div
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{ border: `3px solid ${theme.accent}` }}
            >
              <div
                className="w-14 h-14 rounded-full cursor-pointer transition-transform active:scale-90"
                style={{ background: theme.accent }}
              />
            </div>

            <button
              onClick={() => navigate('/merchant/history')}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className="flex items-center justify-center rounded-full w-12 h-12 transition-colors"
                style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}`, color: theme.text }}
              >
                <span className="material-symbols-outlined text-2xl">history</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>History</span>
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
