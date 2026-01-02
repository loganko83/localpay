import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMerchantDetail } from '../../services/api';

import { theme } from '../../styles/theme';

// Default placeholder data for when API data is loading
const defaultMerchant = {
  storeName: '',
  category: '',
  description: '',
  rating: 0,
  reviewCount: 0,
  isOpen: true,
  address: '',
  phone: '',
  imageUrl: '',
};

// Sample popular items (these would come from a menu API in production)
const popularItems = [
  { name: '생선구이 정식', price: 35000, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=300' },
  { name: '해물탕', price: 28000, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=300' },
  { name: '모둠회', price: 55000, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=300' },
];

const amenities = ['주차', 'WiFi', '카드결제', '예약가능'];

const MerchantDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Fetch merchant details from API
  const { data: merchantData, isLoading } = useMerchantDetail(id);
  const merchant = merchantData ?? defaultMerchant;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: theme.bg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" style={{ borderColor: theme.accent }}></div>
          <p style={{ color: theme.textSecondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: theme.bg }}>
      {/* Hero Image */}
      <div className="relative h-64" style={{ background: theme.card }}>
        <img
          src={merchant.imageUrl || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600'}
          alt={merchant.storeName}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${theme.bg}, transparent 50%, transparent)` }}
        />

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>

        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: merchant.isOpen ? '#22c55e' : theme.accent,
              color: '#fff',
            }}
          >
            {merchant.isOpen ? '영업중' : '영업종료'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-8 relative z-10">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-1" style={{ color: theme.text }}>{merchant.storeName}</h1>
          <p style={{ color: theme.textSecondary }}>{merchant.category}</p>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]" style={{ color: '#facc15' }}>star</span>
              <span className="text-sm font-bold" style={{ color: theme.text }}>{merchant.rating}</span>
              <span className="text-sm" style={{ color: theme.textSecondary }}>({merchant.reviewCount}개 리뷰)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          {[
            { icon: 'call', label: '전화' },
            { icon: 'directions', label: '길찾기' },
            { icon: 'language', label: '웹사이트' },
            { icon: 'share', label: '공유' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <span className="material-symbols-outlined" style={{ color: theme.text }}>{action.icon}</span>
              <span className="text-xs" style={{ color: theme.textSecondary }}>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Cashback Banner */}
        <div
          className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}30` }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: theme.accent + '30' }}
          >
            <span className="material-symbols-outlined" style={{ color: theme.accent }}>local_offer</span>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: theme.accent }}>5% 캐시백</p>
            <p className="text-xs" style={{ color: theme.textSecondary }}>LocalPay로 결제하고 리워드를 받으세요</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-4 mb-6">
          {merchant.address && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>location_on</span>
              <div>
                <p className="text-sm" style={{ color: theme.text }}>{merchant.address}</p>
                <button className="text-xs mt-1" style={{ color: theme.accent }}>지도에서 보기</button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>schedule</span>
            <p className="text-sm" style={{ color: theme.text }}>오전 11:00 - 오후 10:00</p>
          </div>
          {merchant.phone && (
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>call</span>
              <p className="text-sm" style={{ color: theme.text }}>{merchant.phone}</p>
            </div>
          )}
        </div>

        {/* Popular Items */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>인기 메뉴</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {popularItems.map((item, idx) => (
              <div key={idx} className="flex-shrink-0 w-36">
                <div className="h-24 rounded-xl overflow-hidden mb-2">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{item.name}</p>
                <p className="text-xs" style={{ color: theme.accent }}>{formatAmount(item.price)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>편의시설</h3>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <span
                key={amenity}
                className="px-3 py-1.5 rounded-full text-xs"
                style={{ background: theme.cardHover, color: theme.textSecondary }}
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 flex gap-3"
        style={{ background: `${theme.bg}ee`, borderTop: `1px solid ${theme.border}` }}
      >
        <button
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: theme.cardHover, color: theme.textSecondary }}
        >
          <span className="material-symbols-outlined">chat</span>
        </button>
        <button
          onClick={() => navigate('/consumer/scan')}
          className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: theme.accent }}
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          LocalPay로 결제
        </button>
      </div>
    </div>
  );
};

export default MerchantDetail;
