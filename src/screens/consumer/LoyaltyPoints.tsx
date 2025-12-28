import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sharedLoyaltyService, LoyaltyMember, AllianceMerchant, MemberTier } from '../../services/sharedLoyalty';
import { useAuthStore } from '../../store';

import { theme } from '../../styles/theme';

const LoyaltyPoints: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [member, setMember] = useState<LoyaltyMember | null>(null);
  const [merchants, setMerchants] = useState<AllianceMerchant[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'redeem'>('overview');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');

  const userId = user?.id || 'consumer-demo-001';

  useEffect(() => {
    loadMemberData();
    loadMerchants();
  }, []);

  const loadMemberData = async () => {
    let memberData = sharedLoyaltyService.getMember(userId);
    if (!memberData) {
      memberData = await sharedLoyaltyService.enrollMember(userId);
    }
    sharedLoyaltyService.processExpiredPoints(userId);
    memberData = sharedLoyaltyService.getMember(userId);
    setMember(memberData);
  };

  const loadMerchants = () => {
    const mockMerchants: AllianceMerchant[] = [
      { id: 'AM-1', merchantId: 'merchant-001', merchantName: 'Jeonju Cafe', category: 'cafe', joinedAt: Date.now(), isActive: true, customEarnRate: 0.02, totalPointsIssued: 50000, totalPointsRedeemed: 20000, allianceFeePaid: 250 },
      { id: 'AM-2', merchantId: 'merchant-002', merchantName: 'Local Bakery', category: 'restaurant', joinedAt: Date.now(), isActive: true, totalPointsIssued: 35000, totalPointsRedeemed: 15000, allianceFeePaid: 175 },
      { id: 'AM-3', merchantId: 'merchant-003', merchantName: 'BookStore', category: 'retail', joinedAt: Date.now(), isActive: true, totalPointsIssued: 28000, totalPointsRedeemed: 10000, allianceFeePaid: 140 },
      { id: 'AM-4', merchantId: 'merchant-004', merchantName: 'Beauty Salon', category: 'services', joinedAt: Date.now(), isActive: true, customEarnRate: 0.03, totalPointsIssued: 45000, totalPointsRedeemed: 18000, allianceFeePaid: 225 },
      { id: 'AM-5', merchantId: 'merchant-005', merchantName: 'Gym & Fitness', category: 'services', joinedAt: Date.now(), isActive: true, totalPointsIssued: 60000, totalPointsRedeemed: 25000, allianceFeePaid: 300 },
      { id: 'AM-6', merchantId: 'merchant-006', merchantName: 'Pharmacy', category: 'retail', joinedAt: Date.now(), isActive: true, totalPointsIssued: 22000, totalPointsRedeemed: 8000, allianceFeePaid: 110 },
    ];
    setMerchants(mockMerchants);
  };

  const handleRedeemPoints = async () => {
    if (!userId || !selectedMerchant || !pointsToRedeem) {
      setRedeemError('가맹점을 선택하고 포인트 금액을 입력해주세요');
      return;
    }
    const points = parseInt(pointsToRedeem);
    if (isNaN(points) || points <= 0) {
      setRedeemError('유효하지 않은 포인트 금액입니다');
      return;
    }
    setIsRedeeming(true);
    setRedeemError('');
    const result = await sharedLoyaltyService.redeemPoints({ userId, merchantId: selectedMerchant, pointsToRedeem: points });
    setIsRedeeming(false);
    if (result.success) {
      setPointsToRedeem('');
      setSelectedMerchant('');
      loadMemberData();
      alert(`${points} 포인트 사용 완료 (${formatAmount(result.krwValue || 0)} 원)`);
    } else {
      setRedeemError(result.error || '포인트 사용 실패');
    }
  };

  const formatAmount = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount);
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });

  const getTierBenefits = () => member ? sharedLoyaltyService.getTierBenefits(member.currentTier) : null;

  const getTierColor = (tier: MemberTier) => {
    const colors: Record<MemberTier, string> = { BRONZE: '#fb923c', SILVER: '#9ca3af', GOLD: '#facc15', PLATINUM: '#60a5fa', VIP: '#a855f7' };
    return colors[tier];
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = { cafe: 'local_cafe', restaurant: 'restaurant', retail: 'shopping_bag', services: 'spa' };
    return icons[category] || 'store';
  };

  const getExpiringPoints = () => {
    if (!member) return null;
    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
    const expiringTransactions = member.pointHistory.filter(tx => tx.type === 'EARN' && tx.expiryDate && tx.expiryDate > now && tx.expiryDate < thirtyDaysFromNow);
    if (expiringTransactions.length === 0) return null;
    const totalExpiring = expiringTransactions.reduce((sum, tx) => sum + tx.points, 0);
    const nearestExpiry = Math.min(...expiringTransactions.map(tx => tx.expiryDate || now));
    return { points: totalExpiring, expiryDate: nearestExpiry };
  };

  const getTierProgress = () => {
    if (!member) return 0;
    const benefits = getTierBenefits();
    if (!benefits || !benefits.nextTier) return 100;
    const currentThreshold = sharedLoyaltyService.getConfig().tierThresholds[member.currentTier];
    const nextThreshold = benefits.spendingToNextTier;
    const progress = ((member.annualSpending - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: theme.bg }}>
        <span className="material-symbols-outlined text-6xl animate-spin" style={{ color: theme.accent }}>progress_activity</span>
        <p className="mt-4" style={{ color: theme.textSecondary }}>포인트 정보를 불러오는 중...</p>
      </div>
    );
  }

  const tierBenefits = getTierBenefits();
  const expiringPoints = getExpiringPoints();
  const tierProgress = getTierProgress();

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between" style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>포인트</h1>
        <button onClick={() => alert('도움말')}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.textSecondary }}>help_outline</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Expiring Points Alert */}
        {expiringPoints && (
          <div className="px-5 py-4">
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: '#eab308' }}>warning</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#eab308' }}>곧 만료되는 포인트</p>
                <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>{formatAmount(expiringPoints.points)} 포인트가 {formatDate(expiringPoints.expiryDate)}에 만료됩니다</p>
              </div>
            </div>
          </div>
        )}

        {/* Member Card */}
        <div className="px-5 py-4">
          <div className="rounded-2xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full mb-2" style={{ background: `${getTierColor(member.currentTier)}20`, border: `1px solid ${getTierColor(member.currentTier)}40` }}>
                  <span className="text-xs font-bold" style={{ color: getTierColor(member.currentTier) }}>{member.currentTier} 회원</span>
                </div>
                <p className="text-xs" style={{ color: theme.textSecondary }}>가입일: {formatDate(member.joinedAt)}</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: theme.accentSoft }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: theme.accent }}>stars</span>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>사용 가능 포인트</p>
              <h2 className="text-4xl font-bold" style={{ color: theme.text }}>{formatAmount(member.availablePoints)}</h2>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>= {formatAmount(member.availablePoints)} 원</p>
            </div>
            {tierBenefits?.nextTier && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs" style={{ color: theme.textSecondary }}>{tierBenefits.nextTier} 달성까지</p>
                  <p className="text-xs font-bold" style={{ color: theme.text }}>{formatAmount(member.annualSpending)} / {formatAmount(tierBenefits.spendingToNextTier)} 원</p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
                  <div className="h-full transition-all duration-500" style={{ width: `${tierProgress}%`, background: theme.accent }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier Benefits */}
        {tierBenefits && (
          <div className="px-5 mb-6">
            <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>나의 혜택</h3>
            <div className="rounded-xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.accentSoft }}>
                  <span className="material-symbols-outlined" style={{ color: theme.accent }}>percent</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: theme.text }}>{(tierBenefits.earnRate * 100).toFixed(1)}% 포인트 적립률</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>모든 구매에서 {tierBenefits.earnRate * 100}% 적립</p>
                </div>
              </div>
              {tierBenefits.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>check_circle</span>
                  <p className="text-sm" style={{ color: theme.text }}>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points Summary */}
        <div className="px-5 mb-6">
          <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>포인트 요약</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'trending_up', label: '누적 포인트', value: formatAmount(member.lifetimePoints) },
              { icon: 'account_balance_wallet', label: '총 사용 금액', value: formatAmount(member.lifetimeSpending) },
              { icon: 'calendar_today', label: '연간 사용 금액', value: formatAmount(member.annualSpending) },
              { icon: 'store', label: '가맹점', value: member.preferredMerchants.length.toString() },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: theme.accent }}>{item.icon}</span>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>{item.label}</p>
                </div>
                <p className="text-xl font-bold" style={{ color: theme.text }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mb-4">
          <div className="flex gap-2">
            {[
              { key: 'overview', label: '가맹점', icon: 'store' },
              { key: 'history', label: '내역', icon: 'history' },
              { key: 'redeem', label: '사용', icon: 'redeem' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: activeTab === tab.key ? theme.accent : theme.card,
                  color: activeTab === tab.key ? '#fff' : theme.textSecondary,
                  border: activeTab === tab.key ? 'none' : `1px solid ${theme.border}`,
                }}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span className="text-xs">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5">
          {activeTab === 'overview' && (
            <div>
              <p className="text-xs mb-4" style={{ color: theme.textSecondary }}>제휴 가맹점에서 포인트를 적립하고 사용하세요</p>
              <div className="grid grid-cols-2 gap-3">
                {merchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    onClick={() => navigate(`/consumer/merchant/${merchant.merchantId}`)}
                    className="p-4 rounded-xl text-center"
                    style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                  >
                    <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: theme.accentSoft }}>
                      <span className="material-symbols-outlined" style={{ color: theme.accent }}>{getCategoryIcon(merchant.category)}</span>
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: theme.text }}>{merchant.merchantName}</p>
                    {merchant.customEarnRate && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: theme.accentSoft, color: theme.accent }}>
                        +{(merchant.customEarnRate * 100).toFixed(0)}% 보너스
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <p className="text-xs mb-4" style={{ color: theme.textSecondary }}>포인트 거래 내역</p>
              <div className="space-y-3">
                {member.pointHistory.slice().reverse().map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: tx.type === 'EARN' || tx.type === 'BONUS' ? 'rgba(34,197,94,0.1)' : tx.type === 'REDEEM' ? theme.accentSoft : 'rgba(234,179,8,0.1)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: tx.type === 'EARN' || tx.type === 'BONUS' ? '#22c55e' : tx.type === 'REDEEM' ? theme.accent : '#eab308' }}>
                          {tx.type === 'EARN' ? 'add_circle' : tx.type === 'REDEEM' ? 'remove_circle' : tx.type === 'BONUS' ? 'star' : 'schedule'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: theme.text }}>{tx.merchantName || tx.description}</p>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>{formatDate(tx.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: tx.points > 0 ? '#22c55e' : theme.accent }}>{tx.points > 0 ? '+' : ''}{formatAmount(tx.points)}</p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>잔액: {formatAmount(tx.balanceAfter)}</p>
                    </div>
                  </div>
                ))}
                {member.pointHistory.length === 0 && (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl mb-4" style={{ color: theme.textMuted }}>receipt_long</span>
                    <p className="text-sm" style={{ color: theme.textSecondary }}>아직 거래 내역이 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'redeem' && (
            <div>
              <p className="text-xs mb-4" style={{ color: theme.textSecondary }}>포인트를 즉시 할인에 사용하세요</p>
              <div className="rounded-xl p-5 mb-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>사용할 포인트</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: theme.textMuted }}>stars</span>
                    <input
                      type="number"
                      placeholder="금액 입력"
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 rounded-xl outline-none"
                      style={{ background: theme.cardHover, border: `1px solid ${theme.border}`, color: theme.text }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: theme.textSecondary }}>최소: {formatAmount(sharedLoyaltyService.getConfig().minRedemptionPoints)} 포인트</p>
                </div>

                {pointsToRedeem && parseInt(pointsToRedeem) > 0 && (
                  <div className="rounded-xl p-4 mb-4" style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}30` }}>
                    <p className="text-xs mb-1" style={{ color: theme.textSecondary }}>할인 금액</p>
                    <p className="text-2xl font-bold" style={{ color: theme.accent }}>{formatAmount(parseInt(pointsToRedeem))} 원</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>가맹점 선택</label>
                  <div className="grid grid-cols-2 gap-2">
                    {merchants.map((merchant) => (
                      <button
                        key={merchant.id}
                        onClick={() => setSelectedMerchant(merchant.merchantId)}
                        className="p-3 rounded-xl transition-all"
                        style={{
                          background: selectedMerchant === merchant.merchantId ? theme.accentSoft : theme.cardHover,
                          border: `1px solid ${selectedMerchant === merchant.merchantId ? theme.accent : theme.border}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]" style={{ color: selectedMerchant === merchant.merchantId ? theme.accent : theme.textSecondary }}>{getCategoryIcon(merchant.category)}</span>
                          <p className="text-xs font-medium truncate" style={{ color: selectedMerchant === merchant.merchantId ? theme.text : theme.textSecondary }}>{merchant.merchantName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {redeemError && (
                  <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <p className="text-sm" style={{ color: '#ef4444' }}>{redeemError}</p>
                  </div>
                )}

                <button
                  onClick={handleRedeemPoints}
                  disabled={!selectedMerchant || !pointsToRedeem || parseInt(pointsToRedeem) <= 0 || isRedeeming}
                  className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: theme.accent, color: '#fff' }}
                >
                  {isRedeeming ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">redeem</span>
                      포인트 사용
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl p-4" style={{ background: theme.cardHover }}>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: '#3b82f6' }}>info</span>
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: theme.text }}>포인트 사용 안내</p>
                    <ul className="text-xs space-y-1" style={{ color: theme.textSecondary }}>
                      <li>1 포인트 = 1원 할인</li>
                      <li>최소 사용: {formatAmount(sharedLoyaltyService.getConfig().minRedemptionPoints)} 포인트</li>
                      <li>선택한 가맹점에서 사용 가능</li>
                      <li>사용된 포인트는 만료 없음</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoyaltyPoints;
