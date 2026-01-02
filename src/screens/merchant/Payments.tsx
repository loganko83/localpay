import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Input, Button } from '../../components/common';
import { useMerchantTransactions } from '../../services/api';

import { theme } from '../../styles/theme';

type TransactionStatus = 'completed' | 'pending' | 'failed';

const statusFilters: { label: string; value: TransactionStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '완료', value: 'completed' },
  { label: '대기 중', value: 'pending' },
  { label: '실패', value: 'failed' },
];

const Payments: React.FC = () => {
  const [activeStatus, setActiveStatus] = useState<TransactionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('today');

  const { data: transactionsData } = useMerchantTransactions({
    page: 1,
    size: 50,
    status: activeStatus === 'all' ? undefined : activeStatus,
  });

  const transactions = transactionsData?.transactions ?? [];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeStatus !== 'all' && tx.status !== activeStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.customerName?.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalAmount = filteredTransactions
    .filter((tx) => tx.type === 'payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const refundAmount = filteredTransactions
    .filter((tx) => tx.type === 'refund')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex flex-col pb-4">
      <Header title="결제 관리" />

      {/* Search */}
      <div className="px-4 mb-4">
        <Input
          icon="search"
          placeholder="고객 또는 거래 ID로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Date Filter */}
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }} className="no-scrollbar">
          {['today', 'yesterday', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                backgroundColor: dateRange === range ? theme.accent : theme.card,
                color: dateRange === range ? theme.bg : theme.textSecondary,
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (dateRange !== range) {
                  e.currentTarget.style.color = theme.text;
                }
              }}
              onMouseLeave={(e) => {
                if (dateRange !== range) {
                  e.currentTarget.style.color = theme.textSecondary;
                }
              }}
            >
              {range === 'today' ? '오늘' :
                range === 'yesterday' ? '어제' :
                  range === 'week' ? '이번 주' : '이번 달'}
            </button>
          ))}
          <button
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '500',
              backgroundColor: theme.card,
              color: theme.textSecondary,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.text}
            onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            직접 선택
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <Card padding="md">
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>총 수입</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: theme.accent }}>₩{formatAmount(totalAmount)}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.25rem' }}>{filteredTransactions.filter(t => t.type === 'payment').length} 건</p>
          </Card>
          <Card padding="md">
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>환불</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>₩{formatAmount(refundAmount)}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.25rem' }}>{filteredTransactions.filter(t => t.type === 'refund').length} 건</p>
          </Card>
        </div>
      </div>

      {/* Status Filters */}
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveStatus(filter.value)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: activeStatus === filter.value ? theme.cardHover : 'transparent',
                color: activeStatus === filter.value ? theme.text : theme.textSecondary,
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (activeStatus !== filter.value) {
                  e.currentTarget.style.color = theme.text;
                }
              }}
              onMouseLeave={(e) => {
                if (activeStatus !== filter.value) {
                  e.currentTarget.style.color = theme.textSecondary;
                }
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredTransactions.map((tx) => (
          <Card key={tx.id} variant="transaction" padding="md">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  height: '2.5rem',
                  width: '2.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tx.type === 'payment' ? theme.accentSoft : 'rgba(239,68,68,0.15)',
                  color: tx.type === 'payment' ? theme.accent : '#ef4444',
                }}>
                  <span className="material-symbols-outlined text-[20px]">
                    {tx.type === 'payment' ? 'arrow_downward' : 'undo'}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{tx.customerName || '고객'}</p>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                    {new Date(tx.createdAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: tx.type === 'payment' ? theme.accent : '#ef4444',
                }}>
                  {tx.type === 'payment' ? '+' : '-'} ₩{formatAmount(tx.amount)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', marginTop: '0.125rem' }}>
                  <Badge
                    variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                    size="sm"
                  >
                    {tx.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: theme.textMuted }}>
                <span className="material-symbols-outlined text-[14px]">tag</span>
                <span style={{ fontFamily: 'monospace' }}>{tx.id}</span>
                <button
                  style={{
                    color: theme.textSecondary,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = theme.text}
                  onMouseLeave={(e) => e.currentTarget.style.color = theme.textSecondary}
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>
              {tx.type === 'payment' && tx.status === 'completed' && (
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-[16px] mr-1">undo</span>
                  환불
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Export Button */}
      <div style={{ padding: '0 1rem', marginTop: '1.5rem' }}>
        <Button variant="secondary" fullWidth>
          <span className="material-symbols-outlined mr-2">download</span>
          리포트 내보내기
        </Button>
      </div>
    </div>
  );
};

export default Payments;
