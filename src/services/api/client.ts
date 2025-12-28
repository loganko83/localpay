/**
 * Base API Client
 * Unified HTTP client with error handling, retries, and authentication
 */

// API Client module - no external error imports needed

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
  authToken?: string;
  retries?: number;
  retryDelay?: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    size?: number;
    total?: number;
    timestamp?: string;
  };
}

// Paginated response
export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Request options
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean;
  retries?: number;
}

// Error types
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: ApiErrorCode, status?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Base API Client Class
 */
export class ApiClient {
  private config: ApiConfig;
  private authToken: string | null = null;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get current auth token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Build request headers
   */
  private buildHeaders(options?: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options?.headers,
    };

    // Add API key if configured
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    // Add auth token unless skipped
    if (!options?.skipAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Parse error response
   */
  private parseError(status: number, data?: ApiResponse<unknown>): ApiError {
    let code: ApiErrorCode;
    let message = data?.error?.message || data?.message || 'Request failed';

    switch (status) {
      case 401:
        code = 'UNAUTHORIZED';
        message = message || 'Authentication required';
        break;
      case 403:
        code = 'FORBIDDEN';
        message = message || 'Access denied';
        break;
      case 404:
        code = 'NOT_FOUND';
        message = message || 'Resource not found';
        break;
      case 422:
        code = 'VALIDATION_ERROR';
        break;
      case 500:
      case 502:
      case 503:
        code = 'SERVER_ERROR';
        message = message || 'Server error';
        break;
      default:
        code = 'UNKNOWN_ERROR';
    }

    return new ApiError(message, code, status, data?.error?.details);
  }

  /**
   * Execute request with retries
   */
  private async executeWithRetry<T>(
    method: string,
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const maxRetries = options?.retries ?? this.config.retries ?? 3;
    const retryDelay = this.config.retryDelay ?? 1000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = options?.timeout ?? this.config.timeout ?? 30000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: this.buildHeaders(options),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse response
        let data: ApiResponse<T>;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { success: response.ok, data: text as unknown as T };
        }

        // Handle error responses
        if (!response.ok) {
          throw this.parseError(response.status, data as ApiResponse<unknown>);
        }

        // Return data
        if (data.success === false) {
          throw this.parseError(response.status, data as ApiResponse<unknown>);
        }

        return (data.data ?? data) as T;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on specific errors
        if (error instanceof ApiError) {
          if (['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR'].includes(error.code)) {
            throw error;
          }
        }

        // Abort error (timeout)
        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new ApiError('Request timeout', 'TIMEOUT');
        }

        // Network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = new ApiError('Network error', 'NETWORK_ERROR');
        }

        // Retry if not last attempt
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
      }
    }

    throw lastError || new ApiError('Request failed', 'UNKNOWN_ERROR');
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return this.executeWithRetry<T>('GET', url, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return this.executeWithRetry<T>('POST', url, body, options);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return this.executeWithRetry<T>('PUT', url, body, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return this.executeWithRetry<T>('PATCH', url, body, options);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return this.executeWithRetry<T>('DELETE', url, undefined, options);
  }
}

// ==================== Pre-configured API Clients ====================

/**
 * Environment configuration
 */
export const API_CONFIG = {
  // Bank API (IBK Bank)
  bank: {
    baseUrl: import.meta.env.VITE_BANK_API_URL || '/api/bank',
    apiKey: import.meta.env.VITE_BANK_API_KEY || '',
    timeout: 30000,
  },
  // Backend API (Our server)
  backend: {
    baseUrl: import.meta.env.VITE_API_URL || '/api',
    timeout: 15000,
  },
  // DID-BaaS API
  didBaas: {
    baseUrl: import.meta.env.VITE_DID_BAAS_URL || 'https://trendy.storydot.kr/did-baas',
    apiKey: import.meta.env.VITE_DID_BAAS_API_KEY || '',
    timeout: 30000,
  },
  // Feature flags
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true' || !import.meta.env.VITE_API_URL,
};

// Bank API client instance
export const bankApiClient = new ApiClient({
  baseUrl: API_CONFIG.bank.baseUrl,
  apiKey: API_CONFIG.bank.apiKey,
  timeout: API_CONFIG.bank.timeout,
});

// Backend API client instance
export const backendApiClient = new ApiClient({
  baseUrl: API_CONFIG.backend.baseUrl,
  timeout: API_CONFIG.backend.timeout,
});

// DID-BaaS API client instance
export const didApiClient = new ApiClient({
  baseUrl: API_CONFIG.didBaas.baseUrl,
  apiKey: API_CONFIG.didBaas.apiKey,
  timeout: API_CONFIG.didBaas.timeout,
});

export default ApiClient;
