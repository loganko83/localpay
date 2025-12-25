import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Badge } from '../../components/common';

const mockMerchant = {
  id: '1',
  name: 'Jeonju Bibimbap House',
  category: 'Restaurant',
  description: 'Traditional Jeonju bibimbap and Korean cuisine',
  rating: 4.8,
  reviewCount: 120,
  isOpen: true,
  address: '123 Hanok Village Road, Jeonju',
  phone: '063-123-4567',
  hours: '11:00 AM - 10:00 PM',
  imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1470&auto=format&fit=crop',
  cashbackRate: 5,
  popularItems: [
    { name: 'Grilled Fish Set', price: 35000, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=300' },
    { name: 'Seafood Stew', price: 28000, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=300' },
    { name: 'Sashimi Platter', price: 55000, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=300' },
  ],
  amenities: ['Parking', 'WiFi', 'Card Payment', 'Reservations'],
};

const MerchantDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id: _id } = useParams();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <div className="flex flex-col pb-24">
      {/* Hero Image */}
      <div className="relative h-64 bg-surface">
        <img
          src={mockMerchant.imageUrl}
          alt={mockMerchant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge variant={mockMerchant.isOpen ? 'success' : 'error'}>
            {mockMerchant.isOpen ? 'OPEN' : 'CLOSED'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-10">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white mb-1">{mockMerchant.name}</h1>
          <p className="text-text-secondary">{mockMerchant.category}</p>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-yellow-500 text-[18px] filled">star</span>
              <span className="text-sm font-bold text-white">{mockMerchant.rating}</span>
              <span className="text-sm text-text-secondary">({mockMerchant.reviewCount} reviews)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          {[
            { icon: 'call', label: 'Call' },
            { icon: 'directions', label: 'Route' },
            { icon: 'language', label: 'Website' },
            { icon: 'share', label: 'Share' },
          ].map((action) => (
            <button
              key={action.label}
              className="flex-1 flex flex-col items-center gap-1 p-3 bg-surface rounded-xl border border-surface-highlight"
            >
              <span className="material-symbols-outlined text-white">{action.icon}</span>
              <span className="text-xs text-text-secondary">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Cashback Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">local_offer</span>
          </div>
          <div>
            <p className="text-sm font-bold text-primary">{mockMerchant.cashbackRate}% Cashback</p>
            <p className="text-xs text-text-secondary">Pay with LocalPay and earn rewards</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-text-secondary">location_on</span>
            <div>
              <p className="text-sm text-white">{mockMerchant.address}</p>
              <button className="text-xs text-primary mt-1">View on Map</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-text-secondary">schedule</span>
            <p className="text-sm text-white">{mockMerchant.hours}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-text-secondary">call</span>
            <p className="text-sm text-white">{mockMerchant.phone}</p>
          </div>
        </div>

        {/* Popular Items */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white mb-3">Popular Items</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {mockMerchant.popularItems.map((item, idx) => (
              <div key={idx} className="flex-shrink-0 w-36">
                <div className="h-24 rounded-xl overflow-hidden mb-2">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <p className="text-xs text-primary">₩{formatAmount(item.price)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white mb-3">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {mockMerchant.amenities.map((amenity) => (
              <span
                key={amenity}
                className="px-3 py-1.5 bg-surface-highlight rounded-full text-xs text-text-secondary"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/95 backdrop-blur-lg border-t border-surface p-4 flex gap-3">
        <button className="h-12 w-12 rounded-xl bg-surface-highlight flex items-center justify-center text-text-secondary hover:text-white transition-colors">
          <span className="material-symbols-outlined">chat</span>
        </button>
        <Button
          variant="primary"
          className="flex-1"
          size="lg"
          onClick={() => navigate('/consumer/scan')}
        >
          <span className="material-symbols-outlined mr-2">qr_code_scanner</span>
          Pay with LocalPay
        </Button>
      </div>
    </div>
  );
};

export default MerchantDetail;
