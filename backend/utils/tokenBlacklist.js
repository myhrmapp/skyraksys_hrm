/**
 * In-Memory JWT Token Blacklist
 * 
 * Stores blacklisted token JTIs (unique identifiers) with their expiry times.
 * When a user logs out, their access token's JTI is added to this blacklist.
 * The authenticateToken middleware checks this blacklist before accepting a token.
 * 
 * Stale entries are cleaned up automatically on each add() call.
 * 
 * NOTE: For PM2 cluster mode, replace this with a Redis-backed store
 * (e.g. ioredis SETEX with TTL matching token expiry).
 */

const logger = require('./logger');
const redis = require('redis');

class TokenBlacklist {
  constructor() {
    this._useRedis = false;
    this._blacklist = new Map();
    this._redisClient = null;

    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
      this._redisClient = redis.createClient({ url: redisUrl });
      
      this._redisClient.on('error', (err) => {
        logger.error('Redis connection error in TokenBlacklist:', err);
        this._useRedis = false; // Fallback to in-memory on error
      });

      this._redisClient.on('connect', () => {
        logger.info('TokenBlacklist connected to Redis successfully');
        this._useRedis = true;
      });

      this._redisClient.connect().catch(err => {
        logger.warn('Could not connect to Redis for TokenBlacklist, falling back to in-memory Map.', { error: err.message });
      });
    }

    // In-memory fallback cleanup interval
    this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }
  }

  /**
   * Add a token's JTI to the blacklist
   * @param {string} jti - The token's unique identifier
   * @param {number} expiresInMs - How long until the token expires (milliseconds)
   */
  async add(jti, expiresInMs) {
    if (!jti) return;
    
    if (this._useRedis && this._redisClient && this._redisClient.isReady) {
      try {
        const ttlSeconds = Math.ceil((expiresInMs || 15 * 60 * 1000) / 1000);
        await this._redisClient.setEx(`blacklist:${jti}`, ttlSeconds, 'true');
        logger.debug(`Token blacklisted in Redis: ${jti} (expires in ${ttlSeconds}s)`);
        return;
      } catch (err) {
        logger.error('Failed to blacklist token in Redis, falling back to in-memory:', err);
        // Fallback below
      }
    }

    const expiresAt = Date.now() + (expiresInMs || 15 * 60 * 1000);
    this._blacklist.set(jti, expiresAt);
    logger.debug(`Token blacklisted in-memory: ${jti} (expires in ${Math.round(expiresInMs / 1000)}s)`);
  }

  /**
   * Check if a token's JTI is blacklisted
   * @param {string} jti - The token's unique identifier
   * @returns {Promise<boolean>} true if blacklisted (should be rejected)
   */
  async isBlacklisted(jti) {
    if (!jti) return false;

    if (this._useRedis && this._redisClient && this._redisClient.isReady) {
      try {
        const exists = await this._redisClient.get(`blacklist:${jti}`);
        return !!exists;
      } catch (err) {
        logger.error('Failed to check token blacklist in Redis, checking in-memory fallback:', err);
        // Fallback below
      }
    }

    const expiresAt = this._blacklist.get(jti);
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
      this._blacklist.delete(jti);
      return false;
    }

    return true;
  }

  _cleanup() {
    // Only applies to the in-memory fallback
    const now = Date.now();
    let removed = 0;
    for (const [jti, expiresAt] of this._blacklist) {
      if (now > expiresAt) {
        this._blacklist.delete(jti);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug(`Token blacklist cleanup: removed ${removed} expired entries, ${this._blacklist.size} remaining`);
    }
  }

  get size() {
    return this._blacklist.size;
  }
}

const tokenBlacklist = new TokenBlacklist();

module.exports = tokenBlacklist;
