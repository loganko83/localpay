import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicDeliveryService, DeliveryOrder, OrderStatus } from '../../services/publicDelivery';

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

const restaurantCategories = [
  { id: 'all', label: 'All', icon: 'restaurant' },
  { id: 'korean', label: 'Korean', icon: 'ramen_dining' },
  { id: 'chinese', label: 'Chinese', icon: 'lunch_dining' },
  { id: 'japanese', label: 'Japanese', icon: 'set_meal' },
  { id: 'chicken', label: 'Chicken', icon: 'egg' },
  { id: 'pizza', label: 'Pizza', icon: 'local_pizza' },
  { id: 'burger', label: 'Burger', icon: 'fastfood' },
  { id: 'cafe', label: 'Cafe', icon: 'local_cafe' },
];

const mockRestaurants = [
  {
    id: 'rest1',
    name: 'Bibimbap House',
    category: 'korean',
    rating: 4.8,
    deliveryTime: '25-35',
    minOrder: 12000,
    distance: 1.2,
    image: '',
  },
  {
    id: 'rest2',
    name: 'Jjajang Paradise',
    category: 'chinese',
    rating: 4.6,
    deliveryTime: '30-40',
    minOrder: 15000,
    distance: 2.1,
    image: '',
  },
  {
    id: 'rest3',
    name: 'Sushi Master',
    category: 'japanese',
    rating: 4.9,
    deliveryTime: '35-45',
    minOrder: 18000,
    distance: 1.8,
    image: '',
  },
  {
    id: 'rest4',
    name: 'Crispy Chicken',
    category: 'chicken',
    rating: 4.7,
    deliveryTime: '20-30',
    minOrder: 14000,
    distance: 0.8,
    image: '',
  },
  {
    id: 'rest5',
    name: 'Pizza Kingdom',
    category: 'pizza',
    rating: 4.5,
    deliveryTime: '25-35',
    minOrder: 16000,
    distance: 1.5,
    image: '',
  },
  {
    id: 'rest6',
    name: 'Burger Station',
    category: 'burger',
    rating: 4.6,
    deliveryTime: '20-30',
    minOrder: 10000,
    distance: 1.0,
    image: '',
  },
];

const orderStatusSteps: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'DELIVERING', 'DELIVERED'];

