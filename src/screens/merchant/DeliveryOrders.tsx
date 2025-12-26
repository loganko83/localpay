import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/common';
import { publicDeliveryService, DeliveryOrder, OrderStatus } from '../../services/publicDelivery';

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

type TabType = 'all' | 'pending' | 'preparing' | 'ready' | 'completed';

const DeliveryOrders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const merchantId = 'merchant-001';

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = () => {
    const merchantOrders = publicDeliveryService.getMerchantOrders(merchantId);
    setOrders(merchantOrders);
  };

  const handleAcceptOrder = async (orderId: string) => {
    await publicDeliveryService.acceptOrder(orderId, 15);
    loadOrders();
  };

  const handleRejectOrder = async (_orderId: string) => {
    loadOrders();
  };

  const handleMarkReady = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = 'READY';
      loadOrders();
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const anonymizeCustomer = (customerId: string) => {
    return `고객 ${customerId.slice(-4)}`;
  };

  const partialAddress = (address: string) => {
    const parts = address.split(' ');
    return parts.slice(0, 2).join(' ') + '...';
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig: Record<OrderStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'default', label: string }> = {
      PLACED: { variant: 'warning', label: 'Pending' },
      ACCEPTED: { variant: 'info', label: 'Accepted' },
      PREPARING: { variant: 'info', label: 'Preparing' },
      READY: { variant: 'success', label: 'Ready' },
      PICKED_UP: { variant: 'success', label: 'Picked Up' },
      DELIVERING: { variant: 'success', label: 'Delivering' },
      DELIVERED: { variant: 'default', label: 'Completed' },
      CANCELLED: { variant: 'error', label: 'Cancelled' },
    };
    const config = statusConfig[status];
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const filterOrders = (orders: DeliveryOrder[], tab: TabType) => {
    switch (tab) {
      case 'pending':
        return orders.filter(o => o.status === 'PLACED');
      case 'preparing':
        return orders.filter(o => o.status === 'ACCEPTED' || o.status === 'PREPARING');
      case 'ready':
        return orders.filter(o => o.status === 'READY' || o.status === 'PICKED_UP');
      case 'completed':
        return orders.filter(o => o.status === 'DELIVERED');
      default:
        return orders;
    }
  };

  const filteredOrders = filterOrders(orders, activeTab);

  const todayOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'PLACED').length;
  const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
  const todayRevenue = orders
    .filter(o => o.status === 'DELIVERED' && o.settlement)
    .reduce((sum, o) => sum + (o.settlement?.merchantAmount || 0), 0);

  const pendingSettlement = orders
    .filter(o => o.status === 'DELIVERED' && !o.settlement)
    .reduce((sum, o) => sum + o.subtotal, 0);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: orders.length },
    { key: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'PLACED').length },
    { key: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'ACCEPTED' || o.status === 'PREPARING').length },
    { key: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'READY' || o.status === 'PICKED_UP').length },
    { key: 'completed', label: 'Completed', count: completedOrders },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '1rem', backgroundColor: theme.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: `${theme.bg}cc`, backdropFilter: 'blur(12px)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ height: '2.5rem', width: '2.5rem', borderRadius: '9999px', backgroundColor: theme.accentSoft, border: `1px solid ${theme.accent}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: theme.accent }}>restaurant</span>
          </div>
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, lineHeight: 1.25 }}>Delivery Orders</h2>
            <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Real-time order management</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{ padding: '0.5rem', borderRadius: '9999px', transition: 'background-color 0.2s', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.card}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span className="material-symbols-outlined" style={{ color: theme.text }}>history</span>
        </button>
      </div>

      {/* Orders Summary Header */}
      <div style={{ padding: '1rem 1rem 0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Today's Orders</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme.text }}>{todayOrders}</p>
              </div>
              <div style={{ height: '2.5rem', width: '2.5rem', borderRadius: '9999px', backgroundColor: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>receipt_long</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Pending Action</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{pendingOrders}</p>
              </div>
              <div style={{ height: '2.5rem', width: '2.5rem', borderRadius: '9999px', backgroundColor: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>notification_important</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Completed</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme.accent }}>{completedOrders}</p>
              </div>
              <div style={{ height: '2.5rem', width: '2.5rem', borderRadius: '9999px', backgroundColor: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined filled" style={{ color: theme.accent }}>check_circle</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Today's Revenue</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: theme.accent }}>₩{formatAmount(todayRevenue)}</p>
              </div>
              <div style={{ height: '2.5rem', width: '2.5rem', borderRadius: '9999px', backgroundColor: theme.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: theme.accent }}>payments</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Tabs */}
      <div style={{ padding: '0 1rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                backgroundColor: activeTab === tab.key ? theme.accent : theme.card,
                color: activeTab === tab.key ? theme.bg : theme.textSecondary,
                border: activeTab === tab.key ? 'none' : `1px solid ${theme.border}`,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = theme.cardHover;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = theme.card;
                }
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: activeTab === tab.key ? 'rgba(17,17,17,0.2)' : theme.cardHover,
                  color: activeTab === tab.key ? theme.bg : theme.text
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Settlement Summary */}
      <div style={{ padding: '0 1rem 1rem' }}>
        <div style={{ background: `linear-gradient(to bottom right, ${theme.accentSoft}, ${theme.card})`, border: `1px solid ${theme.accent}4d`, borderRadius: '0.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>Settlement Summary</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="material-symbols-outlined filled" style={{ color: theme.accent, fontSize: '16px' }}>verified</span>
              <span style={{ fontSize: '0.75rem', color: theme.accent, fontWeight: 500 }}>Blockchain Verified</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Today's Settlements</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>₩{formatAmount(todayRevenue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Pending Settlement</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fbbf24' }}>₩{formatAmount(pendingSettlement)}</span>
            </div>
            <div style={{ paddingTop: '0.5rem', borderTop: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Platform Commission</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.accent }}>0%</span>
              </div>
              <p style={{ fontSize: '0.625rem', color: theme.textMuted, marginTop: '0.25rem' }}>Only 1% payment gateway fee applies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div style={{ padding: '0 1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text, marginBottom: '0.75rem' }}>
          {activeTab === 'pending' && 'Incoming Orders'}
          {activeTab === 'preparing' && 'Orders in Preparation'}
          {activeTab === 'ready' && 'Ready for Pickup'}
          {activeTab === 'completed' && 'Completed Orders'}
          {activeTab === 'all' && 'All Orders'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredOrders.length === 0 ? (
            <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '0.5rem', padding: '2rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: theme.textMuted, fontSize: '48px', display: 'block', marginBottom: '0.5rem' }}>inbox</span>
              <p style={{ fontSize: '0.875rem', color: theme.textSecondary }}>No orders in this category</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order.id}
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '0.5rem', padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => setSelectedOrder(order)}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${theme.accent}80`}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border}
              >
                {/* Order Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: theme.textSecondary }}>{order.id}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{formatTime(order.createdAt)}</span>
                </div>

                {/* Customer Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ height: '2rem', width: '2rem', borderRadius: '9999px', backgroundColor: theme.cardHover, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: theme.textSecondary, fontSize: '16px' }}>person</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{anonymizeCustomer(order.customerId)}</p>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>location_on</span>
                      {partialAddress(order.deliveryAddress)} • {order.deliveryDistance}km
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div style={{ backgroundColor: `${theme.cardHover}80`, borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: idx === order.items.length - 1 ? 0 : '0.25rem' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.875rem', color: theme.text }}>{item.name} x{item.quantity}</span>
                        {item.options && item.options.length > 0 && (
                          <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>• {item.options.join(', ')}</p>
                        )}
                      </div>
                      <span style={{ fontSize: '0.875rem', color: theme.textSecondary }}>₩{formatAmount(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                {order.specialInstructions && (
                  <div style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.5rem', padding: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '16px' }}>info</span>
                      <p style={{ fontSize: '0.75rem', color: '#fbbf24', flex: 1 }}>{order.specialInstructions}</p>
                    </div>
                  </div>
                )}

                {/* Order Total */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: theme.textSecondary }}>Subtotal</span>
                    <span style={{ color: theme.text }}>₩{formatAmount(order.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: theme.textSecondary }}>Delivery Fee</span>
                    <span style={{ color: theme.text }}>₩{formatAmount(order.deliveryFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 'bold', paddingTop: '0.25rem', borderTop: `1px solid ${theme.border}` }}>
                    <span style={{ color: theme.text }}>Total</span>
                    <span style={{ color: theme.accent }}>₩{formatAmount(order.total)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {order.status === 'PLACED' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#ef4444', color: theme.text, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500, transition: 'opacity 0.2s' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectOrder(order.id);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                      Reject
                    </button>
                    <button
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: theme.accent, color: theme.text, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500, transition: 'opacity 0.2s' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptOrder(order.id);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                      Accept Order
                    </button>
                  </div>
                )}

                {(order.status === 'ACCEPTED' || order.status === 'PREPARING') && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span className="material-symbols-outlined animate-spin" style={{ color: theme.accent, fontSize: '16px' }}>progress_activity</span>
                      <span style={{ fontSize: '0.75rem', color: theme.accent, fontWeight: 500 }}>Preparing... Est. {order.estimatedDeliveryTime}min</span>
                    </div>
                    <button
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: theme.accent, color: theme.text, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500, transition: 'opacity 0.2s' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkReady(order.id);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restaurant</span>
                      Mark as Ready
                    </button>
                  </div>
                )}

                {(order.status === 'READY' || order.status === 'PICKED_UP') && order.riderId && (
                  <div style={{ backgroundColor: theme.accentSoft, border: `1px solid ${theme.accent}4d`, borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ height: '2rem', width: '2rem', borderRadius: '9999px', backgroundColor: `${theme.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '16px' }}>two_wheeler</span>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.text }}>Rider Assigned</p>
                          <p style={{ fontSize: '0.625rem', color: theme.textSecondary }}>Rider ID: {order.riderId.slice(-6)}</p>
                        </div>
                      </div>
                      <button
                        style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: `${theme.accent}1a`, border: `1px solid ${theme.accent}4d`, color: theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.accent}33`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${theme.accent}1a`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>call</span>
                      </button>
                    </div>
                    {order.status === 'PICKED_UP' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="material-symbols-outlined" style={{ color: theme.accent, fontSize: '12px' }}>local_shipping</span>
                        <span style={{ fontSize: '0.75rem', color: theme.accent }}>On the way • ETA {order.estimatedDeliveryTime}min</span>
                      </div>
                    )}
                  </div>
                )}

                {order.status === 'DELIVERED' && order.settlement && (
                  <div style={{ backgroundColor: theme.accentSoft, border: `1px solid ${theme.accent}4d`, borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined filled" style={{ color: theme.accent, fontSize: '16px' }}>check_circle</span>
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.accent }}>Settled</p>
                          <p style={{ fontSize: '0.625rem', color: theme.textSecondary }}>₩{formatAmount(order.settlement.merchantAmount)} received</p>
                        </div>
                      </div>
                      <button
                        style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'transparent', border: 'none', color: theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accentSoft}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>receipt</span>
                        Receipt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{ backgroundColor: theme.card, borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'sticky', top: 0, backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}`, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: theme.text }}>Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '0.5rem', borderRadius: '9999px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.cardHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="material-symbols-outlined" style={{ color: theme.text }}>close</span>
              </button>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Order Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: theme.textSecondary }}>{selectedOrder.id}</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary }}>{new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}</p>
              </div>

              {/* Customer & Delivery */}
              <div style={{ backgroundColor: `${theme.cardHover}80`, borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Customer</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{anonymizeCustomer(selectedOrder.customerId)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Delivery Address</p>
                  <p style={{ fontSize: '0.875rem', color: theme.text }}>{selectedOrder.deliveryAddress}</p>
                  <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.25rem' }}>{selectedOrder.deliveryDistance}km • Est. {selectedOrder.estimatedDeliveryTime}min</p>
                </div>
                {selectedOrder.specialInstructions && (
                  <div>
                    <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Special Instructions</p>
                    <p style={{ fontSize: '0.875rem', color: '#fbbf24' }}>{selectedOrder.specialInstructions}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.5rem' }}>Order Items</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: `${theme.cardHover}80`, borderRadius: '0.5rem', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.text }}>{item.name}</span>
                        <span style={{ fontSize: '0.875rem', color: theme.text }}>₩{formatAmount(item.unitPrice * item.quantity)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          {item.options && item.options.length > 0 && (
                            <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginBottom: '0.25rem' }}>Options: {item.options.join(', ')}</p>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: theme.textSecondary }}>Qty: {item.quantity} × ₩{formatAmount(item.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Breakdown */}
              <div style={{ backgroundColor: `${theme.cardHover}80`, borderRadius: '0.5rem', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.5rem' }}>Payment Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: theme.textSecondary }}>Subtotal</span>
                    <span style={{ color: theme.text }}>₩{formatAmount(selectedOrder.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: theme.textSecondary }}>Delivery Fee</span>
                    <span style={{ color: theme.text }}>₩{formatAmount(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: theme.textSecondary }}>Platform Fee</span>
                    <span style={{ color: theme.accent }}>₩{formatAmount(selectedOrder.platformFee)} (0%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', paddingTop: '0.5rem', borderTop: `1px solid ${theme.border}` }}>
                    <span style={{ color: theme.text }}>Total</span>
                    <span style={{ color: theme.accent }}>₩{formatAmount(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Info */}
              {selectedOrder.settlement && (
                <div style={{ backgroundColor: theme.accentSoft, border: `1px solid ${theme.accent}4d`, borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className="material-symbols-outlined filled" style={{ color: theme.accent }}>verified</span>
                    <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.accent }}>Settlement Completed</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: theme.textSecondary }}>Merchant Amount</span>
                      <span style={{ color: theme.text, fontWeight: 'bold' }}>₩{formatAmount(selectedOrder.settlement.merchantAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: theme.textSecondary }}>Rider Amount</span>
                      <span style={{ color: theme.text }}>₩{formatAmount(selectedOrder.settlement.riderAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: theme.textSecondary }}>PG Fee (1%)</span>
                      <span style={{ color: theme.text }}>₩{formatAmount(selectedOrder.settlement.pgFeeAmount)}</span>
                    </div>
                    {selectedOrder.settlement.blockchainTxHash && (
                      <div style={{ paddingTop: '0.5rem', borderTop: `1px solid ${theme.accent}4d` }}>
                        <p style={{ fontSize: '0.75rem', color: theme.textSecondary, marginBottom: '0.25rem' }}>Blockchain TX</p>
                        <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: theme.accent, wordBreak: 'break-all' }}>{selectedOrder.settlement.blockchainTxHash}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrders;
