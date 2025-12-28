import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicDeliveryService, DeliveryOrder, OrderStatus } from '../../services/publicDelivery';

import { theme } from '../../styles/theme';

const restaurantCategories = [
  { id: 'all', label: '전체', icon: 'restaurant' },
  { id: 'korean', label: '한식', icon: 'ramen_dining' },
  { id: 'chinese', label: '중식', icon: 'lunch_dining' },
  { id: 'japanese', label: '일식', icon: 'set_meal' },
  { id: 'chicken', label: '치킨', icon: 'egg' },
  { id: 'pizza', label: '피자', icon: 'local_pizza' },
  { id: 'burger', label: '버거', icon: 'fastfood' },
  { id: 'cafe', label: '카페', icon: 'local_cafe' },
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
      PLACED: '주문 접수',
      ACCEPTED: '주문 확인',
      PREPARING: '조리 중',
      READY: '준비 완료',
      PICKED_UP: '픽업 완료',
      DELIVERING: '배달 중',
      DELIVERED: '배달 완료',
      CANCELLED: '취소됨',
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
                  수수료 0%
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                  공공 배달
                </span>
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>
                지역 식당을 응원하세요
              </h2>
              <p className="text-sm" style={{ color: theme.textSecondary }}>
                수수료 0%로 지역 상권을 더 많이 지원합니다
              </p>
            </div>
            <span className="material-symbols-outlined text-4xl" style={{ color: theme.accent }}>
              local_shipping
            </span>
          </div>

          {/* Savings Comparison */}
          <div className="rounded-xl p-3 mb-3" style={{ background: theme.cardHover }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: theme.textSecondary }}>예시 주문: {formatAmount(sampleOrderAmount)}원</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>공공 배달</p>
                <p className="text-lg font-bold" style={{ color: theme.accent }}>0 원</p>
                <p className="text-[10px]" style={{ color: theme.textMuted }}>수수료</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>민간 플랫폼</p>
                <p className="text-lg font-bold" style={{ color: '#ef4444' }}>{formatAmount(feeComparison.privateDelivery.commission)} 원</p>
                <p className="text-[10px]" style={{ color: theme.textMuted }}>12% 수수료</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-2 text-center" style={{ background: theme.accentSoft }}>
            <p className="text-xs font-medium" style={{ color: theme.accent }}>
              이 주문으로 {formatAmount(feeComparison.savings)}원 절약!
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <div className="px-5 mb-3">
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>카테고리</h3>
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
          <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>진행 중인 주문</h3>
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
                    <p className="text-sm font-bold" style={{ color: theme.text }}>주문 #{order.id.slice(-6)}</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>
                      예상 배달 시간: {order.estimatedDeliveryTime}분
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
                    <span>접수</span>
                    <span>확인</span>
                    <span>조리</span>
                    <span>배달</span>
                    <span>완료</span>
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
                        <p className="text-sm font-bold" style={{ color: theme.text }}>라이더 배정됨</p>
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
                    {order.items.length}개 • {formatAmount(order.total)}원
                  </p>
                  <button
                    className="w-full h-10 rounded-xl font-bold text-sm"
                    style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
                  >
                    주문 추적
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Restaurants */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: theme.text }}>주변 음식점</h3>
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
                  <span style={{ color: theme.textSecondary }}>최소 {formatAmount(restaurant.minOrder)}원</span>
                  <div className="flex items-center gap-1" style={{ color: theme.accent }}>
                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                    <span className="font-medium">{restaurant.distance} km</span>
                  </div>
                </div>

                {/* Delivery Fee */}
                <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: theme.textMuted }}>배달비</span>
                    <span className="text-xs font-bold" style={{ color: theme.accent }}>
                      {formatAmount(publicDeliveryService.calculateDeliveryFee({ distance: restaurant.distance }).total)}원
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
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>요금 투명성</h3>
            <button
              onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: theme.accent }}
            >
              {showFeeBreakdown ? '숨기기' : '상세 보기'}
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
                  <p className="text-sm font-medium" style={{ color: theme.text }}>기본 배달비</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>표준 배달 요금</p>
                </div>
                <span className="text-sm font-bold" style={{ color: theme.text }}>
                  {formatAmount(deliveryFeeCalc.baseFee)}원
                </span>
              </div>

              {/* Distance Fee */}
              {deliveryFeeCalc.distanceFee > 0 && (
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>거리 요금</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>km당 500원 (첫 2km 무료)</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>
                    {formatAmount(deliveryFeeCalc.distanceFee)}원
                  </span>
                </div>
              )}

              {/* Surcharges */}
              {deliveryFeeCalc.surcharges > 0 && (
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>추가 요금</p>
                    <p className="text-xs" style={{ color: theme.textSecondary }}>야간/날씨 할증</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: theme.text }}>
                    {formatAmount(deliveryFeeCalc.surcharges)}원
                  </span>
                </div>
              )}

              {/* Platform Commission */}
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text }}>플랫폼 수수료</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>수수료 0% 정책</p>
                </div>
                <span className="text-sm font-bold" style={{ color: theme.accent }}>0원</span>
              </div>

              {/* Comparison */}
              <div className="rounded-lg p-3" style={{ background: theme.accentSoft }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: theme.text }}>민간 플랫폼 대비</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                    {formatAmount(feeComparison.savings)}원 절약
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p style={{ color: theme.textMuted }}>공공 배달</p>
                    <p className="font-bold" style={{ color: theme.accent }}>0원</p>
                  </div>
                  <div>
                    <p style={{ color: theme.textMuted }}>민간</p>
                    <p className="font-bold" style={{ color: '#ef4444' }}>{formatAmount(feeComparison.privateDelivery.commission)}원</p>
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
              <h3 className="text-sm font-bold mb-1" style={{ color: theme.text }}>라이더 지원</h3>
              <p className="text-xs" style={{ color: theme.textSecondary }}>모든 배달에 공정한 수익 보장</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <span className="text-sm" style={{ color: theme.textSecondary }}>최소 보장 금액</span>
              <span className="text-sm font-bold" style={{ color: theme.accent }}>
                {formatAmount(feeConfig.riderMinimumGuarantee)}원
              </span>
            </div>

            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <span className="text-sm" style={{ color: theme.textSecondary }}>기본 배달비</span>
              <span className="text-sm font-bold" style={{ color: theme.text }}>
                {formatAmount(feeConfig.baseDeliveryFee)}원
              </span>
            </div>

            <div className="rounded-lg p-3" style={{ background: theme.cardHover }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px]" style={{ color: theme.accent }}>verified</span>
                <span className="text-xs font-bold" style={{ color: theme.text }}>블록체인 검증 근무 이력</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
                모든 라이더 수익은 블록체인에 기록되어, 라이더가 미래의 기회에 사용할 수 있는 검증 가능한 근무 이력이 생성됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History */}
      {orderHistory.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>최근 주문</h3>
            <button className="text-xs font-medium" style={{ color: theme.accent }}>전체 보기</button>
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
                      <p className="text-sm font-bold" style={{ color: theme.text }}>주문 #{order.id.slice(-6)}</p>
                      <p className="text-xs" style={{ color: theme.textSecondary }}>
                        {order.items.length}개 • {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: theme.text }}>{formatAmount(order.total)}원</p>
                    {order.settlement?.blockchainTxHash && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#22c55e20', color: '#22c55e' }}>
                        <span className="material-symbols-outlined text-[10px]">verified</span>
                        검증됨
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="w-full h-10 rounded-xl font-bold text-sm flex items-center justify-center"
                  style={{ background: theme.cardHover, color: theme.text, border: `1px solid ${theme.border}` }}
                >
                  재주문
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
              <p className="text-sm font-bold mb-1" style={{ color: theme.text }}>공공 배달 안내</p>
              <ul className="text-xs space-y-1" style={{ color: theme.textSecondary }}>
                <li>• 식당에 수수료 0%</li>
                <li>• 라이더 공정 수익 보장</li>
                <li>• 블록체인을 통한 즉시 정산</li>
                <li>• 모든 요금 완전 투명 공개</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Delivery;
