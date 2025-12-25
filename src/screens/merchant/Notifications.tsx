/**
 * Merchant Notifications Screen
 *
 * Notification center for merchants:
 * - Payment notifications
 * - System announcements
 * - Settlement alerts
 * - Promotional updates
 */

import React, { useState } from 'react';
import { Header } from '../../components/layout';
import { Card, Button } from '../../components/common';

interface Notification {
  id: string;
  type: 'payment' | 'settlement' | 'system' | 'promo';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'payment',
    title: 'Payment Received',
    message: 'You received 25,000 P from Customer #8821',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    read: false,
    data: { amount: 25000, customerId: '8821' },
  },
  {
    id: 'notif-002',
    type: 'payment',
    title: 'Payment Received',
    message: 'You received 12,500 P from Customer #4102',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    read: false,
    data: { amount: 12500, customerId: '4102' },
  },
  {
    id: 'notif-003',
    type: 'settlement',
    title: 'Settlement Completed',
    message: 'Your daily settlement of 850,000 P has been transferred to your bank account',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: true,
    data: { amount: 850000 },
  },
  {
    id: 'notif-004',
    type: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance on Dec 28, 2:00 AM - 4:00 AM KST. Payment processing will be temporarily unavailable.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: true,
  },
  {
    id: 'notif-005',
    type: 'promo',
    title: 'Jeonju Winter Festival',
    message: 'Join the LocalPay Winter Festival promotion! Offer 10% cashback to attract more customers.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
  {
    id: 'notif-006',
    type: 'payment',
    title: 'Refund Requested',
    message: 'Customer #9931 requested a refund for 8,000 P. Please review and respond.',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    read: true,
    data: { amount: 8000, customerId: '9931' },
  },
];

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'payment' | 'settlement' | 'system' | 'promo'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(
    n => selectedFilter === 'all' || n.type === selectedFilter
  );

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return 'payments';
      case 'settlement': return 'account_balance';
      case 'system': return 'settings';
      case 'promo': return 'campaign';
      default: return 'notifications';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment': return 'text-green-500 bg-green-500/20';
      case 'settlement': return 'text-blue-500 bg-blue-500/20';
      case 'system': return 'text-yellow-500 bg-yellow-500/20';
      case 'promo': return 'text-purple-500 bg-purple-500/20';
      default: return 'text-text-secondary bg-surface-highlight';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('ko-KR');
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'payment', label: 'Payments' },
    { id: 'settlement', label: 'Settlements' },
    { id: 'system', label: 'System' },
    { id: 'promo', label: 'Promos' },
  ];

  return (
    <div className="flex flex-col pb-4">
      <Header title="Notifications" showBack />

      {/* Summary */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedFilter === filter.id
                  ? 'bg-primary text-background'
                  : 'bg-surface text-text-secondary hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="px-4 space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-text-secondary text-5xl mb-4">
              notifications_off
            </span>
            <p className="text-text-secondary">No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={`w-full text-left bg-surface rounded-xl p-4 transition-colors hover:bg-surface-highlight ${
                !notification.read ? 'border-l-4 border-primary' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                  <span className="material-symbols-outlined text-lg">
                    {getTypeIcon(notification.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`font-medium truncate ${notification.read ? 'text-text-secondary' : 'text-white'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 line-clamp-2 ${notification.read ? 'text-text-muted' : 'text-text-secondary'}`}>
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Notification Settings */}
      <div className="px-4 mt-6">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-text-secondary">settings</span>
              <div>
                <p className="text-sm font-medium text-white">Notification Settings</p>
                <p className="text-xs text-text-secondary">Manage your notification preferences</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-text-secondary">chevron_right</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
