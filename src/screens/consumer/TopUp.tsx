import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';
import { Card, Button } from '../../components/common';
import { useWalletStore } from '../../store';

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
  const bonusRate = 0.05; // 5% bonus
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

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    updateBalance(totalAmount);
    setIsProcessing(false);

    // Navigate to success or show modal
    navigate('/consumer/wallet');
  };

  return (
    <div className="flex flex-col pb-4">
      <Header title="Top Up" showBack />

      {/* Current Balance */}
      <div className="px-4 mb-6">
        <Card variant="balance" padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">Current Balance</p>
              <h2 className="text-2xl font-bold text-white">
                {formatAmount(wallet?.balance || 0)} <span className="text-lg">P</span>
              </h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined filled">account_balance_wallet</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Amount Input */}
      <div className="px-4 mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Top-up Amount
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
            className="w-full h-16 bg-surface border border-surface-highlight rounded-xl text-white text-2xl font-bold text-right pr-4 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="px-4 mb-6">
        <div className="flex gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              onClick={() => handleQuickAmount(value)}
              className="flex-1 py-2 bg-surface-highlight rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:bg-surface transition-colors"
            >
              +{value >= 10000 ? `${value / 10000}만` : formatAmount(value)}
            </button>
          ))}
        </div>
      </div>

      {/* Bonus Info */}
      {numericAmount > 0 && (
        <div className="px-4 mb-6">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-[20px]">redeem</span>
              <span className="text-sm font-bold text-primary">5% Bonus Included!</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Top-up amount</span>
              <span className="text-white">₩{formatAmount(numericAmount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-secondary">Bonus (5%)</span>
              <span className="text-primary">+₩{formatAmount(bonusAmount)}</span>
            </div>
            <div className="border-t border-primary/20 mt-2 pt-2 flex justify-between">
              <span className="text-sm font-bold text-white">You'll receive</span>
              <span className="text-lg font-bold text-primary">{formatAmount(totalAmount)} B</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Source */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">From Bank Account</h3>
        <div className="space-y-3">
          {linkedAccounts.map((account) => (
            <button
              key={account.id}
              onClick={() => setSelectedAccount(account.id)}
              className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-colors ${
                selectedAccount === account.id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-surface border-surface-highlight hover:border-text-secondary'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center">
                <span className="material-symbols-outlined text-text-secondary">account_balance</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">{account.bank}</p>
                <p className="text-xs text-text-secondary">{account.accountNumber}</p>
              </div>
              {selectedAccount === account.id && (
                <span className="material-symbols-outlined text-primary">check_circle</span>
              )}
            </button>
          ))}

          <button className="w-full p-4 rounded-xl border border-dashed border-surface-highlight flex items-center justify-center gap-2 text-text-secondary hover:text-white hover:border-text-secondary transition-colors">
            <span className="material-symbols-outlined">add</span>
            <span className="text-sm font-medium">Link New Account</span>
          </button>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="px-4 mt-auto">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          loading={isProcessing}
          disabled={numericAmount < 1000}
          onClick={handleTopUp}
        >
          {numericAmount < 1000 ? 'Enter amount (min ₩1,000)' : `Top Up ₩${formatAmount(numericAmount)}`}
        </Button>
        <p className="text-xs text-text-muted text-center mt-3">
          Funds will be transferred from your bank account instantly
        </p>
      </div>
    </div>
  );
};

export default TopUp;
