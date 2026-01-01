/**
 * Webhook Service
 * Frontend integration for webhook management
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export type WebhookEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'wallet.charged'
  | 'wallet.low_balance'
  | 'merchant.settlement'
  | 'user.registered'
  | 'user.verified'
  | 'voucher.redeemed'
  | 'voucher.expired';

export interface Webhook {
  id: string;
  merchantId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
}

export interface WebhookCreateRequest {
  url: string;
  events: WebhookEventType[];
}

export interface WebhookUpdateRequest {
  url?: string;
  events?: WebhookEventType[];
  enabled?: boolean;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  error: string | null;
  duration: number | null;
  attempt: number;
  createdAt: string;
}

export interface WebhookEventInfo {
  type: WebhookEventType;
  description: string;
}

// ==================== Webhook Service ====================

class WebhookService {
  /**
   * List all webhooks for current merchant
   */
  async listWebhooks(): Promise<Webhook[]> {
    return backendApiClient.get<Webhook[]>('/webhooks');
  }

  /**
   * Create a new webhook
   */
  async createWebhook(request: WebhookCreateRequest): Promise<Webhook> {
    return backendApiClient.post<Webhook>('/webhooks', request);
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, request: WebhookUpdateRequest): Promise<{ message: string }> {
    return backendApiClient.patch<{ message: string }>(`/webhooks/${webhookId}`, request);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<{ message: string }> {
    return backendApiClient.delete<{ message: string }>(`/webhooks/${webhookId}`);
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
    return backendApiClient.get<WebhookDelivery[]>(`/webhooks/${webhookId}/deliveries?limit=${limit}`);
  }

  /**
   * Send test webhook
   */
  async sendTestWebhook(webhookId: string): Promise<{ message: string }> {
    return backendApiClient.post<{ message: string }>(`/webhooks/${webhookId}/test`);
  }

  /**
   * Get available webhook event types
   */
  async getEventTypes(): Promise<WebhookEventInfo[]> {
    return backendApiClient.get<WebhookEventInfo[]>('/webhooks/events/list');
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

export default webhookService;