const Delivery: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentLocation] = useState('Jeonju, Wansan-gu');
  const [activeOrders] = useState<DeliveryOrder[]>([]);
  const [orderHistory] = useState<DeliveryOrder[]>([]);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  const feeConfig = publicDeliveryService.getFeeConfig();
  const sampleOrderAmount = 25000;
  const feeComparison = publicDeliveryService.compareFees(sampleOrderAmount);
  const deliveryFeeCalc = publicDeliveryService.calculateDeliveryFee({ distance: 2.5 });

  useEffect(() => {
    // Load mock data - in real app, fetch from service
  }, []);

  const filteredRestaurants = selectedCategory === 'all'
    ? mockRestaurants
    : mockRestaurants.filter(r => r.category === selectedCategory);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getOrderStatusStep = (status: OrderStatus): number => {
    const steps: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'DELIVERING', 'DELIVERED'];
    return steps.indexOf(status);
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      PLACED: 'Order Placed',
      ACCEPTED: 'Accepted',
      PREPARING: 'Preparing',
      READY: 'Ready',
      PICKED_UP: 'Picked Up',
      DELIVERING: 'Delivering',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return labels[status];
  };

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header with Location */}
      <header
        className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: theme.cardHover }}
        >
          <span className="material-symbols-outlined" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: theme.accent }}>location_on</span>
          <span className="font-medium" style={{ color: theme.text }}>{currentLocation}</span>
          <span className="material-symbols-outlined text-sm" style={{ color: theme.textSecondary }}>expand_more</span>
        </div>
        <button
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: theme.cardHover }}
        >
          <span className="material-symbols-outlined" style={{ color: theme.text }}>search</span>
        </button>
      </header>

      {/* Zero-Commission Banner */}
      <div className="px-5 py-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, rgba(255,71,87,0.05))`, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                  0% Commission
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                  Public Delivery
                </span>
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>
                Support Local Restaurants
              </h2>
              <p className="text-sm" style={{ color: theme.textSecondary }}>
                Zero commission means more support for local businesses
              </p>
            </div>
            <span className="material-symbols-outlined text-4xl" style={{ color: theme.accent }}>
              local_shipping
            </span>
          </div>

          {/* Savings Comparison */}
          <div className="rounded-xl p-3 mb-3" style={{ background: theme.cardHover }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: theme.textSecondary }}>Sample order: {formatAmount(sampleOrderAmount)}KRW</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Public Delivery</p>
                <p className="text-lg font-bold" style={{ color: theme.accent }}>0 KRW</p>
                <p className="text-[10px]" style={{ color: theme.textMuted }}>commission</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Private Platform</p>
                <p className="text-lg font-bold" style={{ color: '#ef4444' }}>{formatAmount(feeComparison.privateDelivery.commission)} KRW</p>
                <p className="text-[10px]" style={{ color: theme.textMuted }}>12% commission</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-2 text-center" style={{ background: theme.accentSoft }}>
            <p className="text-xs font-medium" style={{ color: theme.accent }}>
              You save {formatAmount(feeComparison.savings)} KRW on this order!
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <div className="px-5 mb-3">
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Categories</h3>
        </div>
        <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar">
          {restaurantCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap"
              style={{
                background: selectedCategory === category.id ? theme.accent : theme.card,
                color: selectedCategory === category.id ? '#fff' : theme.textSecondary,
                border: selectedCategory === category.id ? 'none' : `1px solid ${theme.border}`,
              }}
            >
              <span className="material-symbols-outlined text-[20px]">{category.icon}</span>
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Orders Section */}
      {activeOrders.length > 0 && (
        <div className="px-5 mb-6">
          <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Active Orders</h3>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl p-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold" style={{ color: theme.text }}>Order #{order.id.slice(-6)}</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>
                      Estimated: {order.estimatedDeliveryTime} min
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {/* Status Tracker */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    {orderStatusSteps.map((step, idx) => (
                      <div key={step} className="flex flex-col items-center flex-1">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center mb-1"
                          style={{
                            background: getOrderStatusStep(order.status) >= idx ? theme.accent : theme.cardHover,
                            color: getOrderStatusStep(order.status) >= idx ? '#fff' : theme.textMuted,
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {step === 'PLACED' && 'receipt_long'}
                            {step === 'ACCEPTED' && 'check_circle'}
                            {step === 'PREPARING' && 'restaurant'}
                            {step === 'DELIVERING' && 'two_wheeler'}
                            {step === 'DELIVERED' && 'home'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px]" style={{ color: theme.textMuted }}>
                    <span>Placed</span>
                    <span>Accepted</span>
                    <span>Preparing</span>
                    <span>Delivering</span>
                    <span>Done</span>
                  </div>
                </div>

                {/* Rider Info */}
                {order.riderId && (
                  <div className="rounded-lg p-3 mb-3" style={{ background: theme.cardHover }}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: theme.accentSoft }}>
                        <span className="material-symbols-outlined" style={{ color: theme.accent }}>two_wheeler</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: theme.text }}>Rider Assigned</p>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>ID: {order.riderId.slice(-6)}</p>
                      </div>
                      <button className="p-2 rounded-lg" style={{ background: theme.card }}>
                        <span className="material-symbols-outlined text-[16px]" style={{ color: theme.textSecondary }}>call</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Items Summary */}
                <div className="pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>
                    {order.items.length} items • {formatAmount(order.total)} KRW
                  </p>
                  <button
                    className="w-full h-10 rounded-xl font-bold text-sm"
                    style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
                  >
                    Track Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Restaurants */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>Nearby Restaurants</h3>
        <div className="grid grid-cols-2 gap-3">
          {filteredRestaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => navigate(`/consumer/restaurant/${restaurant.id}`)}
              className="rounded-2xl overflow-hidden text-left"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              {/* Restaurant Image */}
              <div className="h-32 flex items-center justify-center" style={{ background: theme.cardHover }}>
                <span className="material-symbols-outlined text-4xl" style={{ color: theme.textMuted }}>restaurant</span>
              </div>

              <div className="p-3">
                <h4 className="text-sm font-bold mb-1" style={{ color: theme.text }}>{restaurant.name}</h4>

                <div className="flex items-center gap-1 mb-2">
                  <span className="material-symbols-outlined text-[14px]" style={{ color: '#eab308' }}>star</span>
                  <span className="text-xs font-medium" style={{ color: theme.text }}>{restaurant.rating}</span>
                  <span className="text-xs" style={{ color: theme.textMuted }}>• {restaurant.deliveryTime} min</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: theme.textSecondary }}>Min {formatAmount(restaurant.minOrder)}</span>
                  <div className="flex items-center gap-1" style={{ color: theme.accent }}>
                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                    <span className="font-medium">{restaurant.distance} km</span>
                  </div>
                </div>

                {/* Delivery Fee */}
                <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: theme.textMuted }}>Delivery</span>
                    <span className="text-xs font-bold" style={{ color: theme.accent }}>
                      {formatAmount(publicDeliveryService.calculateDeliveryFee({ distance: restaurant.distance }).total)} KRW
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fee Transparency Card */}
      <div className="px-5 mb-6">
        <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Fee Transparency</h3>
            <button
              onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: theme.accent }}
            >
              {showFeeBreakdown ? 'Hide' : 'Show'} Details
              <span className="material-symbols-outlined text-[16px]">
                {showFeeBreakdown ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {showFeeBreakdown && (
            <div className="space-y-3">
              {/* Base Fee */}
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text }}>Base Delivery Fee</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>Standard delivery charge</p>
                </div>
                <span className="text-sm font-bold" style={{ color: theme.text }}>
                  {formatAmount(deliveryFeeCalc.baseFee)} KRW
                </span>
              </div>

              {/* Distance Fee */}
              {deliveryFeeCalc.distanceFee > 0 && (
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>Distance Fee</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>500 KRW per km (free first 2km)</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>
                    {formatAmount(deliveryFeeCalc.distanceFee)} KRW
                  </span>
                </div>
              )}

              {/* Surcharges */}
              {deliveryFeeCalc.surcharges > 0 && (
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>Surcharges</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>Night/weather surcharges</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>
                    {formatAmount(deliveryFeeCalc.surcharges)} KRW
                  </span>
                </div>
              )}

              {/* Platform Commission */}
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text }}>Platform Commission</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>Zero commission policy</p>
                </div>
                <span className="text-sm font-bold" style={{ color: theme.accent }}>0 KRW</span>
              </div>

              {/* Comparison */}
              <div className="rounded-lg p-3" style={{ background: theme.accentSoft }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: theme.text }}>vs Private Platform</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                    Save {formatAmount(feeComparison.savings)} KRW
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p style={{ color: theme.textMuted }}>Public (You)</p>
                    <p className="font-bold" style={{ color: theme.accent }}>0 KRW</p>
                  </div>
                  <div>
                    <p style={{ color: theme.textMuted }}>Private</p>
                    <p className="font-bold" style={{ color: '#ef4444' }}>{formatAmount(feeComparison.privateDelivery.commission)} KRW</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rider Support Info */}
      <div className="px-5 mb-6">
        <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: theme.accentSoft }}>
              <span className="material-symbols-outlined text-2xl" style={{ color: theme.accent }}>two_wheeler</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1" style={{ color: theme.text }}>Supporting Riders</h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>Fair earnings for every delivery</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <span className="text-sm" style={{ color: theme.textSecondary }}>Minimum Guarantee</span>
              <span className="text-sm font-bold" style={{ color: theme.accent }}>
                {formatAmount(feeConfig.riderMinimumGuarantee)} KRW
              </span>
            </div>

            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <span className="text-sm" style={{ color: theme.textSecondary }}>Base Delivery Fee</span>
              <span className="text-sm font-bold" style={{ color: theme.text }}>
                {formatAmount(feeConfig.baseDeliveryFee)} KRW
              </span>
            </div>

            <div className="rounded-lg p-3" style={{ background: theme.cardHover }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px]" style={{ color: theme.accent }}>verified</span>
                <span className="text-xs font-bold" style={{ color: theme.text }}>Blockchain-Verified Work History</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                All rider earnings are recorded on blockchain, creating a verifiable work history that riders can use for future opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      {orderHistory.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Recent Orders</h3>
            <button className="text-xs font-medium" style={{ color: theme.accent }}>See All</button>
          </div>

          <div className="space-y-3">
            {orderHistory.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/consumer/delivery/order/${order.id}`)}
                className="w-full rounded-xl p-4 text-left"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: theme.accentSoft }}>
                      <span className="material-symbols-outlined text-[20px]" style={{ color: theme.accent }}>restaurant</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: theme.text }}>Order #{order.id.slice(-6)}</p>
                      <p className="text-xs" style={{ color: theme.textSecondary }}>
                        {order.items.length} items • {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: theme.text }}>{formatAmount(order.total)} KRW</p>
                    {order.settlement?.blockchainTxHash && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                        <span className="material-symbols-outlined text-[10px]">verified</span>
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="w-full h-10 rounded-xl font-bold text-sm flex items-center justify-center"
                  style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
                >
                  Reorder
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Info Banner */}
      <div className="px-5">
        <div className="rounded-xl p-4" style={{ background: theme.cardHover, border: `1px solid ${theme.border}` }}>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined" style={{ color: theme.accent }}>info</span>
            <div className="flex-1">
              <p className="text-sm font-bold mb-1" style={{ color: theme.text }}>How Public Delivery Works</p>
              <ul className="text-xs space-y-1" style={{ color: theme.textSecondary }}>
                <li>• Zero commission to restaurants</li>
                <li>• Fair earnings guaranteed for riders</li>
                <li>• Instant settlement via blockchain</li>
                <li>• Full transparency on all fees</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Delivery;
