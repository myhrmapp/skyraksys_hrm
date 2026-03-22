/**
 * Timesheet Controller
 * Handles HTTP layer for timesheet management operations
 * 
 * Responsibilities:
 * - Validate HTTP requests
 * - Delegate to TimesheetBusinessService
 * - Format responses using ApiResponse
 * - HTTP layer only (no business logic)
 * 
 * @module controllers/timesheetController
 * @author SkyrakSys Development Team
 * @version 1.0.0 (Phase 2.2 - Business Service Extraction)
 * @updated 2026-02-07
 */

const { timesheetDataService } = require('../services/data');
const { timesheetBusinessService } = require('../services/business');
const ApiResponse = require('../utils/ApiResponse');
const { NotFoundError, ValidationError, ForbiddenError, BadRequestError } = require('../utils/errors');
const db = require('../models');

/**
 * Helper: Verify if employee is in manager's team
 * @param {string} managerId - Manager's employee UUID
 * @param {string} employeeId - Employee's UUID to verify
 * @returns {Promise<boolean>}
 */
async function isInManagerTeam(managerId, employeeId) {
  const employee = await db.Employee.findByPk(employeeId, {
    attributes: ['id', 'managerId']
  });
  return employee && employee.managerId === managerId;
}

/**
 * Get all timesheets with pagination and RBAC filtering
 * 
 * RBAC Rules:
 * - Employee: sees only own timesheets
 * - Manager: sees own + team timesheets
 * - HR/Admin: sees all timesheets
 * 
 * @route GET /api/timesheets
 * @access Private (RBAC)
 */
const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, employeeId, projectId, weekStartDate, sort = 'weekStartDate', order = 'DESC' } = req.query;
    const user = req.user;
    
    // Build filters based on role
    const filters = {};
    
    if (status) {
      // Normalize case to match DB enum ('Draft', 'Submitted', 'Approved', 'Rejected')
      const validStatuses = ['Draft', 'Submitted', 'Approved', 'Rejected'];
      const normalized = validStatuses.find(s => s.toLowerCase() === status.toLowerCase());
      filters.status = normalized || status;
    }
    
    if (projectId) {
      filters.projectId = projectId;
    }
    
    if (weekStartDate) {
      filters.weekStartDate = new Date(weekStartDate);
    }
    
    // RBAC: Employee sees only own timesheets
    if (user.role === 'employee') {
      if (!req.employeeId) {
        return res.status(403).json(
          ApiResponse.error('Employee record not found for user', 403)
        );
      }
      filters.employeeId = req.employeeId;
    }
    // RBAC: Manager sees team timesheets
    else if (user.role === 'manager') {
      if (employeeId) {
        // Verify employee is in manager's team
        const isTeamMember = await isInManagerTeam(req.employeeId, employeeId);
        if (!isTeamMember) {
          return res.status(403).json(
            ApiResponse.error('You can only view timesheets from your team members', 403)
          );
        }
        filters.employeeId = employeeId;
      } else {
        // Return manager's own + team timesheets
        const subordinates = await db.Employee.findAll({
          where: { managerId: req.employeeId },
          attributes: ['id']
        });
        const teamIds = [req.employeeId, ...subordinates.map(e => e.id)];
        filters.employeeId = { [db.Sequelize.Op.in]: teamIds };
      }
    }
    // RBAC: Admin/HR see all
    else if (['admin', 'hr'].includes(user.role)) {
      if (employeeId) {
        filters.employeeId = employeeId;
      }
    }
    
    const offset = (page - 1) * limit;
    
    // Use data service for read operations
    const result = await timesheetDataService.findAllWithDetails({
      where: filters,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });
    
    res.json(ApiResponse.success(result.data, {
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.total / limit),
        totalItems: result.total,
        itemsPerPage: parseInt(limit)
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get single timesheet by ID
 * 
 * @route GET /api/timesheets/:id
 * @access Private (RBAC: Own timesheet or Manager/Admin/HR)
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    // Use data service for read operations
    const timesheet = await timesheetDataService.findByIdWithDetails(id);
    
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }
    
    // RBAC: Check access
    if (user.role === 'employee') {
      const employeeId = user.employee?.id || user.employeeId;
      if (timesheet.employeeId !== employeeId) {
        throw new ForbiddenError('You can only view your own timesheets');
      }
    }
    
    res.json(ApiResponse.success(timesheet));
  } catch (error) {
    next(error);
  }
};

/**
 * Create time entry
 * 
 * Business Rules:
 * - Creates or updates weekly timesheet (Mon-Sun)
 * - Validates max 24 hours per day
 * - Calculates total hours for week
 * - Initial status: 'Draft'
 * 
 * @route POST /api/timesheets
 * @access Private (Employee creates own)
 */
