import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { useWalletStore, useTransactionStore } from '../../store';

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

const salesData = [
  { name: 'Mon', value: 400000 },
  { name: 'Tue', value: 300000 },
  { name: 'Wed', value: 550000 },
  { name: 'Thu', value: 450000 },
  { name: 'Fri', value: 680000 },
  { name: 'Sat', value: 850000 },
  { name: 'Sun', value: 720000 },
];

const quickActions = [
  { icon: 'qr_code_scanner', label: 'Receive', primary: true },
  { icon: 'history', label: 'History', primary: false },
  { icon: 'group', label: 'Staff', primary: false },
  { icon: 'analytics', label: 'Reports', primary: false },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const { transactions } = useTransactionStore();

  const recentTransactions = transactions.slice(0, 3);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const todaySales = 850000;
  const txCount = 45;
  const avgTicket = Math.floor(todaySales / txCount);

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
            <h2 className="text-base font-bold leading-tight" style={{ color: theme.text }}>Busan Store #42</h2>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{ color: theme.accent }}>verified</span>
              <span className="text-xs" style={{ color: theme.textSecondary }}>Verified Merchant</span>
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
          Good Morning,<br />
          <span style={{ color: theme.textSecondary }}>Let's check your earnings.</span>
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
                <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Total Balance</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight" style={{ color: theme.text }}>
                    ₩ {formatAmount(wallet?.balance || 1450000)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm" style={{ color: theme.accent }}>trending_up</span>
                  <span className="text-xs font-medium" style={{ color: theme.accent }}>+12% vs yesterday</span>
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
                Exchange
              </button>
              <button
                onClick={() => navigate('/merchant/withdraw')}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-colors active:scale-95"
                style={{ background: theme.cardHover, color: theme.text }}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 py-2">
        <h3 className="text-sm font-bold mb-3 px-1" style={{ color: theme.text }}>Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (action.label === 'Receive') navigate('/merchant/scan');
                else if (action.label === 'History') navigate('/merchant/payments');
                else if (action.label === 'Staff') navigate('/merchant/employees');
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
          <span className="text-xs" style={{ color: theme.textSecondary }}>Today's Sales</span>
          <span className="text-lg font-bold" style={{ color: theme.text }}>₩ 850k</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: theme.accent }}>
            <span className="material-symbols-outlined text-[12px]">arrow_upward</span> 12%
          </span>
        </div>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <span className="text-xs" style={{ color: theme.textSecondary }}>Tx Count</span>
          <span className="text-lg font-bold" style={{ color: theme.text }}>{txCount}</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: theme.accent }}>
            <span className="material-symbols-outlined text-[12px]">arrow_upward</span> 5%
          </span>
        </div>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <span className="text-xs" style={{ color: theme.textSecondary }}>Avg Ticket</span>
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
              <h3 className="text-sm font-bold" style={{ color: theme.text }}>Sales Trend</h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Last 7 days</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: theme.text }}>₩ 5.2M</p>
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
                  formatter={(value) => value != null ? [`₩${formatAmount(value as number)}`, 'Sales'] : ['', '']}
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
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Recent Transactions</h3>
          <button
            onClick={() => navigate('/merchant/payments')}
            className="text-xs font-medium"
            style={{ color: theme.accent }}
          >
            See All
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {recentTransactions.length === 0 ? (
            <>
              {/* Placeholder transactions */}
              {[
                { id: 1, customer: 'Customer #8291', time: '10:42 AM', amount: 12000 },
                { id: 2, customer: 'Customer #4102', time: '09:15 AM', amount: 45500 },
                { id: 3, customer: 'Customer #9931', time: 'Yesterday', amount: 8000 },
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
                      <span className="text-[10px]" style={{ color: theme.textSecondary }}>Confirmed</span>
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
                    <span className="text-sm font-bold" style={{ color: theme.text }}>{tx.customerName || 'Customer'}</span>
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
                      {tx.status === 'completed' ? 'Confirmed' : 'Pending'}
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
