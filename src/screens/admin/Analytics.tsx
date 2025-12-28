import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { usePlatformMetrics, useNetworkStatus } from '../../services/api/hooks';

// Mock data for charts
const transactionVolumeData = [
  { date: '12/22', volume: 1.8, transactions: 12400 },
  { date: '12/23', volume: 2.1, transactions: 14200 },
  { date: '12/24', volume: 1.9, transactions: 13100 },
  { date: '12/25', volume: 2.4, transactions: 16800 },
  { date: '12/26', volume: 2.8, transactions: 19200 },
  { date: '12/27', volume: 3.2, transactions: 22100 },
  { date: '12/28', volume: 2.9, transactions: 20400 },
];

const userGrowthData = [
  { month: 'Jul', users: 280000, newUsers: 12000 },
  { month: 'Aug', users: 295000, newUsers: 15000 },
  { month: 'Sep', users: 310000, newUsers: 15000 },
  { month: 'Oct', users: 322000, newUsers: 12000 },
  { month: 'Nov', users: 335000, newUsers: 13000 },
  { month: 'Dec', users: 342000, newUsers: 7000 },
];

const merchantCategoryData = [
  { name: 'Food & Beverage', value: 35, color: '#2b8cee' },
  { name: 'Retail', value: 25, color: '#22c55e' },
  { name: 'Services', value: 20, color: '#f59e0b' },
  { name: 'Traditional Market', value: 12, color: '#ec4899' },
  { name: 'Others', value: 8, color: '#8b5cf6' },
];

const regionalData = [
  { region: 'Jeonju', volume: 850, merchants: 420 },
  { region: 'Gunsan', volume: 320, merchants: 180 },
  { region: 'Iksan', volume: 280, merchants: 160 },
  { region: 'Jeongeup', volume: 180, merchants: 95 },
  { region: 'Namwon', volume: 150, merchants: 82 },
  { region: 'Gimje', volume: 120, merchants: 65 },
];

const hourlyPatternData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  volume: Math.sin((i - 6) * 0.3) * 50 + 50 + Math.random() * 20,
}));

type TimeRange = '24h' | '7d' | '30d' | '90d';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { data: metrics } = usePlatformMetrics();
  const { data: networkStatus } = useNetworkStatus();

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">
            Platform performance and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['24h', '7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Issuance"
          value={`₩${formatCurrency(metrics?.totalIssuance || 45200000000)}`}
          change="+2.4%"
          positive
          icon="account_balance_wallet"
        />
        <MetricCard
          title="24h Volume"
          value={`₩${formatCurrency(metrics?.volume24h || 2100000000)}`}
          change="+5.4%"
          positive
          icon="sync_alt"
        />
        <MetricCard
          title="Active Users"
          value={formatCurrency(metrics?.activeUsers || 342100)}
          change="+1.2%"
          positive
          icon="groups"
        />
        <MetricCard
          title="Verification Rate"
          value={`${metrics?.verificationRate || 99.8}%`}
          change="+0.1%"
          positive
          icon="verified"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Transaction Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transactionVolumeData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2b8cee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2b8cee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}B`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#2b8cee"
                  strokeWidth={2}
                  fill="url(#colorVolume)"
                  name="Volume (B KRW)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">User Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="users" fill="#2b8cee" name="Total Users" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newUsers" fill="#22c55e" name="New Users" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Merchant Categories */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Merchant Categories</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={merchantCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {merchantCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {merchantCategoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-400">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6 lg:col-span-2">
          <h3 className="text-white font-semibold mb-4">Regional Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="region" type="category" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="volume" fill="#2b8cee" name="Volume (M KRW)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Pattern */}
      <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Hourly Transaction Pattern</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyPatternData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={10} interval={2} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#334155',
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Transaction Volume"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Blockchain Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500">token</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Block Height</p>
              <p className="text-white text-xl font-bold font-mono">
                #{(networkStatus?.blockHeight || 12404200).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-500 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Xphere Connected
          </div>
        </div>

        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">history</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Anchored Logs</p>
              <p className="text-white text-xl font-bold">
                {(metrics?.anchoredLogs || 156789).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">All audit logs anchored to blockchain</p>
        </div>

        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-500">eco</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">CO2 Saved</p>
              <p className="text-white text-xl font-bold">
                {metrics?.co2Saved || 142.5} tons
              </p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Through carbon point incentives</p>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, positive, icon }) => (
  <div className="bg-gray-900/50 border border-white/5 rounded-xl p-5">
    <div className="flex items-start justify-between mb-3">
      <span className="text-gray-400 text-sm">{title}</span>
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
      </div>
    </div>
    <p className="text-white text-2xl font-bold mb-1">{value}</p>
    <div className={`flex items-center gap-1 text-sm ${positive ? 'text-green-500' : 'text-red-500'}`}>
      <span className="material-symbols-outlined text-[16px]">
        {positive ? 'trending_up' : 'trending_down'}
      </span>
      {change}
    </div>
  </div>
);

export default Analytics;
