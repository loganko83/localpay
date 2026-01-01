/**
 * Notification Service
 * Frontend integration for notifications and real-time updates
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'payment' | 'refund' | 'voucher' | 'security' | 'promotion' | 'system';
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  categories: {
    payment: boolean;
    refund: boolean;
    voucher: boolean;
    security: boolean;
    promotion: boolean;
    system: boolean;
  };
}

export interface DeviceTokenRequest {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

// ==================== WebSocket Connection ====================

type MessageHandler = (data: unknown) => void;

class WebSocketConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(url: string) {
    this.url = url;
  }

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${this.url}?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        const handlers = this.handlers.get(type);
        if (handlers) {
          handlers.forEach((handler) => handler(data));
        }

        // Also call 'all' handlers
        const allHandlers = this.handlers.get('*');
        if (allHandlers) {
          allHandlers.forEach((handler) => handler(message));
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(token);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect(token);
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  send(type: string, data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ==================== Notification Service ====================

class NotificationService {
  private wsConnection: WebSocketConnection | null = null;

  /**
   * Get notifications
   */
  async getNotifications(page: number = 1, size: number = 20): Promise<NotificationListResponse> {
    return backendApiClient.get<NotificationListResponse>(`/notifications?page=${page}&size=${size}`);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return backendApiClient.get<{ count: number }>('/notifications/unread-count');
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ message: string }> {
    return backendApiClient.patch<{ message: string }>(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(): Promise<{ message: string }> {
    return backendApiClient.post<{ message: string }>('/notifications/read-all');
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    return backendApiClient.delete<{ message: string }>(`/notifications/${notificationId}`);
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    return backendApiClient.get<NotificationPreferences>('/notifications/preferences');
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return backendApiClient.patch<NotificationPreferences>('/notifications/preferences', preferences);
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(request: DeviceTokenRequest): Promise<{ message: string }> {
    return backendApiClient.post<{ message: string }>('/external/push/register', request);
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<{ message: string }> {
    return backendApiClient.delete<{ message: string }>(`/external/push/unregister?token=${token}`);
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(token: string): WebSocketConnection {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://trendy.storydot.kr/localpay/ws';
    this.wsConnection = new WebSocketConnection(wsUrl);
    this.wsConnection.connect(token);
    return this.wsConnection;
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    this.wsConnection?.disconnect();
    this.wsConnection = null;
  }

  /**
   * Get WebSocket connection
   */
  getWebSocket(): WebSocketConnection | null {
    return this.wsConnection;
  }

  /**
   * Subscribe to notification events
   */
  onNotification(handler: (notification: Notification) => void): () => void {
    if (this.wsConnection) {
      return this.wsConnection.on('notification', handler as MessageHandler);
    }
    return () => {};
  }

  /**
   * Subscribe to balance updates
   */
  onBalanceUpdate(handler: (data: { balance: number }) => void): () => void {
    if (this.wsConnection) {
      return this.wsConnection.on('balance_update', handler as MessageHandler);
    }
    return () => {};
  }

  /**
   * Subscribe to transaction updates
   */
  onTransactionUpdate(handler: (data: unknown) => void): () => void {
    if (this.wsConnection) {
      return this.wsConnection.on('transaction', handler);
    }
    return () => {};
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

export default notificationService;
