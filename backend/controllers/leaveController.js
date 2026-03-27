/**
 * Leave Controller
 * Handles HTTP layer for leave management operations
 * 
 * Responsibilities:
 * - Validate HTTP requests
 * - Call LeaveService methods
 * - Format responses using ApiResponse
 * - Handle RBAC (employees see own, managers approve team, admin/HR see all)
 * 
 * @module controllers/leaveController
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07
 */

const { leaveDataService } = require('../services/data');
const { leaveBusinessService } = require('../services/business'); // Phase 2: Business logic
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
 * Get all leave requests with pagination and RBAC filtering
 * 
 * RBAC Rules:
 * - Employee: sees only own leave requests
 * - Manager: sees own + team members' requests
 * - HR/Admin: sees all requests
 * 
 * @route GET /api/leaves
 * @access Private (RBAC)
 */
const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, employeeId, sort = 'createdAt', order = 'DESC' } = req.query;
    const user = req.user;
    
    // Build filters based on role
    const filters = {};
    
    if (status) {
      // Normalize case to match DB enum ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Cancellation Requested')
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Cancellation Requested'];
      const normalized = validStatuses.find(s => s.toLowerCase() === status.toLowerCase());
      filters.status = normalized || status;
    }
    
    // RBAC: Employee sees only own leaves
    if (user.role === 'employee') {      if (!req.employeeId) {
        return res.status(403).json(
          ApiResponse.error('Employee record not found for user', 403)
        );
      }
      filters.employeeId = req.employeeId;
    }
    // RBAC: Manager sees team leaves
    else if (user.role === 'manager') {
      if (employeeId) {
        // Verify this employee is in manager's team
        const isTeamMember = await isInManagerTeam(req.employeeId, employeeId);
        if (!isTeamMember) {
          return res.status(403).json(
            ApiResponse.error('You can only view leave requests from your team members', 403)
          );
        }
        filters.employeeId = employeeId;
      } else {
        // Return manager's own + team leaves
        const subordinates = await db.Employee.findAll({
          where: { managerId: req.employeeId },
          attributes: ['id']
        });
        const teamIds = [req.employeeId, ...subordinates.map(e => e.id)];
        filters.employeeId = { [db.Sequelize.Op.in]: teamIds };
      }
    }
    // RBAC: Admin/HR see all (or filter by employeeId if provided)
    else if (['admin', 'hr'].includes(user.role)) {
      if (employeeId) {
        filters.employeeId = employeeId;
      }
    }
    
    const offset = (page - 1) * limit;
    
    const result = await leaveDataService.findAllWithDetails({
      where: filters,
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });
    
    // BaseService.findAll returns {data, pagination}
    const leaves = result.data || result.rows || [];
    const total = result.pagination?.totalItems || result.count || 0;
    
    res.json(ApiResponse.success(leaves, {
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number.parseInt(limit)
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get single leave request by ID
 * 
 * @route GET /api/leaves/:id
 * @access Private (RBAC: Own leave or Manager/Admin/HR)
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const leave = await leaveDataService.findByIdWithDetails(id);
    
    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }
    
    // RBAC: Check access
    if (user.role === 'employee') {
      if (!req.employeeId) {
        throw new ForbiddenError('Employee record not found for this user');
      }
      if (leave.employeeId !== req.employeeId) {
        throw new ForbiddenError('You can only view your own leave requests');
      }
    }
    // RBAC: Manager can view team member leaves
    else if (user.role === 'manager') {
      if (!req.employeeId) {
        throw new ForbiddenError('Manager employee record not found');
      }
      const isTeamMember = await isInManagerTeam(req.employeeId, leave.employeeId);
      if (!isTeamMember && leave.employeeId !== req.employeeId) {
        throw new ForbiddenError('You can only view leave requests from your team members');
      }
    }
    
    res.json(ApiResponse.success(leave));
  } catch (error) {
    next(error);
  }
};

/**
 * Create new leave request
 * 
 * Business Rules:
 * - Validates leave balance availability
 * - Checks for date overlaps with existing leaves
 * - Calculates working days (excludes weekends)
 * - Initial status: 'Pending'
 * 
 * @route POST /api/leaves
 * @access Private (Employee creates own, Admin/HR can create for others)
 */
