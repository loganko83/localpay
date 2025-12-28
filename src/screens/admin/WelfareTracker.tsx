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

interface WelfareProgram {
  id: string;
  name: string;
  category: 'youth' | 'senior' | 'disability' | 'culture' | 'education' | 'emergency';
  budget: number;
  distributed: number;
  beneficiaries: number;
  utilizationRate: number;
  status: 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate: Date;
  verificationRequired: boolean;
}

interface Distribution {
  id: string;
  programId: string;
  programName: string;
  beneficiaryId: string;
  beneficiaryName: string;
  amount: number;
  distributedAt: Date;
  usedAmount: number;
  status: 'distributed' | 'partially_used' | 'fully_used' | 'expired';
  didVerified: boolean;
  txHash?: string;
}

const mockPrograms: WelfareProgram[] = [
  {
    id: 'WF-001',
    name: 'Youth Employment Support',
    category: 'youth',
    budget: 5000000000,
    distributed: 3250000000,
    beneficiaries: 12500,
    utilizationRate: 78.5,
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    verificationRequired: true,
  },
  {
    id: 'WF-002',
    name: 'Senior Citizen Monthly Support',
    category: 'senior',
    budget: 8000000000,
    distributed: 7200000000,
    beneficiaries: 45000,
    utilizationRate: 92.3,
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    verificationRequired: true,
  },
  {
    id: 'WF-003',
    name: 'Cultural Experience Voucher',
    category: 'culture',
    budget: 2000000000,
    distributed: 1800000000,
    beneficiaries: 8500,
    utilizationRate: 65.2,
    status: 'active',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-12-31'),
    verificationRequired: false,
  },
  {
    id: 'WF-004',
    name: 'Education Support Fund',
    category: 'education',
    budget: 3000000000,
    distributed: 2400000000,
    beneficiaries: 6200,
    utilizationRate: 88.1,
    status: 'active',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-12-31'),
    verificationRequired: true,
  },
  {
    id: 'WF-005',
    name: 'Disability Living Allowance',
    category: 'disability',
    budget: 4500000000,
    distributed: 4100000000,
    beneficiaries: 15800,
    utilizationRate: 95.4,
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    verificationRequired: true,
  },
];

const mockDistributions: Distribution[] = [
  {
    id: 'DIST-001',
    programId: 'WF-001',
    programName: 'Youth Employment Support',
    beneficiaryId: 'U-44521',
    beneficiaryName: 'Kim Minjun',
    amount: 500000,
    distributedAt: new Date(Date.now() - 86400000),
    usedAmount: 320000,
    status: 'partially_used',
    didVerified: true,
    txHash: '0x8f2a...4e91',
  },
  {
    id: 'DIST-002',
    programId: 'WF-002',
    programName: 'Senior Citizen Monthly Support',
    beneficiaryId: 'U-88234',
    beneficiaryName: 'Park Youngsoo',
    amount: 200000,
    distributedAt: new Date(Date.now() - 172800000),
    usedAmount: 200000,
    status: 'fully_used',
    didVerified: true,
    txHash: '0x3c1b...7f22',
  },
  {
    id: 'DIST-003',
    programId: 'WF-003',
    programName: 'Cultural Experience Voucher',
    beneficiaryId: 'U-55612',
    beneficiaryName: 'Lee Soojin',
    amount: 150000,
    distributedAt: new Date(Date.now() - 259200000),
    usedAmount: 0,
    status: 'distributed',
    didVerified: false,
  },
  {
    id: 'DIST-004',
    programId: 'WF-004',
    programName: 'Education Support Fund',
    beneficiaryId: 'U-33109',
    beneficiaryName: 'Choi Jihye',
    amount: 800000,
    distributedAt: new Date(Date.now() - 604800000),
    usedAmount: 800000,
    status: 'fully_used',
    didVerified: true,
    txHash: '0x9d4e...2a83',
  },
];

const categoryColors: Record<WelfareProgram['category'], string> = {
  youth: '#3b82f6',
  senior: '#22c55e',
  disability: '#8b5cf6',
  culture: '#ec4899',
  education: '#f59e0b',
  emergency: '#ef4444',
};

