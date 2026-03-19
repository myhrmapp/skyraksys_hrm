/**
 * Timesheet Routes
 * Clean, maintainable route definitions using controller pattern
 * Refactored from 2,393 lines to <400 lines
 * 
 * @module routes/timesheet
 * @author SkyrakSys Development Team
 * @version 2.0.0
 * @refactored 2026-02-07
 */

const express = require('express');
const router = express.Router();

// Controller
const timesheetController = require('../controllers/timesheetController');

// Business Services
const { timesheetBusinessService } = require('../services/business');

// Middleware
const { authenticateToken, authorize, isManagerOrAbove } = require('../middleware/auth');
const { validate, validateQuery, validateParams } = require('../middleware/validate');
const validators = require('../middleware/validators');
const { bulkOperationLimiter } = require('../middleware/rateLimiter');

// Database (for routes not yet migrated)
const db = require('../models');
const { Op } = require('sequelize');
const { sanitizeTimesheetData, sanitizeBulkTimesheetData } = require('../utils/sanitizer');
const LogHelper = require('../utils/logHelper');

// Apply global middleware
router.use(authenticateToken);

/**
 * @route GET /api/timesheets
 * @desc Get all timesheets with pagination and RBAC filtering
 * @access Private (RBAC: Employee sees own, Manager sees team, Admin/HR sees all)
 */
router.get('/', 
  validateQuery(validators.timesheetQuerySchema), 
  timesheetController.getAll
);

/**
 * @route GET /api/timesheets/me
 * @desc Get current user's timesheets
 * @access Private
 */
router.get('/me', 
  timesheetController.getMyTimesheets
);

/**
 * @route GET /api/timesheets/summary
 * @desc Get timesheet summary (hours breakdown)
 * @access Private (Own summary or Admin/HR)
 */
router.get('/summary', 
  timesheetController.getSummary
);

/**
 * @route GET /api/timesheets/week/:weekStart
 * @desc Get timesheets by week
 * @access Private (Own week or Admin/HR)
 */
router.get('/week/:weekStart', 
  timesheetController.getByWeek
);

/**
 * @route GET /api/timesheets/approval/pending
 * @desc Get pending timesheets for manager approval
 * @access Private (Manager/Admin/HR)
 * NOTE: Must be defined BEFORE /:id to avoid route shadowing
 */
router.get('/approval/pending',
  isManagerOrAbove,
  async (req, res, next) => {
    try {
      const user = req.user;
      let where = { status: 'Submitted' };

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

      const pendingTimesheets = await db.Timesheet.findAll({
        where,
        include: [
          {
            model: db.Employee,
            as: 'employee',
            attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email']
          },
          {
            model: db.Project,
            as: 'project',
            attributes: ['id', 'name']
          },
          {
            model: db.Task,
            as: 'task',
            attributes: ['id', 'name']
          }
        ],
        order: [['weekStartDate', 'ASC']]
      });

      res.json({
        success: true,
        data: pendingTimesheets
      });
    } catch (error) {
      next(error);
    }
});

/**
 * @route GET /api/timesheets/stats/summary
 * @desc Get timesheet statistics
 * @access Private
 * NOTE: Must be defined BEFORE /:id to avoid route shadowing
 */
