/**
 * Auth Controller
 * Handles HTTP requests for authentication and user management
 * 
 * @module controllers/authController
 * @requires middleware/auth.simple
 * @requires services/password-reset-token.service
 * @requires services/email.service
 */

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const db = require('../models');
const passwordResetService = require('../services/password-reset-token.service');
const emailService = require('../services/email.service');
const authService = require('../services/AuthService');
const ApiResponse = require('../utils/ApiResponse');
const { NotFoundError, UnauthorizedError, ConflictError, ValidationError } = require('../utils/errors');
const { checkRateLimit, trackLoginAttempt } = require('../middleware/login-rate-limiter');
const logger = require('../utils/logger');
const tokenBlacklist = require('../utils/tokenBlacklist');

const User = db.User;
const Employee = db.Employee;
const RefreshToken = db.RefreshToken;

// Cookie security: set COOKIE_SECURE=true in .env when serving over HTTPS
const secureCookie = process.env.COOKIE_SECURE === 'true';

/**
 * AuthController
 * Manages authentication, user sessions, and password management
 */
const AuthController = {
  
  /**
   * Login user
   * @route POST /api/auth/login
   * @access Public
   * @security Rate limiting, account lockout, audit logging
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.validatedData;
      const clientIp = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : (req.ip || req.connection.remoteAddress || 'Unknown');
      const reqMeta = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      const result = await authService.authenticate(email, password, clientIp, reqMeta, req);

      // Set rate limit headers
      if (result.rateLimitHeaders) {
        Object.entries(result.rateLimitHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      // Set httpOnly cookies (clear any stale tokens first to prevent race conditions)
      res.clearCookie('accessToken', { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/' });
      res.clearCookie('refreshToken', { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/' });
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'Lax',
        maxAge: 15 * 60 * 1000,
        path: '/'
      });
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      return res.json(ApiResponse.success({ 
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }, 'Login successful'));
    } catch (error) {
      // Handle service-level errors with proper HTTP responses
      if (error.rateLimitHeaders) {
        Object.entries(error.rateLimitHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }
      if (error.rateLimited) {
        return res.status(429).json({
          success: false,
          message: error.message,
          retryAfter: error.retryAfter,
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }
      if (error.statusCode === 423) {
        return res.status(423).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      next(error);
    }
  },

  /**
   * Logout user
   * @route POST /api/auth/logout
   * @access Private
   * @security Invalidates refresh token
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      // Blacklist the current access token so it can't be reused
      const accessToken = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1];
      if (accessToken) {
        try {
          const decoded = require('jsonwebtoken').decode(accessToken);
          if (decoded && decoded.jti) {
            const remainingMs = decoded.exp ? (decoded.exp * 1000 - Date.now()) : 15 * 60 * 1000;
            if (remainingMs > 0) {
              tokenBlacklist.add(decoded.jti, remainingMs);
            }
          }
        } catch (e) {
          // Token decode failure is non-critical for logout
        }
      }

      // Clear the httpOnly access token cookie
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'Lax',
        path: '/'
      });

      // Clear the httpOnly refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'Lax',
        path: '/'
      });

      // Revoke all refresh tokens for this user (security best practice)
      await RefreshToken.update(
        { isRevoked: true, revokedAt: new Date() },
        { where: { userId: req.user.id, isRevoked: false } }
      );

      // Audit log - make it non-blocking and handle errors gracefully
      try {
        if (db.AuditLog) {
          await db.AuditLog.create({
            userId: req.user.id,
            action: 'LOGOUT',
            entityType: 'Auth',
            entityId: req.user.id,
            metadata: {
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.headers['user-agent']
            },
            success: true
          });
        }
      } catch (auditError) {
        // Log audit failure but don't fail the logout
        logger.warn('Failed to create audit log:', { detail: auditError.message });
      }

      return res.json(ApiResponse.success(null, 'Logged out successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Refresh access token
   * @route POST /api/auth/refresh-token
   * @access Public (requires valid refresh token)
   * @security Token rotation, validates refresh token
   */
  async refreshToken(req, res, next) {
    try {
      // Read refresh token from httpOnly cookie first, fallback to body for API clients
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
      }

      // Find and validate refresh token
      const storedToken = await RefreshToken.findOne({
        where: { token: refreshToken },
        include: [{ model: User, as: 'user', include: [{ model: Employee, as: 'employee' }] }]
      });

      if (!storedToken) {
        // Audit log for failed refresh (invalid token) - non-blocking
        try {
          if (db.AuditLog) {
            await db.AuditLog.create({
              userId: null,
              action: 'TOKEN_REFRESH_FAILED',
              entityType: 'Auth',
              entityId: '00000000-0000-0000-0000-000000000000',
              metadata: {
                reason: 'Invalid or expired refresh token',
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
              },
              success: false
            });
          }
        } catch (auditError) {
          logger.warn('Failed to create audit log for failed refresh:', { detail: auditError.message });
        }
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      if (new Date() > storedToken.expiresAt) {
        // Audit log for failed refresh (expired token) - non-blocking
        try {
          if (db.AuditLog) {
            await db.AuditLog.create({
              userId: storedToken.user?.id || null,
              action: 'TOKEN_REFRESH_FAILED',
              entityType: 'Auth',
              entityId: storedToken.user?.id || '00000000-0000-0000-0000-000000000000',
              metadata: {
                reason: 'Refresh token has expired',
                expiredAt: storedToken.expiresAt,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
              },
              success: false
            });
          }
        } catch (auditError) {
          logger.warn('Failed to create audit log for expired refresh:', { detail: auditError.message });
        }
        await storedToken.destroy();
        throw new UnauthorizedError('Refresh token has expired');
      }

      if (storedToken.isRevoked) {
        // SECURITY: Token reuse detected - revoke all tokens for this user (token family invalidation)
        logger.warn('Token reuse detected — revoking all sessions for user', { userId: storedToken.userId, tokenId: storedToken.id });
        await RefreshToken.update(
          { isRevoked: true, revokedAt: new Date() },
          { where: { userId: storedToken.userId, isRevoked: false } }
        );
        throw new UnauthorizedError('Refresh token has been revoked');
      }

      if (!storedToken.user.isActive) {
        throw new UnauthorizedError('User account is inactive');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(storedToken.user);
      const newRefreshToken = await generateRefreshToken(storedToken.user, req);

      // Revoke old refresh token (token rotation)
      await storedToken.update({ isRevoked: true, revokedAt: new Date() });

      // Audit log for successful token refresh - non-blocking
      try {
        if (db.AuditLog) {
          await db.AuditLog.create({
            userId: storedToken.user.id,
            action: 'TOKEN_REFRESHED',
            entityType: 'Auth',
            entityId: storedToken.user.id,
            metadata: {
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.headers['user-agent'],
              oldTokenExpiry: storedToken.expiresAt,
              newTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            },
            success: true
          });
        }
      } catch (auditError) {
        logger.warn('Failed to create audit log for token refresh:', { detail: auditError.message });
      }

      // Set new tokens as httpOnly cookies
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'Lax',
        maxAge: 15 * 60 * 1000,
        path: '/'
      });
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      return res.json(ApiResponse.success(
        { accessToken: newAccessToken, refreshToken: newRefreshToken },
        'Token refreshed successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current user profile
   * @route GET /api/auth/me
   * @access Private
   */
  async getProfile(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        include: [{ model: Employee, as: 'employee' }],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return res.json(ApiResponse.success(user, 'Profile retrieved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update current user profile
   * @route PUT /api/auth/me
   * @access Private
   */
  async updateProfile(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        include: [{ model: Employee, as: 'employee' }],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Only allow updating safe fields
      const { firstName, lastName, email } = req.body;
      const updates = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;

      await user.update(updates);

      // Reload with associations
      await user.reload({
        include: [{ model: Employee, as: 'employee' }]
      });

      return res.json(ApiResponse.success(user, 'Profile updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Change password
   * @route PUT /api/auth/change-password
   * @access Private
   * @security Validates current password, hashes new password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.validatedData;

      const user = await User.scope('withPassword').findByPk(req.user.id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash and save new password + update passwordChangedAt
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const oldPasswordHash = user.password;
      await user.update({ password: hashedPassword, passwordChangedAt: new Date() });

      // Audit log - non-blocking
      try {
        if (db.AuditLog) {
          await db.AuditLog.create({
            userId: user.id,
            action: 'PASSWORD_CHANGED',
            entityType: 'Auth',
            entityId: user.id,
            metadata: {
              action: 'password_changed',
              passwordChanged: true,
              oldPasswordHash,
              newPasswordHash: hashedPassword,
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.headers['user-agent'],
              timestamp: new Date()
            },
            success: true
          });
        }
      } catch (auditError) {
        logger.warn('Failed to create audit log for password change:', { detail: auditError.message });
      }

      return res.json(ApiResponse.success(null, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Forgot password (send reset email)
   * @route POST /api/auth/forgot-password
   * @access Public
   * @security Generates secure reset token, sends email
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });

      // Always return success (security: don't reveal if email exists)
      if (!user) {
        return res.json(ApiResponse.success(
          null,
          'If an account with that email exists, a password reset link has been sent'
        ));
      }

      // Generate reset token
      const resetToken = await passwordResetService.createResetToken(user.id);

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await emailService.sendPasswordResetEmail(user.email, {
          name: user.firstName || 'User',
          resetLink: resetUrl,
          expiresAt: tokenExpiry,
          expiresIn: '1 hour'
        });
      try {
        if (db.AuditLog) {
          await db.AuditLog.create({
            userId: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            entityType: 'Auth',
            entityId: user.id,
            metadata: {
              email: user.email,
              ip: req.ip || req.connection.remoteAddress
            },
            success: true
          });
        }
      } catch (auditError) {
        logger.warn('Failed to create audit log for password reset request:', { detail: auditError.message });
      }

      return res.json(ApiResponse.success(
        null,
        'If an account with that email exists, a password reset link has been sent'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reset password with token
   * @route POST /api/auth/reset-password
   * @access Public (requires valid reset token)
   * @security Validates token, hashes new password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ValidationError('Token and new password are required');
      }

      // Validate token and get user ID
      const userId = await passwordResetService.validateResetToken(token);

      if (!userId) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Hash and update password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      // Invalidate reset token
      await passwordResetService.invalidateResetToken(token);

      // Audit log - non-blocking
      try {
        if (db.AuditLog) {
          await db.AuditLog.create({
            userId: user.id,
            action: 'PASSWORD_RESET_COMPLETED',
            entityType: 'Auth',
            entityId: user.id,
            metadata: {
              ip: req.ip || req.connection.remoteAddress
            },
            success: true
          });
        }
      } catch (auditError) {
        logger.warn('Failed to create audit log for password reset:', { detail: auditError.message });
      }

      return res.json(ApiResponse.success(null, 'Password reset successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify reset token (check if valid)
   * @route POST /api/auth/verify-reset-token
   * @access Public
   */
  async verifyResetToken(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ValidationError('Token is required');
      }

      const userId = await passwordResetService.validateResetToken(token);

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      return res.json(ApiResponse.success({ valid: true }, 'Token is valid'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cleanup expired tokens
   * @route POST /api/auth/cleanup-tokens
   * @access Admin
   * @security Admin-only maintenance operation
   */
  async cleanupTokens(req, res, next) {
    try {
      const deleted = await RefreshToken.destroy({
        where: {
          expiresAt: { [Op.lt]: new Date() }
        }
      });

      return res.json(ApiResponse.success(
        { deletedCount: deleted },
        `Cleaned up ${deleted} expired tokens`
      ));
    } catch (error) {
      next(error);
    }
  }

};

module.exports = AuthController;
