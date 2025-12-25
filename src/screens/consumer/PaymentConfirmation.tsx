/**
 * Payment Confirmation Screen
 *
 * Shows payment result with:
 * - Success/Failure animation
 * - Transaction receipt
 * - Blockchain verification status
 * - Share and action buttons
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '../../components/common';

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

  // Mock payment result (in production, this would come from payment flow)
  const [result] = useState<PaymentResult>({
    success: true,
    transactionId: 'TX-2024-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    merchantName: 'Jeonju Bibimbap House',
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

  // Simulate verification status update
  useEffect(() => {
    if (result.verificationStatus === 'pending') {
      const timer = setTimeout(() => {
        // In production, this would poll the blockchain
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result.verificationStatus]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Success Animation */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {result.success ? (
          <>
            {/* Success Icon */}
            <div className="relative mb-6">
              <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                <div className="h-20 w-20 rounded-full bg-green-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-500 text-5xl filled">
                    check_circle
                  </span>
                </div>
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Payment Successful</h1>
            <p className="text-text-secondary text-center mb-6">
              Your payment has been processed successfully
            </p>

            {/* Amount Display */}
            <div className="text-center mb-8">
              <p className="text-4xl font-bold text-white">
                {formatAmount(result.finalAmount)}
                <span className="text-lg text-text-secondary ml-1">P</span>
              </p>
              {result.discount && result.discount > 0 && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-sm text-text-secondary line-through">
                    {formatAmount(result.amount)}
                  </span>
                  <Badge variant="success" size="sm">
                    -{formatAmount(result.discount)} saved
                  </Badge>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Failure Icon */}
            <div className="h-24 w-24 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-red-500 text-5xl filled">
                cancel
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
            <p className="text-text-secondary text-center mb-6">
              Something went wrong. Please try again.
            </p>
          </>
        )}

        {/* Receipt Card */}
        <Card padding="lg" className="w-full max-w-sm">
          <div className="space-y-4">
            {/* Merchant */}
            <div className="flex items-center gap-3 pb-4 border-b border-surface-highlight">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">storefront</span>
              </div>
              <div>
                <p className="font-medium text-white">{result.merchantName}</p>
                <p className="text-xs text-text-secondary">{formatTime(result.timestamp)}</p>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Transaction ID</span>
                <span className="text-white font-mono text-xs">{result.transactionId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Original Amount</span>
                <span className="text-white">{formatAmount(result.amount)} P</span>
              </div>
              {result.discount && result.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Discount</span>
                  <span className="text-green-500">-{formatAmount(result.discount)} P</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-surface-highlight">
                <span className="text-white">Total Paid</span>
                <span className="text-primary">{formatAmount(result.finalAmount)} P</span>
              </div>
            </div>

            {/* Blockchain Verification */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 bg-surface-highlight rounded-xl"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">
                  verified
                </span>
                <span className="text-sm text-white">Blockchain Verified</span>
              </div>
              <span className="material-symbols-outlined text-text-secondary text-sm">
                {showDetails ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showDetails && (
              <div className="bg-background rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Block Hash</span>
                  <span className="text-white font-mono">{result.blockchainHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Status</span>
                  <Badge
                    variant={result.verificationStatus === 'verified' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {result.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <p className="text-text-muted pt-2 border-t border-surface">
                  This transaction is recorded on the Xphere blockchain for immutable audit trail.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {/* Share receipt */}}
          >
            <span className="material-symbols-outlined mr-2 text-lg">share</span>
            Share
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate('/consumer/history')}
          >
            <span className="material-symbols-outlined mr-2 text-lg">receipt_long</span>
            History
          </Button>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/consumer')}
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
