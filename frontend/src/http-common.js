import axios from "axios";

// Resolve API base URL from environment (fallback to same-origin /api)
const BASE_URL = process.env.REACT_APP_API_URL || "/api";

// Create axios instance
const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-type": "application/json"
  },
  withCredentials: true // Send httpOnly cookies with every request
});

// --- Token refresh queue ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor (error normalisation only — no localStorage token)
http.interceptors.request.use(
  (config) => config,
  (error) => {
    const err = error instanceof Error ? error : new Error(error?.message || 'Request error');
    return Promise.reject(err);
  }
);

// Response interceptor with silent token refresh on 401
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failing request IS the refresh call
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        // Refresh itself failed — redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Don't try to refresh for auth check endpoints (these are just checking auth status)
      if (originalRequest.url?.includes('/auth/me')) {
        // Auth check failed — this is expected after logout, don't spam refresh attempts
        return Promise.reject(error);
      }

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => http(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent refresh (cookie sent automatically)
        await axios.post(`${BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
        processQueue(null);
        // Retry the original request with the new cookie
        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — force re-login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const err = error instanceof Error ? error : new Error(error?.message || 'Response error');
    return Promise.reject(err);
  }
);

export default http;
