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
  { month: '7월', cases: 12, resolved: 10 },
  { month: '8월', cases: 18, resolved: 15 },
  { month: '9월', cases: 14, resolved: 14 },
  { month: '10월', cases: 22, resolved: 18 },
  { month: '11월', cases: 16, resolved: 16 },
  { month: '12월', cases: 8, resolved: 4 },
];

const AMLCenter: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'cases' | 'reports' | 'thresholds'>('cases');
  const [selectedCase, setSelectedCase] = useState<AMLCase | null>(null);

  const metrics = getComplianceMetrics();
  const cases = getCases();
  const reports = getReports();

  const statusData = [
    { name: '대기 중', value: metrics.pendingReview, color: '#eab308' },
    { name: '조사 중', value: metrics.underInvestigation, color: '#3b82f6' },
    { name: '상신됨', value: metrics.escalated, color: '#ef4444' },
    { name: '해제됨', value: metrics.cleared, color: '#22c55e' },
    { name: '신고됨', value: metrics.reported, color: '#8b5cf6' },
  ];

  const handleStatusUpdate = (caseId: string, newStatus: AMLCase['status']) => {
    updateCaseStatus(caseId, newStatus);
    setSelectedCase(null);
  };

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / 3600000);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">자금세탁방지 센터</h1>
          <p className="text-gray-400 text-sm mt-1">
            자금세탁 모니터링 및 규제 보고 (금융정보분석원)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-green-400 text-sm font-medium">
              준수율 {metrics.complianceRate}%
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            새 보고서
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="전체 건수"
          value={metrics.totalCases}
          icon="folder_open"
          color="#3b82f6"
        />
        <MetricCard
          title="대기 중"
          value={metrics.pendingReview}
          icon="pending"
          color="#eab308"
          highlight={metrics.pendingReview > 0}
        />
        <MetricCard
          title="CTR 제출"
          value={metrics.ctrCount}
          icon="receipt_long"
          color="#22c55e"
          subtitle="이번 달"
        />
        <MetricCard
          title="STR 제출"
          value={metrics.strCount}
          icon="report"
          color="#ef4444"
          subtitle="이번 달"
        />
        <MetricCard
          title="평균 처리시간"
          value={`${metrics.avgResolutionTime}시간`}
          icon="schedule"
          color="#8b5cf6"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case Status Distribution */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">건별 상태</h3>
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
          <h3 className="text-white font-semibold mb-4">건수 추이 (6개월)</h3>
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
                  name="신규 건수"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="처리 완료"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-red-500 rounded" />
              <span className="text-gray-400">신규 건수</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span className="text-gray-400">처리 완료</span>
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
            {tab === 'cases' && '활성 건수'}
            {tab === 'reports' && '규제 보고서'}
            {tab === 'thresholds' && '임계값'}
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
                    건 ID
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    대상
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    유형
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    위험
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    금액
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    상태
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    생성일
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    조치
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
                        검토
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
                    보고서 ID
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    유형
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    대상
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    금액
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    제출일
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    상태
                  </th>
                  <th className="text-left text-gray-400 text-xs font-medium uppercase px-6 py-4">
                    금융정보분석원 참조
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
              한국 자금세탁방지 임계값 (금융정보분석원)
            </h3>
            <div className="space-y-4">
              <ThresholdItem
                label="CTR 임계값"
                value={formatCurrency(AML_THRESHOLDS.CTR_THRESHOLD)}
                description="이 금액 이상의 현금 거래는 보고 필수"
              />
              <ThresholdItem
                label="고액 거래 경보"
                value={formatCurrency(AML_THRESHOLDS.HIGH_VALUE_THRESHOLD)}
                description="추가 심사 임계값"
              />
              <ThresholdItem
                label="일일 한도"
                value={formatCurrency(AML_THRESHOLDS.DAILY_LIMIT)}
                description="일일 최대 거래량"
              />
            </div>
          </div>

          <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">pattern</span>
              패턴 탐지 설정
            </h3>
            <div className="space-y-4">
              <ThresholdItem
                label="구조화 탐지 기간"
                value="24시간"
                description="분할 거래 탐지 시간 범위"
              />
              <ThresholdItem
                label="구조화 탐지 건수"
                value={`${AML_THRESHOLDS.STRUCTURING_COUNT}건`}
                description="경보 발생 최소 거래 건수"
              />
              <ThresholdItem
                label="급증 경보"
                value="평균 대비 5배"
                description="거래량 급증 탐지 배수"
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
                <InfoBox label="유형" value={getCaseTypeLabel(selectedCase.type)} />
                <InfoBox label="금액" value={formatCurrency(selectedCase.amount)} />
                <InfoBox label="대상 ID" value={selectedCase.subjectId} />
                <InfoBox label="상태" value={selectedCase.status.replace('_', ' ')} />
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase mb-2">위험 플래그</p>
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
                <InfoBox label="생성일" value={selectedCase.createdAt.toLocaleString()} />
                <InfoBox label="최종 수정" value={selectedCase.updatedAt.toLocaleString()} />
              </div>

              {selectedCase.assignedTo && (
                <InfoBox label="담당자" value={selectedCase.assignedTo} />
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'under_investigation')}
                  className="flex-1 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                  조사
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'escalated')}
                  className="flex-1 py-2.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-sm font-medium"
                >
                  상신
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'reported')}
                  className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                  신고
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCase.id, 'cleared')}
                  className="flex-1 py-2.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
                >
                  해제
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
