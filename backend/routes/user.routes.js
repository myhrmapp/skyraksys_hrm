const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { Op } = require('sequelize');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const db = require('../models');
const logger = require('../utils/logger');

const User = db.User;
const Employee = db.Employee;
const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'createdAt'],
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['employeeId', 'departmentId', 'positionId', 'status'],
        required: false
      }]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching users:', { detail: error });
    next(error);
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'createdAt'],
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['employeeId', 'departmentId', 'positionId', 'status'],
        required: false
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user profile:', { detail: error });
    next(error);
  }
});

// Profile update validation schema
const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100),
  lastName: Joi.string().trim().min(1).max(100),
  email: Joi.string().trim().email().max(255)
}).min(1);

// Update user profile
router.put('/profile', authenticateToken, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.validatedData;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      email: email || user.email
    });

    // Return updated user
    const updatedUser = await User.findByPk(user.id, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'createdAt']
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user profile:', { detail: error });
    next(error);
  }
});

module.exports = router;
