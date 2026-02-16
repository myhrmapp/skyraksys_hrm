/**
 * Audit Service
 * 
 * Purpose: Centralized service for logging all audit trail entries
 * 
 * Features:
 * - Automatic sensitive field redaction
 * - Never throws errors (doesn't block business operations)
 * - Async logging for performance
 * - IP address and user agent capture
 * - Metadata support for correlation
 * 
 * Usage:
 *   const auditService = require('../services/audit.service');
 *   
 *   await auditService.log({
 *     action: 'UPDATED',
 *     entityType: 'LeaveBalance',
 *     entityId: balance.id,
 *     userId: req.user.id,
 *     oldValues: oldBalance,
 *     newValues: newBalance,
 *     reason: 'Manual adjustment',
 *     req
 *   });
 * 
 * Created: February 5, 2026 (Phase 1, Week 1, Day 3-5)
 */

const { AuditLog, User } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class AuditService {
  /**
   * Log an audit trail entry
   * 
   * @param {Object} params - Audit log parameters
   * @param {string} params.action - Action type (created, updated, deleted, etc.)
   * @param {string} params.entityType - Model name (User, LeaveBalance, etc.)
   * @param {string} params.entityId - ID of affected record
   * @param {string} params.userId - User performing action
   * @param {Object} params.oldValues - State before change (optional)
   * @param {Object} params.newValues - State after change (optional)
   * @param {string} params.reason - Reason for change (optional)
   * @param {Object} params.req - Express request object (optional)
   * @param {Object} params.metadata - Additional context (optional)
   * @param {boolean} params.success - Operation success (default: true)
   * @param {string} params.errorMessage - Error message if failed (optional)
   * @param {number} params.duration - Operation duration in ms (optional)
   * 
   * @returns {Promise<AuditLog|null>} Created audit log or null if failed
   */
  async log({
    action,
    entityType,
    entityId,
    userId,
    oldValues = null,
    newValues = null,
    reason = null,
    req = null,
    metadata = {},
    success = true,
    errorMessage = null,
    duration = null
  }) {
    try {
      // Validate required fields
      if (!action || !entityType || !entityId || !userId) {
        logger.error('[AUDIT] Missing required fields:', { detail: { action, entityType, entityId, userId } });
        return null;
      }

      // Sanitize values (remove sensitive fields)
      const sanitizedOldValues = oldValues ? this.sanitizeValues(oldValues) : null;
      const sanitizedNewValues = newValues ? this.sanitizeValues(newValues) : null;

      // Build audit entry
      const auditEntry = {
        action,
        entityType,
        entityId,
        userId,
        oldValues: sanitizedOldValues,
        newValues: sanitizedNewValues,
        reason,
        ipAddress: req ? this.getClientIp(req) : null,
        userAgent: req ? req.get('user-agent') : null,
        metadata: {
          ...metadata,
          requestId: req?.id, // If using express-request-id middleware
          timestamp: new Date().toISOString(),
          nodeEnv: process.env.NODE_ENV
        },
        success,
        errorMessage,
        duration
      };

      // Create audit log (async, non-blocking)
      const log = await AuditLog.create(auditEntry);

      // Console log for immediate visibility
      const statusEmoji = success ? '✅' : '❌';
      logger.info(`${statusEmoji} [AUDIT] ${action.toUpperCase()} ${entityType}:${entityId.substring(0, 8)} by User:${userId.substring(0, 8)}`);

      return log;
    } catch (error) {
      // CRITICAL: Never throw errors from audit logging
      // (don't block business operations due to logging failure)
      logger.error('[AUDIT ERROR] Failed to create audit log:', { detail: error.message });
      logger.error('[AUDIT ERROR] Attempted to log:', { detail: { action, entityType, entityId, userId } });
      
      // Log to error tracking service if available (Sentry, etc.)
      if (global.errorTracker) {
        global.errorTracker.captureException(error, {
          tags: { component: 'audit-service' },
          extra: { action, entityType, entityId, userId }
        });
      }
      
      return null;
    }
  }

  /**
   * Remove sensitive fields before logging
   * 
   * @param {Object} values - Object with potentially sensitive data
   * @returns {Object} - Sanitized object
   */
  sanitizeValues(values) {
    if (!values || typeof values !== 'object') return values;

    const sensitivePatterns = [
      'password',
      'token',
      'apikey',
      'api_key',
      'secret',
      'ssn',
      'socialsecurity',
      'creditcard',
      'bankaccount',
      'privatekey',
      'accesstoken',
      'refreshtoken'
    ];

    const sanitized = { ...values };

    // Check each field against sensitive patterns (case-insensitive)
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitivePatterns.some(pattern => 
        lowerKey.includes(pattern)
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get real client IP address (handle proxies, load balancers)
   * 
   * @param {Object} req - Express request object
   * @returns {string|null} - Client IP address
   */
  getClientIp(req) {
    try {
      // Check X-Forwarded-For header (reverse proxy)
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        // X-Forwarded-For can be a comma-separated list
        return forwardedFor.split(',')[0].trim();
      }

      // Check X-Real-IP header (Nginx)
      const realIp = req.headers['x-real-ip'];
      if (realIp) {
        return realIp.trim();
      }

      // Fallback to connection remote address
      return req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             req.connection?.socket?.remoteAddress ||
             null;
    } catch (error) {
      logger.error('[AUDIT] Error extracting IP address:', { detail: error.message });
      return null;
    }
  }

  /**
   * Query audit logs with filters
   * 
   * @param {Object} filters - Query filters
   * @param {string} filters.userId - Filter by user
   * @param {string} filters.entityType - Filter by entity type
   * @param {string} filters.entityId - Filter by entity ID
   * @param {string|string[]} filters.action - Filter by action(s)
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @param {boolean} filters.success - Filter by success status
   * @param {number} filters.limit - Result limit (default: 100)
   * @param {number} filters.offset - Result offset (default: 0)
   * @param {boolean} filters.includeUser - Include user data (default: true)
   * 
   * @returns {Promise<AuditLog[]>} - Array of audit logs
   */
  async query({
    userId = null,
    entityType = null,
    entityId = null,
    action = null,
    startDate = null,
    endDate = null,
    success = null,
    limit = 100,
    offset = 0,
    includeUser = true
  } = {}) {
    try {
      const where = {};

      // Build where clause
      if (userId) where.userId = userId;
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      
      if (action) {
        if (Array.isArray(action)) {
          where.action = { [Op.in]: action };
        } else {
          where.action = action;
        }
      }
      
      if (success !== null) where.success = success;

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      // Build query options
      const queryOptions = {
        where,
        order: [['createdAt', 'DESC']],
        limit: Math.min(limit, 1000), // Cap at 1000 for performance
        offset
      };

      // Include user data if requested
      if (includeUser) {
        queryOptions.include = [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }];
      }

      return await AuditLog.findAll(queryOptions);
    } catch (error) {
      logger.error('[AUDIT] Query error:', { detail: error.message });
      throw error;
    }
  }

  /**
   * Get audit trail for specific entity (history timeline)
   * 
   * @param {string} entityType - Entity type (e.g., 'LeaveBalance')
   * @param {string} entityId - Entity ID
   * @param {Object} options - Query options
   * @returns {Promise<AuditLog[]>} - Entity audit history
   */
  async getEntityHistory(entityType, entityId, options = {}) {
    return await this.query({
      entityType,
      entityId,
      limit: options.limit || 1000,
      includeUser: true,
      ...options
    });
  }

  /**
   * Get user activity report
   * 
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<AuditLog[]>} - User activity logs
   */
  async getUserActivity(userId, startDate, endDate, options = {}) {
    return await this.query({
      userId,
      startDate,
      endDate,
      limit: options.limit || 500,
      ...options
    });
  }

  /**
   * Get failed operations (security monitoring)
   * 
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<AuditLog[]>} - Failed operations
   */
  async getFailedOperations(startDate, endDate, options = {}) {
    return await this.query({
      success: false,
      startDate,
      endDate,
      includeUser: true,
      limit: options.limit || 100,
      ...options
    });
  }

  /**
   * Get statistics for reporting
   * 
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Audit statistics
   */
  async getStatistics(startDate, endDate) {
    try {
      const { sequelize } = require('../models');
      
      const [results] = await sequelize.query(`
        SELECT
          action,
          entity_type,
          COUNT(*) as count,
          COUNT(CASE WHEN success = true THEN 1 END) as success_count,
          COUNT(CASE WHEN success = false THEN 1 END) as failure_count,
          AVG(duration) as avg_duration_ms
        FROM audit_logs
        WHERE created_at >= :startDate AND created_at <= :endDate
        GROUP BY action, entity_type
        ORDER BY count DESC
      `, {
        replacements: { startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      logger.error('[AUDIT] Statistics query error:', { detail: error.message });
      throw error;
    }
  }

  /**
   * Cleanup old audit logs (data retention policy)
   * WARNING: Use with caution - may violate compliance requirements
   * 
   * @param {number} retentionDays - Keep logs newer than this many days
   * @returns {Promise<number>} - Number of logs deleted
   */
  async cleanup(retentionDays = 2555) { // Default: 7 years (SOX requirement)
    try {
      logger.warn(`[AUDIT] Cleanup: Deleting audit logs older than ${retentionDays} days`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Force delete (bypass paranoid mode)
      const deleted = await AuditLog.destroy({
        where: {
          createdAt: { [Op.lt]: cutoffDate }
        },
        force: true // Override protection
      });

      logger.debug(`[AUDIT] Cleanup: Deleted ${deleted} audit logs older than ${cutoffDate.toISOString()}`);
      return deleted;
    } catch (error) {
      logger.error('[AUDIT] Cleanup error:', { detail: error.message });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AuditService();
