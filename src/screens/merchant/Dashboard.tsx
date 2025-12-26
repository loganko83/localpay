import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { useWalletStore, useTransactionStore } from '../../store';

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
    <div className="flex flex-col min-h-screen pb-28" style={{ background: '#0f1a14' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center px-4 py-3 justify-between backdrop-blur-md"
        style={{
          background: 'rgba(15,26,20,0.95)',
          borderBottom: '1px solid rgba(59,84,67,0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
            style={{
              background: '#1c271f',
              border: '1px solid #3b5443',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#10b981' }}>storefront</span>
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight text-white">Busan Store #42</h2>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" style={{ color: '#10b981' }}>verified</span>
              <span className="text-xs" style={{ color: '#9db9a6' }}>Verified Merchant</span>
            </div>
          </div>
        </div>
        <button
          className="relative flex items-center justify-center rounded-full w-10 h-10 transition-colors"
          onClick={() => navigate('/merchant/notifications')}
        >
          <span className="material-symbols-outlined text-white">notifications</span>
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ background: '#ef4444' }}
          />
        </button>
      </div>

      {/* Greeting */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold leading-tight text-white">
          Good Morning,<br />
          <span style={{ color: '#9db9a6' }}>Let's check your earnings.</span>
        </h1>
      </div>

      {/* Total Balance Card */}
      <div className="p-4">
        <div
          className="relative overflow-hidden rounded-xl shadow-lg"
          style={{
            background: '#1c271f',
            border: '1px solid #3b5443',
            boxShadow: '0 4px 20px rgba(16,185,129,0.05)',
          }}
        >
          {/* Decorative glow */}
          <div
            className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          />

          <div className="flex flex-col p-5 gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium" style={{ color: '#9db9a6' }}>Total Balance</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-white">
                    ₩ {formatAmount(wallet?.balance || 1450000)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm" style={{ color: '#10b981' }}>trending_up</span>
                  <span className="text-xs font-medium" style={{ color: '#10b981' }}>+12% vs yesterday</span>
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.1)' }}
              >
                <span className="material-symbols-outlined" style={{ color: '#10b981' }}>account_balance_wallet</span>
              </div>
            </div>

            <div className="h-px w-full" style={{ background: '#3b5443' }} />

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/merchant/exchange')}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-bold transition-colors active:scale-95"
                style={{ background: '#10b981', color: '#0f1a14' }}
              >
                <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
                Exchange
              </button>
              <button
                onClick={() => navigate('/merchant/withdraw')}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-colors active:scale-95"
                style={{ background: '#2a3830', color: 'white' }}
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
        <h3 className="text-sm font-bold mb-3 px-1 text-white">Quick Actions</h3>
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
                  background: '#1c271f',
                  border: '1px solid #3b5443',
                }}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ color: action.primary ? '#10b981' : 'white' }}
                >
                  {action.icon}
                </span>
              </div>
              <span className="text-xs font-medium" style={{ color: '#9db9a6' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="pl-4 py-4 overflow-x-auto flex gap-3 pr-4" style={{ scrollbarWidth: 'none' }}>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: '#1c271f', border: '1px solid #3b5443' }}
        >
          <span className="text-xs" style={{ color: '#9db9a6' }}>Today's Sales</span>
          <span className="text-lg font-bold text-white">₩ 850k</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: '#10b981' }}>
            <span className="material-symbols-outlined text-[12px]">arrow_upward</span> 12%
          </span>
        </div>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: '#1c271f', border: '1px solid #3b5443' }}
        >
          <span className="text-xs" style={{ color: '#9db9a6' }}>Tx Count</span>
          <span className="text-lg font-bold text-white">{txCount}</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: '#10b981' }}>
            <span className="material-symbols-outlined text-[12px]">arrow_upward</span> 5%
          </span>
        </div>
        <div
          className="flex-none w-36 p-4 rounded-xl shadow-sm flex flex-col gap-2"
          style={{ background: '#1c271f', border: '1px solid #3b5443' }}
        >
          <span className="text-xs" style={{ color: '#9db9a6' }}>Avg Ticket</span>
          <span className="text-lg font-bold text-white">₩ {formatAmount(avgTicket)}</span>
          <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: '#6b7280' }}>
            <span className="material-symbols-outlined text-[12px]">remove</span> 0%
          </span>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="p-4">
        <div
          className="p-5 rounded-xl shadow-sm"
          style={{ background: '#1c271f', border: '1px solid #3b5443' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Sales Trend</h3>
              <p className="text-xs" style={{ color: '#9db9a6' }}>Last 7 days</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white">₩ 5.2M</p>
              <p className="text-xs font-medium" style={{ color: '#10b981' }}>+8.5%</p>
            </div>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorValueMerchant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c7263', fontSize: 10 }}
                  dy={10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c271f', borderColor: '#3b5443', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value) => value != null ? [`₩${formatAmount(value as number)}`, 'Sales'] : ['', '']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
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
          <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
          <button
            onClick={() => navigate('/merchant/payments')}
            className="text-xs font-medium"
            style={{ color: '#10b981' }}
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
                  style={{ background: '#1c271f', border: '1px solid #3b5443' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: '#2a3830', color: '#9ca3af' }}
                    >
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{tx.customer}</span>
                      <span className="text-xs" style={{ color: '#9db9a6' }}>{tx.time}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold" style={{ color: '#10b981' }}>
                      + {formatAmount(tx.amount)} B
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#10b981' }}
                      />
                      <span className="text-[10px]" style={{ color: '#9db9a6' }}>Confirmed</span>
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
                style={{ background: '#1c271f', border: '1px solid #3b5443' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#2a3830', color: '#9ca3af' }}
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{tx.customerName || 'Customer'}</span>
                    <span className="text-xs" style={{ color: '#9db9a6' }}>
                      {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className="text-sm font-bold"
                    style={{ color: tx.type === 'refund' ? '#ef4444' : '#10b981' }}
                  >
                    {tx.type === 'refund' ? '-' : '+'} {formatAmount(tx.amount)} B
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: tx.status === 'completed' ? '#10b981' : '#f59e0b' }}
                    />
                    <span className="text-[10px]" style={{ color: '#9db9a6' }}>
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
