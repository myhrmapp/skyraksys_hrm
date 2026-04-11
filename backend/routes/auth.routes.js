/**
 * Auth Routes (Refactored)
 * Clean, maintainable route definitions using controller pattern
 * Refactored from 1,349 lines to <400 lines
 * 
 * @module routes/auth
 * @author SkyrakSys Development Team
 * @version 2.0.0
 * @refactored 2026-02-07
 */

const express = require('express');
const router = express.Router();

// Controller
const authController = require('../controllers/authController');

// Middleware
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, validateParams } = require('../middleware/validate');
const validators = require('../middleware/validators');
const { passwordResetLimiter } = require('../middleware/rateLimiter');

// Database (for inline user management routes)
const bcrypt = require('bcryptjs');
const db = require('../models');
const emailService = require('../services/email.service');
const { NotFoundError, ConflictError } = require('../utils/errors');

const User = db.User;
const Employee = db.Employee;

// ============================================================================
// AUTHENTICATION ROUTES (Controller-based)
// ============================================================================

/**
 * @route POST /api/auth/login
 * @desc User login with email and password
 * @access Public
 * @security Rate limiting, account lockout, audit logging
 */
router.post('/login',
  validate(validators.loginSchema),
  authController.login
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user and invalidate refresh token
 * @access Private
 */
router.post('/logout',
  authenticateToken,
  authController.logout
);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token using refresh token
 * @access Public (requires valid refresh token)
 * @security Token rotation
 */
router.post('/refresh-token',
  validate(validators.refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile',
  authenticateToken,
  authController.getProfile
);

/**
 * @route GET /api/auth/me
 * @desc Alias for /profile (get current user)
 * @access Private
 */
router.get('/me',
  authenticateToken,
  authController.getProfile
);

/**
 * @route PUT /api/auth/me
 * @desc Update current user profile
 * @access Private
 */
router.put('/me',
  authenticateToken,
  validate(validators.updateProfileSchema),
  authController.updateProfile
);

/**
 * @route PUT /api/auth/change-password
 * @desc Change current user's password
 * @access Private
 * @security Validates current password
 */
router.put('/change-password',
  authenticateToken,
  validate(validators.changePasswordSchema),
  authController.changePassword
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 * @security Doesn't reveal if email exists
 */
router.post('/forgot-password',
  passwordResetLimiter,
  validate(validators.forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token from email
 * @access Public (requires valid reset token)
 */
router.post('/reset-password',
  validate(validators.resetPasswordSchema),
  authController.resetPassword
);

/**
 * @route POST /api/auth/verify-reset-token
 * @desc Verify if reset token is valid
 * @access Public
 */
router.post('/verify-reset-token',
  authController.verifyResetToken
);

/**
 * @route POST /api/auth/cleanup-tokens
 * @desc Cleanup expired refresh tokens (maintenance)
 * @access Admin
 */
router.post('/cleanup-tokens',
  authenticateToken,
  authorize('admin'),
  authController.cleanupTokens
);

// ============================================================================
// USER MANAGEMENT ROUTES (Inline - Admin-only CRUD operations)
// These remain inline as they are straightforward CRUD with minimal logic
// ============================================================================

/**
 * @route POST /api/auth/register
 * @desc Register new user (Admin only)
 * @access Admin
 */
router.post('/register',
  authenticateToken,
  authorize('admin'),
  validate(validators.adminRegisterSchema),
  async (req, res, next) => {
    try {
      const { firstName, lastName, email, password, role } = req.validatedData;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        firstName: firstName || 'User',
        lastName: lastName || 'Account',
        email,
        password: hashedPassword,
        role: role || 'employee',
        isActive: true
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/auth/users
 * @desc Get all users with pagination
 * @access Admin/HR
 */
router.get('/users',
  authenticateToken,
  authorize(['admin', 'hr']),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, role, isActive, status, search } = req.query;

      const where = {};
      if (role) where.role = role;
      if (status === 'active') where.isActive = true;
      else if (status === 'inactive') where.isActive = false;
      else if (isActive !== undefined) where.isActive = isActive === 'true';

      if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows: users } = await User.findAndCountAll({
        where,
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'firstName', 'lastName', 'employeeId']
          }
        ],
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/auth/users/:userId/reset-password
 * @desc Reset user password (Admin)
 * @access Admin
 */
router.put('/users/:userId/reset-password',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.userIdParamSchema),
  validate(validators.adminResetPasswordSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.validatedData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/auth/users/:userId/account
 * @desc Update user account details (Admin)
 * @access Admin
 */
router.put('/users/:userId/account',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.userIdParamSchema),
  validate(validators.adminUpdateAccountSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { email, role } = req.validatedData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const updates = {};
      if (email) updates.email = email;
      if (role) updates.role = role;

      await user.update(updates);

      res.json({
        success: true,
        message: 'User account updated successfully',
        data: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/auth/users/employee/:employeeId
 * @desc Get user account linked to an employee (Admin/HR)
 * @access Admin/HR
 */
router.get('/users/employee/:employeeId',
  authenticateToken,
  authorize(['admin', 'hr']),
  validateParams(validators.employeeIdParamSchema),
  async (req, res, next) => {
    try {
      const { employeeId } = req.params;

      const employee = await Employee.findByPk(employeeId, {
        include: [{
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }
        }]
      });

      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      if (!employee.user) {
        throw new NotFoundError('No user account linked to this employee');
      }

      res.json({
        success: true,
        data: employee.user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/auth/users/employee/:employeeId
 * @desc Create user for existing employee (Admin)
 * @access Admin
 */
router.post('/users/employee/:employeeId',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.employeeIdParamSchema),
  validate(validators.createEmployeeUserSchema),
  async (req, res, next) => {
    try {
      const { employeeId } = req.params;
      const { email, password, role } = req.validatedData || req.body;

      // Check if employee exists
      const employee = await Employee.findByPk(employeeId);
      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      // Check if user already exists for this employee
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        role: role || 'employee',
        isActive: true
      });

      // Link user to employee
      await employee.update({ userId: user.id });

      res.status(201).json({
        success: true,
        message: 'User created for employee successfully',
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: employee.id
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/auth/users/:userId/role
 * @desc Update user role (Admin)
 * @access Admin
 */
router.put('/users/:userId/role',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.userIdParamSchema),
  validate(validators.updateRoleSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { role } = req.validatedData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      await user.update({ role });

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: { id: user.id, role: user.role }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/auth/users/:userId/status
 * @desc Activate/deactivate user account (Admin)
 * @access Admin
 */
router.put('/users/:userId/status',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.userIdParamSchema),
  validate(validators.updateUserStatusSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.validatedData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      await user.update({ isActive });

      res.json({
        success: true,
        message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { id: user.id, isActive: user.isActive }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/auth/users/:userId/lock
 * @desc Lock/unlock user account (Admin)
 * @access Admin
 */
router.put('/users/:userId/lock',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.userIdParamSchema),
  validate(validators.adminLockSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { isLocked } = req.validatedData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      await user.update({
        isLocked,
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      res.json({
        success: true,
        message: `User account ${isLocked ? 'locked' : 'unlocked'} successfully`,
        data: { id: user.id, isLocked: user.isLocked }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/auth/users/:userId/send-welcome-email
 * @desc Send welcome email to user (Admin)
 * @access Admin
 */
router.post('/users/:userId/send-welcome-email',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.userIdParamSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { temporaryPassword } = req.body;

      const user = await User.findByPk(userId, {
        include: [{ model: Employee, as: 'employee' }]
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Send welcome email
      const welcomeUserData = {
        email: user.email,
        firstName: user.employee?.firstName || 'User',
        lastName: user.employee?.lastName || '',
        role: user.role
      };
      await emailService.sendWelcomeEmail(welcomeUserData, temporaryPassword);

      res.json({
        success: true,
        message: 'Welcome email sent successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/auth/users/:userId
 * @desc Delete user (Admin only, soft delete)
 * @access Admin
 */
router.delete('/users/:userId',
  authenticateToken,
  authorize('admin'),
  validateParams(validators.userIdParamSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Soft delete
      await user.update({ isActive: false, deletedAt: new Date() });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
