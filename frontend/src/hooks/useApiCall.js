import { useState, useCallback } from 'react';
import ApiResponseHandler from '../utils/apiResponseHandler';

/**
 * Centralized API call hook with loading and error handling
 * Provides consistent state management for API operations
 */
export const useApiCall = (initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Execute an API call with automatic loading and error handling
   * @param {Function} apiFunction - The API function to call
   * @param {Object} options - Options for the API call
   */
  const execute = useCallback(async (apiFunction, options = {}) => {
    const {
      onSuccess,
      onError,
      showLoading = true,
      transformData,
      retainDataOnError = false
    } = options;

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Execute the API call through our response handler
      const response = await ApiResponseHandler.handleApiCall(apiFunction());

      if (ApiResponseHandler.isSuccess(response)) {
        const resultData = transformData ? transformData(response.data) : response.data;
        setData(resultData);

        if (onSuccess) {
          onSuccess(resultData, response);
        }

        return { success: true, data: resultData, response };
      } else {
        const errorMessage = ApiResponseHandler.getErrorMessage(response);
        setError(errorMessage);

        if (!retainDataOnError) {
          setData(initialData);
        }

        if (onError) {
          onError(errorMessage, response);
        }

        return { success: false, error: errorMessage, response };
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);

      if (!retainDataOnError) {
        setData(initialData);
      }

      if (onError) {
        onError(errorMessage, err);
      }

      return { success: false, error: errorMessage, response: null };
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [initialData]);

  /**
   * Reset the state to initial values
   */
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  /**
   * Set data manually
   */
  const setDataManually = useCallback((newData) => {
    setData(newData);
    setError(null);
  }, []);

  /**
   * Set error manually
   */
  const setErrorManually = useCallback((newError) => {
    setError(newError);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData: setDataManually,
    setError: setErrorManually,
    clearError,

    // Convenience getters
    hasData: data !== null && data !== undefined,
    hasError: error !== null,
    isIdle: !loading && !error && data === initialData
  };
};

/**
 * Hook for managing multiple API calls
 * Useful for components that need to track multiple async operations
 */
export const useMultipleApiCalls = () => {
  const [calls, setCalls] = useState({});

  /**
   * Register a new API call
   * @param {string} key - Unique identifier for the API call
   * @param {any} initialData - Initial data for this call
   */
  const registerCall = useCallback((key, initialData = null) => {
    setCalls(prev => ({
      ...prev,
      [key]: {
        data: initialData,
        loading: false,
        error: null
      }
    }));
  }, []);

  /**
   * Execute an API call for a specific key
   * @param {string} key - The key for this API call
   * @param {Function} apiFunction - The API function to call
   * @param {Object} options - Options for the API call
   */
  const executeCall = useCallback(async (key, apiFunction, options = {}) => {
    const {
      onSuccess,
      onError,
      showLoading = true,
      transformData,
      retainDataOnError = false
    } = options;

    // Initialize if not registered
    if (!calls[key]) {
      registerCall(key);
    }

    try {
      if (showLoading) {
        setCalls(prev => ({
          ...prev,
          [key]: { ...prev[key], loading: true, error: null }
        }));
      }

      const response = await ApiResponseHandler.handleApiCall(apiFunction());

      if (ApiResponseHandler.isSuccess(response)) {
        const resultData = transformData ? transformData(response.data) : response.data;

        setCalls(prev => ({
          ...prev,
          [key]: { ...prev[key], data: resultData, loading: false, error: null }
        }));

        if (onSuccess) {
          onSuccess(resultData, response);
        }

        return { success: true, data: resultData, response };
      } else {
        const errorMessage = ApiResponseHandler.getErrorMessage(response);

        setCalls(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            error: errorMessage,
            data: retainDataOnError ? prev[key].data : null
          }
        }));

        if (onError) {
          onError(errorMessage, response);
        }

        return { success: false, error: errorMessage, response };
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';

      setCalls(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: false,
          error: errorMessage,
          data: retainDataOnError ? prev[key].data : null
        }
      }));

      if (onError) {
        onError(errorMessage, err);
      }

      return { success: false, error: errorMessage, response: null };
    }
  }, [calls, registerCall]);

  /**
   * Get the state for a specific API call
   * @param {string} key - The key for the API call
   */
  const getCallState = useCallback((key) => {
    return calls[key] || { data: null, loading: false, error: null };
  }, [calls]);

  /**
   * Check if any calls are loading
   */
  const isAnyLoading = useCallback(() => {
    return Object.values(calls).some(call => call.loading);
  }, [calls]);

  /**
   * Check if any calls have errors
   */
  const hasAnyError = useCallback(() => {
    return Object.values(calls).some(call => call.error);
  }, [calls]);

  /**
   * Get all errors
   */
  const getAllErrors = useCallback(() => {
    return Object.entries(calls)
      .filter(([_, call]) => call.error)
      .map(([key, call]) => ({ key, error: call.error }));
  }, [calls]);

  /**
   * Reset a specific call
   * @param {string} key - The key for the API call
   */
  const resetCall = useCallback((key) => {
    setCalls(prev => ({
      ...prev,
      [key]: { data: null, loading: false, error: null }
    }));
  }, []);

  /**
   * Reset all calls
   */
  const resetAllCalls = useCallback(() => {
    setCalls({});
  }, []);

  return {
    calls,
    registerCall,
    executeCall,
    getCallState,
    resetCall,
    resetAllCalls,
    isAnyLoading,
    hasAnyError,
    getAllErrors
  };
};

