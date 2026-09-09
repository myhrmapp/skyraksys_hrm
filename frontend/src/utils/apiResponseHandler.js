// Centralized API Response Handler
// Provides consistent error handling and response formatting

class ApiResponseHandler {
  /**
   * Standardized success response format
   * @param {any} data - The response data
   * @param {string} message - Success message
   * @param {Object} meta - Additional metadata (pagination, etc.)
   */
  static success(data, message = 'Success', meta = {}) {
    return {
      success: true,
      data,
      message,
      meta,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Standardized error response format
   * @param {string} message - Error message
   * @param {Array} errors - Detailed error array
   * @param {number} code - Error code
   */
  static error(message = 'An error occurred', errors = [], code = 500) {
    return {
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors],
      code,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle API response from axios
   * @param {Promise} apiCall - Axios promise
   * @returns {Promise} Standardized response
   */
  static async handleApiCall(apiCall) {
    try {
      const response = await apiCall;

      // If response already has our standard format, return as-is
      if (response.data && typeof response.data.success === 'boolean') {
        return response.data;
      }

      // Otherwise, wrap in standard format
      return this.success(response.data, 'Operation completed successfully');
    } catch (error) {
      console.error('API Error:', error);

      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;

        if (data && data.message) {
          return this.error(data.message, data.errors || [], status);
        }

        // Default error messages based on status
        const statusMessages = {
          400: 'Invalid request data',
          401: 'Authentication required',
          403: 'Access denied',
          404: 'Resource not found',
          422: 'Validation failed',
          500: 'Internal server error',
          503: 'Service unavailable'
        };

        return this.error(
          statusMessages[status] || 'Request failed',
          [],
          status
        );
      } else if (error.request) {
        // Network error
        return this.error(
          'Network error - please check your connection',
          ['NETWORK_ERROR'],
          0
        );
      } else {
        // Other error
        return this.error(
          error.message || 'An unexpected error occurred',
          ['UNKNOWN_ERROR'],
          500
        );
      }
    }
  }

  /**
   * Extract pagination info from response
   * @param {Object} response - API response
   * @returns {Object} Pagination metadata
   */
  static extractPagination(response) {
    if (response.meta && response.meta.pagination) {
      return response.meta.pagination;
    }

    // Legacy format support
    if (response.pagination) {
      return response.pagination;
    }

    return null;
  }

  /**
   * Check if response indicates success
   * @param {Object} response - API response
   * @returns {boolean}
   */
  static isSuccess(response) {
    return response && response.success === true;
  }

  /**
   * Get error message from response
   * @param {Object} response - API response
   * @returns {string}
   */
  static getErrorMessage(response) {
    if (!response) return 'Unknown error occurred';

    if (response.message) return response.message;

    if (response.errors && response.errors.length > 0) {
      return response.errors[0].message || response.errors[0];
    }

    return 'An error occurred';
  }

  /**
   * Get validation errors from response
   * @param {Object} response - API response
   * @returns {Array}
   */
  static getValidationErrors(response) {
    if (!response || !response.errors) return [];

    return response.errors.filter(error =>
      typeof error === 'object' && error.field
    );
  }
}

export default ApiResponseHandler;
