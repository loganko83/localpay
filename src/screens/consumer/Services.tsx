/**
 * Consumer Linked Services Screen
 *
 * PoC Feature: Integration with regional services
 * - Transport (Metro, Bus, Taxi)
 * - Retail partnerships
 * - Culture/Welfare services
 * - Service activation and status
 */

import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Badge, Toggle } from '../../components/common';
import { LinkedService } from '../../types';

// Mock linked services
const mockServices: LinkedService[] = [
  {
    id: 'svc-001',
    name: 'Jeonju Metro',
    description: 'Use LocalPay for metro fare payment with 5% discount',
    provider: 'Jeonju Metro Authority',
    category: 'transport',
    isEnabled: true,
    iconUrl: 'subway',
  },
  {
    id: 'svc-002',
    name: 'City Bus',
    description: 'Pay bus fares with LocalPay balance',
    provider: 'Jeonbuk Bus Association',
    category: 'transport',
    isEnabled: true,
    iconUrl: 'directions_bus',
  },
  {
    id: 'svc-003',
    name: 'LocalPay Taxi',
    description: 'Request taxis and pay with LocalPay',
    provider: 'Jeonju Taxi Union',
    category: 'transport',
    isEnabled: false,
    iconUrl: 'local_taxi',
  },
  {
    id: 'svc-004',
    name: 'Traditional Market',
    description: 'Special discounts at Jeonju Traditional Markets',
    provider: 'Jeonju Market Association',
    category: 'retail',
    isEnabled: true,
    iconUrl: 'storefront',
  },
  {
    id: 'svc-005',
    name: 'Convenience Stores',
    description: 'Pay at partnered convenience stores',
    provider: 'Retail Partners',
    category: 'retail',
    isEnabled: true,
    iconUrl: 'local_convenience_store',
  },
  {
    id: 'svc-006',
    name: 'Hanok Village Tours',
    description: 'Book cultural experiences with LocalPay',
    provider: 'Jeonju Cultural Foundation',
    category: 'culture',
    isEnabled: false,
    iconUrl: 'museum',
  },
  {
    id: 'svc-007',
    name: 'Library Services',
    description: 'Access digital library and rent materials',
    provider: 'Jeonju Public Library',
    category: 'culture',
    isEnabled: true,
    iconUrl: 'local_library',
  },
  {
    id: 'svc-008',
    name: 'Senior Welfare',
    description: 'Welfare benefits for verified seniors',
    provider: 'Jeonju Social Welfare Center',
    category: 'welfare',
    isEnabled: false,
    iconUrl: 'elderly',
  },
  {
    id: 'svc-009',
    name: 'Youth Benefits',
    description: 'Special programs for youth with verified credentials',
    provider: 'Jeonju Youth Center',
    category: 'welfare',
    isEnabled: true,
    iconUrl: 'school',
  },
];

const categoryInfo: Record<string, { label: string; icon: string; color: string }> = {
  transport: { label: 'Transport', icon: 'commute', color: 'text-blue-400' },
  retail: { label: 'Retail', icon: 'shopping_cart', color: 'text-green-400' },
  culture: { label: 'Culture', icon: 'palette', color: 'text-purple-400' },
  welfare: { label: 'Welfare', icon: 'volunteer_activism', color: 'text-orange-400' },
  other: { label: 'Other', icon: 'more_horiz', color: 'text-gray-400' },
};

const Services: React.FC = () => {
  const [services, setServices] = useState(mockServices);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleService = (serviceId: string) => {
    setServices(prev =>
      prev.map(svc =>
        svc.id === serviceId ? { ...svc, isEnabled: !svc.isEnabled } : svc
      )
    );
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, LinkedService[]>);

  const enabledCount = services.filter(s => s.isEnabled).length;

  return (
    <div className="flex flex-col pb-4">
      <Header title="Linked Services" showBack />

      {/* Summary */}
      <div className="px-4 py-4">
        <Card variant="balance" padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-text-secondary">Active Services</p>
              <h2 className="text-2xl font-bold text-white">{enabledCount}</h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                hub
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(categoryInfo).slice(0, 4).map(([key, info]) => {
              const count = groupedServices[key]?.filter(s => s.isEnabled).length || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    selectedCategory === key ? 'bg-primary/20' : 'bg-surface-highlight'
                  }`}
                >
                  <span className={`material-symbols-outlined ${info.color}`}>
                    {info.icon}
                  </span>
                  <span className="text-[10px] text-text-secondary">{info.label}</span>
                  <span className="text-xs font-bold text-white">{count}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* DID Verification Notice */}
      <div className="px-4 mb-4">
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary">verified_user</span>
          <div>
            <p className="text-sm font-medium text-primary">DID Verification Required</p>
            <p className="text-xs text-primary/80 mt-1">
              Some services require credential verification. Verify your identity to unlock all features.
            </p>
          </div>
        </div>
      </div>

      {/* Service List by Category */}
      <div className="px-4 space-y-6">
        {Object.entries(groupedServices)
          .filter(([category]) => !selectedCategory || category === selectedCategory)
          .map(([category, categoryServices]) => {
            const info = categoryInfo[category] || categoryInfo.other;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`material-symbols-outlined ${info.color}`}>
                    {info.icon}
                  </span>
                  <h3 className="text-sm font-bold text-white">{info.label}</h3>
                  <Badge variant="secondary" size="sm">
                    {categoryServices.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {categoryServices.map((service) => (
                    <Card key={service.id} padding="md">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          service.isEnabled ? 'bg-primary/20' : 'bg-surface-highlight'
                        }`}>
                          <span className={`material-symbols-outlined ${
                            service.isEnabled ? 'text-primary' : 'text-text-secondary'
                          }`}>
                            {service.iconUrl}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white truncate">{service.name}</h4>
                            {service.isEnabled && (
                              <span className="material-symbols-outlined text-green-500 text-sm">
                                check_circle
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                            {service.description}
                          </p>
                          <p className="text-[10px] text-text-muted mt-1">
                            {service.provider}
                          </p>
                        </div>
                        <Toggle
                          checked={service.isEnabled}
                          onChange={() => toggleService(service.id)}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer Info */}
      <div className="px-4 mt-6">
        <div className="bg-surface rounded-xl p-4 text-center">
          <span className="material-symbols-outlined text-text-secondary text-3xl mb-2">
            integration_instructions
          </span>
          <p className="text-sm text-text-secondary">
            More services coming soon!
          </p>
          <p className="text-xs text-text-muted mt-1">
            LocalPay is expanding partnerships with local businesses and government services.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Services;
