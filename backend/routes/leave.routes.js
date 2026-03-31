/**
 * Leave Routes
 * Clean, maintainable route definitions using controller pattern
 * Refactored from 1,550 lines to <300 lines
 * 
 * @module routes/leave
 * @author SkyrakSys Development Team
 * @version 2.0.0
 * @refactored 2026-02-07
 */

const express = require('express');
const router = express.Router();

// Controller
const leaveController = require('../controllers/leaveController');

// Middleware
const { authenticateToken, authorize, isManagerOrAbove, canAccessEmployee } = require('../middleware/auth');
const { validate, validateQuery, validateParams } = require('../middleware/validate');
const validators = require('../middleware/validators');

// Database (for routes not yet migrated)
const db = require('../models');
const { Op } = require('sequelize');

// Apply global middleware
router.use(authenticateToken);

/**
 * @route GET /api/leaves
 * @desc Get all leave requests with pagination and RBAC filtering
 * @access Private (RBAC: Employee sees own, Manager sees team, Admin/HR sees all)
 */
router.get('/', 
  validateQuery(validators.leaveQuerySchema), 
  leaveController.getAll
);

/**
 * @route GET /api/leaves/me
 * @desc Get current user's leave requests
 * @access Private
 */
router.get('/me', 
  leaveController.getMyLeaves
);

/**
 * @route GET /api/leaves/statistics
 * @desc Get leave statistics (Admin/HR only)
 * @access Private (Admin/HR)
 */
router.get('/statistics', 
  authorize(['admin', 'hr']),
  leaveController.getStatistics
);

/**
 * @route GET /api/leaves/balance/:employeeId
 * @desc Get leave balance for employee
 * @access Private (Own balance or Admin/HR)
 */
router.get('/balance/:employeeId', 
  canAccessEmployee,
  leaveController.getBalance
);

// ============================================================================
// INLINE ROUTES — Static GET paths
// IMPORTANT: These MUST be registered BEFORE the parameterized GET /:id route
// to prevent Express from matching "meta", "balance", "pending-for-manager",
// "recent-approvals" as the :id parameter.
// ============================================================================

/**
 * @route GET /api/leaves/meta/types
 * @desc Get all active leave types (metadata)
 * @access Private
 */
