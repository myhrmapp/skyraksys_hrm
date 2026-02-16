/**
 * Enhanced Login Rate Limiting Middleware (Task 5.2)
 * 
 * Features:
 * - Per-IP rate limiting (5 attempts per 15 minutes)
 * - Per-username rate limiting (10 attempts per hour across all IPs)
 * - Exponential backoff after 3 failures
 * - Distributed attack detection (alerts on 50+ attempts from different IPs)
 * - Whitelist support (localhost and configured IPs bypass limits)
 * - Rate limit headers in responses
 */

const db = require('../models');
const logger = require('../utils/logger');

// In-memory tracking (use Redis in production for multi-instance deployments)
const rateTracker = new Map();

// Whitelist of IPs that bypass rate limiting (localhost and configured IPs)
// In test environment, use RATE_LIMIT_WHITELIST env var to configure whitelist
function getWhitelistedIPs() {
  if (process.env.RATE_LIMIT_WHITELIST) {
    return process.env.RATE_LIMIT_WHITELIST.split(',').map(ip => ip.trim());
  }
  if (process.env.NODE_ENV === 'test') return [];
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
}

// Configuration
const CONFIG = {
  PER_IP_MAX_ATTEMPTS: 5,
  PER_IP_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  PER_USER_MAX_ATTEMPTS: 10,
  PER_USER_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  EXPONENTIAL_BACKOFF_THRESHOLD: 3,
  DISTRIBUTED_ATTACK_THRESHOLD: 50,
  DISTRIBUTED_ATTACK_WINDOW_MS: 5 * 60 * 1000 // 5 minutes
};

/**
 * Track a login attempt (success or failure)
 * @param {string} identifier - 'ip:x.x.x.x' or 'user:email@example.com'
 * @param {boolean} success - Whether login was successful
 */
function trackLoginAttempt(identifier, success) {
  if (!rateTracker.has(identifier)) {
    rateTracker.set(identifier, {
      attempts: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now(),
      backoffMultiplier: 1
    });
  }

  const record = rateTracker.get(identifier);

  if (success) {
    // Reset on successful login
    rateTracker.delete(identifier);
    logger.debug(`Rate limit reset for ${identifier} (successful login)`);
  } else {
    // Increment failure count
    record.attempts++;
    record.lastAttempt = Date.now();

    // Apply exponential backoff after threshold
    if (record.attempts >= CONFIG.EXPONENTIAL_BACKOFF_THRESHOLD) {
      record.backoffMultiplier = Math.pow(2, record.attempts - CONFIG.EXPONENTIAL_BACKOFF_THRESHOLD);
      logger.info(`Exponential backoff applied to ${identifier}: ${record.backoffMultiplier}x multiplier`);
    }

    logger.info(`Failed login attempt ${record.attempts} for ${identifier}`);
  }
}

/**
 * Check if request should be rate limited
 * @param {string} ip - Client IP address
 * @param {string} username - Username/email being attempted
 * @returns {Object} { allowed: boolean, retryAfter?: number, reason?: string, headers?: Object }
 */
