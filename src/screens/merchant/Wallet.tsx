import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';
import { Card, Button, Badge } from '../../components/common';
import { useWalletStore, useTransactionStore } from '../../store';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { transactions } = useTransactionStore();

  const recentTransactions = transactions.slice(0, 5);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const pendingSettlement = 320000;
  const lastSettlement = new Date(Date.now() - 86400000 * 2);

  return (
    <div className="flex flex-col pb-4">
      <Header title="Merchant Wallet" />

      {/* Balance Card */}
      <div className="px-4 mb-6">
        <div className="relative h-48 w-full rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-1/2 bg-white/5" />

          <div className="relative z-10 flex flex-col justify-between h-full text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Available Balance</p>
                <h2 className="text-3xl font-bold mt-1">₩ {formatAmount(wallet?.balance || 0)}</h2>
              </div>
              <span className="material-symbols-outlined text-3xl opacity-80">account_balance</span>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm opacity-80">Jeonju Store #42</p>
                <p className="text-xs font-medium mt-1 opacity-60">Business Account</p>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                Verified
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement Info */}
      <div className="px-4 mb-6">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-yellow-500">schedule</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Pending Settlement</p>
                <p className="text-xs text-text-secondary">
                  Last: {lastSettlement.toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-yellow-500">₩{formatAmount(pendingSettlement)}</p>
              <Badge variant="warning" size="sm">Processing</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="primary"
            size="lg"
            icon={<span className="material-symbols-outlined">arrow_outward</span>}
          >
            Withdraw
          </Button>
          <Button
            variant="secondary"
            size="lg"
            icon={<span className="material-symbols-outlined">history</span>}
            onClick={() => navigate('/merchant/payments')}
          >
            Settlements
          </Button>
        </div>
      </div>

      {/* Bank Account */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">Settlement Account</h3>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-surface-highlight flex items-center justify-center">
              <span className="material-symbols-outlined text-text-secondary">account_balance</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">IBK Bank</p>
              <p className="text-xs text-text-secondary">****-****-****-4402</p>
            </div>
            <button className="p-2 rounded-full hover:bg-surface-highlight transition-colors">
              <span className="material-symbols-outlined text-text-secondary">edit</span>
            </button>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
          <button
            onClick={() => navigate('/merchant/payments')}
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
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    tx.type === 'payment' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {tx.type === 'payment' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{tx.customerName || 'Customer'}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(tx.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  tx.type === 'payment' ? 'text-primary' : 'text-red-500'
                }`}>
                  {tx.type === 'payment' ? '+' : '-'} {formatAmount(tx.amount)}
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
