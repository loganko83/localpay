/**
 * Transaction Detail Screen
 *
 * Shows full transaction information with:
 * - Transaction summary
 * - Blockchain verification status
 * - Refund request option
 * - Receipt sharing
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../components/layout';
import { Card, Badge, Button } from '../../components/common';
import { useTransactionStore } from '../../store';

const TransactionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transactions } = useTransactionStore();
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Find transaction by ID
  const transaction = transactions.find(t => t.id === id) || {
    id: id || 'TX-001',
    txId: 'TX-2024-ABC123',
    userId: 'user-1',
    merchantId: 'merchant-1',
    merchantName: 'Jeonju Bibimbap House',
    amount: 25000,
    type: 'payment' as const,
    status: 'completed' as const,
    createdAt: new Date().toISOString(),
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return 'shopping_cart';
      case 'topup': return 'add_circle';
      case 'refund': return 'replay';
      case 'transfer': return 'swap_horiz';
      case 'withdrawal': return 'arrow_downward';
      default: return 'receipt';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'payment': return 'Payment';
      case 'topup': return 'Top-up';
      case 'refund': return 'Refund';
      case 'transfer': return 'Transfer';
      case 'withdrawal': return 'Withdrawal';
      default: return type;
    }
  };

  // Mock blockchain data
  const blockchainData = {
    hash: 'BC-' + Math.random().toString(36).substr(2, 12),
    blockNumber: 12345678,
    txHash: '0x' + Math.random().toString(36).substr(2, 40),
    verified: true,
    verifiedAt: new Date(Date.now() - 60000).toISOString(),
    signature: 'sig:user:' + Date.now(),
  };

  return (
    <div className="flex flex-col pb-4">
      <Header title="Transaction Detail" showBack />

      {/* Transaction Summary */}
      <div className="px-4 py-6">
        <div className="flex flex-col items-center text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
            transaction.type === 'topup' || transaction.type === 'refund'
              ? 'bg-green-500/20'
              : 'bg-primary/20'
          }`}>
            <span className={`material-symbols-outlined text-3xl ${
              transaction.type === 'topup' || transaction.type === 'refund'
                ? 'text-green-500'
                : 'text-primary'
            }`}>
              {getTypeIcon(transaction.type)}
            </span>
          </div>

          <p className={`text-3xl font-bold ${
            transaction.type === 'topup' || transaction.type === 'refund'
              ? 'text-green-500'
              : 'text-white'
          }`}>
            {transaction.type === 'topup' || transaction.type === 'refund' ? '+' : '-'}
            {formatAmount(transaction.amount)}
            <span className="text-lg ml-1">P</span>
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getStatusColor(transaction.status) as any}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </Badge>
            <span className="text-text-secondary text-sm">
              {getTypeLabel(transaction.type)}
            </span>
          </div>
        </div>
      </div>

      {/* Merchant/Source Info */}
      <div className="px-4 mb-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-surface-highlight flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">
                {transaction.merchantId ? 'storefront' : 'account_balance'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">
                {transaction.merchantName || 'Bank Transfer'}
              </p>
              <p className="text-xs text-text-secondary">
                {formatDate(transaction.createdAt)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction Details */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-bold text-white mb-3">Transaction Information</h3>
        <Card padding="md">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Transaction ID</span>
              <span className="text-white text-sm font-mono">{transaction.txId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Type</span>
              <span className="text-white text-sm">{getTypeLabel(transaction.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Amount</span>
              <span className="text-white text-sm">{formatAmount(transaction.amount)} P</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Status</span>
              <Badge variant={getStatusColor(transaction.status) as any} size="sm">
                {transaction.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Date & Time</span>
              <span className="text-white text-sm">{formatDate(transaction.createdAt)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Blockchain Verification */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-bold text-white mb-3">Blockchain Verification</h3>
        <Card padding="md">
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-surface-highlight">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500">verified</span>
            </div>
            <div>
              <p className="font-medium text-white">Verified on Blockchain</p>
              <p className="text-xs text-text-secondary">
                Verified at {formatDate(blockchainData.verifiedAt)}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Block Hash</span>
              <span className="text-white font-mono">{blockchainData.hash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Block Number</span>
              <span className="text-white">{blockchainData.blockNumber.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">TX Hash</span>
              <span className="text-white font-mono truncate max-w-[180px]">
                {blockchainData.txHash}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-surface-highlight">
            <p className="text-[10px] text-text-muted">
              This transaction is permanently recorded on the Xphere blockchain network
              for audit and verification purposes.
            </p>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="px-4 space-y-3">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {/* Share */}}
          >
            <span className="material-symbols-outlined mr-2 text-lg">share</span>
            Share
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {/* Download */}}
          >
            <span className="material-symbols-outlined mr-2 text-lg">download</span>
            Receipt
          </Button>
        </div>

        {transaction.type === 'payment' && transaction.status === 'completed' && (
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-red-500"
            onClick={() => setShowRefundModal(true)}
          >
            <span className="material-symbols-outlined mr-2">replay</span>
            Request Refund
          </Button>
        )}
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Request Refund</h2>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-2 hover:bg-background rounded-lg"
              >
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            <div className="bg-background rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white mb-1">
                {formatAmount(transaction.amount)} P
              </p>
              <p className="text-sm text-text-secondary">{transaction.merchantName}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Reason for refund</label>
              <textarea
                className="w-full bg-background text-white rounded-xl p-3 border border-surface-highlight focus:border-primary outline-none resize-none"
                rows={3}
                placeholder="Please describe your reason for requesting a refund..."
              />
            </div>

            <p className="text-xs text-text-muted">
              Refund requests are processed by the merchant. You will be notified once the
              merchant responds to your request.
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowRefundModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setShowRefundModal(false);
                  navigate('/consumer/history');
                }}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetail;
