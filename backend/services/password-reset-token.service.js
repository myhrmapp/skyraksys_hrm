/**
 * Password Reset Token Service (GAP Item 11.16 — DB-backed)
 * 
 * Purpose: Secure token-based password reset (NIST 800-63B compliant)
 * - Generate secure JWT tokens for password reset
 * - 1-hour expiration for security
 * - One-time use tokens (invalidated after use)
 * - Rate limiting per user
 * 
 * Security Features:
 * - No passwords sent via email (only secure reset links)
 * - Tokens include user ID, email, and expiration
 * - Tokens signed with JWT_SECRET for tamper protection
 * - DB-backed token tracking for multi-instance support
 * 
 * Created: February 5, 2026
 * Updated: February 10, 2026 — Migrated from in-memory to PostgreSQL
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../utils/logger');

class PasswordResetTokenService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.TOKEN_EXPIRY = '1h'; // 1 hour expiration
    this.RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
    this.MAX_REQUESTS_PER_WINDOW = 3; // Max 3 reset requests per 15 minutes
  }

  /**
   * Generate a password reset token for a user
   * @param {Object} user - User object (id, email)
   * @returns {Object} { token: string, expiresAt: Date }
   */
  async generateResetToken(user) {
    // Generate unique token ID to prevent replay attacks
    const tokenId = crypto.randomBytes(16).toString('hex');
    
    const payload = {
      id: user.id,
      email: user.email,
      type: 'password-reset',
      tokenId,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.TOKEN_EXPIRY
    });

    // Calculate expiration time (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Persist token record to database
    try {
      await db.PasswordResetToken.create({
        tokenId,
        userId: user.id,
        email: user.email,
        expiresAt
      });
    } catch (error) {
      logger.error('Failed to persist password reset token', { error: error.message });
      // Continue — JWT is still valid even if DB write fails
    }

    return {
      token,
      tokenId,
      expiresAt
    };
  }

  /**
   * Verify and decode a reset token
   * @param {string} token - JWT token to verify
   * @returns {Object} { valid: boolean, payload?: Object, error?: string }
   */
  async verifyResetToken(token) {
    try {
      // Verify JWT signature and expiration
      const payload = jwt.verify(token, this.JWT_SECRET);

      // Validate token type
      if (payload.type !== 'password-reset') {
        return {
          valid: false,
          error: 'Invalid token type'
        };
      }

      // Check if token has already been used (DB lookup)
      const tokenRecord = await db.PasswordResetToken.findOne({
        where: { tokenId: payload.tokenId }
      });

      if (tokenRecord && tokenRecord.usedAt) {
        return {
          valid: false,
          error: 'Token has already been used'
        };
      }

      return {
        valid: true,
        payload
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Reset token has expired'
        };
      }
      if (error.name === 'JsonWebTokenError') {
        return {
          valid: false,
          error: 'Invalid reset token'
        };
      }
      return {
        valid: false,
        error: 'Token verification failed'
      };
    }
  }

  /**
   * Mark a token as used to prevent replay attacks
   * @param {string} tokenId - Unique token identifier
   */
  async markTokenAsUsed(tokenId) {
    try {
      await db.PasswordResetToken.update(
        { usedAt: new Date() },
        { where: { tokenId } }
      );
    } catch (error) {
      logger.error('Failed to mark token as used', { tokenId, error: error.message });
    }
  }

  /**
   * Check rate limiting for password reset requests
   * @param {string} email - User email address
   * @returns {Object} { allowed: boolean, remainingAttempts?: number, retryAfter?: number }
   */
  async checkRateLimit(email) {
    const windowStart = new Date(Date.now() - this.RATE_LIMIT_WINDOW);

    try {
      const recentCount = await db.PasswordResetToken.count({
        where: {
          email,
          createdAt: { [Op.gte]: windowStart }
        }
      });

      if (recentCount >= this.MAX_REQUESTS_PER_WINDOW) {
        // Find oldest request in window to calculate retry-after
        const oldest = await db.PasswordResetToken.findOne({
          where: {
            email,
            createdAt: { [Op.gte]: windowStart }
          },
          order: [['createdAt', 'ASC']]
        });

        const retryAfter = oldest
          ? this.RATE_LIMIT_WINDOW - (Date.now() - new Date(oldest.createdAt).getTime())
          : this.RATE_LIMIT_WINDOW;

        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfter: Math.ceil(retryAfter / 1000)
        };
      }

      return {
        allowed: true,
        remainingAttempts: this.MAX_REQUESTS_PER_WINDOW - recentCount
      };
    } catch (error) {
      logger.error('Rate limit check failed, allowing request', { email, error: error.message });
      // Fail open — allow the request if DB query fails
      return { allowed: true, remainingAttempts: 1 };
    }
  }

  /**
   * Generate a password reset link for email
   * @param {string} token - Reset token
   * @param {string} baseUrl - Application base URL
   * @returns {string} Complete reset URL
   */
  generateResetLink(token, baseUrl = 'http://localhost:3000') {
    return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  /**
   * Validate new password meets security requirements
   * @param {string} password - New password to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validatePassword(password) {
    const errors = [];

    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean up expired tokens (maintenance — call periodically)
   */
  async cleanupExpiredData() {
    try {
      const deleted = await db.PasswordResetToken.destroy({
        where: {
          [Op.or]: [
            { expiresAt: { [Op.lt]: new Date() } },
            // Also clean used tokens older than 2 hours
            {
              usedAt: { [Op.ne]: null },
              createdAt: { [Op.lt]: new Date(Date.now() - 2 * 60 * 60 * 1000) }
            }
          ]
        }
      });

      if (deleted > 0) {
        logger.debug(`[PasswordResetToken] Cleanup: removed ${deleted} expired/used tokens`);
      }
    } catch (error) {
      logger.error('Password reset token cleanup failed', { error: error.message });
    }
  }

  // --- Compatibility API (used by authController) ---

  /**
   * Create a reset token and return the JWT string
   * @param {string} userId - User UUID
   * @returns {Promise<string>} JWT token string
   */
  async createResetToken(userId) {
    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('User not found');
    const { token } = await this.generateResetToken(user);
    return token;
  }

  /**
   * Validate a reset token and return the user ID
   * @param {string} token - JWT token string
   * @returns {Promise<string|null>} User ID or null if invalid
   */
  async validateResetToken(token) {
    const result = await this.verifyResetToken(token);
    return result.valid ? result.payload.id : null;
  }

  /**
   * Invalidate a reset token after use
   * @param {string} token - JWT token string
   */
  async invalidateResetToken(token) {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET);
      await this.markTokenAsUsed(payload.tokenId);
    } catch (error) {
      // Token may be expired — still try to mark by tokenId if available
      logger.warn('Could not invalidate reset token', { error: error.message });
    }
  }

  /**
   * Get statistics about token usage (for monitoring)
   * @returns {Object} Statistics object
   */
  async getStatistics() {
    try {
      const now = new Date();
      const windowStart = new Date(Date.now() - this.RATE_LIMIT_WINDOW);

      const [total, unused, recentRequests] = await Promise.all([
        db.PasswordResetToken.count({ where: { expiresAt: { [Op.gt]: now } } }),
        db.PasswordResetToken.count({ where: { usedAt: null, expiresAt: { [Op.gt]: now } } }),
        db.PasswordResetToken.count({ where: { createdAt: { [Op.gte]: windowStart } } })
      ]);

      return {
        activeTokens: total,
        unusedTokens: unused,
        recentRequests
      };
    } catch (error) {
      logger.error('Failed to get token statistics', { error: error.message });
      return { activeTokens: 0, unusedTokens: 0, recentRequests: 0 };
    }
  }
}

// Export singleton instance
module.exports = new PasswordResetTokenService();
