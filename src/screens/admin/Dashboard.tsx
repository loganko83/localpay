import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

const volumeData = [
  { name: 'Mon', value: 1800 },
  { name: 'Tue', value: 2100 },
  { name: 'Wed', value: 1900 },
  { name: 'Thu', value: 2400 },
  { name: 'Fri', value: 2800 },
  { name: 'Sat', value: 3200 },
  { name: 'Sun', value: 2900 },
];

const recentActivity = [
  {
    id: '1',
    type: 'warning',
    icon: 'warning',
    title: 'High Volume Transaction',
    description: 'Wallet ID: 0x8a...4f2 detected moving ₩50M',
    time: '10m ago',
    color: '#ef4444',
  },
  {
    id: '2',
    type: 'info',
    icon: 'add_business',
    title: 'New Merchant Application',
    description: "'Seomyeon Coffee' requested validation",
    time: '25m ago',
    color: '#3b82f6',
  },
  {
    id: '3',
    type: 'success',
    icon: 'published_with_changes',
    title: 'Policy Update Deployed',
    description: 'Youth Voucher Q3 parameters active',
    time: '2h ago',
    color: '#22c55e',
  },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const platformStats = {
    totalIssuance: '₩45.2B',
    activeUsers: '342.1K',
    volume24h: '₩2.1B',
    pendingMerchants: 12,
    blockHeight: '12,404,200',
  };

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: '#101922' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md px-4 pt-6 pb-3"
        style={{
          background: 'rgba(16,25,34,0.95)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button style={{ color: '#94a3b8' }}>
              <span className="material-symbols-outlined text-[28px]">menu</span>
            </button>
            <div>
              <h1 className="text-white text-lg font-bold leading-none tracking-tight">Busan Admin</h1>
              <p className="text-xs font-medium mt-1" style={{ color: '#94a3b8' }}>City Official Access</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative p-1"
              style={{ color: '#94a3b8' }}
              onClick={() => navigate('/admin/notifications')}
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span
                className="absolute top-1 right-1 h-2 w-2 rounded-full"
                style={{ background: '#ef4444', border: '2px solid #101922' }}
              />
            </button>
            <div
              className="h-9 w-9 overflow-hidden rounded-full"
              style={{ background: '#1c2630', border: '1px solid #334155' }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#64748b' }}>person</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* System Status Ticker */}
      <div
        className="py-2 px-4 flex items-center justify-between"
        style={{ background: '#1c2630', borderBottom: '1px solid #1e293b' }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: '#0bda5b' }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: '#0bda5b' }}
            />
          </span>
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: '#0bda5b' }}>
            System Healthy
          </span>
        </div>
        <p className="text-xs font-mono" style={{ color: '#94a3b8' }}>
          Block Height: #{platformStats.blockHeight}
        </p>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 p-4 pb-24">
        {/* Platform Overview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold tracking-tight">Platform Overview</h2>
            <span
              className="text-xs font-medium px-2 py-1 rounded"
              style={{ color: '#2b8cee', background: 'rgba(43,140,238,0.1)' }}
            >
              Live Data
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Issuance */}
            <div
              className="rounded-xl p-4 flex flex-col gap-1 shadow-sm"
              style={{ background: '#1c2630', border: '1px solid #1e293b' }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-medium uppercase" style={{ color: '#94a3b8' }}>Total Issuance</span>
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#2b8cee' }}>account_balance_wallet</span>
              </div>
              <p className="text-white text-2xl font-bold tracking-tight">{platformStats.totalIssuance}</p>
              <p className="text-xs font-bold flex items-center gap-0.5" style={{ color: '#0bda5b' }}>
                <span className="material-symbols-outlined text-[14px]">trending_up</span> +2.4%
              </p>
            </div>

            {/* Active Users */}
            <div
              className="rounded-xl p-4 flex flex-col gap-1 shadow-sm"
              style={{ background: '#1c2630', border: '1px solid #1e293b' }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-medium uppercase" style={{ color: '#94a3b8' }}>Active Users</span>
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#2b8cee' }}>groups</span>
              </div>
              <p className="text-white text-2xl font-bold tracking-tight">{platformStats.activeUsers}</p>
              <p className="text-xs font-bold flex items-center gap-0.5" style={{ color: '#0bda5b' }}>
                <span className="material-symbols-outlined text-[14px]">trending_up</span> +1.2%
              </p>
            </div>

            {/* 24h Volume */}
            <div
              className="rounded-xl p-4 flex flex-col gap-1 shadow-sm"
              style={{ background: '#1c2630', border: '1px solid #1e293b' }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-medium uppercase" style={{ color: '#94a3b8' }}>24h Volume</span>
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#2b8cee' }}>sync_alt</span>
              </div>
              <p className="text-white text-2xl font-bold tracking-tight">{platformStats.volume24h}</p>
              <p className="text-xs font-bold flex items-center gap-0.5" style={{ color: '#0bda5b' }}>
                <span className="material-symbols-outlined text-[14px]">trending_up</span> +5.4%
              </p>
            </div>

            {/* Pending Merchants */}
            <div
              className="rounded-xl p-4 flex flex-col gap-1 shadow-sm relative overflow-hidden cursor-pointer"
              style={{ background: '#1c2630', border: '1px solid #1e293b' }}
              onClick={() => navigate('/admin/users')}
            >
              <div
                className="absolute -right-2 -top-2 w-12 h-12 rounded-full blur-xl"
                style={{ background: 'rgba(249,115,22,0.2)' }}
              />
              <div className="flex justify-between items-start mb-1 relative z-10">
                <span className="text-xs font-medium uppercase" style={{ color: '#94a3b8' }}>Pending Merchants</span>
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#fb923c' }}>storefront</span>
              </div>
              <p className="text-white text-2xl font-bold tracking-tight relative z-10">{platformStats.pendingMerchants}</p>
              <p className="text-xs font-bold relative z-10" style={{ color: '#fb923c' }}>
                Action Required
              </p>
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section
          className="rounded-xl p-5"
          style={{ background: '#1c2630', border: '1px solid #1e293b' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white text-base font-bold">Transaction Volume</h3>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Last 7 Days vs Previous</p>
            </div>
            <button
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#94a3b8' }}
            >
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2b8cee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2b8cee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  dy={10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c2630', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value) => value != null ? [`₩${value}M`, 'Volume'] : ['', '']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2b8cee"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAdmin)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Management Quick Actions */}
        <section>
          <h3 className="text-white text-lg font-bold mb-3">Management</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: 'manage_accounts', label: 'Users', path: '/admin/users' },
              { icon: 'store', label: 'Merchants', path: '/admin/users' },
              { icon: 'confirmation_number', label: 'Vouchers', path: '/admin/vouchers' },
              { icon: 'lab_profile', label: 'Audit', path: '/admin/audit' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                  style={{ background: '#1e293b', border: '1px solid #334155' }}
                >
                  <span className="material-symbols-outlined text-[24px] text-white">{action.icon}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-lg font-bold">Recent Activity</h3>
            <button
              className="text-xs font-bold"
              style={{ color: '#2b8cee' }}
              onClick={() => navigate('/admin/audit')}
            >
              View All
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 rounded-lg p-3 items-center"
                style={{ background: '#1c2630', border: '1px solid rgba(30,41,59,0.5)' }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${activity.color}15` }}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ color: activity.color }}
                  >
                    {activity.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{activity.description}</p>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{activity.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Secure Badge */}
        <div className="flex flex-col items-center justify-center py-6 gap-2 opacity-50">
          <span className="material-symbols-outlined text-[20px]" style={{ color: '#94a3b8' }}>lock</span>
          <p className="text-xs text-center" style={{ color: '#64748b' }}>
            Secure Connection via Busan BlockchainNet<br />
            Session ID: 8X92-22L1-00P
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
