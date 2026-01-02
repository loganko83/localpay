import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input } from '../../components/common';
import { useAuditLogs, useAdminDashboard } from '../../services/api';
import { AuditLogEntry, AuditActionType } from '../../types';
import { theme } from '../../styles/theme';

const actionTypeLabels: Record<AuditActionType, string> = {
  USER_REGISTERED: '사용자 등록',
  USER_KYC_VERIFIED: 'KYC 검증',
  BANK_ACCOUNT_LINKED: '은행 계좌 연결',
  PREPAID_CARD_ISSUED: '선불카드 발급',
  BALANCE_CHARGED: '잔액 충전',
  PAYMENT_REQUESTED: '결제 요청',
  PAYMENT_COMPLETED: '결제 완료',
  REFUND_REQUESTED: '환불 요청',
  REFUND_COMPLETED: '환불 완료',
  MERCHANT_REGISTERED: '가맹점 등록',
  MERCHANT_VERIFIED: '가맹점 검증',
  MERCHANT_SUSPENDED: '가맹점 정지',
  POLICY_CREATED: '정책 생성',
  POLICY_UPDATED: '정책 업데이트',
  VOUCHER_ISSUED: '바우처 발행',
  VOUCHER_REDEEMED: '바우처 사용',
  SETTLEMENT_INITIATED: '정산 시작',
  SETTLEMENT_COMPLETED: '정산 완료',
  ADMIN_LOGIN: '관리자 로그인',
  ADMIN_ACTION: '관리자 작업',
  SECURITY_ALERT: '보안 경고',
};

const getActionIcon = (action: AuditActionType): string => {
  const iconMap: Record<string, string> = {
    USER_REGISTERED: 'person_add',
    USER_KYC_VERIFIED: 'verified_user',
    BANK_ACCOUNT_LINKED: 'account_balance',
    PREPAID_CARD_ISSUED: 'credit_card',
    BALANCE_CHARGED: 'add_card',
    PAYMENT_REQUESTED: 'pending',
    PAYMENT_COMPLETED: 'check_circle',
    REFUND_REQUESTED: 'undo',
    REFUND_COMPLETED: 'replay',
    MERCHANT_REGISTERED: 'storefront',
    MERCHANT_VERIFIED: 'verified',
    MERCHANT_SUSPENDED: 'block',
    POLICY_CREATED: 'add_circle',
    POLICY_UPDATED: 'edit',
    VOUCHER_ISSUED: 'confirmation_number',
    VOUCHER_REDEEMED: 'redeem',
    SETTLEMENT_INITIATED: 'schedule',
    SETTLEMENT_COMPLETED: 'task_alt',
    ADMIN_LOGIN: 'login',
    ADMIN_ACTION: 'admin_panel_settings',
    SECURITY_ALERT: 'warning',
  };
  return iconMap[action] || 'info';
};