router.get('/meta/types', async (req, res, next) => {
  try {
    const leaveTypes = await db.LeaveType.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'description', 'maxDaysPerYear']
    });
    
    res.json({
      success: true,
      data: leaveTypes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/leaves/meta/balance
 * @desc Get current user's leave balance summary
 * @access Private
 */
router.get('/meta/balance', async (req, res, next) => {
  try {
    if (!req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Employee record not found'
      });
    }
    
    const balances = await db.LeaveBalance.findAll({
      where: { 
        employeeId: req.user.employeeId,
        year: new Date().getFullYear()
      },
      include: [
        {
          model: db.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name']
        }
      ]
    });
    
    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/leaves/balance
 * @desc Get leave balances for all employees (Admin/HR)
 * @access Private (Admin/HR)
 */
router.get('/balance', authorize(['admin', 'hr']), async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const balances = await db.LeaveBalance.findAll({
      where: { year: parseInt(year) },
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName']
        },
        {
          model: db.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name']
        }
      ],
      order: [['employeeId', 'ASC']]
    });
    
    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/leaves/pending-for-manager
 * @desc Get pending leaves for manager approval
 * @access Private (Manager/Admin/HR)
 */
router.get('/pending-for-manager', 
  authorize(['manager', 'admin', 'hr']), 
  async (req, res, next) => {
    try {
      const user = req.user;
      let where = { status: 'Pending' };
      
      if (user.role === 'manager') {
        // Get team members
        const subordinates = await db.Employee.findAll({ 
          where: { managerId: user.employeeId }, 
          attributes: ['id'] 
        });
        const subordinateIds = subordinates.map(e => e.id);
        where.employeeId = { [Op.in]: subordinateIds };
      }
      // Admin/HR see all pending
      
      const pendingLeaves = await db.LeaveRequest.findAll({
        where,
        include: [
          { 
            model: db.Employee, 
            as: 'employee', 
            attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email'] 
          },
          { model: db.LeaveType, as: 'leaveType' }
        ],
        order: [['createdAt', 'ASC']]
      });
      
      res.json({
        success: true,
        data: pendingLeaves
      });
    } catch (error) {
      next(error);
    }
});

/**
 * @route GET /api/leaves/manager/:managerId/pending
 * @desc Get pending leaves for specific manager
 * @access Private (Admin/HR or own)
 */
router.get('/manager/:managerId/pending', 
  validateParams(validators.uuidParamSchema), 
  async (req, res, next) => {
    try {
      const { managerId } = req.params;
      const user = req.user;
      
      // RBAC: Only Admin/HR or the manager themselves
      if (user.role !== 'admin' && user.role !== 'hr' && user.employeeId !== managerId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }
      
      const subordinates = await db.Employee.findAll({
        where: { managerId },
        attributes: ['id']
      });
      const subordinateIds = subordinates.map(e => e.id);
      
      const pendingLeaves = await db.LeaveRequest.findAll({
        where: {
          employeeId: { [Op.in]: subordinateIds },
          status: 'Pending'
        },
        include: [
          { model: db.Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
          { model: db.LeaveType, as: 'leaveType' }
        ]
      });
      
      res.json({
        success: true,
        data: pendingLeaves
      });
    } catch (error) {
      next(error);
    }
});

/**
 * @route GET /api/leaves/recent-approvals
 * @desc Get recently approved/rejected leaves (Admin/HR/Manager)
 * @access Private (Manager/Admin/HR)
 */
router.get('/recent-approvals', 
  authorize(['manager', 'admin', 'hr']), 
  async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      
      const recentLeaves = await db.LeaveRequest.findAll({
        where: {
          status: { [Op.in]: ['Approved', 'Rejected'] },
          approvedAt: { [Op.ne]: null }
        },
        include: [
          { model: db.Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
          { model: db.Employee, as: 'approver', attributes: ['id', 'firstName', 'lastName'] },
          { model: db.LeaveType, as: 'leaveType' }
        ],
        order: [['approvedAt', 'DESC']],
        limit: parseInt(limit)
      });
      
      res.json({
        success: true,
        data: recentLeaves
      });
    } catch (error) {
      next(error);
    }
});

// ============================================================================
// PARAMETERIZED ROUTES — /:id must come AFTER all static/named routes
// ============================================================================

/**
 * @route GET /api/leaves/:id
 * @desc Get single leave request by ID
 * @access Private (RBAC: Own leave or Manager/Admin/HR)
 */
router.get('/:id', 
  validateParams(validators.uuidParamSchema), 
  leaveController.getById
);

/**
 * @route POST /api/leaves
 * @desc Create new leave request
 * @access Private (Employee creates own, Admin/HR can create for others)
 */
router.post('/', 
  validate(validators.createLeaveRequestSchema), 
  leaveController.create
);

/**
 * @route PUT /api/leaves/:id
 * @desc Update leave request
 * @access Private (Own leave if Pending, Admin/HR can update any)
 */
router.put('/:id',
  validateParams(validators.uuidParamSchema),
  leaveController.update
);

/**
 * @route PATCH|PUT /api/leaves/:id/approve
 * @desc Approve leave request
 * @access Private (Manager/Admin/HR)
 */
const approveMiddleware = [
  authorize(['manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  leaveController.approve
];
router.patch('/:id/approve', ...approveMiddleware);
router.put('/:id/approve', ...approveMiddleware);

/**
 * @route PATCH|PUT /api/leaves/:id/reject
 * @desc Reject leave request
 * @access Private (Manager/Admin/HR)
 */
const rejectMiddleware = [
  authorize(['manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  leaveController.reject
];
router.patch('/:id/reject', ...rejectMiddleware);
router.put('/:id/reject', ...rejectMiddleware);

/**
 * @route PATCH|POST /api/leaves/:id/cancel
 * @desc Cancel leave request
 * @access Private (Own leave or Admin/HR)
 */
const cancelMiddleware = [
  validateParams(validators.uuidParamSchema),
  leaveController.cancel
];
router.patch('/:id/cancel', ...cancelMiddleware);
router.post('/:id/cancel', ...cancelMiddleware);

/**
 * @route POST /api/leaves/:id/approve-cancellation
 * @desc Approve cancellation of a leave request
 * @access Private (Manager/Admin/HR)
 */
router.post('/:id/approve-cancellation',
  authorize(['manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  leaveController.approveCancellation
);

/**
 * Helper: Restore leave balance when deleting a leave request
 * Handles Pending (restore pending→balance) and Approved (restore taken→balance) leaves
 */
async function restoreBalanceAndDelete(leave) {
  const transaction = await db.sequelize.transaction();
  try {
    if (['Pending', 'Approved'].includes(leave.status)) {
      const leaveYear = new Date(leave.startDate).getFullYear();
      const leaveBalance = await db.LeaveBalance.findOne({
        where: {
          employeeId: leave.employeeId,
          leaveTypeId: leave.leaveTypeId,
          year: leaveYear
        },
        transaction
      });
      if (leaveBalance) {
        const days = Number(leave.totalDays);
        if (leave.status === 'Pending') {
          leaveBalance.totalPending = Number(leaveBalance.totalPending) - days;
          leaveBalance.balance = Number(leaveBalance.balance) + days;
        } else if (leave.status === 'Approved') {
          leaveBalance.totalTaken = Number(leaveBalance.totalTaken) - days;
          leaveBalance.balance = Number(leaveBalance.balance) + days;
        }
        await leaveBalance.save({ transaction });
      }
    }
    await leave.destroy({ transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * @route DELETE /api/leaves/:id
 * @desc Delete leave request with role-based restrictions
 *   - Admin: can delete any leave in any status
 *   - HR: can delete any pending leave request
 *   - Manager: can delete subordinates' pending leave requests
 *   - Employee: can delete own pending leave requests
 * @access Private (Admin, HR, Manager, Employee)
 */
router.delete('/:id',
  authorize('admin', 'hr', 'manager', 'employee'),
  validateParams(validators.uuidParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.user;
      
      const leave = await db.LeaveRequest.findByPk(id);
      
      if (!leave) {
        return res.status(404).json({
          success: false,
          message: 'Leave request not found'
        });
      }

      // Admin can delete any leave in any status
      if (role === 'admin') {
        await restoreBalanceAndDelete(leave);
        return res.json({ success: true, message: 'Leave request deleted successfully' });
      }

      // All non-admin roles can only delete pending leave requests
      if (leave.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Can only delete pending leave requests'
        });
      }

      const employee = await db.Employee.findOne({ where: { userId: req.user.id } });
      if (!employee) {
        return res.status(403).json({ success: false, message: 'Employee record not found' });
      }

      if (role === 'hr') {
        await restoreBalanceAndDelete(leave);
        return res.json({ success: true, message: 'Leave request deleted successfully' });
      }

      if (role === 'manager') {
        if (leave.employeeId === employee.id) {
          await restoreBalanceAndDelete(leave);
          return res.json({ success: true, message: 'Leave request deleted successfully' });
        }
        const subordinate = await db.Employee.findOne({
          where: { id: leave.employeeId, managerId: employee.id }
        });
        if (subordinate) {
          await restoreBalanceAndDelete(leave);
          return res.json({ success: true, message: 'Leave request deleted successfully' });
        }
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this leave request'
        });
      }

      // Employee can only delete own pending leave requests
      if (leave.employeeId !== employee.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this leave request'
        });
      }

      await restoreBalanceAndDelete(leave);
      res.json({ success: true, message: 'Leave request deleted successfully' });
    } catch (error) {
      next(error);
    }
});

module.exports = router;
