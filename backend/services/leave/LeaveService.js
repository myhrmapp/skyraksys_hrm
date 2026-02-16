const { Op } = require('sequelize');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError, 
  ForbiddenError 
} = require('../../utils/errors');
const holidayService = require('../holiday.service');

/**
 * LeaveService
 * 
 * Handles core leave request operations:
 * - Leave request creation and validation
 * - Leave balance calculations
 * - Overlap detection
 * - Working days calculations
 * - Cancellation requests
 * - Leave balance management
 */
class LeaveService {
  constructor(db) {
    this.db = db;
    this.LeaveRequest = db.LeaveRequest;
    this.LeaveBalance = db.LeaveBalance;
    this.LeaveType = db.LeaveType;
    this.Employee = db.Employee;
    this.User = db.User;
    this.sequelize = db.sequelize;
  }

  /**
   * Calculate working days between two dates (excludes weekends and public holidays)
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<number>} Number of working days
   */
  async calculateWorkingDays(startDate, endDate) {
    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build a set of holiday date strings for O(1) lookup
    let holidayDates = new Set();
    try {
      holidayDates = await holidayService.getHolidayDateSet(startDate, endDate);
    } catch (err) {
      // Graceful degradation — count weekdays only if holiday service fails
    }
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Exclude Saturday (6) and Sunday (0)
        const dateStr = d.toISOString().slice(0, 10);
        if (!holidayDates.has(dateStr)) {
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Get or create leave balance for employee/type/year
   * @param {string} employeeId - Employee UUID
   * @param {string} leaveTypeId - Leave type UUID
   * @param {number} year - Year
   * @param {Transaction} transaction - Sequelize transaction
   * @returns {Promise<LeaveBalance>} Leave balance record
   */
  async getOrCreateLeaveBalance(employeeId, leaveTypeId, year, transaction) {
    let balance = await this.LeaveBalance.findOne({
      where: { employeeId, leaveTypeId, year },
      transaction
    });

    if (!balance) {
      const leaveType = await this.LeaveType.findByPk(leaveTypeId, { transaction });
      if (!leaveType) {
        throw new BadRequestError('Invalid leaveTypeId provided.');
      }

      balance = await this.LeaveBalance.create({
        employeeId,
        leaveTypeId,
        year,
        totalAccrued: leaveType.maxDaysPerYear || 0,
        totalTaken: 0,
        totalPending: 0,
        balance: leaveType.maxDaysPerYear || 0,
        carryForward: 0
      }, { transaction });
    }

    return balance;
  }

  /**
   * Check for overlapping leave requests
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @param {string} excludeId - Leave request ID to exclude (for updates)
   * @param {Transaction} transaction - Sequelize transaction
   * @returns {Promise<LeaveRequest|null>} Overlapping leave request or null
   */
  async checkOverlappingLeave(employeeId, startDate, endDate, excludeId = null, transaction = null) {
    const whereClause = {
      employeeId,
      isCancellation: false,
      status: { [Op.in]: ['Pending', 'Approved'] },
      [Op.or]: [
        {
          startDate: { [Op.lte]: endDate },
          endDate: { [Op.gte]: startDate }
        }
      ]
    };

    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    return await this.LeaveRequest.findOne({
      where: whereClause,
      transaction
    });
  }

  /**
   * Validate leave type is active
   * @param {string} leaveTypeId - Leave type UUID
   * @param {Transaction} transaction - Sequelize transaction
   * @returns {Promise<LeaveType>} Leave type record
   * @throws {BadRequestError} If leave type not found or inactive
   */
  async validateLeaveType(leaveTypeId, transaction = null) {
    const leaveType = await this.LeaveType.findOne({
      where: { id: leaveTypeId, isActive: true },
      transaction
    });

    if (!leaveType) {
      throw new BadRequestError('Selected leave type is not available.');
    }

    return leaveType;
  }

  /**
   * Validate leave balance is sufficient
   * @param {string} employeeId - Employee UUID
   * @param {string} leaveTypeId - Leave type UUID
   * @param {number} totalDays - Number of days requested
   * @param {number} year - Year
   * @param {Transaction} transaction - Sequelize transaction
   * @returns {Promise<LeaveBalance>} Leave balance record
   * @throws {BadRequestError} If insufficient balance
   */
  async validateLeaveBalance(employeeId, leaveTypeId, totalDays, year, transaction) {
    const leaveBalance = await this.getOrCreateLeaveBalance(
      employeeId, 
      leaveTypeId, 
      year, 
      transaction
    );

    if (leaveBalance.balance < totalDays) {
      throw new BadRequestError(
        `Insufficient leave balance. Available: ${leaveBalance.balance} days, Requested: ${totalDays} days.`
      );
    }

    return leaveBalance;
  }

  /**
   * Create a normal leave request with balance deduction
   * @param {Object} leaveData - Leave request data
   * @param {string} leaveData.employeeId - Employee UUID
   * @param {string} leaveData.leaveTypeId - Leave type UUID
   * @param {Date|string} leaveData.startDate - Start date
   * @param {Date|string} leaveData.endDate - End date
   * @param {string} leaveData.reason - Reason for leave
   * @param {boolean} leaveData.isHalfDay - Half day flag
   * @returns {Promise<{leaveRequest: LeaveRequest, leaveBalance: LeaveBalance}>}
   */
  async createLeaveRequest(leaveData) {
    const transaction = await this.sequelize.transaction();
    try {
      const {
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason,
        isHalfDay = false,
        halfDayType = null
      } = leaveData;

      // Calculate total days (async — accounts for holidays)
      const totalDays = isHalfDay ? 0.5 : await this.calculateWorkingDays(startDate, endDate);
      if (totalDays <= 0) {
        throw new BadRequestError('The leave duration must be at least a half day.');
      }

      // Validate leave type
      await this.validateLeaveType(leaveTypeId, transaction);

      // Check for overlapping leaves
      const overlappingLeave = await this.checkOverlappingLeave(
        employeeId, 
        startDate, 
        endDate, 
        null, 
        transaction
      );

      if (overlappingLeave) {
        throw new ConflictError('You already have a leave request that overlaps with these dates.');
      }

      // Validate and get leave balance
      const year = new Date(startDate).getFullYear();
      const leaveBalance = await this.validateLeaveBalance(
        employeeId, 
        leaveTypeId, 
        totalDays, 
        year, 
        transaction
      );

      // Create leave request
      const leaveRequest = await this.LeaveRequest.create({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason,
        totalDays,
        isHalfDay,
        halfDayType,
        status: 'Pending',
        isCancellation: false
      }, { transaction });

      // Deduct from balance
      leaveBalance.totalPending = parseFloat(leaveBalance.totalPending) + totalDays;
      leaveBalance.balance = parseFloat(leaveBalance.balance) - totalDays;
      await leaveBalance.save({ transaction });

      await transaction.commit();
      return { leaveRequest, leaveBalance };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Create a cancellation request for an existing leave
   * @param {Object} cancellationData - Cancellation request data
   * @param {string} cancellationData.employeeId - Employee UUID
   * @param {string} cancellationData.originalLeaveRequestId - Original leave request UUID
   * @param {string} cancellationData.cancellationNote - Reason for cancellation
   * @returns {Promise<LeaveRequest>} Cancellation request
   */
  async createCancellationRequest(cancellationData) {
    const transaction = await this.sequelize.transaction();
    try {
      const { employeeId, originalLeaveRequestId, cancellationNote } = cancellationData;

      // Verify original leave request
      const originalRequest = await this.LeaveRequest.findOne({
        where: { 
          id: originalLeaveRequestId,
          employeeId: employeeId
        },
        transaction
      });

      if (!originalRequest) {
        throw new NotFoundError('Original leave request not found or does not belong to you.');
      }

      // Check if original request is in a cancellable status
      if (!['Pending', 'Approved'].includes(originalRequest.status)) {
        throw new BadRequestError(
          `Cannot cancel a leave request with status: ${originalRequest.status}`
        );
      }

      // Check for existing pending cancellation
      const existingCancellation = await this.LeaveRequest.findOne({
        where: {
          originalLeaveRequestId: originalLeaveRequestId,
          isCancellation: true,
          status: 'Pending'
        },
        transaction
      });

      if (existingCancellation) {
        throw new ConflictError('A cancellation request is already pending for this leave.');
      }

      // Create cancellation request (no balance deduction)
      const cancellationRequest = await this.LeaveRequest.create({
        employeeId,
        leaveTypeId: originalRequest.leaveTypeId,
        startDate: originalRequest.startDate,
        endDate: originalRequest.endDate,
        reason: cancellationNote,
        totalDays: originalRequest.totalDays,
        isHalfDay: originalRequest.isHalfDay,
        status: 'Pending',
        isCancellation: true,
        originalLeaveRequestId: originalLeaveRequestId,
        cancellationNote: cancellationNote
      }, { transaction });

      await transaction.commit();
      return cancellationRequest;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get leave requests with role-based filtering
   * @param {Object} filters - Query filters
   * @param {string} filters.employeeId - Filter by employee ID
   * @param {string} filters.status - Filter by status
   * @param {number} filters.page - Page number
   * @param {number} filters.limit - Items per page
   * @param {string} filters.sort - Sort field
   * @param {string} filters.order - Sort order (ASC/DESC)
   * @param {string} userId - Current user's employee ID
   * @param {string} userRole - Current user's role
   * @returns {Promise<{rows: LeaveRequest[], count: number}>}
   */
  async getLeaveRequests(filters, userId, userRole) {
    const { 
      employeeId, 
      status, 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'DESC' 
    } = filters;

    const whereClause = {};

    // Role-based access control
    if (userRole === 'employee') {
      whereClause.employeeId = userId;
    } else if (userRole === 'manager') {
      // Managers see their team's requests
      const teamMembers = await this.Employee.findAll({
        where: { managerId: userId },
        attributes: ['id']
      });
      const teamMemberIds = teamMembers.map(emp => emp.id);
      teamMemberIds.push(userId); // Include manager's own requests
      whereClause.employeeId = { [Op.in]: teamMemberIds };
    } else if (['admin', 'hr'].includes(userRole)) {
      // Admin/HR see all, but can filter by specific employee
      if (employeeId) {
        whereClause.employeeId = employeeId;
      }
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    return await this.LeaveRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: this.Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'email']
        },
        {
          model: this.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name', 'maxDaysPerYear']
        },
        {
          model: this.Employee,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  }

  /**
   * Get leave balance for employee
   * @param {string} employeeId - Employee UUID
   * @param {number} year - Year (defaults to current year)
   * @returns {Promise<LeaveBalance[]>} Array of leave balances
   */
  async getLeaveBalance(employeeId, year = null) {
    const currentYear = year || new Date().getFullYear();
    
    const balances = await this.LeaveBalance.findAll({
      where: { 
        employeeId, 
        year: currentYear 
      },
      include: [
        {
          model: this.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name', 'maxDaysPerYear', 'carryForward']
        }
      ]
    });

    return balances;
  }

  /**
   * Get single leave request by ID
   * @param {string} leaveRequestId - Leave request UUID
   * @param {string} userId - Current user's employee ID
   * @param {string} userRole - Current user's role
   * @returns {Promise<LeaveRequest>}
   */
  async getLeaveRequestById(leaveRequestId, userId, userRole) {
    const leaveRequest = await this.LeaveRequest.findByPk(leaveRequestId, {
      include: [
        {
          model: this.Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'email']
        },
        {
          model: this.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name', 'maxDaysPerYear']
        },
        {
          model: this.Employee,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: this.LeaveRequest,
          as: 'originalLeaveRequest',
          attributes: ['id', 'startDate', 'endDate', 'status'],
          required: false
        }
      ]
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found.');
    }

    // Permission check
    if (userRole === 'employee' && leaveRequest.employeeId !== userId) {
      throw new ForbiddenError('You can only view your own leave requests.');
    }

    if (userRole === 'manager') {
      const employee = await this.Employee.findByPk(leaveRequest.employeeId);
      if (employee.managerId !== userId && leaveRequest.employeeId !== userId) {
        throw new ForbiddenError('You can only view your team members\' leave requests.');
      }
    }

    return leaveRequest;
  }

  /**
   * Delete leave request (employee can only delete their own pending requests)
   * @param {string} leaveRequestId - Leave request UUID
   * @param {string} userId - Current user's employee ID
   * @param {string} userRole - Current user's role
   * @returns {Promise<void>}
   */
  async deleteLeaveRequest(leaveRequestId, userId, userRole) {
    const transaction = await this.sequelize.transaction();
    try {
      const leaveRequest = await this.LeaveRequest.findByPk(leaveRequestId, { transaction });

      if (!leaveRequest) {
        throw new NotFoundError('Leave request not found.');
      }

      // Permission check: only employee can delete their own pending requests
      if (leaveRequest.employeeId !== userId) {
        throw new ForbiddenError('You can only delete your own leave requests.');
      }

      if (leaveRequest.status !== 'Pending') {
        throw new BadRequestError('Only pending leave requests can be deleted.');
      }

      // Restore leave balance if it's a normal leave (not cancellation)
      if (!leaveRequest.isCancellation) {
        const year = new Date(leaveRequest.startDate).getFullYear();
        const leaveBalance = await this.LeaveBalance.findOne({
          where: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year: year
          },
          transaction
        });

        if (leaveBalance) {
          leaveBalance.totalPending = parseFloat(leaveBalance.totalPending) - leaveRequest.totalDays;
          leaveBalance.balance = parseFloat(leaveBalance.balance) + leaveRequest.totalDays;
          await leaveBalance.save({ transaction });
        }
      }

      await leaveRequest.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all active leave types
   * @returns {Promise<LeaveType[]>}
   */
  async getActiveLeaveTypes() {
    return await this.LeaveType.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'maxDaysPerYear', 'carryForward', 'description']
    });
  }
}

module.exports = LeaveService;
