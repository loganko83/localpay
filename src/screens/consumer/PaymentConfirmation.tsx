import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { theme } from '../../styles/theme';

interface PaymentResult {
  success: boolean;
  transactionId: string;
  merchantName: string;
  amount: number;
  discount?: number;
  finalAmount: number;
  timestamp: string;
  blockchainHash?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

const PaymentConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  const [result] = useState<PaymentResult>({
    success: true,
    transactionId: 'TX-2024-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    merchantName: '전주 비빔밥 본가',
    amount: 25000,
    discount: 2500,
    finalAmount: 22500,
    timestamp: new Date().toISOString(),
    blockchainHash: 'BC-' + Math.random().toString(36).substr(2, 12),
    verificationStatus: 'verified',
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (result.verificationStatus === 'pending') {
      const timer = setTimeout(() => { }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result.verificationStatus]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Success Animation */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {result.success ? (
          <>
            {/* Success Icon */}
            <div className="relative mb-6">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
                style={{ background: '#22c55e20' }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: '#22c55e30' }}
                >
                  <span className="material-symbols-outlined text-5xl" style={{ color: '#22c55e' }}>
                    check_circle
                  </span>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>결제 완료</h1>
            <p className="text-center mb-6" style={{ color: theme.textSecondary }}>
              결제가 성공적으로 처리되었습니다
            </p>

            {/* Amount Display */}
            <div className="text-center mb-8">
              <p className="text-4xl font-bold" style={{ color: theme.text }}>
                {formatAmount(result.finalAmount)}
                <span className="text-lg ml-1" style={{ color: theme.textSecondary }}>P</span>
              </p>
              {result.discount && result.discount > 0 && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-sm line-through" style={{ color: theme.textSecondary }}>
                    {formatAmount(result.amount)}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded"
                    style={{ background: '#22c55e20', color: '#22c55e' }}
                  >
                    -{formatAmount(result.discount)} 절약
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Failure Icon */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ background: theme.accentSoft }}
            >
              <span className="material-symbols-outlined text-5xl" style={{ color: theme.accent }}>
                cancel
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>결제 실패</h1>
            <p className="text-center mb-6" style={{ color: theme.textSecondary }}>
              문제가 발생했습니다. 다시 시도해 주세요.
            </p>
          </>
        )}

        {/* Receipt Card */}
        <div
          className="w-full max-w-sm rounded-xl p-5"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
        >
          <div className="space-y-4">
            {/* Merchant */}
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: theme.accentSoft }}
              >
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>storefront</span>
              </div>
              <div>
                <p className="font-medium" style={{ color: theme.text }}>{result.merchantName}</p>
                <p className="text-xs" style={{ color: theme.textSecondary }}>{formatTime(result.timestamp)}</p>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.textSecondary }}>거래 ID</span>
                <span className="font-mono text-xs" style={{ color: theme.text }}>{result.transactionId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.textSecondary }}>원래 금액</span>
                <span style={{ color: theme.text }}>{formatAmount(result.amount)} P</span>
              </div>
              {result.discount && result.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: theme.textSecondary }}>할인</span>
                  <span style={{ color: '#22c55e' }}>-{formatAmount(result.discount)} P</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                <span style={{ color: theme.text }}>결제 금액</span>
                <span style={{ color: theme.accent }}>{formatAmount(result.finalAmount)} P</span>
              </div>
            </div>

            {/* Blockchain Verification */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 rounded-xl"
              style={{ background: theme.cardHover }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ color: '#22c55e' }}>verified</span>
                <span className="text-sm" style={{ color: theme.text }}>블록체인 인증됨</span>
              </div>
              <span className="material-symbols-outlined text-sm" style={{ color: theme.textSecondary }}>
                {showDetails ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showDetails && (
              <div className="rounded-xl p-3 space-y-2 text-xs" style={{ background: theme.bg }}>
                <div className="flex justify-between">
                  <span style={{ color: theme.textSecondary }}>블록 해시</span>
                  <span className="font-mono" style={{ color: theme.text }}>{result.blockchainHash}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.textSecondary }}>상태</span>
                  <span
                    className="font-bold px-2 py-0.5 rounded"
                    style={{
                      background: result.verificationStatus === 'verified' ? '#22c55e20' : theme.cardHover,
                      color: result.verificationStatus === 'verified' ? '#22c55e' : theme.textSecondary,
                    }}
                  >
                    {result.verificationStatus === 'verified' ? '인증됨' : '대기 중'}
                  </span>
                </div>
                <p className="pt-2" style={{ color: theme.textMuted, borderTop: `1px solid ${theme.border}` }}>
                  이 거래는 불변의 감사 추적을 위해 Xphere 블록체인에 기록됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 space-y-3">
        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <span className="material-symbols-outlined text-lg">share</span>
            공유
          </button>
          <button
            onClick={() => navigate('/consumer/history')}
            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            내역
          </button>
        </div>
        <button
          onClick={() => navigate('/consumer')}
          className="w-full py-4 rounded-xl font-bold text-white"
          style={{ background: theme.accent }}
        >
          홈으로
        </button>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
