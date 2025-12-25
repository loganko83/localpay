import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { Card, Badge } from '../../components/common';

const volumeData = [
  { name: 'Mon', current: 2100, previous: 1800 },
  { name: 'Tue', current: 1900, previous: 2100 },
  { name: 'Wed', current: 2400, previous: 2200 },
  { name: 'Thu', current: 2200, previous: 2000 },
  { name: 'Fri', current: 2800, previous: 2500 },
  { name: 'Sat', current: 3200, previous: 2900 },
  { name: 'Sun', current: 2900, previous: 2700 },
];

const recentActivity = [
  { id: '1', type: 'merchant_application', title: 'New Merchant Application', description: 'Haeundae Cafe requested verification', time: '5 min ago', severity: 'info' as const },
  { id: '2', type: 'high_volume', title: 'High Volume Transaction', description: '₩50M+ transaction detected', time: '15 min ago', severity: 'warning' as const },
  { id: '3', type: 'policy_update', title: 'Policy Update Required', description: 'New compliance regulations', time: '1 hour ago', severity: 'error' as const },
  { id: '4', type: 'system_alert', title: 'System Health Check', description: 'All systems operational', time: '2 hours ago', severity: 'info' as const },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const formatAmount = (amount: number) => {
    if (amount >= 1000000000) {
      return `₩${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `₩${(amount / 1000000).toFixed(1)}M`;
    }
    return `₩${(amount / 1000).toFixed(0)}K`;
  };

  const platformStats = {
    totalIssuance: 45200000000,
    activeUsers: 342100,
    volume24h: 2100000000,
    pendingMerchants: 12,
    blockHeight: 1847293,
    systemHealth: 'healthy' as const,
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-surface">
        <div>
          <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
          <p className="text-xs text-text-secondary">LocalPay Platform Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={platformStats.systemHealth === 'healthy' ? 'success' : 'error'}>
            <span className="material-symbols-outlined text-[12px] mr-1">
              {platformStats.systemHealth === 'healthy' ? 'check_circle' : 'error'}
            </span>
            System {platformStats.systemHealth}
          </Badge>
        </div>
      </div>

      {/* Block Height */}
      <div className="px-4 py-3 bg-surface/50 border-b border-surface flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">deployed_code</span>
          <span className="text-xs text-text-secondary">Block Height</span>
        </div>
        <span className="text-sm font-mono text-white">#{platformStats.blockHeight.toLocaleString()}</span>
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">Total Issuance</p>
          <p className="text-xl font-bold text-white">{formatAmount(platformStats.totalIssuance)}</p>
          <p className="text-xs text-primary mt-1">+2.5% this month</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">Active Users</p>
          <p className="text-xl font-bold text-white">{(platformStats.activeUsers / 1000).toFixed(1)}K</p>
          <p className="text-xs text-primary mt-1">+5.2% this week</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">24h Volume</p>
          <p className="text-xl font-bold text-white">{formatAmount(platformStats.volume24h)}</p>
          <p className="text-xs text-primary mt-1">+12.3% vs yesterday</p>
        </Card>
        <Card padding="md" onClick={() => navigate('/admin/users')}>
          <p className="text-xs text-text-secondary mb-1">Pending Merchants</p>
          <p className="text-xl font-bold text-yellow-500">{platformStats.pendingMerchants}</p>
          <p className="text-xs text-text-muted mt-1">Requires review →</p>
        </Card>
      </div>

      {/* Volume Chart */}
      <div className="px-4 mb-6">
        <Card padding="lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Transaction Volume</h3>
              <p className="text-xs text-text-secondary">7-day comparison</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-text-secondary">This week</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-text-muted" />
                <span className="text-xs text-text-secondary">Last week</span>
              </div>
            </div>
          </div>
          <div className="h-40 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2b8cee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2b8cee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5c6a7a', fontSize: 10 }}
                  dy={10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c242c', borderColor: '#2a3540', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => value != null ? [`₩${value}M`, ''] : ['', '']}
                />
                <Area
                  type="monotone"
                  dataKey="previous"
                  stroke="#3d4855"
                  strokeWidth={2}
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke="#2b8cee"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCurrent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">Management</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: 'group', label: 'Users', path: '/admin/users' },
            { icon: 'storefront', label: 'Merchants', path: '/admin/users' },
            { icon: 'confirmation_number', label: 'Vouchers', path: '/admin/vouchers' },
            { icon: 'fact_check', label: 'Audit', path: '/admin/audit' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-surface border border-surface-highlight flex items-center justify-center group-active:scale-95 transition-all">
                <span className="material-symbols-outlined text-2xl text-white">
                  {action.icon}
                </span>
              </div>
              <span className="text-xs text-text-secondary font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Recent Activity</h3>
          <button className="text-xs text-primary font-medium">View All</button>
        </div>

        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <Card key={activity.id} variant="transaction" padding="md">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  activity.severity === 'error' ? 'bg-red-500/10 text-red-500' :
                  activity.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-primary/10 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {activity.type === 'merchant_application' ? 'store' :
                     activity.type === 'high_volume' ? 'trending_up' :
                     activity.type === 'policy_update' ? 'policy' : 'info'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{activity.title}</p>
                  <p className="text-xs text-text-secondary truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">{activity.time}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
