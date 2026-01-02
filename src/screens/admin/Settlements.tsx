import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input } from '../../components/common';
import { useSettlements, useSettlementStats, useApproveSettlement, useRejectSettlement } from '../../services/api';
import type { Settlement } from '../../services/api';

const Settlements: React.FC = () => {
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter] = useState<string | undefined>(undefined);

  // API hooks
  const { data: settlementsData, isLoading } = useSettlements({
    status: statusFilter as 'pending' | 'processing' | 'completed' | 'failed' | undefined,
  });
  const { data: stats } = useSettlementStats();
  const approveMutation = useApproveSettlement();
  const rejectMutation = useRejectSettlement();

  const settlements = settlementsData?.settlements ?? [];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // Stats from API
  const totalSettled = (stats?.completedTodayAmount ?? 0);
  const pendingAmount = (stats?.totalPendingAmount ?? 0);
  const errorCount = (stats?.failedCount ?? 0);

  // Filter settlements by search query
  const filteredSettlements = settlements.filter((s) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (s.merchantName?.toLowerCase().includes(query) ?? false) ||
        s.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: Settlement['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: Settlement['status']) => {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'processing': return 'pending';
      case 'pending': return 'schedule';
      case 'failed': return 'error';
      default: return 'help';
    }
  };

  const handleApprove = async (settlementId: string) => {
    try {
      await approveMutation.mutateAsync({ settlementId });
    } catch (error) {
      console.error('Failed to approve settlement:', error);
    }
  };

  const handleReject = async (settlementId: string) => {
    try {
      await rejectMutation.mutateAsync({ settlementId, reason: 'Manual rejection by admin' });
    } catch (error) {
      console.error('Failed to reject settlement:', error);
    }
  };

  return (
    <div className="flex flex-col pb-4">
      <Header title="정산 관리" />

      {/* Period Filter */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 bg-surface rounded-xl">
          {[
            { key: 'daily', label: '일별' },
            { key: 'weekly', label: '주별' },
            { key: 'monthly', label: '월별' }
          ].map((period) => (
            <button
              key={period.key}
              onClick={() => setPeriodFilter(period.key as 'daily' | 'weekly' | 'monthly')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                periodFilter === period.key ? 'bg-primary text-background' : 'text-text-secondary hover:text-white'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <Card variant="balance" padding="lg">
          <div className="text-center mb-4">
            <p className="text-sm text-text-secondary mb-1">오늘 정산액</p>
            <h2 className="text-3xl font-bold text-white">₩{formatAmount(totalSettled)}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-surface-highlight rounded-xl">
              <p className="text-xs text-text-secondary mb-1">대기 중</p>
              <p className="text-lg font-bold text-yellow-500">₩{formatAmount(pendingAmount)}</p>
            </div>
            <div className="text-center p-3 bg-surface-highlight rounded-xl">
              <p className="text-xs text-text-secondary mb-1">오류 건수</p>
              <p className="text-lg font-bold text-red-500">
                {errorCount}건
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Discrepancy Alert */}
      {errorCount > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-500">불일치 감지</p>
              <p className="text-xs text-text-secondary">
                {errorCount}개 배치에 수동 검증이 필요합니다
              </p>
            </div>
            <Button variant="danger" size="sm">검토</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mb-4">
        <Input
          icon="search"
          placeholder="가맹점 ID 또는 배치번호로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Settlement List */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-white mb-3">최근 정산</h3>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSettlements.length === 0 ? (
            <Card padding="lg" className="text-center">
              <span className="material-symbols-outlined text-4xl text-text-muted mb-2">receipt_long</span>
              <p className="text-sm text-text-secondary">정산 내역이 없습니다</p>
            </Card>
          ) : filteredSettlements.map((settlement) => (
            <Card key={settlement.id} variant="transaction" padding="md">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  settlement.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                  settlement.status === 'processing' || settlement.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-primary/10 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {getStatusIcon(settlement.status)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{settlement.merchantName || 'Unknown Merchant'}</p>
                  <p className="text-xs text-text-secondary font-mono">STL-{settlement.id.substring(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₩{formatAmount(settlement.netAmount)}</p>
                  <Badge variant={getStatusColor(settlement.status)} size="sm">
                    {settlement.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-highlight">
                <span className="text-xs text-text-muted">
                  {settlement.periodStart && new Date(settlement.periodStart).toLocaleDateString('ko-KR')} ~ {settlement.periodEnd && new Date(settlement.periodEnd).toLocaleDateString('ko-KR')}
                </span>
                {settlement.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(settlement.id)}
                      disabled={approveMutation.isPending}
                    >
                      <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                      승인
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReject(settlement.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <span className="material-symbols-outlined text-[16px] mr-1">close</span>
                      거절
                    </Button>
                  </div>
                )}
                {settlement.status === 'failed' && (
                  <Button variant="danger" size="sm">
                    <span className="material-symbols-outlined text-[16px] mr-1">build</span>
                    재시도
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Download Report */}
      <div className="px-4 mt-6">
        <Button variant="secondary" fullWidth>
          <span className="material-symbols-outlined mr-2">download</span>
          일일 리포트 다운로드
        </Button>
      </div>
    </div>
  );
};

export default Settlements;
