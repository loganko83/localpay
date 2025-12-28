import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import {
  getCases,
  getComplianceMetrics,
  getReports,
  getCaseTypeLabel,
  getRiskLevelColor,
  formatCurrency,
  updateCaseStatus,
  AML_THRESHOLDS,
  type AMLCase,
} from '../../services/aml/screening';

const trendData = [
  { month: 'Jul', cases: 12, resolved: 10 },
  { month: 'Aug', cases: 18, resolved: 15 },
  { month: 'Sep', cases: 14, resolved: 14 },
  { month: 'Oct', cases: 22, resolved: 18 },
  { month: 'Nov', cases: 16, resolved: 16 },
  { month: 'Dec', cases: 8, resolved: 4 },
];

const AMLCenter: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'cases' | 'reports' | 'thresholds'>('cases');
  const [selectedCase, setSelectedCase] = useState<AMLCase | null>(null);

  const metrics = getComplianceMetrics();
  const cases = getCases();
  const reports = getReports();

  const statusData = [
    { name: 'Pending', value: metrics.pendingReview, color: '#eab308' },
    { name: 'Investigating', value: metrics.underInvestigation, color: '#3b82f6' },
    { name: 'Escalated', value: metrics.escalated, color: '#ef4444' },
    { name: 'Cleared', value: metrics.cleared, color: '#22c55e' },
    { name: 'Reported', value: metrics.reported, color: '#8b5cf6' },
  ];

  const handleStatusUpdate = (caseId: string, newStatus: AMLCase['status']) => {
    updateCaseStatus(caseId, newStatus);
    setSelectedCase(null);
  };

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AML Compliance Center</h1>
          <p className="text-gray-400 text-sm mt-1">
            Anti-Money Laundering monitoring and regulatory reporting (KoFIU)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-green-400 text-sm font-medium">
              {metrics.complianceRate}% Compliance
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Report
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Cases"
          value={metrics.totalCases}
          icon="folder_open"
          color="#3b82f6"
        />
        <MetricCard
          title="Pending Review"
          value={metrics.pendingReview}
          icon="pending"
          color="#eab308"
          highlight={metrics.pendingReview > 0}
        />
        <MetricCard
          title="CTR Filed"
          value={metrics.ctrCount}
          icon="receipt_long"
          color="#22c55e"
          subtitle="This Month"
        />
        <MetricCard
          title="STR Filed"
          value={metrics.strCount}
          icon="report"
          color="#ef4444"
          subtitle="This Month"
        />
        <MetricCard
          title="Avg Resolution"
          value={`${metrics.avgResolutionTime}h`}
          icon="schedule"
          color="#8b5cf6"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case Status Distribution */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Case Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-400">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Case Trend (6 Months)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
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
                />
                <Line
                  type="monotone"
                  dataKey="cases"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="New Cases"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-red-500 rounded" />
              <span className="text-gray-400">New Cases</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span className="text-gray-400">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-0">
        {(['cases', 'reports', 'thresholds'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
              selectedTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'cases' && 'Active Cases'}
            {tab === 'reports' && 'Regulatory Reports'}
            {tab === 'thresholds' && 'Thresholds'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === 'cases' && (
        <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Case ID
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Subject
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Type
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Risk
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Amount
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Status
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Created
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cases.map((amlCase) => (
                  <tr
                    key={amlCase.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedCase(amlCase)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-mono text-sm">{amlCase.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white text-sm">{amlCase.subjectName}</p>
                        <p className="text-gray-500 text-xs">
                          {amlCase.subjectType}: {amlCase.subjectId}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 text-sm">
                        {getCaseTypeLabel(amlCase.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-bold uppercase"
                        style={{
                          backgroundColor: `${getRiskLevelColor(amlCase.riskLevel)}20`,
                          color: getRiskLevelColor(amlCase.riskLevel),
                        }}
                      >
                        {amlCase.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white text-sm">
                        {amlCase.amount > 0 ? formatCurrency(amlCase.amount) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={amlCase.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm">
                        {formatTimeAgo(amlCase.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(amlCase);
                        }}
                        className="text-primary hover:text-primary/80 text-sm"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'reports' && (
        <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Report ID
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Type
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Subject
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Amount
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Submitted
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    Status
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    KoFIU Ref
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white font-mono text-sm">{report.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          report.type === 'STR'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white text-sm">{report.subjectName}</p>
                        <p className="text-gray-500 text-xs">{report.subjectId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white text-sm">{formatCurrency(report.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm">
                        {report.submittedAt.toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          report.status === 'acknowledged'
                            ? 'bg-green-500/20 text-green-400'
                            : report.status === 'submitted'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : report.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm font-mono">
                        {report.kofiu_reference || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'thresholds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">gavel</span>
              Korean AML Thresholds (KoFIU)
            </h3>
            <div className="space-y-4">
              <ThresholdItem
                label="CTR Threshold"
                value={formatCurrency(AML_THRESHOLDS.CTR_THRESHOLD)}
                description="Cash transactions above this require reporting"
              />
              <ThresholdItem
                label="High Value Alert"
                value={formatCurrency(AML_THRESHOLDS.HIGH_VALUE_THRESHOLD)}
                description="Additional scrutiny threshold"
              />
              <ThresholdItem
                label="Daily Limit"
                value={formatCurrency(AML_THRESHOLDS.DAILY_LIMIT)}
                description="Maximum daily transaction volume"
              />
            </div>
          </div>

          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">pattern</span>
              Pattern Detection Settings
            </h3>
            <div className="space-y-4">
              <ThresholdItem
                label="Structuring Window"
                value="24 hours"
                description="Time window for detecting split transactions"
              />
              <ThresholdItem
                label="Structuring Count"
                value={`${AML_THRESHOLDS.STRUCTURING_COUNT} transactions`}
                description="Minimum transactions to trigger alert"
              />
              <ThresholdItem
                label="Velocity Alert"
                value="5x average"
                description="Volume spike detection multiplier"
              />
            </div>
          </div>
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="px-2 py-1 rounded text-xs font-bold uppercase"
                  style={{
                    backgroundColor: `${getRiskLevelColor(selectedCase.riskLevel)}20`,
                    color: getRiskLevelColor(selectedCase.riskLevel),
                  }}
                >
                  {selectedCase.riskLevel}
                </span>
                <span className="text-white font-semibold">{selectedCase.id}</span>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-white text-lg font-semibold">{selectedCase.subjectName}</h3>
                <p className="text-gray-400 mt-1">{selectedCase.description}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoBox label="Type" value={getCaseTypeLabel(selectedCase.type)} />
                <InfoBox label="Amount" value={formatCurrency(selectedCase.amount)} />
                <InfoBox label="Subject ID" value={selectedCase.subjectId} />
                <InfoBox label="Status" value={selectedCase.status.replace('_', ' ')} />
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase mb-2">Risk Flags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.flags.map((flag) => (
                    <span
                      key={flag}
                      className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoBox label="Created" value={selectedCase.createdAt.toLocaleString()} />
                <InfoBox label="Last Updated" value={selectedCase.updatedAt.toLocaleString()} />
              </div>

              {selectedCase.assignedTo && (
                <InfoBox label="Assigned To" value={selectedCase.assignedTo} />
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'under_investigation')}
                  className="flex-1 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                  Investigate
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'escalated')}
                  className="flex-1 py-2.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-sm font-medium"
                >
                  Escalate
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'reported')}
                  className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                  File Report
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'cleared')}
                  className="flex-1 py-2.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  subtitle?: string;
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
  highlight,
}) => (
  <div
    className={`bg-gray-900/50 border rounded-xl p-5 ${
      highlight ? 'border-yellow-500/30' : 'border-white/5'
    }`}
  >
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
    {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
  </div>
);

const StatusBadge: React.FC<{ status: AMLCase['status'] }> = ({ status }) => {
  const styles: Record<AMLCase['status'], string> = {
    pending_review: 'bg-yellow-500/20 text-yellow-400',
    under_investigation: 'bg-blue-500/20 text-blue-400',
    escalated: 'bg-orange-500/20 text-orange-400',
    cleared: 'bg-green-500/20 text-green-400',
    reported: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const ThresholdItem: React.FC<{
  label: string;
  value: string;
  description: string;
}> = ({ label, value, description }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <div>
      <p className="text-white text-sm">{label}</p>
      <p className="text-gray-500 text-xs">{description}</p>
    </div>
    <span className="text-primary font-mono text-sm">{value}</span>
  </div>
);

const InfoBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/5 rounded-lg p-3">
    <p className="text-gray-500 text-xs uppercase mb-1">{label}</p>
    <p className="text-white text-sm capitalize">{value}</p>
  </div>
);

export default AMLCenter;
