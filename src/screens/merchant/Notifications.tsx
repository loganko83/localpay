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

import { theme } from '../../styles/theme';

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

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'payment': return { color: '#10b981', backgroundColor: 'rgba(16,185,129,0.2)' };
      case 'settlement': return { color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)' };
      case 'system': return { color: '#eab308', backgroundColor: 'rgba(234,179,8,0.2)' };
      case 'promo': return { color: '#a855f7', backgroundColor: 'rgba(168,85,247,0.2)' };
      default: return { color: theme.textSecondary, backgroundColor: theme.cardHover };
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
          <p style={{ color: theme.textSecondary, fontSize: '0.875rem' }}>
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
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                backgroundColor: selectedFilter === filter.id ? theme.accent : theme.card,
                color: selectedFilter === filter.id ? theme.bg : theme.textSecondary,
              }}
              onMouseEnter={(e) => {
                if (selectedFilter !== filter.id) {
                  e.currentTarget.style.color = theme.text;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedFilter !== filter.id) {
                  e.currentTarget.style.color = theme.textSecondary;
                }
              }}
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
            <span
              className="material-symbols-outlined mb-4"
              style={{ color: theme.textSecondary, fontSize: '3rem' }}
            >
              notifications_off
            </span>
            <p style={{ color: theme.textSecondary }}>No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                backgroundColor: theme.card,
                borderRadius: '0.75rem',
                padding: '1rem',
                transition: 'all 0.2s',
                borderLeft: !notification.read ? `4px solid ${theme.accent}` : undefined,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.cardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.card;
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  style={{
                    height: '2.5rem',
                    width: '2.5rem',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    ...getTypeStyle(notification.type),
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                    {getTypeIcon(notification.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      style={{
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: notification.read ? theme.textSecondary : theme.text,
                      }}
                    >
                      {notification.title}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: theme.textMuted,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      marginTop: '0.25rem',
                      color: notification.read ? theme.textMuted : theme.textSecondary,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <div
                    style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      borderRadius: '9999px',
                      backgroundColor: theme.accent,
                      flexShrink: 0,
                      marginTop: '0.5rem',
                    }}
                  />
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
              <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>
                settings
              </span>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.text }}>
                  Notification Settings
                </p>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                  Manage your notification preferences
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ color: theme.textSecondary }}>
              chevron_right
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
