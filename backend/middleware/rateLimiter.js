const rateLimit = require('express-rate-limit');

/**
 * Route-specific rate limiting middleware
 * 
 * Global rate limiting (generalLimiter, authLimiter) is configured in server.js.
 * Per-user login tracking (checkRateLimit, trackLoginAttempt) is in login-rate-limiter.js.
 * This file provides additional route-specific limiters only where needed.
 */

// Strict rate limit for bulk operations (timesheet bulk submit)
const bulkOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  // M-07: key on authenticated user ID so limits are per-user, not per shared IP
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'Too many bulk operations. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' || req.user?.role === 'admin'
});

// Password reset rate limiter (very strict)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again after 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

// Profile update rate limiter
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many profile update attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

// Strict limiter for password re-authentication endpoints
// Prevents brute-force on verify-password and config view/update
const passwordReauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many password verification attempts. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

module.exports = {
  bulkOperationLimiter,
  passwordResetLimiter,
  profileUpdateLimiter,
  passwordReauthLimiter
};
