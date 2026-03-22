/**
 * ErrorRecoveryManager - Advanced error recovery with exponential backoff
 * Provides intelligent retry mechanisms, operation tracking, and recovery strategies
 */
export class ErrorRecoveryManager {
  constructor(options = {}) {
    this.retryAttempts = new Map();
    this.operationHistory = new Map();
    this.globalRetryCount = 0;
    
    // Configuration options
    this.config = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      jitterEnabled: options.jitterEnabled !== false,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout || 60000,
      enableLogging: options.enableLogging !== false,
      onRetry: options.onRetry,
      onSuccess: options.onSuccess,
      onFailure: options.onFailure,
      onCircuitBreaker: options.onCircuitBreaker
    };

    // Circuit breaker state
    this.circuitBreaker = new Map();
    
    // Bind methods
    this.executeWithRetry = this.executeWithRetry.bind(this);
    this.shouldRetry = this.shouldRetry.bind(this);
    this.calculateDelay = this.calculateDelay.bind(this);
  }

  /**
   * Execute operation with retry logic and recovery strategies
   */
  async executeWithRetry(operation, options = {}) {
    const operationOptions = {
      operationId: options.operationId || this.generateOperationId(),
      maxRetries: options.maxRetries || this.config.maxRetries,
      baseDelay: options.baseDelay || this.config.baseDelay,
      shouldRetry: options.shouldRetry || this.shouldRetry,
      onRetry: options.onRetry || this.config.onRetry,
      onSuccess: options.onSuccess || this.config.onSuccess,
      onFailure: options.onFailure || this.config.onFailure,
      retryStrategies: options.retryStrategies || [],
      circuitBreakerKey: options.circuitBreakerKey,
      timeout: options.timeout,
      metadata: options.metadata || {}
    };

    const { operationId, circuitBreakerKey } = operationOptions;

    // Check circuit breaker
    if (circuitBreakerKey && this.isCircuitOpen(circuitBreakerKey)) {
      const error = new Error(`Circuit breaker is open for ${circuitBreakerKey}`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }

    let attempt = 0;
    let lastError;
    const startTime = Date.now();

    // Initialize operation tracking
    this.initializeOperation(operationId, operationOptions);

    while (attempt <= operationOptions.maxRetries) {
      try {
        this.log(`Executing operation ${operationId}, attempt ${attempt + 1}`, operationOptions.metadata);
        
        // Execute operation with timeout if specified
        const result = operationOptions.timeout 
          ? await this.executeWithTimeout(operation, operationOptions.timeout)
          : await operation();

        // Success - reset counters and circuit breaker
        this.handleSuccess(operationId, circuitBreakerKey, startTime, attempt);
        operationOptions.onSuccess?.(result, attempt, Date.now() - startTime);
        
        return result;

      } catch (error) {
        lastError = error;
        attempt++;
        
        this.log(`Operation ${operationId} failed, attempt ${attempt}:`, error.message);
        
        // Record failure for circuit breaker
        if (circuitBreakerKey) {
          this.recordFailure(circuitBreakerKey);
        }

        // Check if we should retry
        if (attempt > operationOptions.maxRetries || !operationOptions.shouldRetry(error, attempt)) {
          this.handleFailure(operationId, error, attempt, Date.now() - startTime);
          operationOptions.onFailure?.(error, attempt, Date.now() - startTime);
          throw error;
        }

        // Try recovery strategies
        await this.executeRecoveryStrategies(error, operationOptions.retryStrategies, operationId);

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, operationOptions.baseDelay);
        
        // Notify about retry
        operationOptions.onRetry?.(error, attempt, delay, operationId);
        
        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    this.handleFailure(operationId, lastError, attempt, Date.now() - startTime);
    throw lastError;
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout(operation, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(`Operation timed out after ${timeout}ms`);
        error.code = 'OPERATION_TIMEOUT';
        reject(error);
      }, timeout);

      Promise.resolve(operation())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Default retry condition
   */
  shouldRetry(error, attempt) {
    // Don't retry on authentication/authorization errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return false;
    }

    // Don't retry on client errors (4xx) except specific cases
    if (error.response?.status >= 400 && error.response?.status < 500) {
      // Retry on rate limiting and request timeout
      return error.response.status === 408 || error.response.status === 429;
    }

    // Retry on network errors
    if (!error.response || error.code === 'NETWORK_ERROR' || error.code === 'OPERATION_TIMEOUT') {
      return true;
    }

    // Retry on server errors (5xx)
    if (error.response?.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt, baseDelay) {
    const exponentialDelay = baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.config.jitterEnabled) {
      const jitter = Math.random() * 0.3; // ±30% jitter
      return Math.floor(cappedDelay * (1 + jitter - 0.15));
    }
    
    return cappedDelay;
  }

  /**
   * Execute recovery strategies before retry
   */
  async executeRecoveryStrategies(error, strategies, operationId) {
    for (const strategy of strategies) {
      try {
        if (await strategy.canRecover(error)) {
          this.log(`Executing recovery strategy for operation ${operationId}:`, strategy.name);
          await strategy.recover(error, operationId);
          this.log(`Recovery strategy completed for operation ${operationId}`);
          return;
        }
      } catch (recoveryError) {
        this.log(`Recovery strategy failed for operation ${operationId}:`, recoveryError.message);
      }
    }
  }

  /**
   * Circuit breaker functionality
   */
  isCircuitOpen(key) {
    const breaker = this.circuitBreaker.get(key);
    if (!breaker) return false;

    // Check if circuit should be reset
    if (breaker.lastFailure + this.config.circuitBreakerTimeout < Date.now()) {
      this.circuitBreaker.delete(key);
      return false;
    }

    return breaker.failures >= this.config.circuitBreakerThreshold;
  }

  recordFailure(key) {
    const breaker = this.circuitBreaker.get(key) || { failures: 0, lastFailure: 0 };
    breaker.failures++;
    breaker.lastFailure = Date.now();
    this.circuitBreaker.set(key, breaker);

    // Notify about circuit breaker activation
    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      this.config.onCircuitBreaker?.(key, breaker);
    }
  }

  resetCircuitBreaker(key) {
    this.circuitBreaker.delete(key);
  }

  /**
   * Operation tracking
   */
  initializeOperation(operationId, options) {
    this.operationHistory.set(operationId, {
      startTime: Date.now(),
      attempts: 0,
      options,
      status: 'running'
    });
    this.retryAttempts.set(operationId, 0);
  }

  handleSuccess(operationId, circuitBreakerKey, startTime, attempts) {
    // Reset retry count on success
    this.retryAttempts.delete(operationId);
    
    // Update operation history
    const operation = this.operationHistory.get(operationId);
    if (operation) {
      operation.status = 'success';
      operation.endTime = Date.now();
      operation.duration = operation.endTime - startTime;
      operation.attempts = attempts + 1;
    }

    // Reset circuit breaker on success
    if (circuitBreakerKey) {
      this.resetCircuitBreaker(circuitBreakerKey);
    }

    this.log(`Operation ${operationId} completed successfully after ${attempts + 1} attempts`);
  }

  handleFailure(operationId, error, attempts, duration) {
    // Update operation history
    const operation = this.operationHistory.get(operationId);
    if (operation) {
      operation.status = 'failed';
      operation.endTime = Date.now();
      operation.duration = duration;
      operation.attempts = attempts;
      operation.error = error.message;
    }

    this.retryAttempts.delete(operationId);
    this.globalRetryCount++;
    
    this.log(`Operation ${operationId} failed permanently after ${attempts} attempts`);
  }

  /**
   * Utility methods
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRetryCount(operationId) {
    return this.retryAttempts.get(operationId) || 0;
  }

  getOperationHistory(operationId) {
    return operationId ? this.operationHistory.get(operationId) : Array.from(this.operationHistory.values());
  }

  getStats() {
    const operations = Array.from(this.operationHistory.values());
    const successful = operations.filter(op => op.status === 'success').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    const running = operations.filter(op => op.status === 'running').length;

    return {
      totalOperations: operations.length,
      successful,
      failed,
      running,
      successRate: operations.length > 0 ? (successful / operations.length) * 100 : 0,
      globalRetryCount: this.globalRetryCount,
      activeCircuitBreakers: Array.from(this.circuitBreaker.keys())
    };
  }

  log(message, data) {
    if (this.config.enableLogging) {
      if (data) {
        console.log(`[ErrorRecovery] ${message}`, data);
      } else {
        console.log(`[ErrorRecovery] ${message}`);
      }
    }
  }

  // Clean up old operation history to prevent memory leaks
  cleanup(olderThanMs = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - olderThanMs;
    
    for (const [operationId, operation] of this.operationHistory.entries()) {
      if (operation.endTime && operation.endTime < cutoff) {
        this.operationHistory.delete(operationId);
      }
    }
  }
}

/**
 * Pre-defined recovery strategies
 */
