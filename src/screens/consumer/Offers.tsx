import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOffers, useWalletBalance } from '../../services/api';

import { theme } from '../../styles/theme';

const categories = ['전체', '음식', '카페', '쇼핑', '뷰티', '엔터테인먼트'];

const Offers: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('전체');

  // Fetch offers and wallet balance from API
  const { data: offersData } = useOffers(1, 50);
  const { data: walletData } = useWalletBalance();

  const offers = offersData?.offers ?? [];
  const balance = walletData?.balance ?? 0;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // Filter offers - for now show all since offers don't have category in API
  const filteredOffers = offers;

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
            {formatAmount(balance)} B
          </span>
        </div>
      </div>

      {/* Hot Deals Carousel */}
      <div className="mb-6">
        <div className="flex gap-4 px-5 overflow-x-auto no-scrollbar">
          {offers.slice(0, 3).map((offer) => (
            <div
              key={offer.id}
              className="flex-shrink-0 w-72 h-40 rounded-2xl overflow-hidden relative"
              onClick={() => navigate(`/consumer/merchant/${offer.merchant?.id || offer.id}`)}
            >
              <img
                src={offer.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'}
                alt={offer.title}
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
                <h3 className="text-lg font-bold text-white mt-2">{offer.title}</h3>
                <p className="text-sm text-white/80">{offer.merchant?.name || offer.description}</p>
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
          {filteredOffers.map((offer) => {
            const offerType = offer.discountType || 'discount';
            const offerValue = offer.discountValue
              ? (offer.discountType === 'percentage' ? `${offer.discountValue}%` : `${formatAmount(offer.discountValue)}원`)
              : '혜택';
            const expiresText = offer.validUntil
              ? new Date(offer.validUntil).toLocaleDateString('ko-KR')
              : '상시';

            return (
              <button
                key={offer.id}
                onClick={() => navigate(`/consumer/merchant/${offer.merchant?.id || offer.id}`)}
                className="w-full rounded-xl p-3 text-left"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex gap-3">
                  <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={offer.imageUrl || offer.merchant?.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200'}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold truncate" style={{ color: theme.text }}>
                          {offer.merchant?.name || offer.title}
                        </h4>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>
                          {offer.title}
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-1 rounded"
                        style={getOfferBadgeStyle(offerType)}
                      >
                        {offerValue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs" style={{ color: theme.textMuted }}>
                        {expiresText} 까지
                      </span>
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: theme.accent, color: '#fff' }}
                      >
                        방문하기
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Offers;