const create = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    const timeEntry = await timesheetBusinessService.createTimeEntry(req.body, req.user);
    
    res.status(201).json(
      ApiResponse.success(timeEntry, { message: 'Time entry created successfully' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update time entry
 * 
 * @route PUT /api/timesheets/:id
 * @access Private (Own timesheet if Draft, Admin can update any)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Phase 2: Delegate to business service
    const updated = await timesheetBusinessService.updateTimeEntry(id, req.body, req.user);
    
    res.json(
      ApiResponse.success(updated, { message: 'Timesheet updated successfully' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Submit timesheet for approval
 * 
 * Business Rules:
 * - Only Draft timesheets can be submitted
 * - Locks timesheet for editing
 * - Notifies manager
 * 
 * @route PATCH /api/timesheets/:id/submit
 * @access Private (Employee submits own)
 */
const submit = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Phase 2: Delegate to business service
    const submitted = await timesheetBusinessService.submitTimesheet(id, req.user);
    
    res.json(
      ApiResponse.success(submitted, { message: 'Timesheet submitted for approval' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Approve timesheet
 * 
 * @route PATCH /api/timesheets/:id/approve
 * @access Private (Manager/Admin/HR)
 */
const approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body;
    
    // Phase 2: Delegate to business service
    const timesheet = await timesheetBusinessService.approveTimesheet(id, req.user, comments);
    
    res.json(
      ApiResponse.success(timesheet, { message: 'Timesheet approved successfully' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reject timesheet
 * 
 * @route PATCH /api/timesheets/:id/reject
 * @access Private (Manager/Admin/HR)
 */
const reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    // Phase 2: Delegate to business service
    const timesheet = await timesheetBusinessService.rejectTimesheet(id, req.user, comments);
    
    res.json(
      ApiResponse.success(timesheet, { message: 'Timesheet rejected' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Submit all timesheets for a week
 * 
 * @route POST /api/timesheets/week/submit
 * @access Private (Employee - own week)
 */
const submitWeek = async (req, res, next) => {
  try {
    const { weekStartDate } = req.body;
    
    if (!weekStartDate) {
      throw new BadRequestError('weekStartDate is required');
    }
    
    const timesheets = await timesheetBusinessService.submitWeeklyTimesheets(
      weekStartDate,
      req.user
    );
    
    res.status(201).json(
      ApiResponse.success(timesheets, { message: 'Weekly timesheets submitted for approval' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get timesheet by week
 * 
 * @route GET /api/timesheets/week/:weekStart
 * @access Private (Own week or Admin/HR)
 */
const getByWeek = async (req, res, next) => {
  try {
    const { weekStart } = req.params;
    const { employeeId } = req.query;
    const user = req.user;
    
    let targetEmployeeId = employeeId;
    
    // RBAC: Employee can only view own weeks
    if (user.role === 'employee') {
      if (!req.employeeId) {
        throw new ForbiddenError('Employee record not found');
      }
      targetEmployeeId = req.employeeId;
    }
    // Admin/HR can specify employeeId
    else if (!targetEmployeeId) {
      throw new BadRequestError('employeeId is required');
    }
    
    const timesheets = await timesheetDataService.findByWeek(new Date(weekStart), {
      where: { employeeId: targetEmployeeId }
    });
    
    res.json(ApiResponse.success(timesheets));
  } catch (error) {
    next(error);
  }
};

/**
 * Get timesheet summary (hours breakdown)
 * 
 * @route GET /api/timesheets/summary
 * @access Private (Own summary or Admin/HR)
 */
const getSummary = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const user = req.user;
    
    let targetEmployeeId = employeeId;
    
    // RBAC: Employee can only view own summary
    if (user.role === 'employee') {
      if (!req.employeeId) {
        throw new ForbiddenError('Employee record not found');
      }
      targetEmployeeId = req.employeeId;
    }
    // Admin/HR can specify employeeId
    else if (!targetEmployeeId) {
      throw new BadRequestError('employeeId is required');
    }
    
    // Provide default dates if not specified (current month)
    const defaultStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    
    const summary = await timesheetDataService.getTimesheetSummary(
      targetEmployeeId,
      new Date(defaultStartDate),
      new Date(defaultEndDate)
    );
    
    res.json(ApiResponse.success(summary));
  } catch (error) {
    next(error);
  }
};

/**
 * Get my timesheets (current user)
 * 
 * @route GET /api/timesheets/me
 * @access Private
 */
const getMyTimesheets = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!req.employeeId) {
      throw new ForbiddenError('Employee record not found');
    }
    
    const { status, weekStartDate } = req.query;
    const filters = { employeeId: req.employeeId };
    
    if (status) {
      filters.status = status;
    }
    
    if (weekStartDate) {
      filters.weekStartDate = new Date(weekStartDate);
    }
    
    const timesheets = await timesheetDataService.findAll({ where: filters });
    
    res.json(ApiResponse.success(timesheets));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  submit,
  approve,
  reject,
  getByWeek,
  getSummary,
  getMyTimesheets
};
