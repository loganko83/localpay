/**
 * Authentication Service
 * Handles login, logout, registration, and session management
 */

import { backendApiClient } from './client';
import type { UserType } from '../../types';

// ==================== Types ====================

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
  userType?: UserType;
  deviceId?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  expiresAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  userType: 'consumer' | 'merchant';
  phone?: string;
  // Merchant-specific
  businessNumber?: string;
  storeName?: string;
  category?: string;
  address?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  name: string;
  userType: UserType;
  avatarUrl?: string;
  kycVerified: boolean;
  level?: string;
  merchantId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  expiresAt: string | null;
}

// ==================== Storage Keys ====================

const STORAGE_KEYS = {
  TOKEN: 'localpay_token',
  USER: 'localpay_user',
  EXPIRES_AT: 'localpay_expires_at',
} as const;

// ==================== Auth Service ====================

class AuthService {
  private initialized = false;

  /**
   * Initialize auth service - restore session from storage
   */
  initialize(): AuthState {
    if (this.initialized) {
      return this.getState();
    }

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

    if (token && userJson && expiresAt) {
      // Check if token is expired
      if (new Date(expiresAt) > new Date()) {
        const user = JSON.parse(userJson) as AuthUser;
        backendApiClient.setAuthToken(token);
        this.initialized = true;
        return {
          isAuthenticated: true,
          user,
          token,
          expiresAt,
        };
      } else {
        // Token expired, clear storage
        this.clearStorage();
      }
    }

    this.initialized = true;
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      expiresAt: null,
    };
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

    if (token && userJson && expiresAt && new Date(expiresAt) > new Date()) {
      return {
        isAuthenticated: true,
        user: JSON.parse(userJson) as AuthUser,
        token,
        expiresAt,
      };
    }

    return {
      isAuthenticated: false,
      user: null,
      token: null,
      expiresAt: null,
    };
  }

  /**
   * Login user
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await backendApiClient.post<LoginResponse>('/auth/login', request, {
      skipAuth: true,
    });

    // Save to storage
    this.saveSession(response);

    return response;
  }

  /**
   * Register new user
   */
  async register(request: RegisterRequest): Promise<LoginResponse> {
    const response = await backendApiClient.post<LoginResponse>('/auth/register', request, {
      skipAuth: true,
    });

    // Save to storage
    this.saveSession(response);

    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await backendApiClient.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
      console.warn('Logout request failed:', error);
    } finally {
      this.clearStorage();
      backendApiClient.setAuthToken(null);
    }
  }

  /**
   * Get current user info from server
   */
  async getCurrentUser(): Promise<AuthUser> {
    const response = await backendApiClient.get<AuthUser>('/auth/me');

    // Update stored user
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response));

    return response;
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<{ token: string; expiresAt: string }> {
    const response = await backendApiClient.post<{ token: string; expiresAt: string }>('/auth/refresh');

    // Update storage
    localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, response.expiresAt);
    backendApiClient.setAuthToken(response.token);

    return response;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const state = this.getState();
    return state.isAuthenticated;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Get current user
   */
  getUser(): AuthUser | null {
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  }

  // ==================== Private Methods ====================

  private saveSession(response: LoginResponse): void {
    localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, response.expiresAt);
    backendApiClient.setAuthToken(response.token);
  }

  private clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
