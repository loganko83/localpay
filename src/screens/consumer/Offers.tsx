import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '../../components/common';
import { useWalletStore } from '../../store';

const categories = ['All', 'Food', 'Cafe', 'Shopping', 'Beauty', 'Entertainment'];

const hotDeals = [
  {
    id: '1',
    title: '10% Cashback',
    subtitle: 'All restaurants in Seomyeon',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600',
    validUntil: '2024-12-31',
  },
  {
    id: '2',
    title: 'Double Points',
    subtitle: 'Weekend shopping spree',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600',
    validUntil: '2024-12-25',
  },
];

const nearbyOffers = [
  {
    id: '1',
    merchantName: 'Starbucks Haeundae',
    category: 'Cafe',
    distance: '150m',
    offerType: 'cashback',
    offerValue: '5%',
    imageUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=200',
    expiresIn: '3 days',
  },
  {
    id: '2',
    merchantName: 'Olive Young',
    category: 'Beauty',
    distance: '300m',
    offerType: 'coupon',
    offerValue: '₩5,000 off',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=200',
    expiresIn: '7 days',
  },
  {
    id: '3',
    merchantName: 'CGV Cinema',
    category: 'Entertainment',
    distance: '500m',
    offerType: 'discount',
    offerValue: '20%',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=200',
    expiresIn: '5 days',
  },
  {
    id: '4',
    merchantName: 'Paris Baguette',
    category: 'Food',
    distance: '200m',
    offerType: 'cashback',
    offerValue: '3%',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200',
    expiresIn: '10 days',
  },
];

const Offers: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletStore();
  const [activeCategory, setActiveCategory] = useState('All');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const filteredOffers = activeCategory === 'All'
    ? nearbyOffers
    : nearbyOffers.filter(offer => offer.category === activeCategory);

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Exclusive Benefits</h1>
          <p className="text-sm text-text-secondary">Discover deals near you</p>
        </div>
        <div className="px-3 py-1.5 bg-primary/10 rounded-full">
          <span className="text-sm font-bold text-primary">
            {formatAmount(wallet?.balance || 0)} B
          </span>
        </div>
      </div>

      {/* Hot Deals Carousel */}
      <div className="mb-6">
        <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar">
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
                <Badge variant="error" size="sm">HOT</Badge>
                <h3 className="text-lg font-bold text-white mt-2">{deal.title}</h3>
                <p className="text-sm text-white/80">{deal.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? 'bg-primary text-background'
                  : 'bg-surface-highlight text-text-secondary hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby Offers */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-white mb-3">Nearby Offers</h3>
        <div className="space-y-3">
          {filteredOffers.map((offer) => (
            <Card
              key={offer.id}
              variant="transaction"
              padding="md"
              onClick={() => navigate(`/consumer/merchant/${offer.id}`)}
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
                      <h4 className="text-sm font-bold text-white truncate">
                        {offer.merchantName}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        {offer.category} • {offer.distance}
                      </p>
                    </div>
                    <Badge
                      variant={offer.offerType === 'cashback' ? 'success' : 'info'}
                      size="sm"
                    >
                      {offer.offerValue}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-text-muted">
                      Expires in {offer.expiresIn}
                    </span>
                    <Button variant="primary" size="sm">
                      {offer.offerType === 'coupon' ? 'Get Coupon' : 'Visit'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offers;
