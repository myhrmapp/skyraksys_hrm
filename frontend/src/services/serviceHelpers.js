/**
 * Service Helper Utilities
 * Standardizes service responses and error handling
 */

/**
 * Normalize API response to consistent format
 * Handles different backend response structures
 * 
 * @param {Object} response - Axios response object
 * @returns {*} Normalized data
 */
export const normalizeResponse = (response) => {
  const data = response.data;
  
  // If response has pagination metadata, preserve the structure
  if (data && typeof data === 'object' && data.pagination) {
    return {
      data: data.data || [],
      pagination: data.pagination,
      total: data.pagination.totalItems || data.pagination.total || 0,
      totalItems: data.pagination.totalItems || 0
    };
  }
  
  // If response.data has a nested 'data' property (non-paginated), unwrap it
  if (data && typeof data === 'object' && 'data' in data && !data.pagination) {
    return data.data;
  }
  
  // Otherwise return response.data as-is
  return data;
};

/**
 * Normalize error to consistent format
 * 
 * @param {Error} error - Error object
 * @returns {Error} Normalized error with message
 */
export const normalizeError = (error) => {
  // Extract error message from various possible locations
  const message = 
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    'An unexpected error occurred';
  
  // Create a new error with normalized message
  const normalizedError = new Error(message);
  normalizedError.status = error.response?.status;
  normalizedError.originalError = error;
  
  return normalizedError;
};

/**
 * Wrapper for service methods to standardize responses
 * 
 * @param {Function} fn - Service method function
 * @returns {Function} Wrapped function
 */
export const withNormalizedResponse = (fn) => {
  return async (...args) => {
    try {
      const response = await fn(...args);
      return normalizeResponse(response);
    } catch (error) {
      throw normalizeError(error);
    }
  };
};
