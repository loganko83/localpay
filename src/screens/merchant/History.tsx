import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div className="flex flex-col min-h-screen pb-28" style={{ background: '#0f1a14' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(15,26,20,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-white text-2xl">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-white">Transactions</h1>
        </div>
        <button
          onClick={() => navigate('/merchant/scan')}
          className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: '#10b981' }}>qr_code_scanner</span>
          <span className="text-sm font-bold" style={{ color: '#10b981' }}>Scan</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Revenue Card */}
        <div className="px-4 py-4">
          <div
            className="relative rounded-xl p-5 overflow-hidden"
            style={{ background: '#1c271f', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Background gradient */}
            <div
              className="absolute right-0 top-0 h-full w-1/3"
              style={{ background: 'linear-gradient(to left, rgba(16,185,129,0.1), transparent)' }}
            />

            <div className="relative z-10">
              <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    account_balance_wallet
                  </span>
                  <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Today's Revenue</p>
                </div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">₩{formatAmount(todayRevenue)}</h2>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[16px]" style={{ color: '#10b981' }}>trending_up</span>
                  <p className="text-xs font-bold" style={{ color: '#10b981' }}>+{revenueChange}% from yesterday</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="flex-1 h-10 px-4 rounded-lg font-bold text-sm transition-all"
                  style={{
                    background: '#10b981',
                    color: '#0f1a14',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  }}
                >
                  View Analytics
                </button>
                <button
                  className="h-10 w-10 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: '#2a3830', color: 'white' }}
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
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: '24px' }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, amount or customer..."
              className="w-full h-12 rounded-xl pl-12 pr-12 text-white focus:outline-none focus:ring-2 transition-all"
              style={{
                background: '#1c271f',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
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
                  background: activeFilter === filter.value ? '#10b981' : '#1c271f',
                  color: activeFilter === filter.value ? '#0f1a14' : 'white',
                  border: activeFilter === filter.value ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: activeFilter === filter.value ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Updated 1m ago</span>
        </div>

        {/* Transaction List */}
        <div className="px-4 flex flex-col gap-3 pb-8">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl transition-all cursor-pointer"
              style={{
                background: '#1c271f',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      tx.status === 'success'
                        ? 'rgba(16,185,129,0.1)'
                        : tx.status === 'pending'
                        ? 'rgba(245,158,11,0.1)'
                        : 'rgba(107,114,128,0.1)',
                  }}
                >
                  <span
                    className={`material-symbols-outlined ${tx.status === 'pending' ? 'animate-pulse' : ''}`}
                    style={{
                      color:
                        tx.status === 'success'
                          ? '#10b981'
                          : tx.status === 'pending'
                          ? '#f59e0b'
                          : '#6b7280',
                      fontSize: '24px',
                    }}
                  >
                    {tx.status === 'success' ? 'check_circle' : tx.status === 'pending' ? 'pending' : 'keyboard_return'}
                  </span>
                </div>
                <div>
                  <p className="text-base font-bold text-white">{tx.txId}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {tx.time} • {tx.customer}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <p
                  className="text-base font-bold"
                  style={{
                    color: tx.status === 'refunded' ? 'rgba(255,255,255,0.5)' : 'white',
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
                        ? 'rgba(16,185,129,0.1)'
                        : tx.status === 'pending'
                        ? 'rgba(245,158,11,0.1)'
                        : 'rgba(107,114,128,0.2)',
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color:
                        tx.status === 'success'
                          ? '#10b981'
                          : tx.status === 'pending'
                          ? '#f59e0b'
                          : '#9ca3af',
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
            style={{ color: 'rgba(255,255,255,0.5)' }}
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
