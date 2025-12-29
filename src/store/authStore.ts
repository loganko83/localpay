/**
 * Authentication Store
 * Zustand store for auth state management with backend integration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserType, ConsumerUser, MerchantUser, AdminUser } from '../types';
import { applyTheme } from '../styles/themes';
import { authService, type LoginRequest, type RegisterRequest, type AuthUser } from '../services/api/authService';

type User = ConsumerUser | MerchantUser | AdminUser;

interface AuthState {
  // State
  user: User | null;
  userType: UserType;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;

  // Theme/Type actions
  setUserType: (type: UserType) => void;

  // Auth actions
  initialize: () => void;
  loginWithCredentials: (request: LoginRequest) => Promise<boolean>;
  register: (request: RegisterRequest) => Promise<boolean>;
  login: (user: User, type: UserType) => void; // Legacy support
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;

  // Helpers
  getMerchantId: () => string | null;
}

// Convert AuthUser to User type
function convertAuthUser(authUser: AuthUser, userType: UserType): User {
  const baseUser = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    phone: authUser.phone,
    avatarUrl: authUser.avatarUrl,
    createdAt: new Date().toISOString(),
  };

  switch (userType) {
    case 'consumer':
      return {
        ...baseUser,
        level: (authUser.level as ConsumerUser['level']) || 'Bronze',
        kycVerified: authUser.kycVerified,
      } as ConsumerUser;

    case 'merchant':
      return {
        ...baseUser,
        businessNumber: '',
        storeName: '',
        category: '',
        isVerified: true,
      } as MerchantUser;

    case 'admin':
      return {
        ...baseUser,
        role: 'admin',
        permissions: [],
      } as AdminUser;

    default:
      return baseUser as User;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      userType: 'consumer',
      isAuthenticated: false,
      isLoading: true,
      error: null,
      token: null,

      // Set user type (for theme switching)
      setUserType: (type) => {
        applyTheme(type);
        set({ userType: type });
      },

      // Initialize auth from stored session
      initialize: () => {
        const state = authService.initialize();
        if (state.isAuthenticated && state.user) {
          const userType = state.user.userType;
          applyTheme(userType);
          set({
            isAuthenticated: true,
            isLoading: false,
            user: convertAuthUser(state.user, userType),
            userType,
            token: state.token,
            error: null,
          });
        } else {
          set({ isLoading: false });
        }
      },

      // Login with email/password
      loginWithCredentials: async (request: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.login(request);
          const userType = response.user.userType;
          applyTheme(userType);

          set({
            isAuthenticated: true,
            isLoading: false,
            user: convertAuthUser(response.user, userType),
            userType,
            token: response.token,
            error: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            token: null,
            error: message,
          });
          return false;
        }
      },

      // Register new user
      register: async (request: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.register(request);
          const userType = response.user.userType;
          applyTheme(userType);

          set({
            isAuthenticated: true,
            isLoading: false,
            user: convertAuthUser(response.user, userType),
            userType,
            token: response.token,
            error: null,
          });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            token: null,
            error: message,
          });
          return false;
        }
      },

      // Legacy login (for demo mode)
      login: (user, type) => {
        applyTheme(type);
        set({
          user,
          userType: type,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Logout
      logout: async () => {
        set({ isLoading: true });

        try {
          await authService.logout();
        } finally {
          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            token: null,
            error: null,
          });
        }
      },

      // Refresh user info from server
      refreshUser: async () => {
        if (!get().isAuthenticated) return;

        try {
          const authUser = await authService.getCurrentUser();
          const userType = authUser.userType;
          set({ user: convertAuthUser(authUser, userType) });
        } catch (error) {
          // If unauthorized, logout
          if (error instanceof Error && error.message.includes('Unauthorized')) {
            await get().logout();
          }
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Get merchant ID (for merchant users)
      getMerchantId: () => {
        const user = get().user;
        if (user && 'merchantId' in user) {
          return (user as { merchantId?: string }).merchantId || null;
        }
        return null;
      },
    }),
    {
      name: 'localpay-auth',
      partialize: (state) => ({
        userType: state.userType,
      }),
    }
  )
);

export default useAuthStore;
