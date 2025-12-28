import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { theme } from '../../styles/theme';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'withdraw'>('all');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const walletData = {
    balance: 1450000,
    pendingSettlement: 320000,
    todaySales: 85000,
    weeklyTotal: 5200000,
  };

  const recentTransactions = [
    { id: '1', type: 'income', customer: '고객 #8291', amount: 12000, time: '오전 10:42', status: 'confirmed' },
    { id: '2', type: 'income', customer: '고객 #4102', amount: 45500, time: '오전 09:15', status: 'confirmed' },
    { id: '3', type: 'withdraw', customer: '계좌 이체', amount: 500000, time: '어제', status: 'completed' },
    { id: '4', type: 'income', customer: '고객 #9931', amount: 8000, time: '어제', status: 'confirmed' },
    { id: '5', type: 'income', customer: '고객 #1124', amount: 23500, time: '어제', status: 'confirmed' },
  ];

  const filteredTransactions = activeTab === 'all'
    ? recentTransactions
    : recentTransactions.filter((tx) => tx.type === activeTab);

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md px-4 py-3 flex items-center justify-between"
        style={{
          background: theme.bg,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>가맹점 지갑</h1>
        <button className="flex items-center justify-center w-10 h-10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>more_vert</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Balance Card */}
        <div className="px-4 py-6">
          <div
            className="relative rounded-2xl p-6 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent} 100%)`,
              boxShadow: `0 20px 40px -12px ${theme.accentSoft}`,
            }}
          >
            {/* Background decoration */}
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.1)',
                transform: 'translate(30%, -30%)',
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-32 h-32 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                transform: 'translate(-30%, 30%)',
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>사용 가능 잔액</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span className="material-symbols-outlined text-[14px]" style={{ color: theme.text }}>verified</span>
                  <span className="text-xs font-medium" style={{ color: theme.text }}>인증됨</span>
                </div>
              </div>
              <h2 className="text-4xl font-bold tracking-tight mb-6" style={{ color: theme.text }}>
                ₩ {formatAmount(walletData.balance)}
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>부산 매장 #42</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>비즈니스 계정</p>
                </div>
                <span className="material-symbols-outlined text-3xl" style={{ color: 'rgba(255,255,255,0.4)' }}>account_balance_wallet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Today Sales */}
            <div
              className="p-4 rounded-xl"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>trending_up</span>
                <span className="text-xs font-medium" style={{ color: theme.textMuted }}>오늘</span>
              </div>
              <p className="text-xl font-bold" style={{ color: theme.text }}>₩ {formatAmount(walletData.todaySales)}</p>
              <p className="text-xs mt-1" style={{ color: theme.accent }}>+12% 어제 대비</p>
            </div>

            {/* Pending Settlement */}
            <div
              className="p-4 rounded-xl"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#f59e0b' }}>schedule</span>
                <span className="text-xs font-medium" style={{ color: theme.textMuted }}>대기 중</span>
              </div>
              <p className="text-xl font-bold" style={{ color: theme.text }}>₩ {formatAmount(walletData.pendingSettlement)}</p>
              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>처리 중</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              className="py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: theme.accent,
                color: theme.text,
                boxShadow: `0 8px 20px -4px ${theme.accentSoft}`,
              }}
            >
              <span className="material-symbols-outlined text-[20px]">arrow_outward</span>
              출금
            </button>
            <button
              onClick={() => navigate('/merchant/history')}
              className="py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: theme.card,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              정산
            </button>
          </div>
        </div>

        {/* Settlement Account */}
        <div className="px-4 pb-4">
          <div
            className="p-4 rounded-xl flex items-center gap-4"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)' }}
            >
              <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>account_balance</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: theme.text }}>부산은행</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>**** **** **** 8821</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
              >
                활성
              </span>
              <button className="p-2 rounded-full transition-colors" style={{ color: theme.textSecondary }}>
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Filter Tabs */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold" style={{ color: theme.text }}>거래 내역</h3>
            <button
              onClick={() => navigate('/merchant/history')}
              className="text-sm font-medium"
              style={{ color: theme.accent }}
            >
              전체 보기
            </button>
          </div>
          <div className="flex gap-2">
            {(['all', 'income', 'withdraw'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab ? theme.accent : theme.card,
                  color: activeTab === tab ? theme.text : theme.textSecondary,
                  border: activeTab === tab ? 'none' : `1px solid ${theme.border}`,
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="px-4 pb-8 flex flex-col gap-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: tx.type === 'income' ? theme.accentSoft : 'rgba(239,68,68,0.1)',
                }}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ color: tx.type === 'income' ? theme.accent : '#ef4444' }}
                >
                  {tx.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: theme.text }}>{tx.customer}</p>
                <p className="text-xs" style={{ color: theme.textMuted }}>{tx.time}</p>
              </div>
              <div className="text-right">
                <p
                  className="text-sm font-bold"
                  style={{ color: tx.type === 'income' ? theme.accent : '#ef4444' }}
                >
                  {tx.type === 'income' ? '+' : '-'} ₩{formatAmount(tx.amount)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: tx.status === 'confirmed' ? theme.accent : '#3b82f6' }}
                  />
                  <span className="text-[10px]" style={{ color: theme.textMuted }}>
                    {tx.status === 'confirmed' ? '확인됨' : '완료'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Summary */}
        <div className="px-4 pb-8">
          <div
            className="p-5 rounded-xl"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold" style={{ color: theme.text }}>주간 요약</h3>
                <p className="text-xs" style={{ color: theme.textMuted }}>최근 7일</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: theme.text }}>₩ {formatAmount(walletData.weeklyTotal)}</p>
                <p className="text-xs font-medium" style={{ color: theme.accent }}>+8.5%</p>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="flex items-end justify-between h-24 gap-2">
              {[45, 55, 35, 65, 85, 95, 75].map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${height}%`,
                      background: index === 5 ? theme.accent : theme.accentSoft,
                    }}
                  />
                  <span className="text-[10px]" style={{ color: theme.textMuted }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blockchain Security Badge */}
        <div className="flex flex-col items-center justify-center pb-8 gap-2 opacity-50">
          <span className="material-symbols-outlined text-[20px]" style={{ color: theme.textMuted }}>lock</span>
          <p className="text-xs text-center" style={{ color: theme.textMuted }}>
            부산 블록체인넷으로 보호됨<br />
            지갑 ID: 0x8F...2A
          </p>
        </div>
      </main>
    </div>
  );
};

export default Wallet;