/**
 * Hook for paginated API calls
 * Handles pagination state and provides utilities for paginated data
 */
export const usePaginatedApiCall = (initialData = [], pageSize = 10) => {
  const [allData, setAllData] = useState(initialData);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Execute a paginated API call
   * @param {Function} apiFunction - Function that takes pagination params
   * @param {Object} options - Additional options
   */
  const executePaginated = useCallback(async (apiFunction, options = {}) => {
    const {
      page = 1,
      limit = pageSize,
      append = false,
      onSuccess,
      onError
    } = options;

    try {
      setLoading(true);
      setError(null);

      const response = await ApiResponseHandler.handleApiCall(
        apiFunction({ page, limit })
      );

      if (ApiResponseHandler.isSuccess(response)) {
        const { data } = response;
        const paginationInfo = ApiResponseHandler.extractPagination(response);

        if (append && page > 1) {
          setAllData(prev => [...prev, ...(data || [])]);
        } else {
          setAllData(data || []);
        }

        if (paginationInfo) {
          setPagination(paginationInfo);
        } else {
          // Fallback pagination calculation
          setPagination({
            page,
            limit,
            total: data?.length || 0,
            totalPages: Math.ceil((data?.length || 0) / limit)
          });
        }

        if (onSuccess) {
          onSuccess(data, response);
        }

        return { success: true, data, response };
      } else {
        const errorMessage = ApiResponseHandler.getErrorMessage(response);
        setError(errorMessage);

        if (onError) {
          onError(errorMessage, response);
        }

        return { success: false, error: errorMessage, response };
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);

      if (onError) {
        onError(errorMessage, err);
      }

      return { success: false, error: errorMessage, response: null };
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  /**
   * Load next page
   */
  const loadNextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      return executePaginated(
        (params) => params, // This should be replaced with actual API function
        { page: pagination.page + 1, append: true }
      );
    }
    return Promise.resolve({ success: false, error: 'No more pages' });
  }, [pagination, executePaginated]);

  /**
   * Refresh current page
   */
  const refresh = useCallback(() => {
    return executePaginated(
      (params) => params, // This should be replaced with actual API function
      { page: pagination.page }
    );
  }, [pagination.page, executePaginated]);

  /**
   * Reset to first page
   */
  const reset = useCallback(() => {
    setAllData(initialData);
    setPagination({
      page: 1,
      limit: pageSize,
      total: 0,
      totalPages: 0
    });
    setLoading(false);
    setError(null);
  }, [initialData, pageSize]);

  return {
    data: allData,
    pagination,
    loading,
    error,
    executePaginated,
    loadNextPage,
    refresh,
    reset,

    // Convenience getters
    hasData: allData.length > 0,
    hasError: error !== null,
    hasNextPage: pagination.page < pagination.totalPages,
    isFirstPage: pagination.page === 1,
    isLastPage: pagination.page === pagination.totalPages
  };
};

export default useApiCall;
