/**
 * Regulatory Disclosure Component
 *
 * Displays required legal disclosures and compliance information.
 * Implements the principle: "Money handled by bank, Proof handled by technology"
 *
 * Key Requirements:
 * - IBK Bank attribution on all financial screens
 * - Trust account disclosure
 * - Prepaid limit information
 * - Blockchain audit disclaimer
 */

import React from 'react';

// Disclosure types
type DisclosureType =
  | 'balance'      // Balance display pages
  | 'payment'      // Payment confirmation
  | 'topup'        // Top-up screens
  | 'receipt'      // Transaction receipts
  | 'general';     // General footer

interface RegulatoryDisclosureProps {
  type: DisclosureType;
  showBankLogo?: boolean;
  className?: string;
}

// Bank information
const BANK_INFO = {
  name: 'IBK Bank',
  nameKorean: 'IBK 기업은행',
  trustAccount: 'Trust Account',
  trustAccountKorean: '신탁계좌',
};

// Disclosure messages by type
const DISCLOSURES: Record<DisclosureType, { korean: string; english: string }> = {
  balance: {
    korean: '본 잔액은 IBK기업은행 신탁계좌에서 관리됩니다.',
    english: 'This balance is managed by IBK Bank Trust Account.',
  },
  payment: {
    korean: '본 결제는 IBK기업은행을 통해 처리됩니다.',
    english: 'This payment is processed through IBK Bank.',
  },
  topup: {
    korean: '충전금은 IBK기업은행 신탁계좌로 입금됩니다.',
    english: 'Top-up funds are deposited to IBK Bank Trust Account.',
  },
  receipt: {
    korean: 'IBK기업은행 발행 | 블록체인 검증용 기록',
    english: 'Issued by IBK Bank | Blockchain verification record',
  },
  general: {
    korean: '본 서비스는 IBK기업은행이 발행합니다.',
    english: 'This service is issued by IBK Bank.',
  },
};

// Prepaid limits (regulated amounts)
const PREPAID_LIMITS = {
  daily: 500000,      // 50 KRW
  monthly: 2000000,   // 200 KRW
  total: 3000000,     // 300 KRW max balance
};

/**
 * Bank Attribution Badge
 */
export const BankBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 bg-blue-600/20 text-blue-400
        rounded-full border border-blue-500/30 ${sizeClasses[size]}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3 7v2h18V7L12 2zM5 10v8h3v-8H5zm5 0v8h4v-8h-4zm6 0v8h3v-8h-3zM3 20v2h18v-2H3z" />
      </svg>
      <span>{BANK_INFO.nameKorean}</span>
    </span>
  );
};

/**
 * Trust Account Indicator
 */
export const TrustAccountIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
      <span>{BANK_INFO.trustAccountKorean} 관리</span>
    </div>
  );
};

/**
 * Prepaid Limit Display
 */
export const PrepaidLimitDisplay: React.FC<{
  dailyUsed?: number;
  monthlyUsed?: number;
  currentBalance?: number;
}> = ({ dailyUsed = 0, monthlyUsed = 0, currentBalance = 0 }) => {
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR');
  };

  const getProgressColor = (used: number, limit: number) => {
    const ratio = used / limit;
    if (ratio >= 0.9) return 'bg-red-500';
    if (ratio >= 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const limits = [
    {
      label: '1일 한도',
      used: dailyUsed,
      limit: PREPAID_LIMITS.daily,
    },
    {
      label: '월 한도',
      used: monthlyUsed,
      limit: PREPAID_LIMITS.monthly,
    },
    {
      label: '잔액 한도',
      used: currentBalance,
      limit: PREPAID_LIMITS.total,
    },
  ];

  return (
    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">선불 한도 현황</span>
        <span className="text-xs text-gray-500">전자금융거래법 기준</span>
      </div>

      {limits.map(({ label, used, limit }) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-300">
              {formatAmount(used)} / {formatAmount(limit)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(used, limit)} transition-all duration-300`}
              style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}

      <div className="text-xs text-gray-500 pt-1 border-t border-gray-700">
        * 전자금융거래법에 따른 선불전자지급수단 한도
      </div>
    </div>
  );
};

/**
 * Blockchain Verification Badge
 */
export const BlockchainVerificationBadge: React.FC<{
  txHash?: string;
  anchoredAt?: string;
  verified?: boolean;
}> = ({ txHash, anchoredAt, verified = false }) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg border border-purple-500/20">
      <svg
        className={`w-5 h-5 ${verified ? 'text-purple-400' : 'text-gray-500'}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-purple-300">
          {verified ? '블록체인 검증 완료' : '검증 대기중'}
        </div>
        {txHash && (
          <div className="text-xs text-gray-500 truncate">
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </div>
        )}
      </div>
      {anchoredAt && (
        <div className="text-xs text-gray-500">{anchoredAt}</div>
      )}
    </div>
  );
};

/**
 * Main Regulatory Disclosure Component
 */
export const RegulatoryDisclosure: React.FC<RegulatoryDisclosureProps> = ({
  type,
  showBankLogo = true,
  className = '',
}) => {
  const disclosure = DISCLOSURES[type];

  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 bg-gray-900/50
        rounded-lg border border-gray-800 ${className}`}
    >
      {showBankLogo && <BankBadge size="sm" />}

      <p className="text-xs text-gray-400 text-center">{disclosure.korean}</p>

      {type === 'receipt' && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <span>감사 목적의 블록체인 기록이며, 자금 보관과 무관합니다.</span>
        </div>
      )}
    </div>
  );
};

/**
 * Transaction Receipt Footer
 */
export const ReceiptFooter: React.FC<{
  transactionId: string;
  timestamp: string;
  blockchainVerified?: boolean;
}> = ({ transactionId, timestamp, blockchainVerified = false }) => {
  return (
    <div className="space-y-2 pt-3 border-t border-dashed border-gray-700">
      <div className="flex justify-between text-xs text-gray-500">
        <span>거래번호</span>
        <span className="font-mono">{transactionId}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>거래일시</span>
        <span>{timestamp}</span>
      </div>

      <RegulatoryDisclosure type="receipt" showBankLogo={false} />

      {blockchainVerified && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 text-xs text-purple-400">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            블록체인 검증 완료
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Compliance Footer (for all screens)
 */
export const ComplianceFooter: React.FC = () => {
  return (
    <footer className="mt-auto py-4 px-4 border-t border-gray-800">
      <div className="flex flex-col items-center gap-2 text-center">
        <BankBadge size="sm" />
        <p className="text-xs text-gray-500">
          {DISCLOSURES.general.korean}
        </p>
        <p className="text-xs text-gray-600">
          블록체인 검증은 감사 목적으로만 사용되며, 자금 관리와 무관합니다.
        </p>
      </div>
    </footer>
  );
};

// Export all components
export default RegulatoryDisclosure;
