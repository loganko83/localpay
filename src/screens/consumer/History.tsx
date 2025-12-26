import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore, useTransactionStore } from '../../store';
import { TransactionType } from '../../types';

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

const filterOptions: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Payments', value: 'payment' },
  { label: 'Top-ups', value: 'topup' },
  { label: 'Refunds', value: 'refund' },
];

const History: React.FC = () => {
  const navigate = useNavigate();
  useWalletStore();
  const { transactions, setFilters } = useTransactionStore();
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
      key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const getTransactionIcon = (type: string, merchantName?: string) => {
    const name = (merchantName || '').toLowerCase();
    if (name.includes('starbucks') || name.includes('coffee') || name.includes('cafe')) {
      return 'local_cafe';
    }
    if (name.includes('bank') || type === 'topup') {
      return 'account_balance_wallet';
    }
    if (name.includes('olive') || name.includes('shopping') || name.includes('store')) {
      return 'shopping_bag';
    }
    if (name.includes('taxi') || name.includes('uber')) {
      return 'local_taxi';
    }
    if (type === 'refund') {
      return 'undo';
    }
    if (name.includes('market') || name.includes('grocery')) {
      return 'storefront';
    }
    if (name.includes('convenience') || name.includes('gs25') || name.includes('cu ')) {
      return 'store';
    }
    return 'receipt';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Transaction History</h1>
        <button>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.textSecondary }}>search</span>
        </button>
      </header>

      {/* Summary Stats */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Total Spent</p>
            <p className="text-xl font-bold" style={{ color: theme.text }}>{formatAmount(totalSpent)}</p>
            <p className="text-xs mt-1" style={{ color: theme.accent }}>This month</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Total Received</p>
            <p className="text-xl font-bold" style={{ color: '#22c55e' }}>{formatAmount(totalReceived)}</p>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>This month</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-14 z-10 py-3 px-5" style={{ background: theme.bg }}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(option.value)}
              className="shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeFilter === option.value ? theme.accent : theme.card,
                color: activeFilter === option.value ? '#fff' : theme.textSecondary,
                border: `1px solid ${activeFilter === option.value ? theme.accent : theme.border}`,
              }}
            >
              {option.label}
            </button>
          ))}
          <button
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ color: theme.textSecondary }}>calendar_month</span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 px-5">
        {Object.entries(groupedTransactions).map(([date, txs]) => (
          <div key={date} className="mb-4">
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-2 px-1"
              style={{ color: theme.textMuted }}
            >
              {date}
            </h3>
            <div className="rounded-xl overflow-hidden" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              {txs.map((tx, idx) => {
                const isIncome = tx.type === 'topup' || tx.type === 'refund';
                const icon = getTransactionIcon(tx.type, tx.merchantName);

                return (
                  <button
                    key={tx.id}
                    onClick={() => navigate(`/consumer/transaction/${tx.id}`)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                    style={{ borderBottom: idx < txs.length - 1 ? `1px solid ${theme.border}` : 'none' }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isIncome ? theme.accentSoft : theme.cardHover }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: isIncome ? theme.accent : theme.textSecondary }}
                      >
                        {icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{tx.merchantName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs" style={{ color: theme.textMuted }}>{formatTime(tx.createdAt)}</span>
                        <span className="w-1 h-1 rounded-full" style={{ background: theme.textMuted }} />
                        <span
                          className="text-xs"
                          style={{ color: tx.status === 'completed' ? '#22c55e' : theme.textMuted }}
                        >
                          {tx.status === 'completed' ? 'Completed' : tx.status === 'pending' ? 'Pending' : 'Success'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold" style={{ color: isIncome ? '#22c55e' : theme.text }}>
                        {isIncome ? '+' : '-'}{formatAmount(tx.amount)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: theme.accentSoft }}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: theme.accent }}>receipt_long</span>
            </div>
            <p className="text-sm font-medium" style={{ color: theme.text }}>No transactions found</p>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Your transaction history will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
