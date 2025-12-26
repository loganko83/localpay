import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTransactionStore } from '../../store';

// Unified Dark Theme
const theme = {
  bg: '#111111',
  card: '#1a1a1a',
  cardHover: '#222222',
  border: '#2a2a2a',
  accent: '#ff4757',
  accentSoft: 'rgba(255,71,87,0.15)',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#555555',
};

const TransactionDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transactions } = useTransactionStore();
  const [showRefundModal, setShowRefundModal] = useState(false);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return 'shopping_cart';
      case 'topup': return 'add_circle';
      case 'refund': return 'replay';
      case 'transfer': return 'swap_horiz';
      default: return 'receipt';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'payment': return 'Payment';
      case 'topup': return 'Top-up';
      case 'refund': return 'Refund';
      case 'transfer': return 'Transfer';
      default: return type;
    }
  };

  const blockchainData = {
    hash: 'BC-' + Math.random().toString(36).substr(2, 12),
    blockNumber: 12345678,
    txHash: '0x' + Math.random().toString(36).substr(2, 40),
    verifiedAt: new Date(Date.now() - 60000).toISOString(),
  };

  const isIncome = transaction.type === 'topup' || transaction.type === 'refund';

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Transaction Detail</h1>
        <div className="w-8" />
      </header>

      {/* Transaction Summary */}
      <div className="px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: isIncome ? '#22c55e20' : theme.accentSoft }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: isIncome ? '#22c55e' : theme.accent }}
            >
              {getTypeIcon(transaction.type)}
            </span>
          </div>

          <p
            className="text-3xl font-bold"
            style={{ color: isIncome ? '#22c55e' : theme.text }}
          >
            {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
            <span className="text-lg ml-1">P</span>
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs font-bold px-2 py-1 rounded"
              style={{
                background: transaction.status === 'completed' ? '#22c55e20' : theme.cardHover,
                color: transaction.status === 'completed' ? '#22c55e' : theme.textSecondary,
              }}
            >
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </span>
            <span className="text-sm" style={{ color: theme.textSecondary }}>
              {getTypeLabel(transaction.type)}
            </span>
          </div>
        </div>
      </div>

      {/* Merchant Info */}
      <div className="px-5 mb-4">
        <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: theme.cardHover }}
            >
              <span className="material-symbols-outlined" style={{ color: theme.accent }}>
                {transaction.merchantId ? 'storefront' : 'account_balance'}
              </span>
            </div>
            <div>
              <p className="font-medium" style={{ color: theme.text }}>
                {transaction.merchantName || 'Bank Transfer'}
              </p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>
                {formatDate(transaction.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Transaction Information</h3>
        <div className="rounded-xl p-4 space-y-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: theme.textSecondary }}>Transaction ID</span>
            <span className="text-sm font-mono" style={{ color: theme.text }}>{transaction.txId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: theme.textSecondary }}>Type</span>
            <span className="text-sm" style={{ color: theme.text }}>{getTypeLabel(transaction.type)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: theme.textSecondary }}>Amount</span>
            <span className="text-sm" style={{ color: theme.text }}>{formatAmount(transaction.amount)} P</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: theme.textSecondary }}>Status</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                background: transaction.status === 'completed' ? '#22c55e20' : theme.cardHover,
                color: transaction.status === 'completed' ? '#22c55e' : theme.textSecondary,
              }}
            >
              {transaction.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: theme.textSecondary }}>Date & Time</span>
            <span className="text-sm" style={{ color: theme.text }}>{formatDate(transaction.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Blockchain Verification */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Blockchain Verification</h3>
        <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-3 pb-3 mb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#22c55e20' }}
            >
              <span className="material-symbols-outlined" style={{ color: '#22c55e' }}>verified</span>
            </div>
            <div>
              <p className="font-medium" style={{ color: theme.text }}>Verified on Blockchain</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>
                Verified at {formatDate(blockchainData.verifiedAt)}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: theme.textSecondary }}>Block Hash</span>
              <span className="font-mono" style={{ color: theme.text }}>{blockchainData.hash}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.textSecondary }}>Block Number</span>
              <span style={{ color: theme.text }}>{blockchainData.blockNumber.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.textSecondary }}>TX Hash</span>
              <span className="font-mono truncate max-w-[180px]" style={{ color: theme.text }}>
                {blockchainData.txHash}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
            <p className="text-[10px]" style={{ color: theme.textMuted }}>
              This transaction is permanently recorded on the Xphere blockchain network
              for audit and verification purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 space-y-3">
        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <span className="material-symbols-outlined text-lg">share</span>
            Share
          </button>
          <button
            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Receipt
          </button>
        </div>

        {transaction.type === 'payment' && transaction.status === 'completed' && (
          <button
            onClick={() => setShowRefundModal(true)}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ background: 'transparent', color: theme.accent }}
          >
            <span className="material-symbols-outlined">replay</span>
            Request Refund
          </button>
        )}
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl p-4 space-y-4" style={{ background: theme.card }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>Request Refund</h2>
              <button onClick={() => setShowRefundModal(false)} className="p-2 rounded-lg" style={{ background: theme.cardHover }}>
                <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>close</span>
              </button>
            </div>

            <div className="rounded-xl p-4 text-center" style={{ background: theme.bg }}>
              <p className="text-2xl font-bold mb-1" style={{ color: theme.text }}>
                {formatAmount(transaction.amount)} P
              </p>
              <p className="text-sm" style={{ color: theme.textSecondary }}>{transaction.merchantName}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm" style={{ color: theme.textSecondary }}>Reason for refund</label>
              <textarea
                className="w-full rounded-xl p-3 resize-none focus:outline-none"
                rows={3}
                placeholder="Please describe your reason for requesting a refund..."
                style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
              />
            </div>

            <p className="text-xs" style={{ color: theme.textMuted }}>
              Refund requests are processed by the merchant. You will be notified once the
              merchant responds to your request.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ background: theme.cardHover, color: theme.text }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  navigate('/consumer/history');
                }}
                className="flex-1 py-3 rounded-xl font-bold text-white"
                style={{ background: theme.accent }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetail;
