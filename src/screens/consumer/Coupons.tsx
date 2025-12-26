import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegionalCoupon } from '../../types';

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

// Mock regional coupons
const mockCoupons: RegionalCoupon[] = [
  {
    id: 'coup-001',
    name: '10% Discount',
    description: 'Get 10% off at participating restaurants in Hanok Village',
    merchantId: 'm-001',
    merchantName: 'Jeonju Bibimbap House',
    discountType: 'percentage',
    discountValue: 10,
    minPurchase: 20000,
    maxDiscount: 5000,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    usageLimit: 1000,
    usedCount: 456,
    category: 'food',
    region: 'jeonju',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400',
  },
  {
    id: 'coup-002',
    name: '5,000 KRW Off',
    description: 'Fixed discount on traditional craft purchases',
    merchantName: 'Hanok Crafts',
    discountType: 'fixed',
    discountValue: 5000,
    minPurchase: 30000,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    usageLimit: 500,
    usedCount: 123,
    category: 'retail',
    region: 'jeonju',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400',
  },
  {
    id: 'coup-003',
    name: 'Youth 15% Off',
    description: 'Special discount for youth (19-34) with verified credentials',
    discountType: 'percentage',
    discountValue: 15,
    minPurchase: 10000,
    maxDiscount: 10000,
    validFrom: '2024-03-01',
    validUntil: '2024-12-31',
    usageLimit: 2000,
    usedCount: 890,
    category: 'all',
    region: 'jeonju',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400',
  },
  {
    id: 'coup-004',
    name: 'Traditional Market',
    description: '7% cashback at Jeonju Traditional Market',
    discountType: 'percentage',
    discountValue: 7,
    minPurchase: 5000,
    maxDiscount: 3000,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    usageLimit: 5000,
    usedCount: 2341,
    category: 'market',
    region: 'jeonju',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400',
  },
  {
    id: 'coup-005',
    name: 'Culture Experience',
    description: '20% off at Jeonju cultural experience centers',
    merchantName: 'Hanok Experience Center',
    discountType: 'percentage',
    discountValue: 20,
    minPurchase: 15000,
    maxDiscount: 8000,
    validFrom: '2024-06-01',
    validUntil: '2024-12-31',
    usageLimit: 300,
    usedCount: 287,
    category: 'culture',
    region: 'jeonju',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=400',
  },
];

const categories = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'food', label: 'Food', icon: 'restaurant' },
  { id: 'retail', label: 'Retail', icon: 'shopping_bag' },
  { id: 'market', label: 'Market', icon: 'storefront' },
  { id: 'culture', label: 'Culture', icon: 'museum' },
];

const Coupons: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCoupon, setSelectedCoupon] = useState<RegionalCoupon | null>(null);

  const filteredCoupons = useMemo(() => {
    if (selectedCategory === 'all') return mockCoupons;
    return mockCoupons.filter(c => c.category === selectedCategory);
  }, [selectedCategory]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getDiscountDisplay = (coupon: RegionalCoupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}%`;
    }
    return `${formatAmount(coupon.discountValue)} KRW`;
  };

  const getRemainingCount = (coupon: RegionalCoupon) => {
    return coupon.usageLimit - coupon.usedCount;
  };

  const getUsagePercentage = (coupon: RegionalCoupon) => {
    return Math.round((coupon.usedCount / coupon.usageLimit) * 100);
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
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Regional Coupons</h1>
        <div className="w-8" />
      </header>

      {/* My Coupons Summary */}
      <div className="px-5 py-4">
        <div className="rounded-xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Available Coupons</p>
              <h2 className="text-2xl font-bold" style={{ color: theme.text }}>3</h2>
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
              <p className="text-lg font-bold" style={{ color: theme.text }}>12</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Used</p>
            </div>
            <div className="flex-1 text-center" style={{ borderLeft: `1px solid ${theme.border}` }}>
              <p className="text-lg font-bold" style={{ color: theme.accent }}>15,000</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Saved (KRW)</p>
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
                src={coupon.imageUrl}
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
                      {getRemainingCount(coupon)} left
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
                  <span>Until {new Date(coupon.validUntil).toLocaleDateString('ko-KR')}</span>
                </div>
                {coupon.minPurchase && (
                  <span style={{ color: theme.textMuted }}>
                    Min. {formatAmount(coupon.minPurchase)} KRW
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
                  <span>{coupon.usedCount} claimed</span>
                  <span>{getRemainingCount(coupon)} remaining</span>
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
                src={selectedCoupon.imageUrl}
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
                  <span className="text-sm" style={{ color: theme.textSecondary }}>Discount</span>
                  <span className="font-medium" style={{ color: theme.text }}>
                    {selectedCoupon.discountType === 'percentage'
                      ? `${selectedCoupon.discountValue}% Off`
                      : `${formatAmount(selectedCoupon.discountValue)} KRW Off`}
                  </span>
                </div>
                {selectedCoupon.minPurchase && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>Min. Purchase</span>
                    <span style={{ color: theme.text }}>{formatAmount(selectedCoupon.minPurchase)} KRW</span>
                  </div>
                )}
                {selectedCoupon.maxDiscount && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>Max. Discount</span>
                    <span style={{ color: theme.text }}>{formatAmount(selectedCoupon.maxDiscount)} KRW</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: theme.textSecondary }}>Valid Until</span>
                  <span style={{ color: theme.text }}>
                    {new Date(selectedCoupon.validUntil).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {selectedCoupon.merchantName && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: theme.textSecondary }}>Merchant</span>
                    <span style={{ color: theme.accent }}>{selectedCoupon.merchantName}</span>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="rounded-xl p-4" style={{ background: theme.bg }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: theme.textSecondary }}>Remaining</span>
                  <span className="text-lg font-bold" style={{ color: theme.accent }}>
                    {getRemainingCount(selectedCoupon)} / {selectedCoupon.usageLimit}
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
                <p>- Cannot be combined with other discounts</p>
                <p>- One coupon per transaction</p>
                <p>- Valid only at participating merchants in {selectedCoupon.region}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
              <button
                className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: theme.accent }}
                onClick={() => {
                  setSelectedCoupon(null);
                  navigate('/consumer/scan');
                }}
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                Use Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
