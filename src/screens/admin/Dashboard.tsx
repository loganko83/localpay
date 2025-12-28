import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { usePlatformMetrics, useNetworkStatus, useRecentBlocks } from '../../services/api/hooks';
import { formatTimestamp } from '../../services/blockchain/explorer';

const volumeData = [
  { name: 'Mon', value: 1800 },
  { name: 'Tue', value: 2100 },
  { name: 'Wed', value: 1900 },
  { name: 'Thu', value: 2400 },
  { name: 'Fri', value: 2800 },
  { name: 'Sat', value: 3200 },
  { name: 'Sun', value: 2900 },
];

const categoryData = [
  { name: 'F&B', value: 35, color: '#2b8cee' },
  { name: 'Retail', value: 25, color: '#22c55e' },
  { name: 'Service', value: 20, color: '#f59e0b' },
  { name: 'Market', value: 12, color: '#ec4899' },
  { name: 'Other', value: 8, color: '#8b5cf6' },
];

const recentActivity = [
  {
    id: '1',
    type: 'warning',
    icon: 'warning',
    title: '고액 거래 감지',
    description: '지갑 ID: 0x8a...4f2에서 5천만원 이동 감지',
    time: '10분 전',
    color: '#ef4444',
  },
  {
    id: '2',
    type: 'info',
    icon: 'add_business',
    title: '신규 가맹점 신청',
    description: "'서면 커피' 검증 요청",
    time: '25분 전',
    color: '#3b82f6',
  },
  {
    id: '3',
    type: 'success',
    icon: 'published_with_changes',
    title: '정책 업데이트 배포',
    description: '청년 바우처 Q3 파라미터 활성화',
    time: '2시간 전',
    color: '#22c55e',
  },
  {
    id: '4',
    type: 'info',
    icon: 'verified',
    title: '배치 앵커링 완료',
    description: '1,234개 감사 로그가 Xphere에 앵커링됨',
    time: '3시간 전',
    color: '#2b8cee',
  },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: metrics } = usePlatformMetrics();
  const { data: networkStatus } = useNetworkStatus();
  const { data: recentBlocks } = useRecentBlocks(5);

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
          <h1 className="text-2xl font-bold text-white">대시보드</h1>
          <p className="text-gray-400 text-sm mt-1">
            돌아오셨군요! LocalPay 현황입니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/analytics')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            분석 보기
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="총 발행량"
          value={`₩${formatCurrency(metrics?.totalIssuance || 45200000000)}`}
          change="+2.4%"
          positive
          icon="account_balance_wallet"
          onClick={() => navigate('/admin/analytics')}
        />
        <StatCard
          title="활성 사용자"
          value={formatCurrency(metrics?.activeUsers || 342100)}
          change="+1.2%"
          positive
          icon="groups"
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          title="24시간 거래량"
          value={`₩${formatCurrency(metrics?.volume24h || 2100000000)}`}
          change="+5.4%"
          positive
          icon="sync_alt"
          onClick={() => navigate('/admin/analytics')}
        />
        <StatCard
          title="대기 중 가맹점"
          value={(metrics?.pendingMerchants || 12).toString()}
          change="조치 필요"
          positive={false}
          icon="storefront"
          highlight
          onClick={() => navigate('/admin/users')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Volume Chart */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">거래량</h3>
              <p className="text-gray-500 text-sm">최근 7일 비교</p>
            </div>
            <button className="text-primary text-sm hover:underline">리포트 보기</button>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2b8cee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2b8cee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                  formatter={(value) => [`₩${value}M`, '거래량']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2b8cee"
                  strokeWidth={2}
                  fill="url(#colorVolume)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Blockchain Status */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">블록체인 상태</h3>
            <button
              onClick={() => navigate('/admin/blockchain')}
              className="text-primary text-sm hover:underline"
            >
              탐색기
            </button>
          </div>

          {/* Network Status */}
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500">token</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-medium">Xphere 연결됨</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                </div>
                <p className="text-gray-500 text-xs font-mono mt-0.5">
                  Block #{(networkStatus?.blockHeight || 12404200).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Blocks */}
          <div className="space-y-2">
            <p className="text-gray-400 text-xs font-medium uppercase">최근 블록</p>
            {recentBlocks?.slice(0, 4).map((block) => (
              <div
                key={block.number}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    deployed_code
                  </span>
                  <span className="text-white text-sm font-mono">
                    #{block.number.toLocaleString()}
                  </span>
                </div>
                <span className="text-gray-500 text-xs">{formatTimestamp(block.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-white font-semibold">최근 활동</h3>
            <button
              onClick={() => navigate('/admin/audit')}
              className="text-primary text-sm hover:underline"
            >
              전체 보기
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${activity.color}15` }}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ color: activity.color }}
                    >
                      {activity.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{activity.title}</p>
                      <span className="text-gray-500 text-xs">{activity.time}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">{activity.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">빠른 작업</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon="person_add"
              label="사용자 추가"
              onClick={() => navigate('/admin/users')}
            />
            <QuickAction
              icon="add_business"
              label="가맹점 추가"
              onClick={() => navigate('/admin/users')}
            />
            <QuickAction
              icon="confirmation_number"
              label="바우처 발행"
              onClick={() => navigate('/admin/vouchers')}
            />
            <QuickAction
              icon="lab_profile"
              label="감사 로그"
              onClick={() => navigate('/admin/audit')}
            />
            <QuickAction
              icon="policy"
              label="정책"
              onClick={() => navigate('/admin/policies')}
            />
            <QuickAction
              icon="payments"
              label="정산"
              onClick={() => navigate('/admin/settlements')}
            />
          </div>

          {/* Category Distribution */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-gray-400 text-xs font-medium uppercase mb-3">
              가맹점 카테고리
            </p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" hide />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-4 py-4 text-gray-600 text-xs">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          보안 연결
        </span>
        <span>|</span>
        <span>세션 ID: 8X92-22L1-00P</span>
        <span>|</span>
        <span>Xphere 블록체인넷</span>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
  highlight?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  positive,
  icon,
  highlight,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-gray-900/50 border rounded-xl p-5 cursor-pointer hover:bg-gray-800/50 transition-colors ${
      highlight ? 'border-orange-500/30' : 'border-white/5'
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <span className="text-gray-400 text-sm">{title}</span>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          highlight ? 'bg-orange-500/20' : 'bg-primary/20'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[18px] ${
            highlight ? 'text-orange-500' : 'text-primary'
          }`}
        >
          {icon}
        </span>
      </div>
    </div>
    <p className="text-white text-2xl font-bold mb-1">{value}</p>
    <div
      className={`flex items-center gap-1 text-sm ${
        highlight
          ? 'text-orange-500'
          : positive
          ? 'text-green-500'
          : 'text-red-500'
      }`}
    >
      {!highlight && (
        <span className="material-symbols-outlined text-[16px]">
          {positive ? 'trending_up' : 'trending_down'}
        </span>
      )}
      {change}
    </div>
  </div>
);

// Quick Action Button
interface QuickActionProps {
  icon: string;
  label: string;
  onClick: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-colors"
  >
    <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
    <span className="text-gray-400 text-xs">{label}</span>
  </button>
);

export default Dashboard;
