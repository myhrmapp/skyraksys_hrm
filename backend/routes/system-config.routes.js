const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { requirePasswordReauth } = require('../middleware/password-reauth');
const { passwordReauthLimiter } = require('../middleware/rateLimiter');
const db = require('../models');
const logger = require('../utils/logger');

/**
 * Mask a secret value — shows status (SET/NOT_SET) and last 4 chars for identification
 */
function maskSecret(value) {
  if (!value || value === 'NOT_SET') return '●●●●●●●● (NOT_SET)';
  if (value.length <= 4) return '●●●●●●●● (SET)';
  return '●●●●●●●●' + value.slice(-4) + ' (SET)';
}

/**
 * POST /api/system-config/view
 * Retrieve system configuration (requires admin role + password re-auth)
 * Sensitive values (secrets, passwords, keys) are masked for security
 */
router.post('/view', authenticateToken, authorize('admin'), passwordReauthLimiter, requirePasswordReauth, async (req, res, next) => {
  try {
    // Retrieve configuration with sensitive values masked
    const systemConfig = {
      // Authentication & Security
      authentication: {
        jwtSecret: maskSecret(process.env.JWT_SECRET),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        encryptionKey: maskSecret(process.env.ENCRYPTION_KEY),
        bcryptRounds: process.env.BCRYPT_ROUNDS || '10',
        sessionSecret: maskSecret(process.env.SESSION_SECRET)
      },

      // Database Configuration
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        name: process.env.DB_NAME || 'skyraksys_hrm',
        username: process.env.DB_USER || 'postgres',
        password: maskSecret(process.env.DB_PASSWORD),
        dialect: 'postgres',
        logging: process.env.DB_LOGGING === 'true'
      },

      // Email/SMTP Configuration
      email: {
        smtpHost: process.env.SMTP_HOST || 'NOT_SET',
        smtpPort: process.env.SMTP_PORT || '587',
        smtpSecure: process.env.SMTP_SECURE === 'true',
        smtpUser: process.env.SMTP_USER || 'NOT_SET',
        smtpPassword: maskSecret(process.env.SMTP_PASSWORD),
        emailFrom: process.env.EMAIL_FROM || 'NOT_SET',
        emailFromName: process.env.EMAIL_FROM_NAME || 'HRM System'
      },

      // Application Configuration
      application: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '5000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        apiUrl: process.env.API_URL || 'http://localhost:5000',
        uploadPath: process.env.UPLOAD_PATH || './uploads',
        maxFileSize: process.env.MAX_FILE_SIZE || '5MB'
      },

      // Redis Configuration (if applicable)
      redis: {
        host: process.env.REDIS_HOST || 'NOT_SET',
        port: process.env.REDIS_PORT || '6379',
        password: maskSecret(process.env.REDIS_PASSWORD),
        enabled: process.env.REDIS_ENABLED === 'true'
      },

      // Rate Limiting
      rateLimiting: {
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        windowMs: process.env.RATE_LIMIT_WINDOW_MS || '900000', // 15 minutes
        maxRequests: process.env.RATE_LIMIT_MAX || '100'
      },

      // Logging
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log',
        auditEnabled: process.env.AUDIT_LOGGING !== 'false'
      }
    };

    // Log access to system config
    await db.AuditLog.create({
      userId: req.user.id,
      action: 'VIEW_SYSTEM_CONFIG',
      entity: 'SystemConfig',
      entityId: '00000000-0000-0000-0000-000000000000',
      details: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      data: systemConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving system config:', { detail: error });
    next(error);
  }
});

/**
 * PUT /api/system-config/update
 * Update system configuration values (requires admin role + password re-auth)
 * Note: This updates database-stored config, not .env file
 */
router.put('/update', authenticateToken, authorize('admin'), passwordReauthLimiter, requirePasswordReauth, async (req, res, next) => {
  try {
    const { section, updates } = req.body;

    if (!section || !updates) {
      return res.status(400).json({
        success: false,
        message: 'Section and updates required'
      });
    }

    // Retrieve or create SystemConfig record
    let config = await db.sequelize.query(
      `SELECT * FROM system_configs WHERE key = :section LIMIT 1`,
      {
        replacements: { section },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );

    const oldValue = config.length > 0 ? config[0].value : null;

    // Update or create config
    if (config.length > 0) {
      await db.sequelize.query(
        `UPDATE system_configs SET value = :value, "updatedAt" = NOW() WHERE key = :section`,
        {
          replacements: {
            section,
            value: JSON.stringify(updates)
          },
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );
    } else {
      await db.sequelize.query(
        `INSERT INTO system_configs (id, category, key, value, version, "changedBy", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), :category, :section, :value, 1, :changedBy, NOW(), NOW())`,
        {
          replacements: {
            category: section,
            section,
            value: JSON.stringify(updates),
            changedBy: req.user.id
          },
          type: db.Sequelize.QueryTypes.INSERT
        }
      );
    }

    // Log configuration change
    await db.AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_SYSTEM_CONFIG',
      entity: 'SystemConfig',
      entityId: '00000000-0000-0000-0000-000000000000',
      details: {
        section,
        oldValue,
        newValue: updates,
        ip: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: { section, updates }
    });
  } catch (error) {
    logger.error('Error updating system config:', { detail: error });
    next(error);
  }
});

/**
 * GET /api/system-config/audit-trail
 * Get audit trail of system config changes (admin only)
 */
router.get('/audit-trail', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const auditLogs = await db.AuditLog.findAndCountAll({
      where: {
        entityType: 'SystemConfig'
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: auditLogs.rows,
      pagination: {
        total: auditLogs.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(auditLogs.count / limit)
      }
    });
  } catch (error) {
    logger.error('Error retrieving audit trail:', { detail: error });
    next(error);
  }
});

/**
 * POST /api/system-config/verify-password
 * Verify admin password without fetching config (for initial access check)
 */
router.post('/verify-password', authenticateToken, authorize('admin'), passwordReauthLimiter, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password required'
      });
    }

    const bcrypt = require('bcryptjs');
    const user = await db.User.scope('withPassword').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      await db.AuditLog.create({
        userId: user.id,
        action: 'SYSTEM_CONFIG_PASSWORD_VERIFY_FAILED',
        entity: 'SystemConfig',
        entityId: '00000000-0000-0000-0000-000000000000',
        details: { ip: req.ip }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    res.json({
      success: true,
      message: 'Password verified'
    });
  } catch (error) {
    logger.error('Error verifying password:', { detail: error });
    next(error);
  }
});

module.exports = router;
