import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge } from '../../components/common';
import { useWalletStore, useTransactionStore } from '../../store';
import { TransactionType } from '../../types';

const filterOptions: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Payments', value: 'payment' },
  { label: 'Top-ups', value: 'topup' },
  { label: 'Refunds', value: 'refund' },
];

const History: React.FC = () => {
  const { wallet } = useWalletStore();
  const { transactions, setFilters, filters: _filters } = useTransactionStore();
  const [activeFilter, setActiveFilter] = useState<TransactionType | 'all'>('all');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handleFilterChange = (filter: TransactionType | 'all') => {
    setActiveFilter(filter);
    if (filter === 'all') {
      setFilters({ type: undefined });
    } else {
      setFilters({ type: filter });
    }
  };

  const filteredTransactions = activeFilter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === activeFilter);

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = new Date(tx.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tx);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const totalSpent = transactions
    .filter(tx => tx.type === 'payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalReceived = transactions
    .filter(tx => tx.type === 'topup' || tx.type === 'refund')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex flex-col pb-4">
      <Header title="Transaction History" />

      {/* Balance Summary */}
      <div className="px-4 mb-4">
        <Card variant="balance" padding="lg">
          <div className="text-center mb-4">
            <p className="text-sm text-text-secondary mb-1">Current Balance</p>
            <h2 className="text-3xl font-bold text-white">
              ₩{formatAmount(wallet?.balance || 0)}
            </h2>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 text-center p-3 bg-surface-highlight rounded-xl">
              <p className="text-xs text-text-secondary mb-1">Total Spent</p>
              <p className="text-lg font-bold text-white">₩{formatAmount(totalSpent)}</p>
            </div>
            <div className="flex-1 text-center p-3 bg-surface-highlight rounded-xl">
              <p className="text-xs text-text-secondary mb-1">Total Received</p>
              <p className="text-lg font-bold text-primary">₩{formatAmount(totalReceived)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Chips */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === option.value
                  ? 'bg-primary text-background'
                  : 'bg-surface-highlight text-text-secondary hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button className="px-4 py-2 rounded-full text-sm font-medium bg-surface-highlight text-text-secondary hover:text-white flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Date
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-4 space-y-6">
        {Object.entries(groupedTransactions).map(([date, txs]) => (
          <div key={date}>
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">
              {date}
            </h3>
            <div className="space-y-3">
              {txs.map((tx) => (
                <Card key={tx.id} variant="transaction" padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        tx.type === 'payment' ? 'bg-primary/10 text-primary' :
                        tx.type === 'topup' ? 'bg-blue-500/10 text-blue-500' :
                        tx.type === 'refund' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-surface-highlight text-text-secondary'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {tx.type === 'payment' ? 'arrow_upward' :
                           tx.type === 'topup' ? 'arrow_downward' :
                           tx.type === 'refund' ? 'undo' : 'swap_vert'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{tx.merchantName}</p>
                        <p className="text-xs text-text-secondary">
                          {new Date(tx.createdAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${
                        tx.type === 'payment' || tx.type === 'withdrawal' ? 'text-white' : 'text-primary'
                      }`}>
                        {tx.type === 'payment' || tx.type === 'withdrawal' ? '- ' : '+ '}
                        {formatAmount(tx.amount)} B
                      </span>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <Badge
                          variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                          dot
                        />
                        <span className="text-[10px] text-text-secondary">
                          {tx.status === 'completed' ? 'Completed' : tx.status === 'pending' ? 'Pending' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
