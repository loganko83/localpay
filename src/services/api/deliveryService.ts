/**
 * Delivery Service
 * Frontend integration for delivery order management
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface DeliveryOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  options?: string[];
}

export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  userId: string;
  merchantId: string;
  merchantName?: string;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryNotes: string | null;
  contactPhone: string;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivering' | 'completed' | 'cancelled';
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface DeliveryOrderListResponse {
  orders: DeliveryOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DeliveryTracking {
  id: string;
  orderId: string;
  status: string;
  locationLat: number | null;
  locationLng: number | null;
  note: string | null;
  createdAt: string;
}

export interface DeliveryOrderDetail extends DeliveryOrder {
  tracking: DeliveryTracking[];
}

export interface DeliveryStats {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  averageDeliveryTime: number;
  cancelRate: number;
}

// ==================== Delivery Service ====================

class DeliveryService {
  /**
   * Get consumer's delivery orders
   */
  async getMyOrders(filters?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<DeliveryOrderListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/delivery/orders?${queryString}` : '/delivery/orders';

    const response = await backendApiClient.get<{ success: boolean; data: DeliveryOrderListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get order details with tracking
   */
  async getOrder(orderId: string): Promise<DeliveryOrderDetail> {
    const response = await backendApiClient.get<{ success: boolean; data: { order: DeliveryOrderDetail } }>(
      `/delivery/orders/${orderId}`
    );
    return response.data.order;
  }

  /**
   * Create delivery order
   */
  async createOrder(data: {
    merchantId: string;
    items: Array<{ menuItemId: string; quantity: number; options?: string[] }>;
    deliveryAddress: string;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveryNotes?: string;
    contactPhone: string;
    couponCode?: string;
  }): Promise<DeliveryOrder> {
    const response = await backendApiClient.post<{ success: boolean; data: { order: DeliveryOrder } }>(
      '/delivery/orders',
      data
    );
    return response.data.order;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    await backendApiClient.post<{ success: boolean }>(`/delivery/orders/${orderId}/cancel`, { reason });
  }

  /**
   * Get merchant's delivery orders
   */
  async getMerchantOrders(filters?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<DeliveryOrderListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/delivery/merchant/orders?${queryString}` : '/delivery/merchant/orders';

    const response = await backendApiClient.get<{ success: boolean; data: DeliveryOrderListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Update order status (merchant)
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string,
    estimatedMinutes?: number
  ): Promise<DeliveryOrder> {
    const response = await backendApiClient.put<{ success: boolean; data: { order: DeliveryOrder } }>(
      `/delivery/merchant/orders/${orderId}/status`,
      { status, note, estimatedMinutes }
    );
    return response.data.order;
  }

  /**
   * Get delivery statistics (merchant)
   */
  async getMerchantStats(): Promise<DeliveryStats> {
    const response = await backendApiClient.get<{ success: boolean; data: DeliveryStats }>('/delivery/merchant/stats');
    return response.data;
  }
}

// Export singleton instance
export const deliveryService = new DeliveryService();

export default deliveryService;