router.get('/stats/summary',
  async (req, res, next) => {
    try {
      const user = req.user;
      const { startDate, endDate } = req.query;

      let where = {};
      
      if (user.role === 'employee') {
        where.employeeId = user.employeeId;
      }

      if (startDate && endDate) {
        where.weekStartDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const timesheets = await db.Timesheet.findAll({
        where,
        attributes: [
          'status',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
          [db.sequelize.fn('SUM', db.sequelize.col('totalHoursWorked')), 'totalHours']
        ],
        group: ['status'],
        raw: true
      });

      const summary = {
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        totalHours: 0
      };

      timesheets.forEach(item => {
        const status = item.status.toLowerCase();
        summary[status] = parseInt(item.count) || 0;
        summary.totalHours += parseFloat(item.totalHours) || 0;
      });

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
});

/**
 * @route GET /api/timesheets/:id
 * @desc Get single timesheet by ID
 * @access Private (RBAC: Own timesheet or Manager/Admin/HR)
 */
router.get('/:id', 
  validateParams(validators.uuidParamSchema), 
  timesheetController.getById
);

/**
 * @route POST /api/timesheets
 * @desc Create time entry (creates/updates weekly timesheet)
 * @access Private (Employee creates own)
 */
router.post('/', 
  validate(validators.createTimesheetSchema), 
  timesheetController.create
);

/**
 * @route PUT /api/timesheets/:id
 * @desc Update timesheet
 * @access Private (Own draft timesheet, Admin can update any)
 */
router.put('/:id',
  validateParams(validators.uuidParamSchema),
  validate(validators.updateTimesheetSchema),
  timesheetController.update
);

/**
 * @route PATCH /api/timesheets/:id/submit
 * @desc Submit timesheet for approval
 * @access Private (Employee submits own)
 */
router.patch('/:id/submit',
  validateParams(validators.uuidParamSchema),
  timesheetController.submit
);

/**
 * @route PATCH /api/timesheets/:id/approve
 * @desc Approve timesheet
 * @access Private (Manager/Admin/HR)
 */
router.patch('/:id/approve',
  authorize(['manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  timesheetController.approve
);

/**
 * @route POST /api/timesheets/:id/approve
 * @desc Approve timesheet (alternative POST method)
 * @access Private (Manager/Admin/HR)
 */
router.post('/:id/approve',
  authorize(['manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  timesheetController.approve
);

/**
 * @route PATCH /api/timesheets/:id/reject
 * @desc Reject timesheet
 * @access Private (Manager/Admin/HR)
 */
router.patch('/:id/reject',
  authorize(['manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  // Use Joi-based approval schema for validation
  validate(validators.timesheetApprovalSchema),
  (req, res, next) => {
    // Normalize validated data for controller: always pass comments
    const { action, comments } = req.validatedData || req.body || {};
    req.body.comments = comments;
    req.body.action = action || 'reject';
    next();
  },
  timesheetController.reject
);

/**
 * @route POST /api/timesheets/:id/reject
 * @desc Reject timesheet (alternative POST method)
 * @access Private (Manager/Admin/HR)
 */
router.post('/:id/reject',
  authorize(['manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  validate(validators.timesheetApprovalSchema),
  (req, res, next) => {
    const { action, comments } = req.validatedData || req.body || {};
    req.body.comments = comments;
    req.body.action = action || 'reject';
    next();
  },
  timesheetController.reject
);

// ============================================================================
// INLINE ROUTES (Bulk Operations, Complex Logic, Legacy)
// These routes have complex business logic that doesn't fit controller pattern yet
// ============================================================================

// Shared handler for submitting timesheets (by IDs or by weekStartDate)
async function handleBulkSubmit(req, res, next) {
  try {
    let { timesheetIds } = req.body;
    const { weekStartDate } = req.body;

    // Determine effective employeeId for queries (fallback to user.id in test env)
    const employeeId = req.user && (req.user.employeeId || req.user.id);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee context is missing for timesheet submission.'
      });
    }

      // If weekStartDate provided, find draft timesheets for that week
      if ((!timesheetIds || timesheetIds.length === 0) && weekStartDate) {
        const weekStart = new Date(weekStartDate);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const draftTimesheets = await db.Timesheet.findAll({
          where: {
            employeeId,
            weekStartDate: weekStartStr,
            status: 'Draft',
            deletedAt: null
          },
          attributes: ['id']
        });
        
        if (draftTimesheets.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No draft timesheets found to submit for this week.'
          });
        }
        
        timesheetIds = draftTimesheets.map(t => t.id);
      }

    if (!timesheetIds || !Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timesheet IDs or week start date'
      });
    }

    // Fetch and update timesheets
    const timesheets = await db.Timesheet.findAll({
      where: { 
        id: { [Op.in]: timesheetIds },
        employeeId,
        status: 'Draft'
      }
    });

    if (timesheets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No draft timesheets found'
      });
    }

    // Update status to Submitted with submittedAt timestamp
    await db.Timesheet.update(
      { status: 'Submitted', submittedAt: new Date() },
      {
        where: {
          id: { [Op.in]: timesheets.map(t => t.id) }
        }
      }
    );

    LogHelper.logBusinessEvent('Bulk timesheet submission', {
      employeeId,
      count: timesheets.length
    });

    res.json({
      success: true,
      message: `${timesheets.length} timesheets submitted successfully`,
      data: { count: timesheets.length }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route POST /api/timesheets/bulk-submit
 * @desc Submit multiple timesheets at once (by IDs or weekStartDate)
 * @access Private
 */
router.post('/bulk-submit',
  validate(validators.bulkSubmitTimesheetSchema),
  handleBulkSubmit
);

/**
 * @route POST /api/timesheets/week/submit
 * @desc Submit weekly timesheets for approval (alias for bulk-submit with weekStartDate)
 * @access Private
 */
router.post('/week/submit',
  validate(validators.bulkSubmitTimesheetSchema),
  handleBulkSubmit
);

/**
 * @route POST /api/timesheets/bulk-approve
 * @desc Approve multiple timesheets at once
 * @access Private (Manager/Admin/HR)
 */
router.post('/bulk-approve',
  authorize(['manager', 'admin', 'hr']),
  async (req, res, next) => {
    try {
      const { timesheetIds, comments = '' } = req.body;

      if (!timesheetIds || !Array.isArray(timesheetIds) || timesheetIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timesheet IDs'
        });
      }

      const timesheets = await db.Timesheet.findAll({
        where: {
          id: { [Op.in]: timesheetIds },
          status: 'Submitted'
        }
      });

      if (timesheets.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No submitted timesheets found'
        });
      }

      // Update status to Approved
      await db.Timesheet.update(
        {
          status: 'Approved',
          approvedBy: req.user.employeeId || req.user.id,
          approvedAt: new Date(),
          approverComments: comments
        },
        {
          where: {
            id: { [Op.in]: timesheets.map(t => t.id) }
          }
        }
      );

      res.json({
        success: true,
        message: `${timesheets.length} timesheets approved successfully`,
        data: { count: timesheets.length }
      });
    } catch (error) {
      next(error);
    }
});

/**
 * @route POST /api/timesheets/bulk-reject
 * @desc Reject multiple timesheets at once
 * @access Private (Manager/Admin/HR)
 */
router.post('/bulk-reject',
  bulkOperationLimiter,
  authorize(['manager', 'admin', 'hr']),
  async (req, res, next) => {
    try {
      const { timesheetIds, comments } = req.body;

      if (!timesheetIds || !Array.isArray(timesheetIds) || timesheetIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid timesheet IDs'
        });
      }

      if (!comments) {
        return res.status(400).json({
          success: false,
          message: 'Rejection comments are required'
        });
      }

      const timesheets = await db.Timesheet.findAll({
        where: {
          id: { [Op.in]: timesheetIds },
          status: 'Submitted'
        }
      });

      if (timesheets.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No submitted timesheets found'
        });
      }

      // Update status to Rejected
      await db.Timesheet.update(
        {
          status: 'Rejected',
          rejectedBy: req.user.employeeId || req.user.id,
          rejectedAt: new Date(),
          approverComments: comments
        },
        {
          where: {
            id: { [Op.in]: timesheets.map(t => t.id) }
          }
        }
      );

      res.json({
        success: true,
        message: `${timesheets.length} timesheets rejected`,
        data: { count: timesheets.length }
      });
    } catch (error) {
      next(error);
    }
});

