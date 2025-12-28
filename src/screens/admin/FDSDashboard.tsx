import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  getAlerts,
  getAlertStats,
  getHighRiskEntities,
  getSeverityColor,
  getAlertTypeLabel,
  updateAlertStatus,
  type FDSAlert,
} from '../../services/fds/detector';

const FDSDashboard: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<FDSAlert['status'] | 'all'>('all');
  const [selectedAlert, setSelectedAlert] = useState<FDSAlert | null>(null);

  const stats = getAlertStats();
  const alerts = getAlerts(
    selectedStatus === 'all' ? undefined : { status: selectedStatus }
  );
  const highRiskEntities = getHighRiskEntities(70);

  const severityData = [
    { name: '심각', value: stats.bySeverity.critical, color: '#ef4444' },
    { name: '높음', value: stats.bySeverity.high, color: '#f97316' },
    { name: '중간', value: stats.bySeverity.medium, color: '#eab308' },
    { name: '낮음', value: stats.bySeverity.low, color: '#22c55e' },
  ];

  const typeData = Object.entries(stats.byType).map(([type, count]) => ({
    name: getAlertTypeLabel(type as keyof typeof stats.byType),
    value: count,
  }));

  const handleStatusUpdate = (alertId: string, newStatus: FDSAlert['status']) => {
    updateAlertStatus(alertId, newStatus);
    setSelectedAlert(null);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">이상거래 탐지 시스템</h1>
          <p className="text-gray-400 text-sm mt-1">
            지역화폐 거래의 실시간 모니터링 및 이상 탐지
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            설정
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
            <span className="material-symbols-outlined text-[18px]">notification_important</span>
            {stats.byStatus.new}건 신규 경고
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 경고"
          value={stats.total}
          icon="warning"
          color="#ef4444"
          subtitle="활성 모니터링"
        />
        <StatCard
          title="심각"
          value={stats.bySeverity.critical}
          icon="error"
          color="#ef4444"
          subtitle="즉시 조치 필요"
        />
        <StatCard
          title="조사 중"
          value={stats.byStatus.investigating}
          icon="search"
          color="#f97316"
          subtitle="검토 중"
        />
        <StatCard
          title="고위험 대상"
          value={highRiskEntities.length}
          icon="shield_person"
          color="#eab308"
          subtitle="점수 70 이상"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">경고 심각도</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {severityData.map((item) => (
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

        {/* Alert Types */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">경고 유형별 분포</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" fill="#2b8cee" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert List */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-white font-semibold">경고 대기열</h3>
            <div className="flex items-center gap-2">
              {(['all', 'new', 'investigating', 'confirmed', 'dismissed'] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {status === 'all' ? '전체' : status === 'new' ? '신규' : status === 'investigating' ? '조사 중' : status === 'confirmed' ? '확인됨' : '기각됨'}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer ${
                  selectedAlert?.id === alert.id ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${getSeverityColor(alert.severity)}20` }}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ color: getSeverityColor(alert.severity) }}
                    >
                      {alert.severity === 'critical' ? 'error' : 'warning'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor: `${getSeverityColor(alert.severity)}20`,
                            color: getSeverityColor(alert.severity),
                          }}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-white font-medium text-sm">{alert.title}</span>
                      </div>
                      <span className="text-gray-500 text-xs shrink-0">
                        {formatTimeAgo(alert.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1 truncate">{alert.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">
                        <span className="text-gray-400">{alert.subjectType}:</span>{' '}
                        {alert.subjectId}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-[10px]">
                        {getAlertTypeLabel(alert.type)}
                      </span>
                      {alert.status !== 'new' && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            alert.status === 'investigating'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : alert.status === 'confirmed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {alert.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk Entities */}
        <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold">고위험 대상</h3>
            <p className="text-gray-500 text-xs mt-1">위험 점수 70 이상</p>
          </div>
          <div className="divide-y divide-white/5">
            {highRiskEntities.map((entity) => (
              <div key={entity.entityId} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">
                      {entity.entityType === 'merchant' ? 'store' : 'person'}
                    </span>
                    <span className="text-white font-medium text-sm">{entity.entityId}</span>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      entity.score >= 80
                        ? 'text-red-500'
                        : entity.score >= 70
                        ? 'text-orange-500'
                        : 'text-yellow-500'
                    }`}
                  >
                    {entity.score}
                  </span>
                </div>
                <div className="space-y-1">
                  {entity.factors.slice(0, 3).map((factor) => (
                    <div key={factor.name} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${factor.value}%`,
                            backgroundColor:
                              factor.value >= 80
                                ? '#ef4444'
                                : factor.value >= 60
                                ? '#f97316'
                                : '#22c55e',
                          }}
                        />
                      </div>
                      <span className="text-gray-500 text-[10px] w-20 truncate">
                        {factor.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="px-2 py-1 rounded text-xs font-bold uppercase"
                  style={{
                    backgroundColor: `${getSeverityColor(selectedAlert.severity)}20`,
                    color: getSeverityColor(selectedAlert.severity),
                  }}
                >
                  {selectedAlert.severity}
                </span>
                <span className="text-white font-semibold">{selectedAlert.id}</span>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-white text-lg font-semibold">{selectedAlert.title}</h3>
                <p className="text-gray-400 mt-1">{selectedAlert.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase mb-1">대상</p>
                  <p className="text-white">
                    {selectedAlert.subjectType}: {selectedAlert.subjectId}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase mb-1">유형</p>
                  <p className="text-white">{getAlertTypeLabel(selectedAlert.type)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase mb-1">생성일</p>
                  <p className="text-white">{selectedAlert.createdAt.toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase mb-1">상태</p>
                  <p className="text-white capitalize">{selectedAlert.status}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase mb-2">상세 정보</p>
                <div className="bg-white/5 rounded-lg p-4 font-mono text-sm">
                  <pre className="text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(selectedAlert.details, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleStatusUpdate(selectedAlert.id, 'investigating')}
                  className="flex-1 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                >
                  조사
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedAlert.id, 'confirmed')}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  사기 확정
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedAlert.id, 'dismissed')}
                  className="flex-1 py-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                >
                  기각
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <div className="bg-gray-900/50 border border-white/5 rounded-xl p-5">
    <div className="flex items-start justify-between mb-3">
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
    <p className="text-white text-2xl font-bold mb-1">{value}</p>
    <p className="text-gray-500 text-xs">{subtitle}</p>
  </div>
);

export default FDSDashboard;
