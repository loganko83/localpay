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

type FilterType = 'all' | 'completed' | 'refunded' | 'pending';

const History: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const todayRevenue = 1250000;
  const revenueChange = 12.5;

  const transactions = [
    { id: '1', txId: '0x8f...2a4b', customer: 'Customer #4921', amount: 15000, time: '10:42 AM', status: 'success' as const },
    { id: '2', txId: '0x1d...ff32', customer: 'Processing', amount: 32000, time: '09:58 AM', status: 'pending' as const },
    { id: '3', txId: '0x3b...9c11', customer: 'Refunded', amount: 4500, time: '10:15 AM', status: 'refunded' as const },
    { id: '4', txId: '0xa1...77b2', customer: 'Customer #3301', amount: 8200, time: '09:30 AM', status: 'success' as const },
    { id: '5', txId: '0xe4...11c9', customer: 'Customer #8822', amount: 45000, time: '09:12 AM', status: 'success' as const },
    { id: '6', txId: '0xb2...44a1', customer: 'Customer #1102', amount: 22500, time: '08:45 AM', status: 'success' as const },
  ];

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'completed') return tx.status === 'success';
    if (activeFilter === 'refunded') return tx.status === 'refunded';
    if (activeFilter === 'pending') return tx.status === 'pending';
    return true;
  });

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Refunded', value: 'refunded' },
    { label: 'Pending', value: 'pending' },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(17,17,17,0.95)',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Transactions</h1>
        </div>
        <button
          onClick={() => navigate('/merchant/scan')}
          className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
          style={{ background: theme.accentSoft }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>qr_code_scanner</span>
          <span className="text-sm font-bold" style={{ color: theme.accent }}>Scan</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Revenue Card */}
        <div className="px-4 py-4">
          <div
            className="relative rounded-xl p-5 overflow-hidden"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            {/* Background gradient */}
            <div
              className="absolute right-0 top-0 h-full w-1/3"
              style={{ background: `linear-gradient(to left, ${theme.accentSoft}, transparent)` }}
            />

            <div className="relative z-10">
              <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: theme.textSecondary }}>
                    account_balance_wallet
                  </span>
                  <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Today's Revenue</p>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: theme.text }}>₩{formatAmount(todayRevenue)}</h2>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[16px]" style={{ color: theme.accent }}>trending_up</span>
                  <p className="text-xs font-bold" style={{ color: theme.accent }}>+{revenueChange}% from yesterday</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="flex-1 h-10 px-4 rounded-lg font-bold text-sm transition-all"
                  style={{
                    background: theme.accent,
                    color: theme.text,
                    boxShadow: `0 4px 12px ${theme.accentSoft}`,
                  }}
                >
                  View Analytics
                </button>
                <button
                  className="h-10 w-10 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: theme.cardHover, color: theme.text }}
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined"
              style={{ color: theme.textSecondary, fontSize: '24px' }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, amount or customer..."
              className="w-full h-12 rounded-xl pl-12 pr-12 focus:outline-none focus:ring-2 transition-all"
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                color: theme.text,
              }}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
              style={{ color: theme.textSecondary }}
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className="flex h-9 shrink-0 items-center justify-center px-4 rounded-full text-sm font-medium transition-all"
                style={{
                  background: activeFilter === filter.value ? theme.accent : theme.card,
                  color: activeFilter === filter.value ? theme.text : theme.text,
                  border: activeFilter === filter.value ? 'none' : `1px solid ${theme.border}`,
                  boxShadow: activeFilter === filter.value ? `0 4px 12px ${theme.accentSoft}` : 'none',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: theme.text }}>Recent Activity</h3>
          <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>Updated 1m ago</span>
        </div>

        {/* Transaction List */}
        <div className="px-4 flex flex-col gap-3 pb-8">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl transition-all cursor-pointer"
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      tx.status === 'success'
                        ? theme.accentSoft
                        : tx.status === 'pending'
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(107,114,128,0.15)',
                  }}
                >
                  <span
                    className={`material-symbols-outlined ${tx.status === 'pending' ? 'animate-pulse' : ''}`}
                    style={{
                      color:
                        tx.status === 'success'
                          ? theme.accent
                          : tx.status === 'pending'
                          ? '#f59e0b'
                          : theme.textMuted,
                      fontSize: '24px',
                    }}
                  >
                    {tx.status === 'success' ? 'check_circle' : tx.status === 'pending' ? 'pending' : 'keyboard_return'}
                  </span>
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: theme.text }}>{tx.txId}</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
                    {tx.time} • {tx.customer}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <p
                  className="text-base font-bold"
                  style={{
                    color: tx.status === 'refunded' ? theme.textSecondary : theme.text,
                    textDecoration: tx.status === 'refunded' ? 'line-through' : 'none',
                  }}
                >
                  {tx.status !== 'refunded' && '+ '}₩{formatAmount(tx.amount)}
                </p>
                <div
                  className="mt-1 px-1.5 py-0.5 rounded"
                  style={{
                    background:
                      tx.status === 'success'
                        ? theme.accentSoft
                        : tx.status === 'pending'
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(107,114,128,0.15)',
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color:
                        tx.status === 'success'
                          ? theme.accent
                          : tx.status === 'pending'
                          ? '#f59e0b'
                          : theme.textSecondary,
                    }}
                  >
                    {tx.status === 'success' ? 'Success' : tx.status === 'pending' ? 'Pending' : 'Refunded'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="flex justify-center pb-8">
          <button
            className="flex items-center gap-1 text-sm font-medium transition-colors"
            style={{ color: theme.textSecondary }}
          >
            Load More
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default History;
