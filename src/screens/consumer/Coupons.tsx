/**
 * Consumer Regional Coupons Screen
 *
 * PoC Feature: Regional coupon system for local currency
 * - Browse available coupons by category
 * - View coupon details and usage conditions
 * - Claim and track coupon usage
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';
import { Card, Badge, Button } from '../../components/common';
import { RegionalCoupon } from '../../types';

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
    <div className="flex flex-col pb-4">
      <Header title="Regional Coupons" showBack />

      {/* My Coupons Summary */}
      <div className="px-4 py-4">
        <Card variant="balance" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Available Coupons</p>
              <h2 className="text-2xl font-bold text-white">3</h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                confirmation_number
              </span>
            </div>
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-surface-highlight">
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-white">12</p>
              <p className="text-xs text-text-secondary">Used</p>
            </div>
            <div className="flex-1 text-center border-l border-surface-highlight">
              <p className="text-lg font-bold text-primary">15,000</p>
              <p className="text-xs text-text-secondary">Saved (KRW)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-secondary hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Coupon List */}
      <div className="px-4 space-y-3">
        {filteredCoupons.map((coupon) => (
          <button
            key={coupon.id}
            onClick={() => setSelectedCoupon(coupon)}
            className="w-full bg-surface rounded-2xl overflow-hidden text-left hover:bg-surface-highlight transition-colors"
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
                    <Badge variant="primary" size="sm">
                      {getDiscountDisplay(coupon)}
                    </Badge>
                    <h3 className="text-lg font-bold text-white mt-1">{coupon.name}</h3>
                  </div>
                  {getRemainingCount(coupon) < 50 && (
                    <Badge variant="warning" size="sm">
                      {getRemainingCount(coupon)} left
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Coupon Body */}
            <div className="p-4">
              <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                {coupon.description}
              </p>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-text-muted">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span>Until {new Date(coupon.validUntil).toLocaleDateString('ko-KR')}</span>
                </div>
                {coupon.minPurchase && (
                  <span className="text-text-muted">
                    Min. {formatAmount(coupon.minPurchase)} KRW
                  </span>
                )}
              </div>

              {/* Usage Progress */}
              <div className="mt-3">
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${getUsagePercentage(coupon)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-text-muted">
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
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Modal Header Image */}
            <div className="relative h-48 flex-shrink-0">
              <img
                src={selectedCoupon.imageUrl}
                alt={selectedCoupon.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
              <button
                onClick={() => setSelectedCoupon(null)}
                className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-sm rounded-full"
              >
                <span className="material-symbols-outlined text-white">close</span>
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <Badge variant="primary" size="lg">
                  {getDiscountDisplay(selectedCoupon)}
                </Badge>
                <h2 className="text-2xl font-bold text-white mt-2">{selectedCoupon.name}</h2>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-text-secondary">{selectedCoupon.description}</p>

              {/* Coupon Details */}
              <div className="bg-background rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Discount</span>
                  <span className="text-white font-medium">
                    {selectedCoupon.discountType === 'percentage'
                      ? `${selectedCoupon.discountValue}% Off`
                      : `${formatAmount(selectedCoupon.discountValue)} KRW Off`}
                  </span>
                </div>
                {selectedCoupon.minPurchase && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Min. Purchase</span>
                    <span className="text-white">{formatAmount(selectedCoupon.minPurchase)} KRW</span>
                  </div>
                )}
                {selectedCoupon.maxDiscount && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Max. Discount</span>
                    <span className="text-white">{formatAmount(selectedCoupon.maxDiscount)} KRW</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Valid Until</span>
                  <span className="text-white">
                    {new Date(selectedCoupon.validUntil).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {selectedCoupon.merchantName && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Merchant</span>
                    <span className="text-primary">{selectedCoupon.merchantName}</span>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="bg-background rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-text-secondary">Remaining</span>
                  <span className="text-lg font-bold text-primary">
                    {getRemainingCount(selectedCoupon)} / {selectedCoupon.usageLimit}
                  </span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${100 - getUsagePercentage(selectedCoupon)}%` }}
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="text-xs text-text-muted space-y-1">
                <p>- Cannot be combined with other discounts</p>
                <p>- One coupon per transaction</p>
                <p>- Valid only at participating merchants in {selectedCoupon.region}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-background flex-shrink-0">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  setSelectedCoupon(null);
                  navigate('/consumer/scan');
                }}
              >
                <span className="material-symbols-outlined mr-2">qr_code_scanner</span>
                Use Coupon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
