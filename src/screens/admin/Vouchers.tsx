import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Button, Input, Modal } from '../../components/common';
import { Voucher } from '../../types';
import { theme } from '../../styles/theme';

const mockVouchers: Voucher[] = [
  {
    id: '1',
    name: 'Welcome Bonus',
    code: 'WELCOME2024',
    amount: 10000,
    type: 'welcome',
    usageLimit: 10000,
    usageCount: 3421,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Summer Festival',
    code: 'SUMMER50',
    amount: 50000,
    type: 'promo',
    usageLimit: 1000,
    usageCount: 892,
    validFrom: '2024-06-01',
    validUntil: '2024-08-31',
    status: 'active',
    createdAt: '2024-05-15',
  },
  {
    id: '3',
    name: 'Partner Reward',
    code: 'PARTNER10',
    amount: 10000,
    type: 'partner',
    usageLimit: 500,
    usageCount: 500,
    validFrom: '2024-03-01',
    validUntil: '2024-06-30',
    status: 'expired',
    createdAt: '2024-02-20',
  },
];

const Vouchers: React.FC = () => {
  const [vouchers] = useState<Voucher[]>(mockVouchers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const filteredVouchers = vouchers.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    return true;
  });

  const totalIssued = vouchers.reduce((sum, v) => sum + v.amount * v.usageCount, 0);
  const totalActive = vouchers.filter((v) => v.status === 'active').length;

  const getTypeIcon = (type: Voucher['type']) => {
    switch (type) {
      case 'welcome': return 'waving_hand';
      case 'promo': return 'campaign';
      case 'subsidy': return 'account_balance';
      case 'partner': return 'handshake';
      default: return 'confirmation_number';
    }
  };

  const getStatusColor = (status: Voucher['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="flex flex-col pb-24" style={{ background: theme.bg }}>
      <Header title="바우처 관리" />

      {/* Stats */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">총 발행 금액</p>
          <p className="text-xl font-bold text-primary">₩{formatAmount(totalIssued)}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-secondary mb-1">활성 캠페인</p>
          <p className="text-xl font-bold text-white">{totalActive}</p>
        </Card>
      </div>

      {/* Status Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: '전체' },
            { key: 'active', label: '활성' },
            { key: 'paused', label: '일시정지' },
            { key: 'expired', label: '만료' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key as typeof statusFilter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${statusFilter === filter.key
                  ? 'bg-primary text-background'
                  : 'bg-surface-highlight text-text-secondary hover:text-white'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voucher List */}
      <div className="px-4 space-y-3">
        {filteredVouchers.map((voucher) => (
          <Card key={voucher.id} variant="transaction" padding="md">
            <div className="flex items-start gap-3 mb-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${voucher.status === 'active' ? 'bg-primary/10 text-primary' :
                  voucher.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-surface-highlight text-text-secondary'
                }`}>
                <span className="material-symbols-outlined">{getTypeIcon(voucher.type)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{voucher.name}</p>
                  <Badge variant={getStatusColor(voucher.status)} size="sm">
                    {voucher.status}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  코드: <span className="font-mono text-white">{voucher.code}</span>
                </p>
              </div>
              <p className="text-lg font-bold text-primary">₩{formatAmount(voucher.amount)}</p>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>사용량: {voucher.usageCount.toLocaleString()} / {voucher.usageLimit.toLocaleString()}</span>
                <span>{Math.round((voucher.usageCount / voucher.usageLimit) * 100)}%</span>
              </div>
              <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${voucher.status === 'active' ? 'bg-primary' : 'bg-text-muted'
                    }`}
                  style={{ width: `${Math.min((voucher.usageCount / voucher.usageLimit) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Validity */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">
                유효기간: {voucher.validFrom} ~ {voucher.validUntil}
              </span>
              {voucher.status === 'active' && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <span className="material-symbols-outlined text-[16px] mr-1">pause</span>
                    일시정지
                  </Button>
                  <Button variant="ghost" size="sm">
                    <span className="material-symbols-outlined text-[16px] mr-1">edit</span>
                    수정
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create Voucher FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-background text-2xl">add</span>
      </button>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="새 바우처 생성"
      >
        <div className="space-y-4">
          <Input label="캠페인 이름" placeholder="예: 여름 축제 2024" />
          <Input label="바우처 코드" placeholder="예: SUMMER50" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="금액 (₩)" placeholder="10000" type="number" />
            <Input label="사용 한도" placeholder="1000" type="number" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">바우처 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'Welcome', label: '웰컴' },
                { key: 'Promo', label: '프로모션' },
                { key: 'Subsidy', label: '보조금' },
                { key: 'Partner', label: '파트너' }
              ].map((type) => (
                <button
                  key={type.key}
                  className="p-3 rounded-xl bg-surface-highlight text-white text-sm font-medium hover:bg-surface transition-colors border border-transparent hover:border-primary"
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="시작일" type="date" />
            <Input label="종료일" type="date" />
          </div>

          <Button variant="primary" fullWidth size="lg">
            바우처 생성
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Vouchers;
