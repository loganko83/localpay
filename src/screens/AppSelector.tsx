import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { Card } from '../components/common';
import { useAuthStore } from '../store';
import { UserType } from '../types';

const appOptions: { type: UserType; icon: string; title: string; description: string; color: string }[] = [
  {
    type: 'consumer',
    icon: 'account_balance_wallet',
    title: 'LocalPay Wallet',
    description: 'Prepaid local currency for Jeonbuk region',
    color: '#ed2630',
  },
  {
    type: 'merchant',
    icon: 'storefront',
    title: 'Merchant Portal',
    description: 'Manage payments and track sales',
    color: '#13ec5b',
  },
  {
    type: 'admin',
    icon: 'admin_panel_settings',
    title: 'Admin Dashboard',
    description: 'Platform management and operations',
    color: '#2b8cee',
  },
];

const AppSelector: React.FC = () => {
  const navigate = useNavigate();
  const { setUserType } = useAuthStore();

  const handleSelect = (type: UserType) => {
    setUserType(type);
    if (type === 'merchant') {
      navigate('/merchant/login');
    } else if (type === 'admin') {
      navigate('/admin/login');
    } else {
      navigate('/consumer');
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col justify-center p-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark mb-4">
            <span className="material-symbols-outlined text-white text-4xl">
              payments
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">LocalPay</h1>
          <p className="text-text-secondary">Jeonbuk Prepaid Local Currency</p>
        </div>

        {/* App Options */}
        <div className="space-y-4">
          {appOptions.map((option) => (
            <Card
              key={option.type}
              variant="transaction"
              padding="lg"
              onClick={() => handleSelect(option.type)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${option.color}20` }}
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ color: option.color }}
                  >
                    {option.icon}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{option.title}</h3>
                  <p className="text-sm text-text-secondary">{option.description}</p>
                </div>
                <span className="material-symbols-outlined text-text-secondary">
                  chevron_right
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-text-muted">
            Powered by Jeonju City & IBK
          </p>
          <p className="text-xs text-text-muted mt-1">
            Blockchain-based Local Currency System
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AppSelector;
