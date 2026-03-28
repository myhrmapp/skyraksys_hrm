import { useState, useCallback, useRef, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { errorRecoveryManager, recoveryStrategies } from '../utils/errorRecovery';

/**
 * Enhanced error recovery hook with recovery strategies and notification integration
 */
export const useErrorRecovery = (options = {}) => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [recoveryHistory, setRecoveryHistory] = useState([]);
  
  const activeOperations = useRef(new Map());

  const {
    maxRecoveryAttempts = 3,
    autoRetry = true,
    retryDelay = 1000,
    onRecoverySuccess,
    onRecoveryFailure,
    onMaxAttemptsReached,
    defaultRecoveryStrategies = [],
    enableNotifications = true,
    logRecoveryAttempts = true
  } = options;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeOperations.current.clear();
    };
  }, []);

  /**
   * Execute operation with comprehensive error recovery
   */
  const executeWithRecovery = useCallback(async (
    operation, 
    recoveryConfig = {}
  ) => {
    const {
      operationId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recoveryStrategies: customStrategies = [],
      maxAttempts = maxRecoveryAttempts,
      skipRecovery = false,
      fallbackValue,
      onError,
      onSuccess,
      showSuccessMessage,
      showErrorMessage = enableNotifications,
      retryable = autoRetry,
      metadata = {}
    } = recoveryConfig;

    // Track operation
    activeOperations.current.set(operationId, {
      startTime: Date.now(),
      attempts: 0,
      lastError: null,
      metadata
    });

    try {
      // Execute operation
      const result = await operation();
      
      // Success - cleanup and notify
      const operationData = activeOperations.current.get(operationId);
      if (operationData && operationData.attempts > 0) {
        setRecoveryAttempts(0);
        if (enableNotifications && showSuccessMessage) {
          showSuccess(showSuccessMessage);
        }
        onRecoverySuccess?.(result, operationData.attempts);
      }
      
      activeOperations.current.delete(operationId);
      onSuccess?.(result);
      
      return result;

    } catch (error) {
      console.error(`Operation ${operationId} failed:`, error);
      setLastError(error);
      
      const operationData = activeOperations.current.get(operationId);
      if (operationData) {
        operationData.attempts++;
        operationData.lastError = error;
      }

      // Call error callback
      onError?.(error);

      // Skip recovery if requested or max attempts reached
      if (skipRecovery || recoveryAttempts >= maxAttempts) {
        activeOperations.current.delete(operationId);
        
        if (recoveryAttempts >= maxAttempts) {
          onMaxAttemptsReached?.(error, recoveryAttempts);
          if (enableNotifications && showErrorMessage) {
            showError(
              'Maximum recovery attempts reached. Please contact support.',
              { persist: true }
            );
          }
        } else if (enableNotifications && showErrorMessage) {
          showError(getErrorMessage(error));
        }
        
        // Return fallback value if provided
        if (fallbackValue !== undefined) {
          return fallbackValue;
        }
        
        throw error;
      }

      // Attempt recovery
      return attemptRecovery(
        operation,
        error,
        operationId,
        [...defaultRecoveryStrategies, ...customStrategies],
        {
          maxAttempts,
          retryable,
          showSuccessMessage,
          showErrorMessage,
          fallbackValue,
          onError,
          onSuccess,
          metadata
        }
      );
    }
  }, [
    maxRecoveryAttempts,
    autoRetry,
    enableNotifications,
    defaultRecoveryStrategies,
    recoveryAttempts,
    showSuccess,
    showError,
    onRecoverySuccess,
    onMaxAttemptsReached
  ]);

  /**
   * Attempt recovery using available strategies
   */
  const attemptRecovery = useCallback(async (
    operation,
    error,
    operationId,
    strategies,
    config
  ) => {
    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);

    const recoveryAttempt = {
      operationId,
      error: error.message,
      timestamp: Date.now(),
      strategiesAttempted: [],
      success: false
    };

    try {
      // Try each recovery strategy
      let recoverySuccessful = false;
      
      for (const strategy of strategies) {
        try {
          if (await strategy.canRecover(error)) {
            if (logRecoveryAttempts) {
              console.log(`Attempting recovery strategy: ${strategy.name} for operation ${operationId}`);
            }
            
            recoveryAttempt.strategiesAttempted.push({
              name: strategy.name,
              attempted: true,
              success: false,
              error: null
            });

            await strategy.recover(error, operationId);
            
            // Mark strategy as successful
            const lastStrategy = recoveryAttempt.strategiesAttempted[recoveryAttempt.strategiesAttempted.length - 1];
            lastStrategy.success = true;
            
            recoverySuccessful = true;
            
            if (enableNotifications) {
              showInfo(`Recovery successful using ${strategy.name}`, { autoHideDuration: 3000 });
            }
            
            break;
          }
        } catch (recoveryError) {
          console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
          
          const lastStrategy = recoveryAttempt.strategiesAttempted[recoveryAttempt.strategiesAttempted.length - 1];
          if (lastStrategy) {
            lastStrategy.error = recoveryError.message;
          }
        }
      }

      // Wait before retrying
      if (config.retryable) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // Retry the original operation
      if (recoverySuccessful || config.retryable) {
        try {
          const result = await operation();
          
          recoveryAttempt.success = true;
          setRecoveryHistory(prev => [...prev, recoveryAttempt].slice(-10)); // Keep last 10
          
          setIsRecovering(false);
          setRecoveryAttempts(0);
          activeOperations.current.delete(operationId);
          
          if (enableNotifications && config.showSuccessMessage) {
            showSuccess(config.showSuccessMessage);
          }
          
          onRecoverySuccess?.(result, recoveryAttempts + 1);
          config.onSuccess?.(result);
          
          return result;
          
        } catch (retryError) {
          console.error(`Operation retry failed for ${operationId}:`, retryError);
          
          // Recursive recovery attempt if we haven't hit max attempts
          if (recoveryAttempts + 1 < config.maxAttempts) {
            return attemptRecovery(
              operation,
              retryError,
              operationId,
              strategies,
              config
            );
          } else {
            throw retryError;
          }
        }
      } else {
        throw error; // No recovery strategies worked
      }

    } catch (finalError) {
      recoveryAttempt.success = false;
      setRecoveryHistory(prev => [...prev, recoveryAttempt].slice(-10));
      
      setIsRecovering(false);
      activeOperations.current.delete(operationId);
      
      onRecoveryFailure?.(finalError, recoveryAttempts + 1);
      
      if (recoveryAttempts + 1 >= config.maxAttempts) {
        setRecoveryAttempts(0);
        onMaxAttemptsReached?.(finalError, recoveryAttempts + 1);
        
        if (enableNotifications && config.showErrorMessage) {
          showError(
            'Maximum recovery attempts reached. Please contact support.',
            { 
              persist: true,
              action: {
                label: 'Report Issue',
                callback: () => reportError(finalError, operationId)
              }
            }
          );
        }
      } else if (enableNotifications && config.showErrorMessage) {
        showWarning(
          `Recovery attempt ${recoveryAttempts + 1} of ${config.maxAttempts} failed`,
          { autoHideDuration: 5000 }
        );
      }
      
      // Return fallback value if provided
      if (config.fallbackValue !== undefined) {
        return config.fallbackValue;
      }
      
      throw finalError;
    }
  }, [
    recoveryAttempts,
    retryDelay,
    enableNotifications,
    logRecoveryAttempts,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    onRecoverySuccess,
    onRecoveryFailure,
    onMaxAttemptsReached
  ]);

  /**
   * Create an operation with built-in recovery
   */
  const createRecoverableOperation = useCallback((
    operationFn,
    defaultConfig = {}
  ) => {
    return (runtimeConfig = {}) => {
      return executeWithRecovery(operationFn, { ...defaultConfig, ...runtimeConfig });
    };
  }, [executeWithRecovery]);

  /**
   * Retry a failed operation manually
   */
  const retryOperation = useCallback(async (operationId) => {
    const operation = activeOperations.current.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found or already completed`);
    }

    // Reset recovery attempts for manual retry
    setRecoveryAttempts(0);
    
    // This would need the original operation function to be stored
    // For now, just clear the operation
    activeOperations.current.delete(operationId);
    
    if (enableNotifications) {
      showInfo('Manual retry initiated');
    }
  }, [enableNotifications, showInfo]);

  /**
   * Cancel a recovering operation
   */
  const cancelRecovery = useCallback((operationId) => {
    if (activeOperations.current.has(operationId)) {
      activeOperations.current.delete(operationId);
      setIsRecovering(false);
      setRecoveryAttempts(0);
      
      if (enableNotifications) {
        showInfo('Recovery cancelled');
      }
    }
  }, [enableNotifications, showInfo]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((error) => {
    if (!error) return 'An unknown error occurred';

    // Network errors
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data?.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return data?.message || 'Data conflict. Please refresh and try again.';
      case 422:
        return 'Please fix the validation errors and try again.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Server error. Our team has been notified.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return data?.message || error.message || 'An unexpected error occurred.';
    }
  }, []);

  /**
   * Report error to external service
   */
  const reportError = useCallback((error, operationId) => {
    const errorReport = {
      operationId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      recoveryHistory: recoveryHistory.filter(h => h.operationId === operationId),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Send to error reporting service
    if (process.env.NODE_ENV === 'development') {
      console.log('Error report generated:', errorReport);
    }
    
    // Could integrate with external error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }, [recoveryHistory]);

  /**
   * Get recovery statistics
   */
  const getRecoveryStats = useCallback(() => {
    const activeOps = Array.from(activeOperations.current.values());
    
    return {
      isRecovering,
      recoveryAttempts,
      lastError: lastError ? {
        message: lastError.message,
        timestamp: Date.now()
      } : null,
      activeOperations: activeOps.length,
      recoveryHistory: recoveryHistory.length,
      successfulRecoveries: recoveryHistory.filter(h => h.success).length,
      failedRecoveries: recoveryHistory.filter(h => !h.success).length,
      hasReachedMaxAttempts: recoveryAttempts >= maxRecoveryAttempts
    };
  }, [isRecovering, recoveryAttempts, lastError, recoveryHistory, maxRecoveryAttempts]);

  /**
   * Clear recovery history
   */
  const clearRecoveryHistory = useCallback(() => {
    setRecoveryHistory([]);
    setRecoveryAttempts(0);
    setLastError(null);
  }, []);

  return {
    // Main recovery function
    executeWithRecovery,
    
    // Helper functions
    createRecoverableOperation,
    retryOperation,
    cancelRecovery,
    
    // State
    isRecovering,
    recoveryAttempts,
    lastError,
    recoveryHistory,
    
    // Utilities
    getRecoveryStats,
    clearRecoveryHistory,
    getErrorMessage,
    reportError,
    
    // State checks
    hasReachedMaxAttempts: recoveryAttempts >= maxRecoveryAttempts,
    hasActiveOperations: activeOperations.current.size > 0
  };
};

/**
 * Pre-configured recovery strategies for common scenarios
 */
export const commonRecoveryStrategies = {
  // Network connectivity recovery
  networkRecovery: {
    name: 'Network Recovery',
    canRecover: async (error) => {
      return !error.response || error.code === 'NETWORK_ERROR';
    },
    recover: async (error, operationId) => {
      // Check if we're online
      if (!navigator.onLine) {
        await new Promise(resolve => {
          const handleOnline = () => {
            window.removeEventListener('online', handleOnline);
            resolve();
          };
          window.addEventListener('online', handleOnline);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            window.removeEventListener('online', handleOnline);
            resolve();
          }, 30000);
        });
      }
      
      // Wait a bit for network to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  },

  // Token refresh recovery
  authRecovery: {
    name: 'Authentication Recovery',
    canRecover: async (error) => {
      return error.response?.status === 401 && localStorage.getItem('refreshToken');
    },
    recover: async (error, operationId) => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // This would typically use your auth service
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { accessToken } = await response.json();
      localStorage.setItem('accessToken', accessToken);
    }
  },

  // Data conflict recovery
  conflictRecovery: {
    name: 'Conflict Recovery',
    canRecover: async (error) => {
      return error.response?.status === 409;
    },
    recover: async (error, operationId) => {
      // Clear caches to ensure fresh data
      if ('caches' in window) {
        await caches.delete('api-cache');
      }
      
      // Clear relevant localStorage cache
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      cacheKeys.forEach(key => localStorage.removeItem(key));
      
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

export default useErrorRecovery;