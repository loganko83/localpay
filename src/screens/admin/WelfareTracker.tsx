import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useWelfarePrograms, useWelfareDistributions, useWelfareStats, useWelfareImpact } from '../../services/api';
import type { WelfareProgram, WelfareDistribution } from '../../services/api';

type ProgramCategory = 'youth' | 'senior' | 'disability' | 'culture' | 'education' | 'housing' | 'medical';

const categoryColors: Record<ProgramCategory, string> = {
  youth: '#3b82f6',
  senior: '#22c55e',
  disability: '#8b5cf6',
  culture: '#ec4899',
  education: '#f59e0b',
  housing: '#06b6d4',
  medical: '#ef4444',
};

const monthlyData = [
  { month: '7월', distributed: 2100, used: 1850 },
  { month: '8월', distributed: 2400, used: 2100 },
  { month: '9월', distributed: 2200, used: 2000 },
  { month: '10월', distributed: 2800, used: 2450 },
  { month: '11월', distributed: 3100, used: 2700 },
  { month: '12월', distributed: 1900, used: 1200 },
];

const WelfareTracker: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState<WelfareProgram | null>(null);
  const [selectedTab, setSelectedTab] = useState<'programs' | 'distributions' | 'analytics'>(
    'programs'
  );

  // API hooks
  const { data: programsData, isLoading: programsLoading } = useWelfarePrograms();
  const { data: distributionsData, isLoading: distributionsLoading } = useWelfareDistributions();
  const { data: stats } = useWelfareStats();
  const { data: impact } = useWelfareImpact();

  const programs = programsData?.programs ?? [];
  const distributions = distributionsData?.distributions ?? [];

  const totalBudget = stats?.totalBudget ?? programs.reduce((sum, p) => sum + p.budget, 0);
  const totalDistributed = stats?.totalSpent ?? programs.reduce((sum, p) => sum + p.spent, 0);
  const totalBeneficiaries = stats?.totalBeneficiaries ?? 0;
  const avgUtilization = stats?.utilizationRate ?? 0;

  const categoryData = Object.entries(
    programs.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + p.spent;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, value]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: value / 1000000000,
    color: categoryColors[category as ProgramCategory] || '#64748b',
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">복지 배분 추적</h1>
          <p className="text-gray-400 text-sm mt-1">
            블록체인 검증과 함께 정부 보조금 및 복지 기금 배분 추적
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            보고서 내보내기
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            새 프로그램
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="총 예산"
          value={`${formatCurrency(totalBudget)}`}
          icon="account_balance"
          color="#3b82f6"
          subtitle="모든 활성 프로그램"
        />
        <SummaryCard
          title="배분액"
          value={`${formatCurrency(totalDistributed)}`}
          icon="payments"
          color="#22c55e"
          subtitle={`예산 대비 ${((totalDistributed / totalBudget) * 100).toFixed(1)}%`}
        />
        <SummaryCard
          title="수혜자"
          value={totalBeneficiaries.toLocaleString()}
          icon="groups"
          color="#8b5cf6"
          subtitle="총 수혜자 수"
        />
        <SummaryCard
          title="활용률"
          value={`${avgUtilization.toFixed(1)}%`}
          icon="trending_up"
          color="#f59e0b"
          subtitle="프로그램 평균"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution by Category */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">카테고리별 배분</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}B KRW`, '']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
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

        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">월별 배분 및 사용 현황 (백만원)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorDistributed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                  formatter={(value) => [`${value}M KRW`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="distributed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorDistributed)"
                  name="배분"
                />
                <Area
                  type="monotone"
                  dataKey="used"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorUsed)"
                  name="사용"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-blue-500 rounded" />
              <span className="text-gray-400">배분</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span className="text-gray-400">사용</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-0">
        {(['programs', 'distributions', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
              selectedTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'programs' && '활성 프로그램'}
            {tab === 'distributions' && '최근 배분'}
            {tab === 'analytics' && '성과 분석'}
          </button>
        ))}
      </div>

      {/* Programs Tab */}
      {selectedTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programsLoading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : programs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              등록된 프로그램이 없습니다
            </div>
          ) : programs.map((program) => {
            const utilizationRate = program.budget > 0 ? (program.spent / program.budget) * 100 : 0;
            return (
              <div
                key={program.id}
                onClick={() => setSelectedProgram(program)}
                className="bg-gray-900/50 border border-white/5 rounded-xl p-5 hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="px-2 py-1 rounded text-xs font-medium capitalize"
                    style={{
                      backgroundColor: `${categoryColors[program.type as ProgramCategory] || '#64748b'}20`,
                      color: categoryColors[program.type as ProgramCategory] || '#64748b',
                    }}
                  >
                    {program.type}
                  </div>
                  {program.status === 'active' && (
                    <span className="material-symbols-outlined text-green-500 text-[18px]">
                      verified_user
                    </span>
                  )}
                </div>
                <h4 className="text-white font-medium mb-2">{program.name}</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">배분 진행률</span>
                      <span className="text-white">
                        {utilizationRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(utilizationRate, 100)}%`,
                          backgroundColor: categoryColors[program.type as ProgramCategory] || '#64748b',
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">수혜자</span>
                    <span className="text-white">{program.beneficiaryCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">예산</span>
                    <span className="text-white">{formatCurrency(program.budget)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Distributions Tab */}
      {selectedTab === 'distributions' && (
        <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
          {distributionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : distributions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              배분 내역이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                      ID
                    </th>
                    <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                      프로그램
                    </th>
                    <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                      수혜자
                    </th>
                    <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                      금액
                    </th>
                    <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                      상태
                    </th>
                    <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                      블록체인
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {distributions.map((dist) => (
                    <tr key={dist.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-white font-mono text-sm">{dist.id.substring(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 text-sm">{dist.programName || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white text-sm">{dist.beneficiaryName || 'Unknown'}</p>
                          <p className="text-gray-500 text-xs">{dist.beneficiaryId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white text-sm">
                          {dist.amount.toLocaleString()} KRW
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <DistributionStatusBadge status={dist.status} />
                      </td>
                      <td className="px-6 py-4">
                        {dist.blockchainHash ? (
                          <a
                            href={`https://xp.tamsa.io/tx/${dist.blockchainHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm font-mono"
                          >
                            {dist.blockchainHash.substring(0, 10)}...
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">프로그램 활용률</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programs.map(p => ({ ...p, utilizationRate: p.budget > 0 ? (p.spent / p.budget) * 100 : 0 }))} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: 8,
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, '활용률']}
                  />
                  <Bar dataKey="utilizationRate" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">성과 지표</h3>
            <div className="space-y-4">
              <ImpactMetric
                label="경제 승수효과"
                value={`${impact?.economicMultiplier?.toFixed(1) ?? '1.8'}배`}
                description="지역 내 소비 증폭 효과"
                trend="+0.2"
              />
              <ImpactMetric
                label="자금 잔류율"
                value={`${impact?.capitalRetention?.toFixed(1) ?? '94.2'}%`}
                description="지역 경제 내 잔류 자금"
                trend="+2.1"
              />
              <ImpactMetric
                label="일자리 창출"
                value={`${impact?.jobsCreated?.toLocaleString() ?? '0'}개`}
                description="복지 프로그램 관련 일자리"
                trend="+5.3"
              />
              <ImpactMetric
                label="총 배분율"
                value={`${avgUtilization.toFixed(1)}%`}
                description="전체 예산 대비 배분"
                trend="+0.1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="px-2 py-1 rounded text-xs font-medium capitalize"
                  style={{
                    backgroundColor: `${categoryColors[selectedProgram.type as ProgramCategory] || '#64748b'}20`,
                    color: categoryColors[selectedProgram.type as ProgramCategory] || '#64748b',
                  }}
                >
                  {selectedProgram.type}
                </div>
                <span className="text-white font-semibold">{selectedProgram.id.substring(0, 8)}</span>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <h3 className="text-white text-xl font-semibold">{selectedProgram.name}</h3>

              <div className="grid grid-cols-2 gap-4">
                <InfoCard
                  label="예산"
                  value={`${formatCurrency(selectedProgram.budget)} 원`}
                />
                <InfoCard
                  label="배분액"
                  value={`${formatCurrency(selectedProgram.spent)} 원`}
                />
                <InfoCard
                  label="수혜자"
                  value={selectedProgram.beneficiaryCount.toLocaleString()}
                />
                <InfoCard
                  label="활용률"
                  value={`${selectedProgram.budget > 0 ? ((selectedProgram.spent / selectedProgram.budget) * 100).toFixed(1) : 0}%`}
                />
                <InfoCard
                  label="시작일"
                  value={selectedProgram.startDate ? new Date(selectedProgram.startDate).toLocaleDateString() : 'N/A'}
                />
                <InfoCard
                  label="종료일"
                  value={selectedProgram.endDate ? new Date(selectedProgram.endDate).toLocaleDateString() : 'N/A'}
                />
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase mb-2">배분 진행률</p>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(selectedProgram.budget > 0 ? (selectedProgram.spent / selectedProgram.budget) * 100 : 0, 100)}%`,
                      backgroundColor: categoryColors[selectedProgram.type as ProgramCategory] || '#64748b',
                    }}
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {selectedProgram.budget > 0 ? ((selectedProgram.spent / selectedProgram.budget) * 100).toFixed(1) : 0}%
                  배분 완료
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    selectedProgram.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : selectedProgram.status === 'paused'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {selectedProgram.status === 'active'
                      ? 'play_circle'
                      : selectedProgram.status === 'paused'
                      ? 'pause_circle'
                      : 'check_circle'}
                  </span>
                  <span className="text-sm capitalize">{selectedProgram.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, subtitle }) => (
  <div className="bg-gray-900/50 border border-white/5 rounded-xl p-5">
    <div className="flex items-start justify-between mb-2">
      <span className="text-gray-400 text-sm">{title}</span>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <span className="material-symbols-outlined text-[18px]" style={{ color }}>
          {icon}
        </span>
      </div>
    </div>
    <p className="text-white text-2xl font-bold">{value}</p>
    <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
  </div>
);

type DistributionStatus = WelfareDistribution['status'];

const DistributionStatusBadge: React.FC<{ status: DistributionStatus }> = ({ status }) => {
  const styles: Record<DistributionStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
};

const ImpactMetric: React.FC<{
  label: string;
  value: string;
  description: string;
  trend: string;
}> = ({ label, value, description, trend }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <div>
      <p className="text-white font-medium">{label}</p>
      <p className="text-gray-500 text-xs">{description}</p>
    </div>
    <div className="text-right">
      <p className="text-white text-lg font-bold">{value}</p>
      <p className="text-green-500 text-xs">{trend}%</p>
    </div>
  </div>
);

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/5 rounded-lg p-3">
    <p className="text-gray-500 text-xs uppercase mb-1">{label}</p>
    <p className="text-white font-medium">{value}</p>
  </div>
);

export default WelfareTracker;
