import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore, useTransactionStore } from '../../store';
import { programmableMoneyService, type ProgrammableToken, type PolicyFundType } from '../../services/programmableMoney';
import { theme } from '../../styles/theme';



const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, cards } = useWalletStore();
  const { transactions } = useTransactionStore();
  const [, setActiveCardIndex] = useState(0);
  const [programmableTokens, setProgrammableTokens] = useState<ProgrammableToken[]>([]);

  const recentTransactions = transactions.slice(0, 4);

  useEffect(() => {
    if (wallet?.userId) {
      const tokens = programmableMoneyService.getUserTokens(wallet.userId);
      setProgrammableTokens(tokens);
    }
  }, [wallet?.userId]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getFundTypeColor = (fundType: PolicyFundType): string => {
    const colorMap: Record<PolicyFundType, string> = {
      DISASTER_RELIEF: '#dc2626',
      CHILD_MEAL: '#ea580c',
      YOUTH_ALLOWANCE: '#2563eb',
      SENIOR_WELFARE: '#9333ea',
      FARMER_SUPPORT: '#16a34a',
      TRADITIONAL_MARKET: '#ca8a04',
      GENERAL: '#525252',
    };
    return colorMap[fundType] || '#525252';
  };

  const getFundTypeName = (fundType: PolicyFundType): string => {
    const nameMap: Record<PolicyFundType, string> = {
      DISASTER_RELIEF: '재난지원금',
      CHILD_MEAL: '아동급식 지원',
      YOUTH_ALLOWANCE: '청년수당',
      SENIOR_WELFARE: '노인복지',
      FARMER_SUPPORT: '농민지원',
      TRADITIONAL_MARKET: '전통시장',
      GENERAL: '일반자금',
    };
    return nameMap[fundType] || fundType;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return '방금';
    if (diffHours < 24) return '오늘';
    if (diffHours < 48) return '어제';
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h2 className="text-lg font-bold" style={{ color: theme.text }}>내 지갑</h2>
        <button onClick={() => navigate('/consumer/profile')}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.textSecondary }}>notifications</span>
        </button>
      </div>

      {/* Total Balance */}
      <div className="flex flex-col items-center pt-6 pb-4 px-5">
        <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>총 잔액</p>
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: theme.text }}>
          {formatAmount(wallet?.balance || 150000)}
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>B코인</p>
      </div>

      {/* Card Carousel */}
      <div className="w-full overflow-x-auto pb-4 px-5 flex gap-4 snap-x snap-mandatory no-scrollbar">
        {/* Main Wallet Card */}
        <div
          className="snap-center shrink-0 relative overflow-hidden rounded-2xl"
          style={{ width: '85%', aspectRatio: '1.6/1', background: theme.accent }}
        >
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
          }} />
          <div className="relative h-full flex flex-col justify-between p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">부산 디지털 지갑</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.2)' }}>인증됨</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-3xl opacity-80">account_balance_wallet</span>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-widest mb-1">{formatAmount(wallet?.balance || 150000)}</p>
              <p className="font-mono text-sm opacity-80">0x12...8A92</p>
            </div>
          </div>
        </div>

        {/* Linked Cards */}
        {cards.map((card, idx) => (
          <div
            key={card.id}
            className="snap-center shrink-0 relative overflow-hidden rounded-2xl"
            style={{
              width: '85%',
              aspectRatio: '1.6/1',
              background: card.type === 'bank' ? '#2563eb' : theme.card,
              border: `1px solid ${theme.border}`,
            }}
            onClick={() => setActiveCardIndex(idx)}
          >
            <div className="relative h-full flex flex-col justify-between p-5 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">{card.name}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-sm">link</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.2)' }}>연결됨</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-lg font-bold tracking-widest mb-4">**** **** **** {card.lastFour || '0000'}</p>
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {card.type === 'bank' ? 'CHECK' : 'PREPAID'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Add Card */}
        <div
          className="snap-center shrink-0 flex flex-col items-center justify-center rounded-2xl cursor-pointer"
          style={{
            width: '20%',
            minWidth: '80px',
            aspectRatio: '0.4/1',
            border: `2px dashed ${theme.border}`,
            color: theme.textMuted,
          }}
          onClick={() => navigate('/consumer/add-card')}
        >
          <span className="material-symbols-outlined text-3xl">add</span>
          <span className="text-xs font-bold text-center mt-1">추가</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 px-5 mb-6">
        {[
          { icon: 'add_card', label: '충전', path: '/consumer/topup', primary: true },
          { icon: 'qr_code_scanner', label: 'QR결제', path: '/consumer/scan' },
          { icon: 'history', label: '내역', path: '/consumer/history' },
          { icon: 'settings', label: '관리', path: '/consumer/profile' },
        ].map((action, idx) => (
          <button
            key={idx}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: action.primary ? theme.accent : theme.card,
                border: action.primary ? 'none' : `1px solid ${theme.border}`,
              }}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ color: action.primary ? '#fff' : theme.textSecondary }}
              >
                {action.icon}
              </span>
            </div>
            <span className="text-xs" style={{ color: theme.textSecondary }}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Programmable Money Tokens */}
      {programmableTokens.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold" style={{ color: theme.text }}>프로그래머블 머니</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: theme.accentSoft, color: theme.accent }}>
              {programmableTokens.length}
            </span>
          </div>

          <div className="space-y-3">
            {programmableTokens.map((token) => {
              const daysUntilExpiry = Math.ceil((token.restrictions.expiryDate - Date.now()) / (24 * 60 * 60 * 1000));
              const fundColor = getFundTypeColor(token.fundType);

              return (
                <div
                  key={token.id}
                  className="rounded-xl p-4"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${fundColor}20` }}>
                        <span className="material-symbols-outlined text-[18px]" style={{ color: fundColor }}>token</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.text }}>{getFundTypeName(token.fundType)}</p>
                        <p className="text-xs" style={{ color: theme.textMuted }}>{daysUntilExpiry}일 후 만료</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{formatAmount(token.amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: theme.text }}>최근 활동</h3>
          <button onClick={() => navigate('/consumer/history')} style={{ color: theme.accent }} className="text-sm font-medium">
            전체보기
          </button>
        </div>

        <div className="space-y-2">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: theme.accentSoft }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: theme.accent }}>receipt_long</span>
              </div>
              <p className="text-sm" style={{ color: theme.textMuted }}>최근 거래 내역이 없습니다</p>
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const isIncome = tx.type === 'topup' || tx.type === 'refund';
              return (
                <button
                  key={tx.id}
                  onClick={() => navigate(`/consumer/transaction/${tx.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: isIncome ? theme.accentSoft : theme.cardHover }}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ color: isIncome ? theme.accent : theme.textSecondary }}>
                      {tx.type === 'payment' ? 'shopping_bag' : tx.type === 'topup' ? 'add_circle' : 'redeem'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: theme.text }}>{tx.merchantName}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>{formatTime(tx.createdAt)}</p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: isIncome ? '#22c55e' : theme.text }}>
                    {isIncome ? '+' : '-'}{formatAmount(tx.amount)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
