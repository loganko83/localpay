import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserType, ConsumerUser, MerchantUser, AdminUser } from '../types';
import { applyTheme } from '../styles/themes';

type User = ConsumerUser | MerchantUser | AdminUser;

interface AuthState {
  user: User | null;
  userType: UserType;
  isAuthenticated: boolean;

  setUserType: (type: UserType) => void;
  login: (user: User, type: UserType) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      userType: 'consumer',
      isAuthenticated: false,

      setUserType: (type) => {
        applyTheme(type);
        set({ userType: type });
      },

      login: (user, type) => {
        applyTheme(type);
        set({
          user,
          userType: type,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
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