const create = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles validation, balance checks, and RBAC
    const leave = await leaveBusinessService.createLeaveRequest(req.body, req.user);
    
    res.status(201).json(
      ApiResponse.success(leave, { message: 'Leave request created successfully' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update leave request
 * 
 * @route PUT /api/leaves/:id
 * @access Private (Own leave if Pending, Admin/HR can update any)
 */
const update = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles RBAC and validation
    const leave = await leaveBusinessService.updateLeaveRequest(
      req.params.id,
      req.body,
      req.user
    );
    
    res.json(
      ApiResponse.success(leave, { message: 'Leave request updated successfully' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Approve leave request
 * 
 * Business Rules:
 * - Only Pending leaves can be approved
 * - Deducts from leave balance (transaction-safe)
 * - Records approver ID and timestamp
 * 
 * @route PATCH /api/leaves/:id/approve
 * @access Private (Manager/Admin/HR)
 */
const approve = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles RBAC, balance deduction, and transaction
    const leave = await leaveBusinessService.approveLeaveRequest(
      req.params.id,
      req.user,
      req.body.comments || ''
    );
    
    res.json(
      ApiResponse.success(leave, { message: 'Leave request approved successfully' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reject leave request
 * 
 * @route PATCH /api/leaves/:id/reject
 * @access Private (Manager/Admin/HR)
 */
const reject = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles RBAC and validation
    const leave = await leaveBusinessService.rejectLeaveRequest(
      req.params.id,
      req.user,
      req.body.comments
    );
    
    res.json(
      ApiResponse.success(leave, { message: 'Leave request rejected' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel leave request
 * 
 * Business Rules:
 * - Only Pending or Approved leaves can be cancelled
 * - If Approved, restores leave balance (transaction-safe)
 * - Employee can cancel own leaves, Admin/HR can cancel any
 * 
 * @route PATCH /api/leaves/:id/cancel
 * @access Private (Own leave or Admin/HR)
 */
const cancel = async (req, res, next) => {
  try {
    // Phase 2: Delegate to business service
    // Business service handles RBAC, balance restoration, and transaction
    const leave = await leaveBusinessService.cancelLeaveRequest(
      req.params.id,
      req.user,
      req.body.reason || ''
    );
    
    res.json(
      ApiResponse.success(leave, { message: 'Leave request cancelled successfully' })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get leave balance for employee
 * 
 * @route GET /api/leaves/balance/:employeeId
 * @access Private (Own balance or Admin/HR)
 */
const getBalance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;
    
    // RBAC: Employee can only view own balance
    if (user.role === 'employee') {
      if (!req.employeeId) {
        throw new ForbiddenError('Employee record not found');
      }
      if (employeeId !== req.employeeId) {
        throw new ForbiddenError('You can only view your own leave balance');
      }
    }
    
    const year = req.query.year || new Date().getFullYear();
    
    const db = require('../models');
    const balances = await db.LeaveBalance.findAll({
      where: { 
        employeeId,
        year: parseInt(year)
      },
      include: [
        {
          model: db.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name', 'description', 'maxDaysPerYear']
        }
      ]
    });
    
    res.json(ApiResponse.success(balances));
  } catch (error) {
    next(error);
  }
};

/**
 * Get my leave requests (current user)
 * 
 * @route GET /api/leaves/me
 * @access Private
 */
const getMyLeaves = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user.employeeId) {
      throw new ForbiddenError('Employee record not found');
    }
    
    const { status, year } = req.query;
    const filters = { employeeId: user.employeeId };
    
    if (status) {
      filters.status = status;
    }
    
    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);
      filters.startDate = { [require('sequelize').Op.between]: [startOfYear, endOfYear] };
    }
    
    const leaves = await leaveDataService.findAll({ where: filters });
    
    res.json(ApiResponse.success(leaves));
  } catch (error) {
    next(error);
  }
};

/**
 * Get leave statistics (Admin/HR only)
 * 
 * @route GET /api/leaves/statistics
 * @access Private (Admin/HR)
 */
const getStatistics = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!['admin', 'hr'].includes(user.role)) {
      throw new ForbiddenError('Only Admin or HR can view leave statistics');
    }
    
    // Calculate statistics (implement as needed)
    const stats = {
      totalRequests: await leaveDataService.count(),
      pendingRequests: await leaveDataService.count({ status: 'Pending' }),
      approvedRequests: await leaveDataService.count({ status: 'Approved' }),
      rejectedRequests: await leaveDataService.count({ status: 'Rejected' })
    };
    
    res.json(ApiResponse.success(stats));
  } catch (error) {
    next(error);
  }
};

/**
 * Approve cancellation of a leave request
 * 
 * @route POST /api/leaves/:id/approve-cancellation
 * @access Private (Manager/Admin/HR)
 */
const approveCancellation = async (req, res, next) => {
  try {
    const leave = await leaveBusinessService.approveCancellation(
      req.params.id,
      req.user,
      req.body.approverComments || req.body.comments || ''
    );
    
    res.json(
      ApiResponse.success(leave, { message: 'Leave cancellation approved successfully' })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  approve,
  reject,
  cancel,
  approveCancellation,
  getBalance,
  getMyLeaves,
  getStatistics
};
