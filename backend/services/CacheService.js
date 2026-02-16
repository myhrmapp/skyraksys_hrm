/**
 * CacheService - In-memory caching with TTL support
 * 
 * Provides a simple, fast caching mechanism without external dependencies.
 * Features:
 * - TTL (time-to-live) support for automatic expiration
 * - Namespace support for organized cache keys
 * - Automatic cleanup of expired entries
 * - Pattern-based invalidation
 * - Memory-efficient with size limits
 * 
 * @example
 * const cache = new CacheService();
 * await cache.set('user:123', userData, 300); // 5 minutes
 * const data = await cache.get('user:123');
 * await cache.invalidate('user:*'); // Clear all user keys
 */

const logger = require('../utils/logger');

class CacheService {
    constructor(options = {}) {
        this.cache = new Map();
        this.timers = new Map();
        this.options = {
            defaultTTL: options.defaultTTL || 300, // 5 minutes default
            maxSize: options.maxSize || 1000, // Max entries
            cleanupInterval: options.cleanupInterval || 60000, // Cleanup every 1 minute
        };

        // Start periodic cleanup
        this.startCleanup();
    }

    /**
     * Set a value in cache with optional TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache (will be deep cloned)
     * @param {number} ttl - Time to live in seconds (optional)
     * @returns {Promise<boolean>}
     */
    async set(key, value, ttl = null) {
        try {
            // Check cache size limit
            if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
                // Evict oldest entry (LRU-like behavior)
                const firstKey = this.cache.keys().next().value;
                this.delete(firstKey);
            }

            const effectiveTTL = ttl !== null ? ttl : this.options.defaultTTL;
            const expiresAt = Date.now() + (effectiveTTL * 1000);

            // Deep clone to prevent mutations
            const clonedValue = JSON.parse(JSON.stringify(value));

            this.cache.set(key, {
                value: clonedValue,
                expiresAt,
                createdAt: Date.now()
            });

            // Clear existing timer if any
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
            }

            // Set expiration timer
            const timer = setTimeout(() => {
                this.delete(key);
            }, effectiveTTL * 1000);

            this.timers.set(key, timer);

            return true;
        } catch (error) {
            logger.error('CacheService.set error:', { detail: error });
            return false;
        }
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} - Cached value or null if not found/expired
     */
    async get(key) {
        try {
            const entry = this.cache.get(key);

            if (!entry) {
                return null;
            }

            // Check expiration
            if (Date.now() > entry.expiresAt) {
                this.delete(key);
                return null;
            }

            // Deep clone to prevent mutations
            return JSON.parse(JSON.stringify(entry.value));
        } catch (error) {
            logger.error('CacheService.get error:', { detail: error });
            return null;
        }
    }

    /**
     * Get or set pattern - fetch from cache or compute and cache
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Async function to fetch data if not cached
     * @param {number} ttl - TTL in seconds (optional)
     * @returns {Promise<any>}
     */
    async getOrSet(key, fetchFn, ttl = null) {
        // Try to get from cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Not in cache, fetch data
        try {
            const data = await fetchFn();
            
            // Only cache if data is not null/undefined
            if (data !== null && data !== undefined) {
                await this.set(key, data, ttl);
            }
            
            return data;
        } catch (error) {
            logger.error('CacheService.getOrSet fetchFn error:', { detail: error });
            throw error;
        }
    }

    /**
     * Delete a specific key
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    delete(key) {
        // Clear timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }

        return this.cache.delete(key);
    }

    /**
     * Invalidate keys by pattern (supports wildcards)
     * @param {string} pattern - Pattern to match (e.g., "user:*", "dashboard:stats:*")
     * @returns {Promise<number>} - Number of keys deleted
     */
    async invalidate(pattern) {
        try {
            const regex = this.patternToRegex(pattern);
            let deleted = 0;

            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    this.delete(key);
                    deleted++;
                }
            }

            return deleted;
        } catch (error) {
            logger.error('CacheService.invalidate error:', { detail: error });
            return 0;
        }
    }

    /**
     * Clear all cache entries
     * @returns {Promise<void>}
     */
    async clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }

        this.cache.clear();
        this.timers.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        let expired = 0;
        let valid = 0;
        const now = Date.now();

        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) {
                expired++;
            } else {
                valid++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries: valid,
            expiredEntries: expired,
            maxSize: this.options.maxSize,
            memoryUsage: process.memoryUsage().heapUsed
        };
    }

    /**
     * Check if a key exists and is not expired
     * @param {string} key - Cache key
     * @returns {Promise<boolean>}
     */
    async has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        if (Date.now() > entry.expiresAt) {
            this.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * Get remaining TTL for a key in seconds
     * @param {string} key - Cache key
     * @returns {Promise<number|null>} - Remaining seconds or null if not found
     */
    async getTTL(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const remaining = entry.expiresAt - Date.now();
        return remaining > 0 ? Math.floor(remaining / 1000) : 0;
    }

    /**
     * Convert wildcard pattern to regex
     * @private
     * @param {string} pattern - Pattern with wildcards (*, ?)
     * @returns {RegExp}
     */
    patternToRegex(pattern) {
        // Escape special regex characters except * and ?
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        
        // Convert wildcards to regex
        const regexPattern = escaped
            .replace(/\*/g, '.*')  // * matches any characters
            .replace(/\?/g, '.');   // ? matches single character
        
        return new RegExp(`^${regexPattern}$`);
    }

    /**
     * Start periodic cleanup of expired entries
     * @private
     */
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.options.cleanupInterval);

        // Prevent timer from keeping process alive
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Manually trigger cleanup of expired entries
     * @private
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`CacheService: Cleaned ${cleaned} expired entries`);
        }
    }

    /**
     * Stop the cleanup timer (useful for testing or shutdown)
     */
    stopCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Shutdown the cache service gracefully
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.stopCleanup();
        await this.clear();
    }
}

// Singleton instance
let instance = null;

/**
 * Get singleton cache instance
 * @param {Object} options - Cache options (only used on first call)
 * @returns {CacheService}
 */
function getCacheInstance(options = {}) {
    if (!instance) {
        instance = new CacheService(options);
    }
    return instance;
}

/**
 * Reset singleton (useful for testing)
 */
function resetCacheInstance() {
    if (instance) {
        instance.shutdown();
        instance = null;
    }
}

module.exports = {
    CacheService,
    getCacheInstance,
    resetCacheInstance
};
