import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoupons, useCouponStats, useClaimCoupon, type Coupon } from '../../services/api';

import { theme } from '../../styles/theme';

const categories = [
  { id: 'all', label: '전체', icon: 'apps' },
  { id: 'food', label: '음식', icon: 'restaurant' },
  { id: 'retail', label: '소매', icon: 'shopping_bag' },
  { id: 'market', label: '시장', icon: 'storefront' },
  { id: 'culture', label: '문화', icon: 'museum' },
];

const Coupons: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // Fetch coupons from API
  const { data: couponsData } = useCoupons({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    limit: 50,
  });
  const { data: statsData } = useCouponStats();
  const claimMutation = useClaimCoupon();

  const coupons = couponsData?.coupons ?? [];
  const stats = statsData ?? { available: 0, used: 0, expired: 0, totalSaved: 0 };

  const filteredCoupons = useMemo(() => {
    return coupons;
  }, [coupons]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}%`;
    }
    return `${formatAmount(coupon.discountValue)}원`;
  };

  const getRemainingCount = (coupon: Coupon) => {
    return coupon.remainingCount ?? 0;
  };

  const getUsagePercentage = (coupon: Coupon) => {
    // Calculate from remainingCount if available
    if (coupon.remainingCount !== null && coupon.remainingCount !== undefined) {
      // Estimate based on typical 1000 limit
      return Math.max(0, 100 - Math.round((coupon.remainingCount / 1000) * 100));
    }
    return 50; // Default
  };

  const handleClaimCoupon = async () => {
    if (!selectedCoupon || selectedCoupon.claimed) return;
    try {
      await claimMutation.mutateAsync(selectedCoupon.id);
      setSelectedCoupon(null);
    } catch (error) {
      console.error('Failed to claim coupon:', error);
    }
  };

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
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>지역 쿠폰</h1>
        <div className="w-8" />
      </header>

      {/* My Coupons Summary */}
      <div className="px-5 py-4">
        <div className="rounded-xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>사용 가능 쿠폰</p>
              <h2 className="text-2xl font-bold" style={{ color: theme.text }}>{stats.available}</h2>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: theme.accentSoft }}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: theme.accent }}>confirmation_number</span>
            </div>
          </div>
          <div className="flex gap-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
            <div className="flex-1 text-center">
              <p className="text-lg font-bold" style={{ color: theme.text }}>{stats.used}</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>사용함</p>
            </div>
            <div className="flex-1 text-center" style={{ borderLeft: `1px solid ${theme.border}` }}>
              <p className="text-lg font-bold" style={{ color: theme.accent }}>{formatAmount(stats.totalSaved)}</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>절약 (원)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all"
              style={{
                background: selectedCategory === cat.id ? theme.accent : theme.card,
                color: selectedCategory === cat.id ? '#fff' : theme.textSecondary,
                border: `1px solid ${selectedCategory === cat.id ? theme.accent : theme.border}`,
              }}
            >
              <span className="material-symbols-outlined text-lg">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Coupon List */}
      <div className="px-5 space-y-3">
        {filteredCoupons.map((coupon) => (
          <button
            key={coupon.id}
            onClick={() => setSelectedCoupon(coupon)}
            className="w-full rounded-xl overflow-hidden text-left"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            {/* Coupon Header with Image */}
            <div className="relative h-32 overflow-hidden">
              <img
                src={coupon.imageUrl || 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400'}
                alt={coupon.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded"
                      style={{ background: theme.accent, color: '#fff' }}
                    >
                      {getDiscountDisplay(coupon)}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">{coupon.name}</h3>
                  </div>
                  {getRemainingCount(coupon) < 50 && (
                    <span
                      className="text-xs font-bold px-2 py-1 rounded"
                      style={{ background: '#f59e0b', color: '#fff' }}
                    >
                      {getRemainingCount(coupon)}개 남음
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Coupon Body */}
            <div className="p-4">
              <p className="text-sm line-clamp-2 mb-3" style={{ color: theme.textSecondary }}>
                {coupon.description}
              </p>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1" style={{ color: theme.textMuted }}>
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span>{new Date(coupon.validUntil).toLocaleDateString('ko-KR')}까지</span>
                </div>
                {coupon.minPurchase && (
                  <span style={{ color: theme.textMuted }}>
                    최소 {formatAmount(coupon.minPurchase)}원
                  </span>
                )}
              </div>

              {/* Usage Progress */}
              <div className="mt-3">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${getUsagePercentage(coupon)}%`, background: theme.accent }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px]" style={{ color: theme.textMuted }}>
                  <span>{coupon.claimed ? '받은 쿠폰' : '받지 않음'}</span>
                  <span>{getRemainingCount(coupon)}개 남음</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Coupon Detail Modal */}
      {selectedCoupon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div
            className="w-full max-w-md mx-auto rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: theme.card }}
          >
            {/* Modal Header Image */}
            <div className="relative h-48 flex-shrink-0">
              <img
                src={selectedCoupon.imageUrl || 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400'}
                alt={selectedCoupon.name}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${theme.card}, transparent 50%, transparent)` }}
              />
              <button
                onClick={() => setSelectedCoupon(null)}
                className="absolute top-4 right-4 p-2 rounded-full"
                style={{ background: 'rgba(0,0,0,0.3)' }}
              >
                <span className="material-symbols-outlined text-white">close</span>
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <span
                  className="text-sm font-bold px-3 py-1 rounded"
                  style={{ background: theme.accent, color: '#fff' }}
                >
                  {getDiscountDisplay(selectedCoupon)}
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">{selectedCoupon.name}</h2>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p style={{ color: theme.textSecondary }}>{selectedCoupon.description}</p>

              {/* Coupon Details */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: theme.bg }}>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: theme.textSecondary }}>할인</span>
                  <span className="font-medium" style={{ color: theme.text }}>
                    {selectedCoupon.discountType === 'percentage'
                      ? `${selectedCoupon.discountValue}% 할인`
                      : `${formatAmount(selectedCoupon.discountValue)}원 할인`}
                  </span>
                </div>
                {selectedCoupon.minPurchase && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>최소 구매금액</span>
                    <span style={{ color: theme.text }}>{formatAmount(selectedCoupon.minPurchase)}원</span>
                  </div>
                )}
                {selectedCoupon.maxDiscount && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>최대 할인금액</span>
                    <span style={{ color: theme.text }}>{formatAmount(selectedCoupon.maxDiscount)}원</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: theme.textSecondary }}>유효기간</span>
                  <span style={{ color: theme.text }}>
                    {new Date(selectedCoupon.validUntil).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {selectedCoupon.merchant?.name && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>가맹점</span>
                    <span style={{ color: theme.accent }}>{selectedCoupon.merchant.name}</span>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="rounded-xl p-4" style={{ background: theme.bg }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: theme.textSecondary }}>남은 수량</span>
                  <span className="text-lg font-bold" style={{ color: theme.accent }}>
                    {getRemainingCount(selectedCoupon)}개
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.cardHover }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${100 - getUsagePercentage(selectedCoupon)}%`, background: theme.accent }}
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="text-xs space-y-1" style={{ color: theme.textMuted }}>
                <p>- 다른 할인과 중복 적용 불가</p>
                <p>- 거래당 1회 사용 가능</p>
                <p>- {selectedCoupon.region} 지역 참여 가맹점에서만 사용 가능</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
              {selectedCoupon.claimed ? (
                <button
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: theme.accent }}
                  onClick={() => {
                    setSelectedCoupon(null);
                    navigate('/consumer/scan');
                  }}
                >
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                  쿠폰 사용하기
                </button>
              ) : (
                <button
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: theme.accent, opacity: claimMutation.isPending ? 0.7 : 1 }}
                  onClick={handleClaimCoupon}
                  disabled={claimMutation.isPending}
                >
                  <span className="material-symbols-outlined">download</span>
                  {claimMutation.isPending ? '받는 중...' : '쿠폰 받기'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
