import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../../components/common';
import { publicDeliveryService, DeliveryOrder, OrderStatus } from '../../services/publicDelivery';

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
    <div className="flex flex-col pb-4 bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-surface">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#13ec5b]/10 border border-[#13ec5b]/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#13ec5b]">restaurant</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Delivery Orders</h2>
            <p className="text-xs text-text-secondary">Real-time order management</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 rounded-full hover:bg-surface transition-colors"
        >
          <span className="material-symbols-outlined text-white">history</span>
        </button>
      </div>

      {/* Orders Summary Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md" className="bg-surface border-surface-highlight">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Today's Orders</p>
                <p className="text-2xl font-bold text-white">{todayOrders}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#13ec5b]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#13ec5b]">receipt_long</span>
              </div>
            </div>
          </Card>

          <Card padding="md" className="bg-surface border-surface-highlight">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Pending Action</p>
                <p className="text-2xl font-bold text-yellow-500">{pendingOrders}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-yellow-500">notification_important</span>
              </div>
            </div>
          </Card>

          <Card padding="md" className="bg-surface border-surface-highlight">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Completed</p>
                <p className="text-2xl font-bold text-[#13ec5b]">{completedOrders}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#13ec5b]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#13ec5b] filled">check_circle</span>
              </div>
            </div>
          </Card>

          <Card padding="md" className="bg-surface border-surface-highlight">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary mb-1">Today's Revenue</p>
                <p className="text-lg font-bold text-[#13ec5b]">₩{formatAmount(todayRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#13ec5b]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#13ec5b]">payments</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Order Status Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-all
                ${activeTab === tab.key
                  ? 'bg-[#13ec5b] text-background'
                  : 'bg-surface border border-surface-highlight text-text-secondary hover:bg-surface-highlight'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${activeTab === tab.key ? 'bg-background/20 text-background' : 'bg-surface-highlight text-white'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Settlement Summary */}
      <div className="px-4 mb-4">
        <Card padding="md" className="bg-gradient-to-br from-[#13ec5b]/10 to-surface border-[#13ec5b]/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Settlement Summary</h3>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[#13ec5b] text-[16px] filled">verified</span>
              <span className="text-xs text-[#13ec5b] font-medium">Blockchain Verified</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary">Today's Settlements</span>
              <span className="text-sm font-bold text-white">₩{formatAmount(todayRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary">Pending Settlement</span>
              <span className="text-sm font-bold text-yellow-500">₩{formatAmount(pendingSettlement)}</span>
            </div>
            <div className="pt-2 border-t border-surface-highlight">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Platform Commission</span>
                <span className="text-sm font-bold text-[#13ec5b]">0%</span>
              </div>
              <p className="text-[10px] text-text-muted mt-1">Only 1% payment gateway fee applies</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Orders List */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-white mb-3">
          {activeTab === 'pending' && 'Incoming Orders'}
          {activeTab === 'preparing' && 'Orders in Preparation'}
          {activeTab === 'ready' && 'Ready for Pickup'}
          {activeTab === 'completed' && 'Completed Orders'}
          {activeTab === 'all' && 'All Orders'}
        </h3>

        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <Card padding="lg" className="text-center">
              <span className="material-symbols-outlined text-text-muted text-[48px] mb-2 block">inbox</span>
              <p className="text-sm text-text-secondary">No orders in this category</p>
            </Card>
          ) : (
            filteredOrders.map(order => (
              <Card
                key={order.id}
                padding="md"
                className="bg-surface border-surface-highlight hover:border-[#13ec5b]/50 transition-colors"
                onClick={() => setSelectedOrder(order)}
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-secondary">{order.id}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <span className="text-xs text-text-secondary">{formatTime(order.createdAt)}</span>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-surface-highlight flex items-center justify-center">
                    <span className="material-symbols-outlined text-text-secondary text-[16px]">person</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{anonymizeCustomer(order.customerId)}</p>
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">location_on</span>
                      {partialAddress(order.deliveryAddress)} • {order.deliveryDistance}km
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-surface-highlight/50 rounded-lg p-3 mb-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start mb-1 last:mb-0">
                      <div className="flex-1">
                        <span className="text-sm text-white">{item.name} x{item.quantity}</span>
                        {item.options && item.options.length > 0 && (
                          <p className="text-xs text-text-muted">• {item.options.join(', ')}</p>
                        )}
                      </div>
                      <span className="text-sm text-text-secondary">₩{formatAmount(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                {order.specialInstructions && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-yellow-500 text-[16px]">info</span>
                      <p className="text-xs text-yellow-500 flex-1">{order.specialInstructions}</p>
                    </div>
                  </div>
                )}

                {/* Order Total */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="text-white">₩{formatAmount(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Delivery Fee</span>
                    <span className="text-white">₩{formatAmount(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-surface-highlight">
                    <span className="text-white">Total</span>
                    <span className="text-[#13ec5b]">₩{formatAmount(order.total)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {order.status === 'PLACED' && (
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectOrder(order.id);
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 bg-[#13ec5b] hover:bg-[#10c34d]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptOrder(order.id);
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Accept Order
                    </Button>
                  </div>
                )}

                {(order.status === 'ACCEPTED' || order.status === 'PREPARING') && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#13ec5b] text-[16px] animate-spin">progress_activity</span>
                      <span className="text-xs text-[#13ec5b] font-medium">Preparing... Est. {order.estimatedDeliveryTime}min</span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      className="bg-[#13ec5b] hover:bg-[#10c34d]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkReady(order.id);
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">restaurant</span>
                      Mark as Ready
                    </Button>
                  </div>
                )}

                {(order.status === 'READY' || order.status === 'PICKED_UP') && order.riderId && (
                  <div className="bg-[#13ec5b]/10 border border-[#13ec5b]/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-[#13ec5b]/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#13ec5b] text-[16px]">two_wheeler</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Rider Assigned</p>
                          <p className="text-[10px] text-text-secondary">Rider ID: {order.riderId.slice(-6)}</p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-[#13ec5b]/10 border-[#13ec5b]/30 text-[#13ec5b] hover:bg-[#13ec5b]/20"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                      </Button>
                    </div>
                    {order.status === 'PICKED_UP' && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[#13ec5b] text-[12px]">local_shipping</span>
                        <span className="text-xs text-[#13ec5b]">On the way • ETA {order.estimatedDeliveryTime}min</span>
                      </div>
                    )}
                  </div>
                )}

                {order.status === 'DELIVERED' && order.settlement && (
                  <div className="bg-[#13ec5b]/10 border border-[#13ec5b]/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#13ec5b] text-[16px] filled">check_circle</span>
                        <div>
                          <p className="text-xs font-bold text-[#13ec5b]">Settled</p>
                          <p className="text-[10px] text-text-secondary">₩{formatAmount(order.settlement.merchantAmount)} received</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#13ec5b] hover:bg-[#13ec5b]/10"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt</span>
                        Receipt
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-surface rounded-t-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b border-surface-highlight px-4 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full hover:bg-surface-highlight transition-colors"
              >
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Order Info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-text-secondary">{selectedOrder.id}</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-text-secondary">{new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}</p>
              </div>

              {/* Customer & Delivery */}
              <div className="bg-surface-highlight/50 rounded-lg p-3 space-y-3">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Customer</p>
                  <p className="text-sm font-bold text-white">{anonymizeCustomer(selectedOrder.customerId)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Delivery Address</p>
                  <p className="text-sm text-white">{selectedOrder.deliveryAddress}</p>
                  <p className="text-xs text-text-muted mt-1">{selectedOrder.deliveryDistance}km • Est. {selectedOrder.estimatedDeliveryTime}min</p>
                </div>
                {selectedOrder.specialInstructions && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Special Instructions</p>
                    <p className="text-sm text-yellow-500">{selectedOrder.specialInstructions}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <p className="text-xs text-text-secondary mb-2">Order Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="bg-surface-highlight/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold text-white">{item.name}</span>
                        <span className="text-sm text-white">₩{formatAmount(item.unitPrice * item.quantity)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          {item.options && item.options.length > 0 && (
                            <p className="text-xs text-text-muted mb-1">Options: {item.options.join(', ')}</p>
                          )}
                        </div>
                        <span className="text-xs text-text-secondary">Qty: {item.quantity} × ₩{formatAmount(item.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="bg-surface-highlight/50 rounded-lg p-3">
                <p className="text-xs text-text-secondary mb-2">Payment Breakdown</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="text-white">₩{formatAmount(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Delivery Fee</span>
                    <span className="text-white">₩{formatAmount(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Platform Fee</span>
                    <span className="text-[#13ec5b]">₩{formatAmount(selectedOrder.platformFee)} (0%)</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-surface-highlight">
                    <span className="text-white">Total</span>
                    <span className="text-[#13ec5b]">₩{formatAmount(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Info */}
              {selectedOrder.settlement && (
                <div className="bg-[#13ec5b]/10 border border-[#13ec5b]/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#13ec5b] filled">verified</span>
                    <p className="text-sm font-bold text-[#13ec5b]">Settlement Completed</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Merchant Amount</span>
                      <span className="text-white font-bold">₩{formatAmount(selectedOrder.settlement.merchantAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Rider Amount</span>
                      <span className="text-white">₩{formatAmount(selectedOrder.settlement.riderAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">PG Fee (1%)</span>
                      <span className="text-white">₩{formatAmount(selectedOrder.settlement.pgFeeAmount)}</span>
                    </div>
                    {selectedOrder.settlement.blockchainTxHash && (
                      <div className="pt-2 border-t border-[#13ec5b]/30">
                        <p className="text-xs text-text-secondary mb-1">Blockchain TX</p>
                        <p className="text-xs font-mono text-[#13ec5b] break-all">{selectedOrder.settlement.blockchainTxHash}</p>
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
