/**
 * Soft Delete Restore Routes
 * Admin-only endpoints to restore soft-deleted records
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const db = require('../models');
const logger = require('../utils/logger');

const { EmployeeReview, LeaveBalance, User } = db;

// Use standard authorize middleware
const requireAdmin = authorize('admin');

/**
 * @swagger
 * /api/restore/employee-reviews/{id}:
 *   post:
 *     summary: Restore soft-deleted employee review
 *     tags: [Admin - Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee review restored successfully
 *       404:
 *         description: Deleted review not found
 *       403:
 *         description: Admin access required
 */
router.post('/employee-reviews/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find soft-deleted review (paranoid: false includes deleted records)
    const review = await EmployeeReview.findOne({
      where: { id },
      paranoid: false
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Employee review not found'
      });
    }

    if (!review.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Employee review is not deleted'
      });
    }

    // Restore the review
    await review.restore();

    res.json({
      success: true,
      message: 'Employee review restored successfully',
      data: review
    });
  } catch (error) {
    logger.error('Error restoring employee review:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/restore/leave-balances/{id}:
 *   post:
 *     summary: Restore soft-deleted leave balance
 *     tags: [Admin - Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Leave balance restored successfully
 *       404:
 *         description: Deleted leave balance not found
 *       403:
 *         description: Admin access required
 */
router.post('/leave-balances/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find soft-deleted leave balance
    const leaveBalance = await LeaveBalance.findOne({
      where: { id },
      paranoid: false
    });

    if (!leaveBalance) {
      return res.status(404).json({
        success: false,
        message: 'Leave balance not found'
      });
    }

    if (!leaveBalance.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Leave balance is not deleted'
      });
    }

    // Restore the leave balance
    await leaveBalance.restore();

    res.json({
      success: true,
      message: 'Leave balance restored successfully',
      data: leaveBalance
    });
  } catch (error) {
    logger.error('Error restoring leave balance:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/restore/users/{id}:
 *   post:
 *     summary: Restore soft-deleted user
 *     tags: [Admin - Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User restored successfully
 *       404:
 *         description: Deleted user not found
 *       403:
 *         description: Admin access required
 */
router.post('/users/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find soft-deleted user
    const user = await User.findOne({
      where: { id },
      paranoid: false
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'User is not deleted'
      });
    }

    // Restore the user
    await user.restore();

    // Remove sensitive fields from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User restored successfully',
      data: userResponse
    });
  } catch (error) {
    logger.error('Error restoring user:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/restore/employee-reviews:
 *   get:
 *     summary: List all soft-deleted employee reviews
 *     tags: [Admin - Restore]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted employee reviews
 *       403:
 *         description: Admin access required
 */
router.get('/employee-reviews', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const deletedReviews = await EmployeeReview.findAll({
      where: {},
      paranoid: false,
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'employeeId']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['deletedAt', 'DESC']]
    });

    // Filter only deleted records
    const onlyDeleted = deletedReviews.filter(review => review.deletedAt !== null);

    res.json({
      success: true,
      count: onlyDeleted.length,
      data: onlyDeleted
    });
  } catch (error) {
    logger.error('Error fetching deleted reviews:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/restore/leave-balances:
 *   get:
 *     summary: List all soft-deleted leave balances
 *     tags: [Admin - Restore]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted leave balances
 *       403:
 *         description: Admin access required
 */
router.get('/leave-balances', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const deletedBalances = await LeaveBalance.findAll({
      where: {},
      paranoid: false,
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'employeeId']
        },
        {
          model: db.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name']
        }
      ],
      order: [['deletedAt', 'DESC']]
    });

    // Filter only deleted records
    const onlyDeleted = deletedBalances.filter(balance => balance.deletedAt !== null);

    res.json({
      success: true,
      count: onlyDeleted.length,
      data: onlyDeleted
    });
  } catch (error) {
    logger.error('Error fetching deleted leave balances:', { detail: error });
    next(error);
  }
});

/**
 * @swagger
 * /api/restore/users:
 *   get:
 *     summary: List all soft-deleted users
 *     tags: [Admin - Restore]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted users
 *       403:
 *         description: Admin access required
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const deletedUsers = await User.findAll({
      where: {},
      paranoid: false,
      attributes: { exclude: ['password'] },
      order: [['deletedAt', 'DESC']]
    });

    // Filter only deleted records
    const onlyDeleted = deletedUsers.filter(user => user.deletedAt !== null);

    res.json({
      success: true,
      count: onlyDeleted.length,
      data: onlyDeleted
    });
  } catch (error) {
    logger.error('Error fetching deleted users:', { detail: error });
    next(error);
  }
});

module.exports = router;
