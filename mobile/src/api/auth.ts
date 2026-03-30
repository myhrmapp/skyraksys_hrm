import api, { storeTokens, clearTokens } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'hr' | 'manager' | 'employee';
  employeeId?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  accessToken?: string;
  token?: string;
  refreshToken: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', payload);
    // Backend wraps response in ApiResponse: { success, data: { user, accessToken, refreshToken } }
    const inner = data.data || data;
    const accessToken = inner.accessToken || inner.token || '';
    const refreshToken = inner.refreshToken || '';
    await storeTokens(accessToken, refreshToken);
    return { success: data.success, user: inner.user, accessToken, token: accessToken, refreshToken };
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await clearTokens();
    }
  },

  getProfile: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    // Backend wraps in ApiResponse: { success, data: { id, firstName, ..., employee: { id } } }
    const inner = data.data || data;
    return {
      id: inner.id,
      firstName: inner.firstName,
      lastName: inner.lastName,
      email: inner.email,
      role: inner.role,
      employeeId: inner.employee?.id ?? inner.employeeId,
    };
  },
};
