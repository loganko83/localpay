import React, { useState, useEffect } from 'react';
import { amlComplianceService, AMLAlert, RiskLevel, AlertType } from '../../services/amlCompliance';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
};

// Get severity color
const getSeverityColor = (severity: RiskLevel): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    case 'HIGH':
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'MEDIUM':
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'LOW':
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    default:
      return 'bg-surface-highlight text-text-secondary';
  }
};

// Get alert type icon
const getAlertTypeIcon = (type: AlertType): string => {
  const iconMap: Record<AlertType, string> = {
    THRESHOLD_BREACH: 'warning',
    STRUCTURING: 'account_tree',
    VELOCITY_ANOMALY: 'speed',
    PATTERN_MATCH: 'pattern',
    SANCTIONS_HIT: 'gavel',
    UNUSUAL_BEHAVIOR: 'psychology',
    HIGH_RISK_COUNTERPARTY: 'person_alert',
    CROSS_BORDER: 'public',
  };
  return iconMap[type] || 'notifications';
};

// Get alert type label
const getAlertTypeLabel = (type: AlertType): string => {
  const labelMap: Record<AlertType, string> = {
    THRESHOLD_BREACH: '임계값 초과',
    STRUCTURING: '구조화 거래',
    VELOCITY_ANOMALY: '속도 이상',
    PATTERN_MATCH: '패턴 일치',
    SANCTIONS_HIT: '제재 대상',
    UNUSUAL_BEHAVIOR: '비정상 행동',
    HIGH_RISK_COUNTERPARTY: '고위험 거래상대',
    CROSS_BORDER: '국경간 거래',
  };
  return labelMap[type] || type;
};

const AMLDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'customers' | 'strs' | 'config'>('alerts');
  const [stats, setStats] = useState<ReturnType<typeof amlComplianceService.getComplianceStats> | null>(null);
  const [alerts, setAlerts] = useState<AMLAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AMLAlert | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'type'>('date');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const complianceStats = amlComplianceService.getComplianceStats();
    const openAlerts = amlComplianceService.getOpenAlerts();

    setStats(complianceStats);
    setAlerts(openAlerts);
  };

  // Sort alerts
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (sortBy === 'date') {
      return b.createdAt - a.createdAt;
    } else if (sortBy === 'severity') {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    } else {
      return a.alertType.localeCompare(b.alertType);
    }
  });

  // Open alert detail
  const handleAlertClick = (alert: AMLAlert) => {
    setSelectedAlert(alert);
    setShowAlertModal(true);
    setResolutionNotes('');
  };

  // Resolve alert
  const handleResolveAlert = async (decision: 'FALSE_POSITIVE' | 'SUSPICIOUS' | 'CLEARED' | 'REPORTED_TO_FIU') => {
    if (!selectedAlert || !resolutionNotes.trim()) {
      alert('해결 내용을 입력해주세요');
      return;
    }

    setIsResolving(true);
    try {
      await amlComplianceService.resolveAlert({
        alertId: selectedAlert.id,
        decision,
        notes: resolutionNotes,
        resolvedBy: 'admin-user',
      });

      loadData();
      setShowAlertModal(false);
      setSelectedAlert(null);
      setResolutionNotes('');
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setIsResolving(false);
    }
  };

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-blue-500">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-surface-highlight z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">자금세탁방지</h1>
              <p className="text-sm text-text-secondary">자금세탁방지 모니터링</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500 text-[32px]">
                shield
              </span>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card variant="stat" padding="sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500 text-[20px]">
                    monitoring
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-secondary">모니터링</div>
                  <div className="text-lg font-bold text-white truncate">
                    {stats.totalTransactionsMonitored.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="stat" padding="sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-500 text-[20px]">
                    notifications_active
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-secondary">미처리 알림</div>
                  <div className="text-lg font-bold text-white truncate">
                    {(stats.alertsByStatus['OPEN'] || 0) + (stats.alertsByStatus['UNDER_REVIEW'] || 0)}
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="stat" padding="sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-500 text-[20px]">
                    report
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-secondary">STR 제출</div>
                  <div className="text-lg font-bold text-white truncate">
                    {stats.strSubmitted}
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="stat" padding="sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-[20px]">
                    person_alert
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-secondary">고위험</div>
                  <div className="text-lg font-bold text-white truncate">
                    {stats.highRiskCustomers}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {[
              { key: 'alerts', label: '알림', icon: 'notifications' },
              { key: 'customers', label: '위험 프로필', icon: 'person' },
              { key: 'strs', label: 'STR', icon: 'report' },
              { key: 'config', label: '설정', icon: 'settings' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all
                  ${activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-surface text-text-secondary hover:bg-surface-highlight'
                  }
                `}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <>
            {/* Alert Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card variant="stat" padding="sm">
                <div className="text-xs text-text-secondary mb-1">심각도별</div>
                <div className="space-y-1">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as RiskLevel[]).map((level) => {
                    const count = alerts.filter((a) => a.severity === level).length;
                    return (
                      <div key={level} className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">{level}</span>
                        <span className={`text-sm font-bold ${level === 'CRITICAL' ? 'text-red-500' : 'text-white'}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card variant="stat" padding="sm">
                <div className="text-xs text-text-secondary mb-1">상태별</div>
                <div className="space-y-1">
                  {Object.entries(stats.alertsByStatus).slice(0, 4).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{status}</span>
                      <span className="text-sm font-bold text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card variant="stat" padding="sm" className="col-span-2">
                <div className="text-xs text-text-secondary mb-2">알림 유형</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.alertsByType).slice(0, 6).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500 text-[16px]">
                        {getAlertTypeIcon(type as AlertType)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text-secondary truncate">{getAlertTypeLabel(type as AlertType)}</div>
                        <div className="text-sm font-bold text-white">{count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">미처리 알림</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-surface text-white text-sm rounded-lg px-3 py-1.5 border border-surface-highlight outline-none"
                >
                  <option value="date">날짜</option>
                  <option value="severity">심각도</option>
                  <option value="type">유형</option>
                </select>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {sortedAlerts.length === 0 ? (
                <Card padding="lg">
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-6xl text-text-secondary mb-2 block">
                      check_circle
                    </span>
                    <div className="text-text-secondary">미처리 알림 없음</div>
                  </div>
                </Card>
              ) : (
                sortedAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    variant="transaction"
                    padding="md"
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getSeverityColor(alert.severity)} border`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {getAlertTypeIcon(alert.alertType)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={alert.severity === 'CRITICAL' ? 'danger' : alert.severity === 'HIGH' ? 'warning' : 'info'} size="sm">
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-text-secondary">
                            {getAlertTypeLabel(alert.alertType)}
                          </span>
                        </div>

                        <div className="text-sm font-medium text-white mb-1">
                          {alert.description}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-text-secondary">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              person
                            </span>
                            {alert.subjectId.substring(0, 12)}...
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              receipt_long
                            </span>
                            {alert.relatedTransactions.length}건 거래
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              schedule
                            </span>
                            {formatDate(alert.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${alert.severity === 'CRITICAL' ? 'text-red-500' : 'text-white'}`}>
                          {alert.riskScore}
                        </div>
                        <span className="material-symbols-outlined text-text-secondary text-[20px]">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {/* Customer Risk Profiles Tab */}
        {activeTab === 'customers' && (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-6xl text-text-secondary mb-2 block">
                person_search
              </span>
              <div className="text-text-secondary mb-4">고객 위험 프로필</div>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                KYC 상태, 위험 점수, 알림 이력을 포함한 고객 위험 프로필을 조회하고 관리합니다.
              </p>
            </div>
          </Card>
        )}

        {/* STRs Tab */}
        {activeTab === 'strs' && (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-6xl text-text-secondary mb-2 block">
                report
              </span>
              <div className="text-text-secondary mb-4">의심거래보고서</div>
              <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                금융정보분석원(KoFIU)에 제출할 STR 초안 및 제출 내역을 관리합니다.
              </p>
              <Button variant="primary">
                <span className="material-symbols-outlined text-[20px]">add</span>
                새 STR 생성
              </Button>
            </div>
          </Card>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">AML 임계값 설정</h2>

            <Card padding="md">
              <h3 className="text-sm font-bold text-white mb-3">거래 임계값</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-surface-highlight">
                  <div>
                    <div className="text-sm text-white">CTR 임계값</div>
                    <div className="text-xs text-text-secondary">고액현금거래보고</div>
                  </div>
                  <div className="text-sm font-bold text-blue-500">
                    {formatCurrency(amlComplianceService.getThresholds().ctrThreshold)}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-surface-highlight">
                  <div>
                    <div className="text-sm text-white">트래블룰 임계값</div>
                    <div className="text-xs text-text-secondary">가상자산 이체</div>
                  </div>
                  <div className="text-sm font-bold text-blue-500">
                    {formatCurrency(amlComplianceService.getThresholds().travelRuleThreshold)}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-surface-highlight">
                  <div>
                    <div className="text-sm text-white">고액 거래 임계값</div>
                    <div className="text-xs text-text-secondary">강화된 실사 필요</div>
                  </div>
                  <div className="text-sm font-bold text-blue-500">
                    {formatCurrency(amlComplianceService.getThresholds().highValueThreshold)}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm text-white">일일 현금 한도</div>
                    <div className="text-xs text-text-secondary">일일 최대 현금 거래</div>
                  </div>
                  <div className="text-sm font-bold text-blue-500">
                    {formatCurrency(amlComplianceService.getThresholds().dailyLimitCash)}
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <h3 className="text-sm font-bold text-white mb-3">속도 제한</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-surface-highlight">
                  <div>
                    <div className="text-sm text-white">시간당 최대 거래</div>
                    <div className="text-xs text-text-secondary">고객당</div>
                  </div>
                  <div className="text-sm font-bold text-blue-500">
                    {amlComplianceService.getThresholds().maxHourlyTransactions}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm text-white">일일 최대 거래</div>
                    <div className="text-xs text-text-secondary">고객당</div>
                  </div>
                  <div className="text-sm font-bold text-blue-500">
                    {amlComplianceService.getThresholds().maxDailyTransactions}
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <h3 className="text-sm font-bold text-white mb-3">위험 점수 임계값</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-surface-highlight">
                  <div>
                    <div className="text-sm text-white">고위험 점수</div>
                    <div className="text-xs text-text-secondary">강화 모니터링 발동</div>
                  </div>
                  <div className="text-sm font-bold text-orange-500">
                    {amlComplianceService.getThresholds().highRiskScore}+
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm text-white">중위험 점수</div>
                    <div className="text-xs text-text-secondary">검토 필요</div>
                  </div>
                  <div className="text-sm font-bold text-yellow-500">
                    {amlComplianceService.getThresholds().mediumRiskScore}+
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <Modal
          isOpen={showAlertModal}
          onClose={() => {
            setShowAlertModal(false);
            setSelectedAlert(null);
            setResolutionNotes('');
          }}
          title="알림 상세"
        >
          <div className="space-y-4">
            {/* Alert Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-surface-highlight">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getSeverityColor(selectedAlert.severity)} border`}>
                <span className="material-symbols-outlined text-[24px]">
                  {getAlertTypeIcon(selectedAlert.alertType)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={selectedAlert.severity === 'CRITICAL' ? 'danger' : selectedAlert.severity === 'HIGH' ? 'warning' : 'info'} size="md">
                    {selectedAlert.severity}
                  </Badge>
                  <span className="text-xs text-text-secondary">
                    위험 점수: {selectedAlert.riskScore}
                  </span>
                </div>
                <div className="text-sm font-medium text-white">
                  {getAlertTypeLabel(selectedAlert.alertType)}
                </div>
              </div>
            </div>

            {/* Alert Info */}
            <div className="space-y-3">
              <div>
                <div className="text-xs text-text-secondary mb-1">설명</div>
                <div className="text-sm text-white">{selectedAlert.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-text-secondary mb-1">대상 ID</div>
                  <div className="text-sm text-white font-mono break-all">{selectedAlert.subjectId}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1">대상 유형</div>
                  <div className="text-sm text-white">{selectedAlert.subjectType}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-text-secondary mb-1">생성일시</div>
                <div className="text-sm text-white">{formatDate(selectedAlert.createdAt)}</div>
              </div>

              <div>
                <div className="text-xs text-text-secondary mb-1">관련 거래</div>
                <div className="text-sm text-white">{selectedAlert.relatedTransactions.length}건 거래</div>
              </div>

              <div>
                <div className="text-xs text-text-secondary mb-1">상태</div>
                <Badge variant={selectedAlert.status === 'OPEN' ? 'warning' : 'info'} size="md">
                  {selectedAlert.status}
                </Badge>
              </div>
            </div>

            {/* Resolution Section */}
            {selectedAlert.status === 'OPEN' || selectedAlert.status === 'UNDER_REVIEW' ? (
              <div className="space-y-3 pt-4 border-t border-surface-highlight">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">
                    해결 내용
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="조사 내용 및 해결 상세 정보를 입력하세요..."
                    className="w-full h-24 bg-surface border border-surface-highlight rounded-xl px-3 py-2 text-sm text-white placeholder-text-secondary resize-none outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolveAlert('FALSE_POSITIVE')}
                    disabled={isResolving || !resolutionNotes.trim()}
                  >
                    오탐
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolveAlert('CLEARED')}
                    disabled={isResolving || !resolutionNotes.trim()}
                  >
                    해제
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleResolveAlert('SUSPICIOUS')}
                    disabled={isResolving || !resolutionNotes.trim()}
                  >
                    의심 표시
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleResolveAlert('REPORTED_TO_FIU')}
                    disabled={isResolving || !resolutionNotes.trim()}
                  >
                    FIU 보고
                  </Button>
                </div>
              </div>
            ) : selectedAlert.resolution ? (
              <div className="space-y-2 pt-4 border-t border-surface-highlight">
                <div className="text-xs text-text-secondary">해결 정보</div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="success" size="md">
                    {selectedAlert.resolution.decision}
                  </Badge>
                  <span className="text-xs text-text-secondary">
                    담당자: {selectedAlert.resolution.resolvedBy}
                  </span>
                </div>
                <div className="text-sm text-white bg-surface rounded-lg p-3">
                  {selectedAlert.resolution.notes}
                </div>
                <div className="text-xs text-text-secondary">
                  해결일시: {formatDate(selectedAlert.resolution.resolvedAt)}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AMLDashboard;
