import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Input, Button } from '../../components/common';
import { useTransactionStore } from '../../store';
import { TransactionStatus } from '../../types';

const statusFilters: { label: string; value: TransactionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
];

const Payments: React.FC = () => {
  const { transactions } = useTransactionStore();
  const [activeStatus, setActiveStatus] = useState<TransactionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('today');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (activeStatus !== 'all' && tx.status !== activeStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.customerName?.toLowerCase().includes(query) ||
        tx.txId.toLowerCase().includes(query)
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
      <Header title="Payment Management" />

      {/* Search */}
      <div className="px-4 mb-4">
        <Input
          icon="search"
          placeholder="Search by customer or TX ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Date Filter */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['today', 'yesterday', 'week', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                dateRange === range
                  ? 'bg-primary text-background'
                  : 'bg-surface-highlight text-text-secondary hover:text-white'
              }`}
            >
              {range === 'today' ? 'Today' :
               range === 'yesterday' ? 'Yesterday' :
               range === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
          <button className="px-4 py-2 rounded-full text-sm font-medium bg-surface-highlight text-text-secondary hover:text-white flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Custom
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md">
            <p className="text-xs text-text-secondary mb-1">Total Received</p>
            <p className="text-xl font-bold text-primary">₩{formatAmount(totalAmount)}</p>
            <p className="text-xs text-text-muted mt-1">{filteredTransactions.filter(t => t.type === 'payment').length} transactions</p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-text-secondary mb-1">Refunds</p>
            <p className="text-xl font-bold text-red-500">₩{formatAmount(refundAmount)}</p>
            <p className="text-xs text-text-muted mt-1">{filteredTransactions.filter(t => t.type === 'refund').length} transactions</p>
          </Card>
        </div>
      </div>

      {/* Status Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveStatus(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeStatus === filter.value
                  ? 'bg-surface-highlight text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-4 space-y-3">
        {filteredTransactions.map((tx) => (
          <Card key={tx.id} variant="transaction" padding="md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  tx.type === 'payment' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {tx.type === 'payment' ? 'arrow_downward' : 'undo'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{tx.customerName || 'Customer'}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(tx.createdAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${
                  tx.type === 'payment' ? 'text-primary' : 'text-red-500'
                }`}>
                  {tx.type === 'payment' ? '+' : '-'} ₩{formatAmount(tx.amount)}
                </span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <Badge
                    variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'error'}
                    size="sm"
                  >
                    {tx.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-surface-highlight">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="material-symbols-outlined text-[14px]">tag</span>
                <span className="font-mono">{tx.txId}</span>
                <button className="text-text-secondary hover:text-white">
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>
              {tx.type === 'payment' && tx.status === 'completed' && (
                <Button variant="ghost" size="sm">
                  <span className="material-symbols-outlined text-[16px] mr-1">undo</span>
                  Refund
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Export Button */}
      <div className="px-4 mt-6">
        <Button variant="secondary" fullWidth>
          <span className="material-symbols-outlined mr-2">download</span>
          Export Report
        </Button>
      </div>
    </div>
  );
};

export default Payments;
