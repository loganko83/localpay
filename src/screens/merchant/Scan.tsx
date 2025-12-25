import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common';

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'display' | 'scan'>('display');
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
  const qrData = `jeonju-merchant-42-pay-${numericAmount}`;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-surface">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center text-white"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="text-lg font-bold text-white">Receive Payment</h1>
        <div className="w-10" />
      </div>

      {/* Mode Tabs */}
      <div className="px-4 py-4">
        <div className="flex gap-2 p-1 bg-surface rounded-xl">
          <button
            onClick={() => setMode('display')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'display' ? 'bg-primary text-background' : 'text-text-secondary hover:text-white'
            }`}
          >
            Show QR
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'scan' ? 'bg-primary text-background' : 'text-text-secondary hover:text-white'
            }`}
          >
            Scan QR
          </button>
        </div>
      </div>

      {/* Display Mode */}
      {mode === 'display' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          {/* Amount Input */}
          <div className="w-full max-w-sm mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2 text-center">
              Enter Amount (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                ₩
              </span>
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full h-14 bg-surface border border-surface-highlight rounded-xl text-white text-xl font-bold text-center px-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-surface border border-surface-highlight rounded-3xl p-6 flex flex-col items-center mb-6">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center mb-4 ring-4 ring-primary/10">
              <span className="material-symbols-outlined text-primary text-2xl">storefront</span>
            </div>

            <h2 className="text-lg font-bold text-white">Jeonju Store #42</h2>
            <p className="text-sm text-text-secondary mb-6">ID: 8821-4402</p>

            <div className="bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(19,236,91,0.2)]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&color=102216&bgcolor=ffffff&margin=10`}
                alt="Payment QR Code"
                className="w-48 h-48"
              />
            </div>

            {numericAmount > 0 && (
              <div className="mt-4 px-4 py-2 bg-primary/10 rounded-full">
                <span className="text-sm font-bold text-primary">
                  Amount: ₩{formatAmount(amount)}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-text-secondary text-center px-4">
            Customer scans this code to pay you directly
          </p>

          {/* Actions */}
          <div className="flex gap-3 w-full max-w-sm mt-6">
            <Button variant="secondary" className="flex-1">
              <span className="material-symbols-outlined text-[18px] mr-1">share</span>
              Share
            </Button>
            <Button variant="secondary" className="flex-1">
              <span className="material-symbols-outlined text-[18px] mr-1">download</span>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Scan Mode */}
      {mode === 'scan' && (
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=687&auto=format&fit=crop"
              alt="Camera Feed"
              className="w-full h-full object-cover opacity-40"
            />

            {/* Scanner Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-primary rounded-3xl relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(19,236,91,0.8)] animate-[scan_2s_infinite]" />

                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-white/80 text-sm">
              Scan customer's QR code to receive payment
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Scan;
