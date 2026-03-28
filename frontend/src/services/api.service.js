/**
 * Enhanced API Service
 * Provides a modern, consistent interface for all API calls
 * Includes error handling, response normalization, and request interceptors
 */

import http from '../http-common';
import { getEndpoint } from '../config/apiEndpoints';

class ApiService {
  /**
   * Generic GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} config - Axios config options
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, params = {}, config = {}) {
    try {
      const url = getEndpoint(endpoint, params);
      const response = await http.get(url, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} config - Axios config options
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data = {}, config = {}) {
    try {
      const response = await http.post(endpoint, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} config - Axios config options
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data = {}, config = {}) {
    try {
      const response = await http.put(endpoint, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} config - Axios config options
   * @returns {Promise<Object>} Response data
   */
  async patch(endpoint, data = {}, config = {}) {
    try {
      const response = await http.patch(endpoint, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generic DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} config - Axios config options
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint, config = {}) {
    try {
      const response = await http.delete(endpoint, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload file with FormData
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @param {Function} onUploadProgress - Progress callback
   * @returns {Promise<Object>} Response data
   */
  async upload(endpoint, formData, onUploadProgress = null) {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      
      if (onUploadProgress) {
        config.onUploadProgress = onUploadProgress;
      }

      const response = await http.post(endpoint, formData, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Download file
   * @param {string} endpoint - API endpoint
   * @param {string} filename - Filename for downloaded file
   * @returns {Promise<Blob>} File blob
   */
  async download(endpoint, filename) {
    try {
      const response = await http.get(endpoint, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Normalize API response
   * Backend returns: { success: boolean, data: any, message?: string }
   * @param {Object} response - Axios response
   * @returns {Object} Normalized response
   */
  normalizeResponse(response) {
    const { data } = response;
    
    // If backend returns standardized format
    if (data && typeof data === 'object' && 'success' in data) {
      return {
        success: data.success,
        data: data.data,
        message: data.message,
        meta: data.meta,
        pagination: data.pagination,
      };
    }
    
    // Otherwise return as-is
    return {
      success: true,
      data: data,
    };
  }

  /**
   * Handle and normalize errors
   * @param {Error} error - Error object
   * @returns {Error} Normalized error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error
      const { data, status } = error.response;
      
      const normalizedError = new Error(
        data?.message || data?.error || `Request failed with status ${status}`
      );
      
      normalizedError.status = status;
      normalizedError.data = data;
      normalizedError.isServerError = true;
      
      return normalizedError;
    } else if (error.request) {
      // Request made but no response
      const networkError = new Error('Network error: No response from server');
      networkError.isNetworkError = true;
      return networkError;
    } else {
      // Something else happened
      return error;
    }
  }

  /**
   * Check if response indicates success
   * @param {Object} response - Normalized response
   * @returns {boolean} Success status
   */
  isSuccess(response) {
    return response && response.success === true;
  }

  /**
   * Extract data from response
   * @param {Object} response - Normalized response
   * @returns {any} Response data
   */
  getData(response) {
    return response?.data;
  }

  /**
   * Extract message from response
   * @param {Object} response - Normalized response
   * @returns {string|null} Response message
   */
  getMessage(response) {
    return response?.message || null;
  }
}

// Create singleton instance
const apiService = new ApiService();

// Export both the class and instance
export { ApiService };
export default apiService;
