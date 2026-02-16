const express = require('express');
const router = express.Router();
const emailService = require('../services/email.service');
const { User, Employee } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/email/welcome/:userId
 * @desc    Send welcome email to user with login credentials
 * @access  Private (Admin, HR)
 */
router.post('/welcome/:userId', authenticateToken, authorize(['admin', 'hr']), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { tempPassword } = req.body;

    if (!tempPassword) {
      return res.status(400).json({
        success: false,
        message: 'Temporary password is required'
      });
    }

    // Check if email service is configured
    if (!emailService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured. Please set SMTP credentials in environment variables.'
      });
    }

    // Get user with employee data
    const user = await User.findByPk(userId, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['firstName', 'lastName', 'employeeId']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare user data for email
    const userData = {
      email: user.email,
      firstName: user.employee?.firstName || 'User',
      lastName: user.employee?.lastName || '',
      role: user.role
    };

    // Send welcome email
    const result = await emailService.sendWelcomeEmail(userData, tempPassword);

    res.json({
      success: true,
      message: 'Welcome email sent successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error sending welcome email:', { detail: error });
    next(error);
  }
});

/**
 * @route   POST /api/email/password-reset/:userId
 * @desc    Send password reset email to user
 * @access  Private (Admin, HR)
 */
router.post('/password-reset/:userId', authenticateToken, authorize(['admin', 'hr']), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { tempPassword } = req.body;

    if (!tempPassword) {
      return res.status(400).json({
        success: false,
        message: 'Temporary password is required'
      });
    }

    // Check if email service is configured
    if (!emailService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured. Please set SMTP credentials in environment variables.'
      });
    }

    // Get user with employee data
    const user = await User.findByPk(userId, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['firstName', 'lastName', 'employeeId']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare user data for email
    const userData = {
      email: user.email,
      firstName: user.employee?.firstName || 'User',
      lastName: user.employee?.lastName || ''
    };

    // Send password reset email
    const result = await emailService.sendPasswordResetWithTempPassword(userData, tempPassword);

    res.json({
      success: true,
      message: 'Password reset email sent successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error sending password reset email:', { detail: error });
    next(error);
  }
});

/**
 * @route   POST /api/email/account-status/:userId
 * @desc    Send account status change notification email
 * @access  Private (Admin, HR)
 */
router.post('/account-status/:userId', authenticateToken, authorize(['admin', 'hr']), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive status is required'
      });
    }

    // Check if email service is configured
    if (!emailService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured. Please set SMTP credentials in environment variables.'
      });
    }

    // Get user with employee data
    const user = await User.findByPk(userId, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['firstName', 'lastName', 'employeeId']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare user data for email
    const userData = {
      email: user.email,
      firstName: user.employee?.firstName || 'User',
      lastName: user.employee?.lastName || ''
    };

    // Send account status change email
    const result = await emailService.sendAccountStatusChangeEmail(userData, isActive);

    res.json({
      success: true,
      message: 'Account status notification email sent successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error sending account status email:', { detail: error });
    next(error);
  }
});

/**
 * @route   GET /api/email/status
 * @desc    Check if email service is configured and ready
 * @access  Private (Admin, HR)
 */
router.get('/status', authenticateToken, authorize(['admin', 'hr']), (req, res) => {
  const isConfigured = emailService.isConfigured();
  
  res.json({
    success: true,
    data: {
      configured: isConfigured,
      message: isConfigured 
        ? 'Email service is configured and ready' 
        : 'Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env file'
    }
  });
});

module.exports = router;