// NOTE: /approval/pending and /stats/summary moved above /:id to prevent route shadowing

/**
 * @route POST /api/timesheets/bulk-save
 * @desc Save multiple time entries at once
 * @access Private
 */
router.post('/bulk-save',
  async (req, res, next) => {
    try {
      const { entries } = req.body;

      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entries array'
        });
      }

      if (entries.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 100 entries per bulk operation'
        });
      }

      // Enforce ownership — all entries must belong to the authenticated user
      const sanitizedEntries = entries.map(entry => 
        sanitizeTimesheetData({ ...entry, employeeId: req.user.employeeId })
      );

      const results = [];
      const errors = [];

      for (const entry of sanitizedEntries) {
        try {
          const created = await timesheetBusinessService.createTimeEntry(entry, req.user);
          results.push(created);
        } catch (entryError) {
          errors.push({
            entry,
            error: entryError.message
          });
        }
      }

      res.json({
        success: true,
        message: `${results.length} entries saved, ${errors.length} failed`,
        data: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      next(error);
    }
});

/**
 * @route PUT /api/timesheets/bulk-update
 * @desc Update multiple timesheets at once
 * @access Private
 */
router.put('/bulk-update',
  async (req, res, next) => {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid updates array'
        });
      }

      if (updates.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 100 updates per bulk operation'
        });
      }

      // Verify ownership — all timesheets must belong to the authenticated user
      const timesheetIds = updates.filter(u => u.id).map(u => u.id);
      if (timesheetIds.length > 0) {
        const ownedCount = await db.Timesheet.count({
          where: {
            id: { [Op.in]: timesheetIds },
            employeeId: req.user.employeeId
          }
        });
        if (ownedCount !== timesheetIds.length && !['admin', 'hr'].includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own timesheets'
          });
        }
      }

      const results = [];
      const errors = [];

      for (const update of updates) {
        if (!update.id) {
          errors.push({ update, error: 'Missing id field' });
          continue;
        }
        try {
          const updated = await timesheetBusinessService.updateTimeEntry(
            update.id,
            sanitizeTimesheetData(update),
            req.user
          );
          results.push(updated);
        } catch (updateError) {
          errors.push({
            id: update.id,
            error: updateError.message
          });
        }
      }

      res.json({
        success: true,
        message: `${results.length} timesheets updated, ${errors.length} failed`,
        data: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      next(error);
    }
});

/**
 * @route DELETE /api/timesheets/:id
 * @desc Delete timesheet
 * @access Employees (own drafts), Admins (any)
 */
router.delete('/:id',
  authorize(['employee', 'manager', 'admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      await timesheetBusinessService.deleteTimeEntry(id, req.user);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
});

module.exports = router;
