import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletBalance, useBackendTransactions } from '../../services/api';
import { theme } from '../../styles/theme';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { data: walletData, isLoading: walletLoading } = useWalletBalance();
  const { data: transactionsData } = useBackendTransactions({ page: 1, size: 4 });

  const balance = walletData?.balance ?? 0;
  const transactions = transactionsData?.transactions ?? [];
  const recentTransactions = transactions.slice(0, 4);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return '방금';
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffHours < 48) return '어제';
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };



  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: theme.accent }}
          >
            <span className="material-symbols-outlined text-white text-[20px]">person</span>
          </div>
          <div>
            <p style={{ color: theme.textMuted }} className="text-xs">현재 위치</p>
            <p style={{ color: theme.text }} className="text-sm font-semibold">부산광역시</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ color: theme.textSecondary }}>search</span>
          </button>
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center relative"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ color: theme.textSecondary }}>notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: theme.accent }} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 py-4 space-y-5">
        {/* Balance Card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <div className="flex justify-between items-start mb-5">
            <div>
              <p style={{ color: theme.textSecondary }} className="text-sm mb-1">총 잔액</p>
              <h2 style={{ color: theme.text }} className="text-3xl font-bold">
                {walletLoading ? '...' : formatAmount(balance)}
              </h2>
              <p style={{ color: theme.textMuted }} className="text-sm mt-1">B코인</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: theme.accentSoft }}
            >
              <span className="material-symbols-outlined text-[24px]" style={{ color: theme.accent }}>account_balance_wallet</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/consumer/topup')}
              className="flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: theme.accent, color: '#fff' }}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              충전
            </button>
            <button
              onClick={() => navigate('/consumer/scan')}
              className="flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              결제
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: 'swap_horiz', label: '송금', path: '/consumer/wallet' },
            { icon: 'confirmation_number', label: '쿠폰', path: '/consumer/coupons' },
            { icon: 'train', label: '교통', path: '/consumer/services' },
            { icon: 'stars', label: '리워드', path: '/consumer/loyalty' },
          ].map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2"
              style={{ background: 'transparent', border: 'none' }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <span className="material-symbols-outlined text-[24px]" style={{ color: theme.accent }}>
                  {action.icon}
                </span>
              </div>
              <span className="text-xs" style={{ color: theme.textSecondary }}>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <p style={{ color: theme.textMuted }} className="text-xs mb-1">이번 달</p>
            <p style={{ color: theme.text }} className="text-lg font-bold">+45.2K</p>
            <p style={{ color: '#22c55e' }} className="text-xs">+12.5%</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <p style={{ color: theme.textMuted }} className="text-xs mb-1">사용액</p>
            <p style={{ color: theme.text }} className="text-lg font-bold">-128K</p>
            <p style={{ color: theme.textMuted }} className="text-xs">32건</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <p style={{ color: theme.textMuted }} className="text-xs mb-1">포인트</p>
            <p style={{ color: theme.text }} className="text-lg font-bold">2,450</p>
            <p style={{ color: '#f59e0b' }} className="text-xs">골드</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ color: theme.text }} className="text-base font-bold">최근 활동</h3>
            <button
              onClick={() => navigate('/consumer/history')}
              style={{ color: theme.accent, background: 'transparent', border: 'none' }}
              className="text-sm font-medium"
            >
              전체보기
            </button>
          </div>

          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <>
                {[
                  { name: '스타벅스 리저브', amount: -8500, time: '2시간 전', icon: 'local_cafe' },
                  { name: '부산 지하철', amount: -1450, time: '어제', icon: 'train' },
                  { name: '캐시백 적립', amount: 500, time: '어제', icon: 'redeem' },
                  { name: 'GS25 편의점', amount: -3200, time: '2일 전', icon: 'store' },
                ].map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: tx.amount > 0 ? theme.accentSoft : theme.cardHover }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: tx.amount > 0 ? theme.accent : theme.textSecondary }}
                      >
                        {tx.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p style={{ color: theme.text }} className="text-sm font-medium">{tx.name}</p>
                      <p style={{ color: theme.textMuted }} className="text-xs">{tx.time}</p>
                    </div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: tx.amount > 0 ? '#22c55e' : theme.text }}
                    >
                      {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              recentTransactions.map((tx) => {
                const isIncome = tx.type === 'topup' || tx.type === 'refund';
                return (
                  <button
                    key={tx.id}
                    onClick={() => navigate(`/consumer/transaction/${tx.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: isIncome ? theme.accentSoft : theme.cardHover }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: isIncome ? theme.accent : theme.textSecondary }}
                      >
                        {tx.type === 'payment' ? 'shopping_bag' :
                          tx.type === 'topup' ? 'add_circle' :
                            tx.type === 'refund' ? 'redeem' : 'swap_vert'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p style={{ color: theme.text }} className="text-sm font-medium">{tx.merchantName}</p>
                      <p style={{ color: theme.textMuted }} className="text-xs">{formatTime(tx.createdAt)}</p>
                    </div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: isIncome ? '#22c55e' : theme.text }}
                    >
                      {isIncome ? '+' : '-'}{formatAmount(tx.amount)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
