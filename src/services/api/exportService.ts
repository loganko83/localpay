/**
 * Export Service
 * Frontend integration for data export operations
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface ExportOptions {
  format?: 'csv' | 'pdf' | 'json';
  dateFrom?: string;
  dateTo?: string;
}

export interface UserDataExport {
  exportedAt: string;
  data: {
    profile: Record<string, unknown>;
    transactions: Array<Record<string, unknown>>;
    wallet: Record<string, unknown>;
  };
}

// ==================== Export Service ====================

class ExportService {
  /**
   * Export user transactions
   */
  async exportTransactions(options: ExportOptions = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);

    const queryString = params.toString();
    const endpoint = queryString ? `/export/transactions?${queryString}` : '/export/transactions';

    const response = await fetch(`${backendApiClient['config'].baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${backendApiClient.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Export merchant transactions
   */
  async exportMerchantTransactions(options: ExportOptions = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);

    const queryString = params.toString();
    const endpoint = queryString ? `/export/merchant/transactions?${queryString}` : '/export/merchant/transactions';

    const response = await fetch(`${backendApiClient['config'].baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${backendApiClient.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Generate settlement report
   */
  async generateSettlementReport(dateFrom: string, dateTo: string): Promise<Blob> {
    const params = new URLSearchParams({ dateFrom, dateTo });
    const endpoint = `/export/merchant/settlement?${params.toString()}`;

    const response = await fetch(`${backendApiClient['config'].baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${backendApiClient.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Settlement report generation failed');
    }

    return response.blob();
  }

  /**
   * Export user data (GDPR)
   */
  async exportUserData(): Promise<UserDataExport> {
    return backendApiClient.get<UserDataExport>('/export/user-data');
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Export singleton instance
export const exportService = new ExportService();

export default exportService;
