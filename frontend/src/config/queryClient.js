/**
 * React Query Configuration
 * Centralized query client setup with optimized defaults
 * Updated for @tanstack/react-query v5
 */
import { QueryClient } from '@tanstack/react-query';

// Global error handlers
const handleQueryError = (error) => {
  console.error('Query error:', error);
  // TODO: Add error logging service (Sentry, LogRocket, etc.)
};

const handleMutationError = (error) => {
  console.error('Mutation error:', error);
  // TODO: Add error logging service (Sentry, LogRocket, etc.)
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garbage collection time (v5: renamed from cacheTime)
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus (enable per-query if needed)
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      // Global error handler
      onError: handleQueryError,
    },
    mutations: {
      // Retry mutations once on network errors only
      retry: (failureCount, error) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      // Global mutation error handler
      onError: handleMutationError,
    },
  },
});
