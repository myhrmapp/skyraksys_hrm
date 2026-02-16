const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models');
const authConfig = require('../config/auth.config');
const LogHelper = require('../utils/logHelper');
const logger = require('../utils/logger');
const tokenBlacklist = require('../utils/tokenBlacklist');

const User = db.User;
const Employee = db.Employee;
const RefreshToken = db.RefreshToken;

const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employee ? user.employee.id : null,
    jti: crypto.randomBytes(8).toString('hex'), // Unique ID for this token
  };
  return jwt.sign(payload, authConfig.secret, {
    expiresIn: authConfig.expiresIn, // 15 minutes
  });
};

const generateRefreshToken = async (user, req) => {
  const payload = {
    id: user.id,
    type: 'refresh',
    jti: crypto.randomBytes(16).toString('hex') // Add unique identifier to prevent token collisions
  };
  
  const token = jwt.sign(payload, authConfig.refreshSecret, {
    expiresIn: authConfig.refreshExpiresIn, // 7 days
  });

  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  try {
    await RefreshToken.create({
      token,
      userId: user.id,
      expiresAt,
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
    });
  } catch (error) {
    // Handle duplicate token edge case (very rare with jti, but possible)
    if (error.name === 'SequelizeUniqueConstraintError') {
      logger.warn('Duplicate refresh token generated, retrying...');
      return generateRefreshToken(user, req); // Retry once
    }
    throw error;
  }

  return token;
};

const authenticateToken = async (req, res, next) => {
  // Try to get token from cookie first, then fallback to Authorization header
  let token = req.cookies?.accessToken;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    LogHelper.logAuthEvent('token_missing', false, { 
      reason: 'No token provided',
      path: req.path 
    }, req);
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, authConfig.secret);

    // Check if token has been blacklisted (e.g. user logged out)
    if (decoded.jti && tokenBlacklist.isBlacklisted(decoded.jti)) {
      LogHelper.logAuthEvent('token_blacklisted', false, {
        reason: 'Token has been revoked (user logged out)',
        jti: decoded.jti
      }, req);
      return res.status(401).json({ success: false, message: 'Token has been revoked.' });
    }
    
    const user = await User.findByPk(decoded.id, {
      include: {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'managerId'],
      },
    });

    if (!user || !user.isActive) {
      LogHelper.logAuthEvent('token_invalid_user', false, {
        reason: !user ? 'User not found' : 'User is inactive',
        userId: decoded.id,
        email: decoded.email
      }, req);
      return res.status(401).json({ success: false, message: 'User not found or is inactive.' });
    }

    // Log successful authentication
    LogHelper.logAuthEvent('token_verified', true, {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id
    }, req);

    req.user = user;
    req.user.employeeId = user.employee ? user.employee.id : null;
    req.userId = user.id;
    req.userRole = user.role;
    req.employeeId = user.employee ? user.employee.id : null;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      LogHelper.logAuthEvent('token_expired', false, {
        reason: 'Token has expired',
        error: error.message
      }, req);
      return res.status(401).json({ success: false, message: 'Token has expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      LogHelper.logAuthEvent('token_invalid', false, {
        reason: 'Invalid token',
        error: error.message
      }, req);
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    LogHelper.logError(error, { context: 'token_authentication' }, req);
    return res.status(500).json({ success: false, message: 'Failed to authenticate token.' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Flatten the roles array if it's nested (handles both authorize('admin') and authorize(['admin', 'hr']))
    const roles = allowedRoles.flat();
    
    if (!req.userRole || !roles.includes(req.userRole)) {
      LogHelper.logAuthzEvent('access_denied', false, {
        userRole: req.userRole,
        allowedRoles: roles,
        resource: req.path,
        action: req.method,
        reason: 'Insufficient permissions'
      }, req);
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }
    
    LogHelper.logAuthzEvent('access_granted', true, {
      userRole: req.userRole,
      allowedRoles: roles,
      resource: req.path,
      action: req.method
    }, req);
    
    next();
  };
};

const isAdminOrHR = authorize('admin', 'hr');

const isManagerOrAbove = authorize('admin', 'hr', 'manager');

const canAccessEmployee = async (req, res, next) => {
  try {
    const targetEmployeeId = req.params.id || req.params.employeeId;

    if (req.userRole === 'admin' || req.userRole === 'hr') {
        return next();
    }

    // Check if accessing own employee record (UUID string comparison)
    if (req.employeeId && req.employeeId === targetEmployeeId) {
        return next();
    }

    if (req.userRole === 'manager') {
        const subordinate = await Employee.findOne({ where: { id: targetEmployeeId, managerId: req.employeeId } });
        if (subordinate) {
            return next();
        }
    }

    LogHelper.logAuthzEvent('employee_access_denied', false, {
        userRole: req.userRole,
        userEmployeeId: req.employeeId,
        targetEmployeeId: targetEmployeeId,
        reason: 'User cannot access this employee record'
    }, req);

    return res.status(403).json({ success: false, message: 'You do not have permission to access this employee\'s data.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
  authorize,
  isAdminOrHR,
  isManagerOrAbove,
  canAccessEmployee,
};