export const recoveryStrategies = {
  /**
   * Token refresh strategy for authentication errors
   */
  tokenRefresh: {
    name: 'Token Refresh',
    canRecover: async (error) => {
      return error.response?.status === 401 && localStorage.getItem('refreshToken');
    },
    recover: async (error, operationId) => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      try {
        // This would typically call your auth service
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
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Token refreshed successfully for operation ${operationId}`);
        }
      } catch (refreshError) {
        // Clear tokens on refresh failure
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw refreshError;
      }
    }
  },

  /**
   * Network connectivity check strategy
   */
  networkCheck: {
    name: 'Network Check',
    canRecover: async (error) => {
      return !error.response || error.code === 'NETWORK_ERROR';
    },
    recover: async (error, operationId) => {
      // Wait for network to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if online
      if (!navigator.onLine) {
        throw new Error('Still offline');
      }

      // Perform connectivity check
      try {
        await fetch('/api/health', { 
          method: 'HEAD', 
          timeout: 5000,
          cache: 'no-cache'
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(`Network connectivity restored for operation ${operationId}`);
        }
      } catch (connectivityError) {
        throw new Error('Network connectivity check failed');
      }
    }
  },

  /**
   * Cache refresh strategy for data conflicts
   */
  cacheRefresh: {
    name: 'Cache Refresh',
    canRecover: async (error) => {
      return error.response?.status === 409; // Conflict
    },
    recover: async (error, operationId) => {
      // Clear relevant caches
      if ('caches' in window) {
        try {
          await caches.delete('api-cache');
          if (process.env.NODE_ENV === 'development') {
            console.log(`Cache cleared for operation ${operationId}`);
          }
        } catch (cacheError) {
          console.warn('Failed to clear cache:', cacheError);
        }
      }

      // Clear local storage cache if applicable
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      cacheKeys.forEach(key => localStorage.removeItem(key));
    }
  },

  /**
   * Server overload backoff strategy
   */
  serverBackoff: {
    name: 'Server Backoff',
    canRecover: async (error) => {
      return error.response?.status === 503 || error.response?.status === 429;
    },
    recover: async (error, operationId) => {
      // Extract retry-after header if present
      const retryAfter = error.response?.headers?.['retry-after'];
      const backoffTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Server overload detected for operation ${operationId}, backing off for ${backoffTime}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
};

/**
 * Global error recovery manager instance
 */
export const errorRecoveryManager = new ErrorRecoveryManager({
  enableLogging: process.env.NODE_ENV === 'development',
  onRetry: (error, attempt, delay, operationId) => {
    console.warn(`Retrying operation ${operationId} in ${delay}ms (attempt ${attempt}):`, error.message);
  },
  onCircuitBreaker: (key, breaker) => {
    console.error(`Circuit breaker activated for ${key} after ${breaker.failures} failures`);
  }
});

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    errorRecoveryManager.cleanup();
  }, 60 * 60 * 1000); // Cleanup every hour
}

export default errorRecoveryManager;