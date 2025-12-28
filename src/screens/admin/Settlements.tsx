import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input } from '../../components/common';
import { SettlementBatch } from '../../types';

const mockBatches: SettlementBatch[] = [
  {
    id: '1',
    batchNumber: 'STL-2024-0315-001',
    merchantId: 'm1',
    merchantName: 'Jeonju Bibimbap',
    amount: 1250000,
    transactionCount: 45,
    status: 'verified',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    batchNumber: 'STL-2024-0315-002',
    merchantId: 'm2',
    merchantName: 'Jeonju Coffee',
    amount: 820000,
    transactionCount: 128,
    status: 'processing',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    batchNumber: 'STL-2024-0315-003',
    merchantId: 'm3',
    merchantName: 'Jeonju Hanok Mart',
    amount: 3450000,
    transactionCount: 234,
    status: 'verified',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    batchNumber: 'STL-2024-0314-015',
    merchantId: 'm4',
    merchantName: 'Beach Side Hotel',
    amount: 5200000,
    transactionCount: 67,
    status: 'error',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '5',
    batchNumber: 'STL-2024-0314-014',
    merchantId: 'm5',
    merchantName: 'Gwangan Bakery',
    amount: 680000,
    transactionCount: 89,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const Settlements: React.FC = () => {
  const [batches] = useState<SettlementBatch[]>(mockBatches);
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const totalSettled = batches
    .filter((b) => b.status === 'completed' || b.status === 'verified')
    .reduce((sum, b) => sum + b.amount, 0);

  const pendingAmount = batches
    .filter((b) => b.status === 'processing')
    .reduce((sum, b) => sum + b.amount, 0);

  const errorCount = batches.filter((b) => b.status === 'error').length;

  const filteredBatches = batches.filter((b) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        b.merchantName.toLowerCase().includes(query) ||
        b.batchNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: SettlementBatch['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'verified': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: SettlementBatch['status']) => {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'verified': return 'verified';
      case 'processing': return 'pending';
      case 'error': return 'error';
      default: return 'help';
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
            <p className="text-sm text-text-secondary mb-1">총 정산액</p>
            <h2 className="text-3xl font-bold text-white">₩{formatAmount(totalSettled)}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-surface-highlight rounded-xl">
              <p className="text-xs text-text-secondary mb-1">대기 중</p>
              <p className="text-lg font-bold text-yellow-500">₩{formatAmount(pendingAmount)}</p>
            </div>
            <div className="text-center p-3 bg-surface-highlight rounded-xl">
              <p className="text-xs text-text-secondary mb-1">오류율</p>
              <p className="text-lg font-bold text-red-500">
                {((errorCount / batches.length) * 100).toFixed(1)}%
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

      {/* Batch List */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-white mb-3">최근 배치</h3>
        <div className="space-y-3">
          {filteredBatches.map((batch) => (
            <Card key={batch.id} variant="transaction" padding="md">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  batch.status === 'error' ? 'bg-red-500/10 text-red-500' :
                  batch.status === 'processing' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-primary/10 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {getStatusIcon(batch.status)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{batch.merchantName}</p>
                  <p className="text-xs text-text-secondary font-mono">{batch.batchNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₩{formatAmount(batch.amount)}</p>
                  <Badge variant={getStatusColor(batch.status)} size="sm">
                    {batch.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-highlight">
                <span className="text-xs text-text-muted">
                  {batch.transactionCount}건 거래 • {new Date(batch.createdAt).toLocaleDateString('ko-KR')}
                </span>
                {batch.status === 'processing' && (
                  <Button variant="primary" size="sm">
                    <span className="material-symbols-outlined text-[16px] mr-1">verified</span>
                    검증
                  </Button>
                )}
                {batch.status === 'error' && (
                  <Button variant="danger" size="sm">
                    <span className="material-symbols-outlined text-[16px] mr-1">build</span>
                    수정
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
