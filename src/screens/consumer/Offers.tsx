import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../../store';

import { theme } from '../../styles/theme';

const categories = ['전체', '음식', '카페', '쇼핑', '뷰티', '엔터테인먼트'];

const hotDeals = [
  {
    id: '1',
    title: '10% 캐시백',
    subtitle: '서면 전 음식점',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600',
    validUntil: '2024-12-31',
  },
  {
    id: '2',
    title: '포인트 2배',
    subtitle: '주말 쇼핑 혜택',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600',
    validUntil: '2024-12-25',
  },
];

const nearbyOffers = [
  {
    id: '1',
    merchantName: '스타벅스 해운대점',
    category: '카페',
    distance: '150m',
    offerType: 'cashback',
    offerValue: '5%',
    imageUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=200',
    expiresIn: '3일 후',
  },
  {
    id: '2',
    merchantName: '올리브영',
    category: '뷰티',
    distance: '300m',
    offerType: 'coupon',
    offerValue: '5,000원 할인',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=200',
    expiresIn: '7일 후',
  },
  {
    id: '3',
    merchantName: 'CGV 영화관',
    category: '엔터테인먼트',
    distance: '500m',
    offerType: 'discount',
    offerValue: '20%',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=200',
    expiresIn: '5일 후',
  },
  {
    id: '4',
    merchantName: '파리바게뜨',
    category: '음식',
    distance: '200m',
    offerType: 'cashback',
    offerValue: '3%',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200',
    expiresIn: '10일 후',
  },
];

const Offers: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const [activeCategory, setActiveCategory] = useState('All');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const filteredOffers = activeCategory === '전체'
    ? nearbyOffers
    : nearbyOffers.filter(offer => offer.category === activeCategory);

  const getOfferBadgeStyle = (offerType: string) => {
    switch (offerType) {
      case 'cashback':
        return { background: '#22c55e20', color: '#22c55e' };
      case 'coupon':
        return { background: '#3b82f620', color: '#3b82f6' };
      case 'discount':
        return { background: theme.accentSoft, color: theme.accent };
      default:
        return { background: theme.cardHover, color: theme.textSecondary };
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>특별 혜택</h1>
          <p className="text-sm" style={{ color: theme.textSecondary }}>내 주변 혜택을 찾아보세요</p>
        </div>
        <div className="px-3 py-1.5 rounded-full" style={{ background: theme.accentSoft }}>
          <span className="text-sm font-bold" style={{ color: theme.accent }}>
            {formatAmount(wallet?.balance || 0)} B
          </span>
        </div>
      </div>

      {/* Hot Deals Carousel */}
      <div className="mb-6">
        <div className="flex gap-4 px-5 overflow-x-auto no-scrollbar">
          {hotDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex-shrink-0 w-72 h-40 rounded-2xl overflow-hidden relative"
            >
              <img
                src={deal.image}
                alt={deal.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span
                  className="text-xs font-bold px-2 py-1 rounded"
                  style={{ background: theme.accent, color: '#fff' }}
                >
                  HOT
                </span>
                <h3 className="text-lg font-bold text-white mt-2">{deal.title}</h3>
                <p className="text-sm text-white/80">{deal.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                background: activeCategory === category ? theme.accent : theme.card,
                color: activeCategory === category ? '#fff' : theme.textSecondary,
                border: `1px solid ${activeCategory === category ? theme.accent : theme.border}`,
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby Offers */}
      <div className="px-5">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>근처 혜택</h3>
        <div className="space-y-3">
          {filteredOffers.map((offer) => (
            <button
              key={offer.id}
              onClick={() => navigate(`/consumer/merchant/${offer.id}`)}
              className="w-full rounded-xl p-3 text-left"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex gap-3">
                <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={offer.imageUrl}
                    alt={offer.merchantName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold truncate" style={{ color: theme.text }}>
                        {offer.merchantName}
                      </h4>
                      <p className="text-xs" style={{ color: theme.textSecondary }}>
                        {offer.category} • {offer.distance}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded"
                      style={getOfferBadgeStyle(offer.offerType)}
                    >
                      {offer.offerValue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs" style={{ color: theme.textMuted }}>
                      {offer.expiresIn} 만료
                    </span>
                    <span
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: theme.accent, color: '#fff' }}
                    >
                      {offer.offerType === 'coupon' ? '쿠폰 받기' : '방문하기'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offers;
