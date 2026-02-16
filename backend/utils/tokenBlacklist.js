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

class TokenBlacklist {
  constructor() {
    // Map<jti, expiresAtTimestamp>
    this._blacklist = new Map();
    this._cleanupInterval = null;

    // Periodically clean up expired entries every 5 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
    // Allow the process to exit without waiting for the interval
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }
  }

  /**
   * Add a token's JTI to the blacklist
   * @param {string} jti - The token's unique identifier
   * @param {number} expiresInMs - How long until the token expires (milliseconds)
   */
  add(jti, expiresInMs) {
    if (!jti) return;
    const expiresAt = Date.now() + (expiresInMs || 15 * 60 * 1000); // default 15 min
    this._blacklist.set(jti, expiresAt);
    logger.debug(`Token blacklisted: ${jti} (expires in ${Math.round(expiresInMs / 1000)}s)`);
  }

  /**
   * Check if a token's JTI is blacklisted
   * @param {string} jti - The token's unique identifier
   * @returns {boolean} true if blacklisted (should be rejected)
   */
  isBlacklisted(jti) {
    if (!jti) return false;
    const expiresAt = this._blacklist.get(jti);
    if (!expiresAt) return false;

    // If expired, remove it and return false
    if (Date.now() > expiresAt) {
      this._blacklist.delete(jti);
      return false;
    }

    return true;
  }

  /**
   * Remove expired entries from the blacklist
   */
  _cleanup() {
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

  /**
   * Get current blacklist size (for monitoring)
   */
  get size() {
    return this._blacklist.size;
  }
}

// Singleton instance
const tokenBlacklist = new TokenBlacklist();

module.exports = tokenBlacklist;
