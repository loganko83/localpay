import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LinkedService } from '../../types';

import { theme } from '../../styles/theme';

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
  transport: { label: 'Transport', icon: 'commute', color: '#3b82f6' },
  retail: { label: 'Retail', icon: 'shopping_cart', color: '#22c55e' },
  culture: { label: 'Culture', icon: 'palette', color: '#a855f7' },
  welfare: { label: 'Welfare', icon: 'volunteer_activism', color: '#f97316' },
};

const Services: React.FC = () => {
  const navigate = useNavigate();
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
    <div className="flex flex-col min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl" style={{ color: theme.text }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Linked Services</h1>
        <div className="w-8" />
      </header>

      {/* Summary */}
      <div className="px-5 py-4">
        <div className="rounded-xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Active Services</p>
              <h2 className="text-2xl font-bold" style={{ color: theme.text }}>{enabledCount}</h2>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: theme.accentSoft }}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: theme.accent }}>hub</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(categoryInfo).map(([key, info]) => {
              const count = groupedServices[key]?.filter(s => s.isEnabled).length || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                  style={{
                    background: selectedCategory === key ? theme.accentSoft : theme.cardHover,
                    border: selectedCategory === key ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: info.color }}>{info.icon}</span>
                  <span className="text-[10px]" style={{ color: theme.textSecondary }}>{info.label}</span>
                  <span className="text-xs font-bold" style={{ color: theme.text }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DID Verification Notice */}
      <div className="px-5 mb-4">
        <div
          className="rounded-xl p-3 flex items-start gap-3"
          style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}30` }}
        >
          <span className="material-symbols-outlined" style={{ color: theme.accent }}>verified_user</span>
          <div>
            <p className="text-sm font-medium" style={{ color: theme.accent }}>DID Verification Required</p>
            <p className="text-xs mt-1" style={{ color: `${theme.accent}cc` }}>
              Some services require credential verification. Verify your identity to unlock all features.
            </p>
          </div>
        </div>
      </div>

      {/* Service List by Category */}
      <div className="px-5 space-y-6">
        {Object.entries(groupedServices)
          .filter(([category]) => !selectedCategory || category === selectedCategory)
          .map(([category, categoryServices]) => {
            const info = categoryInfo[category];
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined" style={{ color: info.color }}>{info.icon}</span>
                  <h3 className="text-sm font-bold" style={{ color: theme.text }}>{info.label}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: theme.cardHover, color: theme.textSecondary }}
                  >
                    {categoryServices.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-xl p-4"
                      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: service.isEnabled ? theme.accentSoft : theme.cardHover }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ color: service.isEnabled ? theme.accent : theme.textSecondary }}
                          >
                            {service.iconUrl}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate" style={{ color: theme.text }}>{service.name}</h4>
                            {service.isEnabled && (
                              <span className="material-symbols-outlined text-sm" style={{ color: '#22c55e' }}>
                                check_circle
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: theme.textSecondary }}>
                            {service.description}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: theme.textMuted }}>
                            {service.provider}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleService(service.id)}
                          className="relative w-12 h-7 rounded-full transition-colors"
                          style={{ background: service.isEnabled ? theme.accent : theme.cardHover }}
                        >
                          <div
                            className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                            style={{ left: service.isEnabled ? '26px' : '4px' }}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer Info */}
      <div className="px-5 mt-6">
        <div className="rounded-xl p-4 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <span className="material-symbols-outlined text-3xl mb-2" style={{ color: theme.textSecondary }}>
            integration_instructions
          </span>
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            More services coming soon!
          </p>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
            LocalPay is expanding partnerships with local businesses and government services.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Services;