const monthlyData = [
  { month: 'Jul', distributed: 2100, used: 1850 },
  { month: 'Aug', distributed: 2400, used: 2100 },
  { month: 'Sep', distributed: 2200, used: 2000 },
  { month: 'Oct', distributed: 2800, used: 2450 },
  { month: 'Nov', distributed: 3100, used: 2700 },
  { month: 'Dec', distributed: 1900, used: 1200 },
];

const WelfareTracker: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState<WelfareProgram | null>(null);
  const [selectedTab, setSelectedTab] = useState<'programs' | 'distributions' | 'analytics'>(
    'programs'
  );

  const totalBudget = mockPrograms.reduce((sum, p) => sum + p.budget, 0);
  const totalDistributed = mockPrograms.reduce((sum, p) => sum + p.distributed, 0);
  const totalBeneficiaries = mockPrograms.reduce((sum, p) => sum + p.beneficiaries, 0);
  const avgUtilization =
    mockPrograms.reduce((sum, p) => sum + p.utilizationRate, 0) / mockPrograms.length;

  const categoryData = Object.entries(
    mockPrograms.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.distributed;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, value]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: value / 1000000000,
    color: categoryColors[category as WelfareProgram['category']],
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
          <h1 className="text-2xl font-bold text-white">Welfare Distribution Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track government subsidies and welfare fund distribution with blockchain verification
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Program
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Budget"
          value={`${formatCurrency(totalBudget)}`}
          icon="account_balance"
          color="#3b82f6"
          subtitle="All active programs"
        />
        <SummaryCard
          title="Distributed"
          value={`${formatCurrency(totalDistributed)}`}
          icon="payments"
          color="#22c55e"
          subtitle={`${((totalDistributed / totalBudget) * 100).toFixed(1)}% of budget`}
        />
        <SummaryCard
          title="Beneficiaries"
          value={totalBeneficiaries.toLocaleString()}
          icon="groups"
          color="#8b5cf6"
          subtitle="Total recipients"
        />
        <SummaryCard
          title="Utilization Rate"
          value={`${avgUtilization.toFixed(1)}%`}
          icon="trending_up"
          color="#f59e0b"
          subtitle="Average across programs"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution by Category */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Distribution by Category</h3>
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
          <h3 className="text-white font-semibold mb-4">Monthly Distribution & Usage (M KRW)</h3>
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
                  name="Distributed"
                />
                <Area
                  type="monotone"
                  dataKey="used"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorUsed)"
                  name="Used"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-blue-500 rounded" />
              <span className="text-gray-400">Distributed</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span className="text-gray-400">Used</span>
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
            {tab === 'programs' && 'Active Programs'}
            {tab === 'distributions' && 'Recent Distributions'}
            {tab === 'analytics' && 'Impact Analytics'}
          </button>
        ))}
      </div>

      {/* Programs Tab */}
      {selectedTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockPrograms.map((program) => (
            <div
              key={program.id}
              onClick={() => setSelectedProgram(program)}
              className="bg-gray-900/50 border border-white/5 rounded-xl p-5 hover:bg-gray-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="px-2 py-1 rounded text-xs font-medium capitalize"
                  style={{
                    backgroundColor: `${categoryColors[program.category]}20`,
                    color: categoryColors[program.category],
                  }}
                >
                  {program.category}
                </div>
                {program.verificationRequired && (
                  <span className="material-symbols-outlined text-green-500 text-[18px]">
                    verified_user
                  </span>
                )}
              </div>
              <h4 className="text-white font-medium mb-2">{program.name}</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">Distribution Progress</span>
                    <span className="text-white">
                      {((program.distributed / program.budget) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(program.distributed / program.budget) * 100}%`,
                        backgroundColor: categoryColors[program.category],
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Beneficiaries</span>
                  <span className="text-white">{program.beneficiaries.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Utilization</span>
                  <span
                    className={
                      program.utilizationRate >= 80
                        ? 'text-green-500'
                        : program.utilizationRate >= 50
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    }
                  >
                    {program.utilizationRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Distributions Tab */}
      {selectedTab === 'distributions' && (
        <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    ID
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Program
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Beneficiary
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Amount
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Used
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Status
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    DID
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Blockchain
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockDistributions.map((dist) => (
                  <tr key={dist.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white font-mono text-sm">{dist.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 text-sm">{dist.programName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white text-sm">{dist.beneficiaryName}</p>
                        <p className="text-gray-500 text-xs">{dist.beneficiaryId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white text-sm">
                        {dist.amount.toLocaleString()} KRW
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm">
                        {dist.usedAmount.toLocaleString()} KRW
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <DistributionStatusBadge status={dist.status} />
                    </td>
                    <td className="px-6 py-4">
                      {dist.didVerified ? (
                        <span className="text-green-500 flex items-center gap-1 text-sm">
                          <span className="material-symbols-outlined text-[16px]">
                            verified
                          </span>
                          Verified
                        </span>
                      ) : (
                        <span className="text-yellow-500 flex items-center gap-1 text-sm">
                          <span className="material-symbols-outlined text-[16px]">
                            pending
                          </span>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {dist.txHash ? (
                        <a
                          href={`https://xp.tamsa.io/tx/${dist.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm font-mono"
                        >
                          {dist.txHash}
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
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Program Utilization</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPrograms} layout="vertical">
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
                    formatter={(value) => [`${value}%`, 'Utilization']}
                  />
                  <Bar dataKey="utilizationRate" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Impact Metrics</h3>
            <div className="space-y-4">
              <ImpactMetric
                label="Economic Multiplier"
                value="1.8x"
                description="Local spending amplification effect"
                trend="+0.2"
              />
              <ImpactMetric
                label="Capital Retention"
                value="94.2%"
                description="Funds staying in local economy"
                trend="+2.1"
              />
              <ImpactMetric
                label="DID Verification Rate"
                value="87.5%"
                description="Beneficiaries with verified identity"
                trend="+5.3"
              />
              <ImpactMetric
                label="Blockchain Anchored"
                value="99.8%"
                description="Transactions recorded on-chain"
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
                    backgroundColor: `${categoryColors[selectedProgram.category]}20`,
                    color: categoryColors[selectedProgram.category],
                  }}
                >
                  {selectedProgram.category}
                </div>
                <span className="text-white font-semibold">{selectedProgram.id}</span>
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
                  label="Budget"
                  value={`${formatCurrency(selectedProgram.budget)} KRW`}
                />
                <InfoCard
                  label="Distributed"
                  value={`${formatCurrency(selectedProgram.distributed)} KRW`}
                />
                <InfoCard
                  label="Beneficiaries"
                  value={selectedProgram.beneficiaries.toLocaleString()}
                />
                <InfoCard
                  label="Utilization"
                  value={`${selectedProgram.utilizationRate}%`}
                />
                <InfoCard
                  label="Start Date"
                  value={selectedProgram.startDate.toLocaleDateString()}
                />
                <InfoCard
                  label="End Date"
                  value={selectedProgram.endDate.toLocaleDateString()}
                />
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase mb-2">Distribution Progress</p>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(selectedProgram.distributed / selectedProgram.budget) * 100}%`,
                      backgroundColor: categoryColors[selectedProgram.category],
                    }}
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {((selectedProgram.distributed / selectedProgram.budget) * 100).toFixed(1)}%
                  distributed
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    selectedProgram.verificationRequired
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span className="text-sm">
                    {selectedProgram.verificationRequired
                      ? 'DID Verification Required'
                      : 'No Verification'}
                  </span>
                </div>
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

const DistributionStatusBadge: React.FC<{ status: Distribution['status'] }> = ({ status }) => {
  const styles: Record<Distribution['status'], string> = {
    distributed: 'bg-blue-500/20 text-blue-400',
    partially_used: 'bg-yellow-500/20 text-yellow-400',
    fully_used: 'bg-green-500/20 text-green-400',
    expired: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${styles[status]}`}>
      {status.replace('_', ' ')}
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
