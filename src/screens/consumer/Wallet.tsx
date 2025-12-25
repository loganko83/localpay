import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';
import { Card, Badge } from '../../components/common';
import { useWalletStore, useTransactionStore } from '../../store';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, cards } = useWalletStore();
  const { transactions } = useTransactionStore();
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const recentTransactions = transactions.slice(0, 4);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const quickActions = [
    { icon: 'add_card', label: 'Top Up', onClick: () => navigate('/consumer/topup') },
    { icon: 'qr_code_scanner', label: 'QR Pay', onClick: () => navigate('/consumer/scan') },
    { icon: 'receipt_long', label: 'History', onClick: () => navigate('/consumer/history') },
    { icon: 'tune', label: 'Manage', onClick: () => {} },
  ];

  return (
    <div className="flex flex-col pb-4">
      <Header title="My Wallet" />

      {/* Total Balance */}
      <div className="px-4 pt-2 pb-6">
        <p className="text-sm text-text-secondary mb-1">Total Balance</p>
        <h1 className="text-4xl font-bold text-white">
          ₩{formatAmount(wallet?.balance || 0)}
        </h1>
      </div>

      {/* Card Carousel */}
      <div className="mb-6">
        <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {cards.map((card, idx) => (
            <div
              key={card.id}
              className={`flex-shrink-0 w-72 snap-center transition-transform ${
                activeCardIndex === idx ? 'scale-100' : 'scale-95 opacity-70'
              }`}
              onClick={() => setActiveCardIndex(idx)}
            >
              <div className={`h-44 rounded-2xl p-5 relative overflow-hidden ${
                card.type === 'digital'
                  ? 'bg-gradient-to-br from-primary to-primary-dark'
                  : card.type === 'bank'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-800'
                  : 'bg-gradient-to-br from-gray-600 to-gray-800'
              }`}>
                <div className="absolute top-0 right-0 h-full w-1/2 bg-white/5" />

                <div className="relative z-10 flex flex-col justify-between h-full text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs opacity-80 uppercase tracking-wider">{card.name}</p>
                      {card.isVerified && (
                        <Badge variant="success" size="sm">Verified</Badge>
                      )}
                    </div>
                    <span className="material-symbols-outlined opacity-80">contactless</span>
                  </div>

                  <div>
                    <p className="text-2xl font-bold mb-1">
                      ₩{formatAmount(card.balance)}
                    </p>
                    <p className="text-sm opacity-80 font-mono">
                      •••• •••• •••• {card.lastFour || '0000'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Card */}
          <div className="flex-shrink-0 w-72 snap-center">
            <div className="h-44 rounded-2xl border-2 border-dashed border-surface-highlight flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <div className="text-center">
                <span className="material-symbols-outlined text-3xl text-text-secondary">add_circle</span>
                <p className="text-sm text-text-secondary mt-2">Link New Card</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                activeCardIndex === idx ? 'w-6 bg-primary' : 'w-1.5 bg-surface-highlight'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-surface border border-surface-highlight flex items-center justify-center group-active:scale-95 transition-all">
                <span className="material-symbols-outlined text-2xl text-white">
                  {action.icon}
                </span>
              </div>
              <span className="text-xs text-text-secondary font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Recent Activity</h3>
          <button
            onClick={() => navigate('/consumer/history')}
            className="text-xs text-primary font-medium"
          >
            See All
          </button>
        </div>

        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <Card key={tx.id} variant="transaction" padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center text-text-secondary">
                    <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{tx.merchantName}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(tx.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  tx.type === 'payment' ? 'text-white' : 'text-primary'
                }`}>
                  {tx.type === 'payment' ? '-' : '+'} {formatAmount(tx.amount)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