function checkRateLimit(ip, username) {
  // Whitelist bypass
  const whitelistedIPs = getWhitelistedIPs();
  if (whitelistedIPs.includes(ip)) {
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': 'unlimited',
        'X-RateLimit-Remaining': 'unlimited',
        'X-RateLimit-Reset': 'never'
      }
    };
  }

  const ipIdentifier = `ip:${ip}`;
  const userIdentifier = `user:${username}`;

  const ipRecord = rateTracker.get(ipIdentifier);
  const userRecord = rateTracker.get(userIdentifier);

  // Check per-IP rate limit
  if (ipRecord) {
    const timeSinceFirst = Date.now() - ipRecord.firstAttempt;
    const waitTime = CONFIG.PER_IP_WINDOW_MS * ipRecord.backoffMultiplier;

    if (ipRecord.attempts >= CONFIG.PER_IP_MAX_ATTEMPTS && timeSinceFirst < waitTime) {
      const retryAfter = Math.ceil((waitTime - timeSinceFirst) / 1000);
      return {
        allowed: false,
        retryAfter,
        reason: `Too many login attempts from your IP. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        headers: {
          'X-RateLimit-Limit': CONFIG.PER_IP_MAX_ATTEMPTS,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
          'Retry-After': retryAfter
        }
      };
    }
  }

  // Check per-username rate limit
  if (userRecord) {
    const timeSinceFirst = Date.now() - userRecord.firstAttempt;
    const waitTime = CONFIG.PER_USER_WINDOW_MS;

    if (userRecord.attempts >= CONFIG.PER_USER_MAX_ATTEMPTS && timeSinceFirst < waitTime) {
      const retryAfter = Math.ceil((waitTime - timeSinceFirst) / 1000);
      return {
        allowed: false,
        retryAfter,
        reason: `Account temporarily locked due to too many failed login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        headers: {
          'X-RateLimit-Limit': CONFIG.PER_USER_MAX_ATTEMPTS,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
          'Retry-After': retryAfter
        }
      };
    }
  }

  // Calculate remaining attempts
  const ipRemaining = ipRecord
    ? Math.max(0, CONFIG.PER_IP_MAX_ATTEMPTS - ipRecord.attempts)
    : CONFIG.PER_IP_MAX_ATTEMPTS;

  const userRemaining = userRecord
    ? Math.max(0, CONFIG.PER_USER_MAX_ATTEMPTS - userRecord.attempts)
    : CONFIG.PER_USER_MAX_ATTEMPTS;

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': CONFIG.PER_IP_MAX_ATTEMPTS,
      'X-RateLimit-Remaining': Math.min(ipRemaining, userRemaining),
      'X-RateLimit-Reset': new Date(Date.now() + CONFIG.PER_IP_WINDOW_MS).toISOString()
    }
  };
}

/**
 * Detect distributed brute force attacks
 * (Many different IPs attacking the same username)
 */
async function detectDistributedAttack() {
  const now = Date.now();
  const recentWindow = now - CONFIG.DISTRIBUTED_ATTACK_WINDOW_MS;

  // Group attempts by username
  const userAttempts = {};

  for (const [identifier, record] of rateTracker.entries()) {
    if (identifier.startsWith('user:') && record.lastAttempt > recentWindow) {
      const username = identifier.replace('user:', '');
      userAttempts[username] = (userAttempts[username] || 0) + record.attempts;
    }
  }

  // Alert on potential distributed attacks
  for (const [username, totalAttempts] of Object.entries(userAttempts)) {
    if (totalAttempts >= CONFIG.DISTRIBUTED_ATTACK_THRESHOLD) {
      logger.info(`SECURITY ALERT: Distributed brute force attack detected on ${username} (${totalAttempts} attempts from multiple IPs)`);

      // Log to audit log
      try {
        await db.AuditLog.create({
          userId: null,
          action: 'DISTRIBUTED_ATTACK_DETECTED',
          entityType: 'User',
          entityId: '00000000-0000-0000-0000-000000000000', // No specific user
          details: {
            username,
            totalAttempts,
            windowMinutes: CONFIG.DISTRIBUTED_ATTACK_WINDOW_MS / 60000,
            timestamp: new Date()
          }
        });
      } catch (error) {
        logger.error('Failed to log distributed attack:', { detail: error.message });
      }
    }
  }
}

/**
 * Cleanup old rate limit records (prevent memory leak)
 */
function cleanupOldRecords() {
  const now = Date.now();
  const maxAge = Math.max(CONFIG.PER_IP_WINDOW_MS, CONFIG.PER_USER_WINDOW_MS) * 2;

  let cleanedCount = 0;
  for (const [identifier, record] of rateTracker.entries()) {
    if (now - record.lastAttempt > maxAge) {
      rateTracker.delete(identifier);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug(`Cleaned up ${cleanedCount} old rate limit records`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldRecords, 5 * 60 * 1000);

// Run distributed attack detection every minute
setInterval(detectDistributedAttack, 60 * 1000);

/**
 * Reset rate limiter (for testing only)
 */
function resetRateLimiter() {
  rateTracker.clear();
  logger.debug('Rate limiter reset');
}

module.exports = {
  trackLoginAttempt,
  checkRateLimit,
  detectDistributedAttack,
  cleanupOldRecords,
  resetRateLimiter, // Export for testing
  CONFIG // Export for testing
};
