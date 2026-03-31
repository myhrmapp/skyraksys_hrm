import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as Storage from '../utils/storage';

const API_BASE_URL = __DEV__
  ? Platform.OS === 'web'
    ? 'http://localhost:5000/api'   // Web browser (expo start --web) → backend on :5000
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'   // Android emulator → host machine
    : 'http://localhost:5000/api'   // iOS simulator → localhost
  : '/api';  // Production: relative path — nginx proxies /api → backend:5000

// For physical device local testing, replace the dev URL with your machine's LAN IP:
// e.g. 'http://192.168.x.x:5000/api'

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await Storage.getItemAsync(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ───────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await Storage.getItemAsync(REFRESH_KEY);
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const newAccessToken = data.accessToken || data.token;
      const newRefreshToken = data.refreshToken;

      await Storage.setItemAsync(TOKEN_KEY, newAccessToken);
      if (newRefreshToken) {
        await Storage.setItemAsync(REFRESH_KEY, newRefreshToken);
      }

      processQueue(null, newAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await Storage.deleteItemAsync(TOKEN_KEY);
      await Storage.deleteItemAsync(REFRESH_KEY);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Token helpers ────────────────────────────────────────────
export const storeTokens = async (accessToken: string, refreshToken: string) => {
  await Storage.setItemAsync(TOKEN_KEY, accessToken);
  await Storage.setItemAsync(REFRESH_KEY, refreshToken);
};

export const clearTokens = async () => {
  await Storage.deleteItemAsync(TOKEN_KEY);
  await Storage.deleteItemAsync(REFRESH_KEY);
};

export const getAccessToken = () => Storage.getItemAsync(TOKEN_KEY);

export default api;
