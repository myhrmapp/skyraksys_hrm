import { create } from 'zustand';
import * as Storage from '../utils/storage';
import { authApi, User } from '../api/auth';
import { clearTokens } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  viewMode: 'employee' | 'manager';

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setBiometric: (enabled: boolean) => Promise<void>;
  setViewMode: (mode: 'employee' | 'manager') => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  biometricEnabled: false,
  viewMode: 'employee',

  login: async (email, password) => {
    const result = await authApi.login({ email, password });
    set({ user: result.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local state even if API call fails
    }
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await Storage.getItemAsync('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const user = await authApi.getProfile();
      const bioStr = await Storage.getItemAsync('biometricEnabled');
      const viewModeStr = await Storage.getItemAsync('viewMode');
      const isManagerRole = user.role === 'manager' || user.role === 'admin' || user.role === 'hr';
      const viewMode: 'employee' | 'manager' =
        isManagerRole && viewModeStr === 'manager' ? 'manager' : 'employee';
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        biometricEnabled: bioStr === 'true',
        viewMode,
      });
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setBiometric: async (enabled) => {
    await Storage.setItemAsync('biometricEnabled', enabled ? 'true' : 'false');
    set({ biometricEnabled: enabled });
  },

  setViewMode: async (mode) => {
    await Storage.setItemAsync('viewMode', mode);
    set({ viewMode: mode });
  },
}));
