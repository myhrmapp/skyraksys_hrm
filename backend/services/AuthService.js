/**
 * Auth Service
 * Handles authentication business logic, separated from HTTP concerns.
 * 
 * @module services/AuthService
 */

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const db = require('../models');
const { checkRateLimit, trackLoginAttempt } = require('../middleware/login-rate-limiter');
const logger = require('../utils/logger');
const { UnauthorizedError } = require('../utils/errors');

const User = db.User;
const Employee = db.Employee;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

class AuthService {

  /**
   * Authenticate a user with email and password.
   * Handles rate limiting, lockout checks, credential validation,
   * failed-attempt tracking, and token generation.
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} clientIp - Client IP address
   * @param {Object} reqMeta - Request metadata { ip, userAgent }
   * @param {Object} req - Express request (needed for generateRefreshToken)
   * @returns {Object} { rateLimitHeaders, accessToken, refreshToken, user }
   * @throws {UnauthorizedError} If credentials are invalid
   * @throws {Object} Rate limit response object with status 429
   */
  async authenticate(email, password, clientIp, reqMeta, req) {
    // --- Rate limiting ---
    const rateLimitCheck = checkRateLimit(clientIp, email);
    const rateLimitHeaders = rateLimitCheck.headers || {};

    if (!rateLimitCheck.allowed) {
      const err = new Error(rateLimitCheck.reason);
      err.statusCode = 429;
      err.rateLimited = true;
      err.retryAfter = rateLimitCheck.retryAfter;
      err.rateLimitHeaders = rateLimitHeaders;
      throw err;
    }

    // --- Find user ---
    const user = await User.scope('withPassword').findOne({
      where: { email, isActive: true },
      include: { model: Employee, as: 'employee', attributes: ['id'] },
    });

    // --- Account lock checks ---
    if (user?.isLocked) {
      const err = new Error('Account is locked. Please contact your administrator.');
      err.statusCode = 423;
      err.code = 'ACCOUNT_LOCKED';
      err.rateLimitHeaders = rateLimitHeaders;
      throw err;
    }

    if (user?.lockoutUntil && new Date() < user.lockoutUntil) {
      const remainingTime = Math.ceil((user.lockoutUntil - new Date()) / (1000 * 60));
      const err = new Error(`Account temporarily locked. Please try again in ${remainingTime} minute(s).`);
      err.statusCode = 423;
      err.code = 'ACCOUNT_TEMP_LOCKED';
      err.rateLimitHeaders = rateLimitHeaders;
      throw err;
    }

    // --- Validate credentials ---
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await this._handleFailedLogin(user, email, clientIp, reqMeta);
      const err = new UnauthorizedError('Invalid email or password');
      err.rateLimitHeaders = rateLimitHeaders;
      throw err;
    }

    // --- Success path ---
    await this._handleSuccessfulLogin(user, email, clientIp, reqMeta);

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);

    return {
      rateLimitHeaders,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id || null
      }
    };
  }

  /**
   * Handle a failed login: audit log, track attempts, auto-lock.
   * @private
   */
  async _handleFailedLogin(user, email, clientIp, reqMeta) {
    // Audit log for failed login
    this._createAuditLog({
      userId: user ? user.id : null,
      action: 'LOGIN_FAILED',
      entityId: user ? user.id : '00000000-0000-0000-0000-000000000000',
      metadata: {
        email,
        reason: 'Invalid credentials',
        ip: reqMeta.ip,
        userAgent: reqMeta.userAgent,
        timestamp: new Date()
      },
      success: false,
      errorMessage: user ? 'Invalid password' : 'User not found'
    });

    // Track failed attempts and auto-lock
    if (user) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        this._createAuditLog({
          userId: user.id,
          action: 'ACCOUNT_LOCKED_TEMP',
          entityId: user.id,
          metadata: {
            reason: 'Too many failed login attempts',
            lockDuration: `${LOCKOUT_DURATION_MINUTES} minutes`,
            failedAttempts: attempts,
            ip: reqMeta.ip,
            userAgent: reqMeta.userAgent
          },
          success: true
        });
      }

      await user.update(updateData);
    }

    // Track for rate limiter
    trackLoginAttempt(`ip:${clientIp}`, false);
    trackLoginAttempt(`user:${email}`, false);
  }

  /**
   * Handle a successful login: reset attempts, audit log, rate limit tracking.
   * @private
   */
  async _handleSuccessfulLogin(user, email, clientIp, reqMeta) {
    // Reset failed attempts
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      await user.update({ failedLoginAttempts: 0, lockoutUntil: null, lastLoginAt: new Date() });
    } else {
      await user.update({ lastLoginAt: new Date() });
    }

    // Track for rate limiter
    trackLoginAttempt(`ip:${clientIp}`, true);
    trackLoginAttempt(`user:${email}`, true);

    // Audit log
    this._createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityId: user.id,
      metadata: {
        email: user.email,
        ip: reqMeta.ip,
        userAgent: reqMeta.userAgent,
        timestamp: new Date()
      },
      success: true
    });
  }

  /**
   * Create an audit log entry (non-blocking, fire-and-forget).
   * @private
   */
  _createAuditLog({ userId, action, entityId, metadata, success, errorMessage }) {
    if (!db.AuditLog) return;
    db.AuditLog.create({
      userId,
      action,
      entityType: 'Auth',
      entityId,
      metadata,
      success,
      ...(errorMessage && { errorMessage })
    }).catch(err => {
      logger.warn(`Failed to create audit log for ${action}:`, { detail: err.message });
    });
  }
}

module.exports = new AuthService();
