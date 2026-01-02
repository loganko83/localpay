import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { useBackendMerchantDashboard, useMerchantTransactions, useWalletBalance } from '../../services/api';

import { theme } from '../../styles/theme';

const quickActions = [
  { icon: 'qr_code_scanner', label: '받기', key: 'Receive', primary: true },
  { icon: 'history', label: '내역', key: 'History', primary: false },
  { icon: 'group', label: '스태프', key: 'Staff', primary: false },
  { icon: 'analytics', label: '리포트', key: 'Reports', primary: false },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboardData } = useBackendMerchantDashboard();
  const { data: walletData } = useWalletBalance();
  const { data: transactionsData } = useMerchantTransactions({ page: 1, size: 3 });

  const recentTransactions = transactionsData?.transactions ?? [];
  const balance = walletData?.balance ?? 0;

  // Dashboard stats
  const todaySales = dashboardData?.todaySales ?? 0;
  const txCount = dashboardData?.todayTransactions ?? 0;
  const monthSales = dashboardData?.monthSales ?? 0;
  const avgTicket = txCount > 0 ? Math.floor(todaySales / txCount) : 0;

  // Generate sales chart data from dashboard
  const salesData = [
    { name: 'Mon', value: Math.floor(monthSales / 7 * 0.8) },
    { name: 'Tue', value: Math.floor(monthSales / 7 * 0.6) },
    { name: 'Wed', value: Math.floor(monthSales / 7 * 1.1) },
    { name: 'Thu', value: Math.floor(monthSales / 7 * 0.9) },
    { name: 'Fri', value: Math.floor(monthSales / 7 * 1.3) },
    { name: 'Sat', value: Math.floor(monthSales / 7 * 1.6) },
    { name: 'Sun', value: Math.floor(monthSales / 7 * 1.4) },
  ];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center px-4 py-3 justify-between backdrop-blur-md"
        style={{
          background: theme.card,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
            }}
          >
            <span className="material-symbols-outlined" style={{ color: theme.accent }}>storefront</span>
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight" style={{ color: theme.text }}>부산 매장 #42</h2>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{ color: theme.accent }}>verified</span>
              <span className="text-xs" style={{ color: theme.textSecondary }}>인증된 가맹점</span>
            </div>
          </div>
        </div>
        <button
          className="relative flex items-center justify-center rounded-full w-10 h-10 transition-colors"
          onClick={() => navigate('/merchant/notifications')}
        >
          <span className="material-symbols-outlined" style={{ color: theme.text }}>notifications</span>
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ background: theme.accent }}
          />
        </button>
      </div>

      {/* Greeting */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold leading-tight" style={{ color: theme.text }}>
          좋은 아침입니다,<br />
          <span style={{ color: theme.textSecondary }}>매출을 확인해보세요.</span>
        </h1>
      </div>

      {/* Total Balance Card */}
      <div className="p-4">
        <div
          className="relative overflow-hidden rounded-xl shadow-lg"
          style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
          }}
        >
          {/* Decorative glow */}
          <div
            className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: theme.accentSoft }}
          />

          <div className="flex flex-col p-5 gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>총 잔액</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight" style={{ color: theme.text }}>
                    ₩ {formatAmount(balance)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm" style={{ color: theme.accent }}>trending_up</span>
                  <span className="text-xs font-medium" style={{ color: theme.accent }}>+12% 어제 대비</span>
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: theme.accentSoft }}
              >
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>account_balance_wallet</span>
              </div>
            </div>

            <div className="h-px w-full" style={{ background: theme.border }} />

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/merchant/exchange')}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-bold transition-colors active:scale-95"
                style={{ background: theme.accent, color: theme.text }}
              >
                <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
                환전
              </button>
              <button
                onClick={() => navigate('/merchant/withdraw')}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-colors active:scale-95"
                style={{ background: theme.cardHover, color: theme.text }}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
                출금
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 py-2">
        <h3 className="text-sm font-bold mb-3 px-1" style={{ color: theme.text }}>빠른 실행</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (action.key === 'Receive') navigate('/merchant/scan');
                else if (action.key === 'History') navigate('/merchant/payments');
                else if (action.key === 'Staff') navigate('/merchant/employees');
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm transition-transform active:scale-95"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: action.primary ? theme.accent : theme.text }}
                >
                  {action.icon}
                </span>
              </div>
              <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="pl-4 py-4 overflow-x-auto flex gap-3 pr-4" style={{ scrollbarWidth: 'none' }}>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <span className="text-xs" style={{ color: theme.textSecondary }}>오늘 매출</span>
          <span className="text-lg font-bold" style={{ color: theme.text }}>₩ {formatAmount(todaySales)}</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: theme.accent }}>
            <span className="material-symbols-outlined text-[12px]">arrow_upward</span> 12%
          </span>
        </div>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <span className="text-xs" style={{ color: theme.textSecondary }}>거래 수</span>
          <span className="text-lg font-bold" style={{ color: theme.text }}>{txCount}</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: theme.accent }}>
            <span className="material-symbols-outlined text-[12px]">arrow_upward</span> 5%
          </span>
        </div>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <span className="text-xs" style={{ color: theme.textSecondary }}>평균 결제액</span>
          <span className="text-lg font-bold" style={{ color: theme.text }}>₩ {formatAmount(avgTicket)}</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: theme.textMuted }}>
            <span className="material-symbols-outlined text-[12px]">remove</span> 0%
          </span>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="p-4">
        <div
          className="p-5 rounded-xl shadow-sm"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>매출 추이</h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>최근 7일</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: theme.text }}>₩ {formatAmount(monthSales)}</p>
              <p className="text-xs font-medium" style={{ color: theme.accent }}>+8.5%</p>
            </div>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorValueMerchant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme.textMuted, fontSize: 10 }}
                  dy={10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: '8px' }}
                  itemStyle={{ color: theme.text }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value) => value != null ? [`₩${formatAmount(value as number)}`, '매출'] : ['', '']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={theme.accent}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValueMerchant)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>최근 거래</h3>
          <button
            onClick={() => navigate('/merchant/payments')}
            className="text-xs font-medium"
            style={{ color: theme.accent }}
          >
            전체 보기
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {recentTransactions.length === 0 ? (
            <>
              {/* Placeholder transactions */}
              {[
                { id: 1, customer: '고객 #8291', time: '오전 10:42', amount: 12000 },
                { id: 2, customer: '고객 #4102', time: '오전 09:15', amount: 45500 },
                { id: 3, customer: '고객 #9931', time: '어제', amount: 8000 },
              ].map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl shadow-sm"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: theme.cardHover, color: theme.textSecondary }}
                    >
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold" style={{ color: theme.text }}>{tx.customer}</span>
                      <span className="text-xs" style={{ color: theme.textSecondary }}>{tx.time}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold" style={{ color: theme.accent }}>
                      + {formatAmount(tx.amount)} B
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: theme.accent }}
                      />
                      <span className="text-[10px]" style={{ color: theme.textSecondary }}>확인됨</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl shadow-sm"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: theme.cardHover, color: theme.textSecondary }}
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold" style={{ color: theme.text }}>{tx.customerName || '고객'}</span>
                    <span className="text-xs" style={{ color: theme.textSecondary }}>
                      {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className="text-sm font-bold"
                    style={{ color: tx.type === 'refund' ? theme.accent : theme.accent }}
                  >
                    {tx.type === 'refund' ? '-' : '+'} {formatAmount(tx.amount)} B
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: tx.status === 'completed' ? theme.accent : '#f59e0b' }}
                    />
                    <span className="text-[10px]" style={{ color: theme.textSecondary }}>
                      {tx.status === 'completed' ? '확인됨' : '대기 중'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
