import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../components/common';
import { useWalletStore, useTransactionStore } from '../../store';

const quickActions = [
  { icon: 'currency_exchange', label: 'Exchange', path: '/consumer/exchange' },
  { icon: 'confirmation_number', label: 'Coupons', path: '/consumer/offers' },
  { icon: 'subway', label: 'Metro', path: '/consumer/metro' },
  { icon: 'stars', label: 'Rewards', path: '/consumer/rewards' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { transactions } = useTransactionStore();

  const recentTransactions = transactions.slice(0, 4);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">location_on</span>
          <span className="text-white font-medium">Jeonju</span>
          <span className="material-symbols-outlined text-text-secondary text-sm">expand_more</span>
        </div>
        <button
          onClick={() => navigate('/consumer/profile')}
          className="h-10 w-10 rounded-full bg-surface-highlight overflow-hidden"
        >
          <div className="h-full w-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
        </button>
      </div>

      {/* Welcome */}
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-2xl font-bold text-white">
          Welcome back!
        </h1>
        <p className="text-text-secondary">
          Ready to pay with LocalPay today?
        </p>
      </div>

      {/* Balance Card */}
      <div className="px-4 mb-6">
        <Card variant="balance" padding="lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm text-text-secondary font-medium mb-1">Total Balance</p>
              <h2 className="text-3xl font-bold text-white">
                {formatAmount(wallet?.balance || 0)} <span className="text-lg">P</span>
              </h2>
              <p className="text-xs text-text-muted mt-1">
                ≈ ₩{formatAmount(wallet?.balance || 0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined filled">account_balance_wallet</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="primary"
              className="flex-1"
              icon={<span className="material-symbols-outlined text-[20px]">add</span>}
              onClick={() => navigate('/consumer/topup')}
            >
              Top Up
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              icon={<span className="material-symbols-outlined text-[20px]">send</span>}
              onClick={() => navigate('/consumer/send')}
            >
              Send
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-surface border border-surface-highlight flex items-center justify-center group-active:scale-95 transition-all">
                <span className={`material-symbols-outlined text-2xl ${idx === 0 ? 'text-primary' : 'text-white'}`}>
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
            className="text-xs text-primary font-medium hover:text-white transition-colors"
          >
            See All
          </button>
        </div>

        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <Card
              key={tx.id}
              variant="transaction"
              padding="md"
              onClick={() => navigate(`/consumer/transaction/${tx.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    tx.type === 'payment' ? 'bg-primary/10 text-primary' :
                    tx.type === 'topup' ? 'bg-blue-500/10 text-blue-500' :
                    tx.type === 'refund' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-surface-highlight text-text-secondary'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {tx.type === 'payment' ? 'shopping_bag' :
                       tx.type === 'topup' ? 'add_circle' :
                       tx.type === 'refund' ? 'undo' : 'swap_vert'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{tx.merchantName}</p>
                    <p className="text-xs text-text-secondary">{formatTime(tx.createdAt)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  tx.type === 'refund' || tx.type === 'topup' ? 'text-primary' : 'text-white'
                }`}>
                  {tx.type === 'payment' || tx.type === 'withdrawal' ? '- ' : '+ '}
                  {formatAmount(tx.amount)} B
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
