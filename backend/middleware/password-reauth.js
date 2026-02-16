const bcrypt = require('bcryptjs');
const db = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware to require password re-authentication for sensitive operations
 * Admin must provide their current password to access system config
 */
const requirePasswordReauth = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(401).json({
        success: false,
        message: 'Password required for this operation'
      });
    }

    // Get current user from database
    const user = await db.User.scope('withPassword').findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      // Log failed authentication attempt
      await db.AuditLog.create({
        userId: user.id,
        action: 'SYSTEM_CONFIG_ACCESS_DENIED',
        entity: 'SystemConfig',
        entityId: '00000000-0000-0000-0000-000000000000',
        details: { reason: 'Invalid password', ip: req.ip }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Log successful re-authentication
    await db.AuditLog.create({
      userId: user.id,
      action: 'SYSTEM_CONFIG_ACCESS_GRANTED',
      entity: 'SystemConfig',
      entityId: '00000000-0000-0000-0000-000000000000',
      details: { ip: req.ip }
    });

    // Password verified, proceed
    next();
  } catch (error) {
    logger.error('Password re-auth error:', { detail: error });
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = { requirePasswordReauth };
