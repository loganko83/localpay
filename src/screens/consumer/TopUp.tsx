import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../store';

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

const quickAmounts = [10000, 50000, 100000, 500000];

const linkedAccounts = [
  { id: '1', bank: 'IBK Bank', accountNumber: '****-****-4402', type: 'savings', isDefault: true },
  { id: '2', bank: 'Jeonbuk Bank', accountNumber: '****-****-1234', type: 'checking', isDefault: false },
];

const TopUp: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, updateBalance } = useWalletStore();
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(linkedAccounts[0].id);
  const [isProcessing, setIsProcessing] = useState(false);

  const numericAmount = parseInt(amount.replace(/,/g, '')) || 0;
  const bonusRate = 0.05;
  const bonusAmount = Math.floor(numericAmount * bonusRate);
  const totalAmount = numericAmount + bonusAmount;

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const handleAmountChange = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    if (numeric) {
      setAmount(formatAmount(parseInt(numeric)));
    } else {
      setAmount('');
    }
  };

  const handleQuickAmount = (value: number) => {
    const current = parseInt(amount.replace(/,/g, '')) || 0;
    setAmount(formatAmount(current + value));
  };

  const handleTopUp = async () => {
    if (numericAmount < 1000) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    updateBalance(totalAmount);
    setIsProcessing(false);
    navigate('/consumer/wallet');
  };

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Top Up</h1>
        <div className="w-8" />
      </header>

      {/* Current Balance */}
      <div className="px-5 py-4">
        <div className="rounded-xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Current Balance</p>
              <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
                {formatAmount(wallet?.balance || 0)} <span className="text-lg">P</span>
              </h2>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: theme.accentSoft }}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: theme.accent }}>account_balance_wallet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="px-5 mb-4">
        <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>
          Top-up Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: theme.textSecondary }}>
            W
          </span>
          <input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className="w-full h-16 rounded-xl text-2xl font-bold text-right pr-4 pl-10 focus:outline-none"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              color: theme.text,
            }}
          />
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="px-5 mb-6">
        <div className="flex gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              onClick={() => handleQuickAmount(value)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: theme.cardHover, color: theme.textSecondary, border: `1px solid ${theme.border}` }}
            >
              +{value >= 10000 ? `${value / 10000}` : formatAmount(value)}
            </button>
          ))}
        </div>
      </div>

      {/* Bonus Info */}
      {numericAmount > 0 && (
        <div className="px-5 mb-6">
          <div className="rounded-xl p-4" style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>redeem</span>
              <span className="text-sm font-bold" style={{ color: theme.accent }}>5% Bonus Included!</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: theme.textSecondary }}>Top-up amount</span>
              <span style={{ color: theme.text }}>W{formatAmount(numericAmount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span style={{ color: theme.textSecondary }}>Bonus (5%)</span>
              <span style={{ color: theme.accent }}>+W{formatAmount(bonusAmount)}</span>
            </div>
            <div className="mt-2 pt-2 flex justify-between" style={{ borderTop: `1px solid ${theme.accent}30` }}>
              <span className="text-sm font-bold" style={{ color: theme.text }}>You'll receive</span>
              <span className="text-lg font-bold" style={{ color: theme.accent }}>{formatAmount(totalAmount)} B</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Source */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>From Bank Account</h3>
        <div className="space-y-3">
          {linkedAccounts.map((account) => (
            <button
              key={account.id}
              onClick={() => setSelectedAccount(account.id)}
              className="w-full p-4 rounded-xl flex items-center gap-3 transition-colors"
              style={{
                background: selectedAccount === account.id ? theme.accentSoft : theme.card,
                border: `1px solid ${selectedAccount === account.id ? theme.accent : theme.border}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: theme.cardHover }}
              >
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>account_balance</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold" style={{ color: theme.text }}>{account.bank}</p>
                <p className="text-xs" style={{ color: theme.textSecondary }}>{account.accountNumber}</p>
              </div>
              {selectedAccount === account.id && (
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>check_circle</span>
              )}
            </button>
          ))}

          <button
            className="w-full p-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            style={{ border: `2px dashed ${theme.border}`, color: theme.textSecondary }}
          >
            <span className="material-symbols-outlined">add</span>
            <span className="text-sm font-medium">Link New Account</span>
          </button>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="px-5 mt-auto">
        <button
          onClick={handleTopUp}
          disabled={numericAmount < 1000 || isProcessing}
          className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity"
          style={{
            background: numericAmount < 1000 ? theme.textMuted : theme.accent,
            opacity: isProcessing ? 0.7 : 1,
          }}
        >
          {isProcessing ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Processing...
            </>
          ) : numericAmount < 1000 ? (
            'Enter amount (min W1,000)'
          ) : (
            `Top Up W${formatAmount(numericAmount)}`
          )}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: theme.textMuted }}>
          Funds will be transferred from your bank account instantly
        </p>
      </div>
    </div>
  );
};

export default TopUp;