const getActionColor = (action: AuditActionType) => {
  if (action === 'SECURITY_ALERT') return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
  if (action.includes('COMPLETED') || action.includes('VERIFIED')) return { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' };
  if (action.includes('SUSPENDED') || action.includes('REFUND')) return { background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' };
  return { background: `${theme.admin}15`, color: theme.admin };
};

const AuditLogs: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const { data: auditData } = useAuditLogs({
    page: 1,
    size: 50,
    action: filterAction === 'all' ? undefined : filterAction,
  });
  const { data: dashboardData } = useAdminDashboard();

  const logs = auditData?.logs ?? [];

  // Stats from dashboard
  const totalLogs = dashboardData?.audit?.total ?? logs.length;
  const todayLogs = dashboardData?.audit?.today ?? 0;
  const verifiedPercentage = dashboardData?.audit?.verifiedPercentage ?? 0;
  const securityAlerts = logs.filter(l => l.action === 'SECURITY_ALERT').length;

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.description.toLowerCase().includes(query) ||
        log.actorId.toLowerCase().includes(query) ||
        log.targetId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  const truncateHash = (hash?: string) => {
    if (!hash) return '-';
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  };

  return (
    <div className="flex flex-col pb-4" style={{ background: theme.bg }}>
      <Header title="감사 로그 및 블록체인 추적" />

      {/* Stats Overview */}
      <div className="px-4 mb-4">
        <Card variant="balance" padding="lg">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-text-secondary mb-1">총 로그</p>
              <p className="text-xl font-bold text-white">{totalLogs.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">오늘</p>
              <p className="text-xl font-bold text-primary">{todayLogs}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">검증됨</p>
              <p className="text-xl font-bold text-green-500">{verifiedPercentage}%</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">경고</p>
              <p className="text-xl font-bold text-red-500">{securityAlerts}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Blockchain Status */}
      <div className="px-4 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-500">token</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-500">블록체인 연결됨</p>
            <p className="text-xs text-text-secondary">
              Xphere 네트워크 | 블록 #12,345,678 | 모든 로그 앵커링 완료
            </p>
          </div>
          <Badge variant="success" size="sm">실시간</Badge>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-4 mb-4 space-y-3">
        <Input
          icon="search"
          placeholder="설명, 행위자, 대상으로 로그 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'PAYMENT_COMPLETED', 'POLICY_UPDATED', 'MERCHANT_VERIFIED', 'SECURITY_ALERT', 'BALANCE_CHARGED'].map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterAction === action
                ? 'bg-primary text-background'
                : 'bg-surface-highlight text-text-secondary hover:text-white'
                }`}
            >
              {action === 'all' ? '전체' : actionTypeLabels[action as AuditActionType]}
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">감사 추적</h3>
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-[16px] mr-1">download</span>
            내보내기
          </Button>
        </div>

        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card
              key={log.id}
              variant="transaction"
              padding="md"
              onClick={() => setSelectedLog(log)}
              className="cursor-pointer hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={getActionColor(log.action)}>
                  <span className="material-symbols-outlined text-[20px]">
                    {getActionIcon(log.action)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-white">
                      {actionTypeLabels[log.action]}
                    </p>
                    {log.verified ? (
                      <span className="material-symbols-outlined text-green-500 text-[14px]">verified</span>
                    ) : (
                      <span className="material-symbols-outlined text-yellow-500 text-[14px]">pending</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">{log.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span>{formatTime(log.timestamp)}</span>
                    <span className="font-mono">{truncateHash(log.blockchainHash)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Detail Modal (simplified) */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-surface w-full max-w-md rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">감사 로그 상세</h3>
              <button onClick={() => setSelectedLog(null)} className="text-text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-muted mb-1">작업</p>
                <p className="text-sm font-bold text-white">{actionTypeLabels[selectedLog.action]}</p>
              </div>

              <div>
                <p className="text-xs text-text-muted mb-1">설명</p>
                <p className="text-sm text-white">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">행위자 ID</p>
                  <p className="text-sm text-white font-mono">{selectedLog.actorId}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">대상 ID</p>
                  <p className="text-sm text-white font-mono">{selectedLog.targetId}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-text-muted mb-1">행위자 DID</p>
                <p className="text-sm text-white font-mono break-all">{selectedLog.actorDid || '-'}</p>
              </div>

              <div className="border-t border-surface-highlight pt-4">
                <p className="text-xs text-text-muted mb-2">블록체인 앵커링</p>
                <div className="bg-surface-highlight rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">해시</span>
                    <span className="text-xs text-white font-mono">{selectedLog.blockchainHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">블록</span>
                    <span className="text-xs text-white">#{selectedLog.blockNumber?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">검증됨</span>
                    <span className={`text-xs ${selectedLog.verified ? 'text-green-500' : 'text-yellow-500'}`}>
                      {selectedLog.verified ? '완료' : '대기 중'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLog.signature && (
                <div>
                  <p className="text-xs text-text-muted mb-1">디지털 서명</p>
                  <p className="text-xs text-white font-mono break-all bg-surface-highlight rounded p-2">
                    {selectedLog.signature}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" fullWidth onClick={() => setSelectedLog(null)}>
                  닫기
                </Button>
                <Button variant="primary" fullWidth>
                  <span className="material-symbols-outlined text-[16px] mr-1">verified</span>
                  체인에서 검증
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh FAB */}
      <button className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-background text-2xl">sync</span>
      </button>
    </div>
  );
};

export default AuditLogs;
