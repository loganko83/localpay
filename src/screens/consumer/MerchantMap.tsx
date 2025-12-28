import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { theme } from '../../styles/theme';

const categories = [
  { id: 'all', label: '전체', icon: 'grid_view' },
  { id: 'food', label: '음식', icon: 'restaurant' },
  { id: 'shopping', label: '쇼핑', icon: 'shopping_bag' },
  { id: 'cafe', label: '카페', icon: 'local_cafe' },
  { id: 'services', label: '서비스', icon: 'home_repair_service' },
  { id: 'beauty', label: '뷰티', icon: 'face_retouching_natural' },
  { id: 'health', label: '건강', icon: 'medical_services' },
];

const categoryLabels: Record<string, string> = {
  food: '음식',
  shopping: '쇼핑',
  cafe: '카페',
  services: '서비스',
  beauty: '뷰티',
  health: '건강',
};

const mockMerchants = [
  {
    id: '1',
    name: '전주 비빔밥집',
    category: 'food',
    distance: '0.3 km',
    rating: 4.8,
    reviewCount: 120,
    localCurrency: '원',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=300',
    cashbackRate: 5,
    isOpen: true,
  },
  {
    id: '2',
    name: 'K-패션 부티크',
    category: 'shopping',
    distance: '0.5 km',
    rating: 4.6,
    reviewCount: 85,
    localCurrency: '원',
    imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=300',
    cashbackRate: 3,
    isOpen: true,
  },
  {
    id: '3',
    name: '서울 커피 로스터스',
    category: 'cafe',
    distance: '0.7 km',
    rating: 4.9,
    reviewCount: 200,
    localCurrency: '원',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=300',
    cashbackRate: 4,
    isOpen: true,
  },
  {
    id: '4',
    name: '한옥 스파 & 웰니스',
    category: 'beauty',
    distance: '0.9 km',
    rating: 4.7,
    reviewCount: 95,
    localCurrency: '원',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=300',
    cashbackRate: 6,
    isOpen: false,
  },
  {
    id: '5',
    name: '강남 메디컬센터',
    category: 'health',
    distance: '1.2 km',
    rating: 4.5,
    reviewCount: 75,
    localCurrency: '원',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=300',
    cashbackRate: 2,
    isOpen: true,
  },
];

const MerchantMap: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredMerchants = selectedCategory === 'all'
    ? mockMerchants
    : mockMerchants.filter(m => m.category === selectedCategory);

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
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>주변 가맹점</h1>
        <div className="w-8" />
      </header>

      {/* Map Placeholder */}
      <div className="relative h-64" style={{ background: theme.cardHover, borderBottom: `1px solid ${theme.border}` }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-6xl mb-2" style={{ color: theme.textSecondary }}>map</span>
          <p className="text-sm" style={{ color: theme.textSecondary }}>지도 보기 - 준비 중</p>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>인터랙티브 지도가 곧 제공될 예정입니다</p>
        </div>

        {/* Location Indicator */}
        <div
          className="absolute top-4 left-4 rounded-full px-3 py-2 flex items-center gap-2"
          style={{ background: `${theme.bg}ee` }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>location_on</span>
          <span className="text-sm font-medium" style={{ color: theme.text }}>전주</span>
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: `${theme.bg}ee`, color: theme.text }}
          >
            <span className="material-symbols-outlined">my_location</span>
          </button>
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: `${theme.bg}ee`, color: theme.text }}
          >
            <span className="material-symbols-outlined">zoom_in</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all"
              style={{
                background: selectedCategory === category.id ? theme.accent : theme.card,
                color: selectedCategory === category.id ? '#fff' : theme.textSecondary,
                border: `1px solid ${selectedCategory === category.id ? theme.accent : theme.border}`,
              }}
            >
              <span className="material-symbols-outlined text-[18px]">{category.icon}</span>
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Merchant List */}
      <div className="px-5 py-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold" style={{ color: theme.text }}>
            주변 가맹점 {filteredMerchants.length}곳
          </h2>
          <button className="flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>
            <span className="material-symbols-outlined text-[16px]">tune</span>
            필터
          </button>
        </div>

        <div className="space-y-3">
          {filteredMerchants.map((merchant) => (
            <button
              key={merchant.id}
              onClick={() => navigate(`/consumer/merchant/${merchant.id}`)}
              className="w-full rounded-xl overflow-hidden text-left"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex gap-3">
                {/* Merchant Image */}
                <div className="relative w-24 h-24 flex-shrink-0">
                  <img
                    src={merchant.imageUrl}
                    alt={merchant.name}
                    className="w-full h-full object-cover"
                  />
                  {!merchant.isOpen && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-xs text-white font-bold">영업 종료</span>
                    </div>
                  )}
                </div>

                {/* Merchant Info */}
                <div className="flex-1 py-3 pr-3">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold leading-tight pr-2" style={{ color: theme.text }}>
                      {merchant.name}
                    </h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background: theme.accentSoft, color: theme.accent }}
                    >
                      {merchant.localCurrency}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: '#facc15' }}>star</span>
                      <span className="text-xs font-medium" style={{ color: theme.text }}>{merchant.rating}</span>
                      <span className="text-xs" style={{ color: theme.textMuted }}>({merchant.reviewCount})</span>
                    </div>
                    <span style={{ color: theme.textMuted }}>•</span>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: theme.accent }}>near_me</span>
                      <span className="text-xs" style={{ color: theme.textSecondary }}>{merchant.distance}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ background: '#22c55e20', color: '#22c55e' }}
                    >
                      <span className="material-symbols-outlined text-[10px]">local_offer</span>
                      {merchant.cashbackRate}% 캐시백
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ background: theme.cardHover, color: theme.textSecondary }}
                    >
                      {categoryLabels[merchant.category] || merchant.category}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredMerchants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-symbols-outlined text-6xl mb-2" style={{ color: theme.textMuted }}>store_off</span>
            <p style={{ color: theme.textSecondary }}>이 카테고리에 가맹점이 없습니다</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 text-sm font-medium"
              style={{ color: theme.accent }}
            >
              전체 가맹점 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantMap;
