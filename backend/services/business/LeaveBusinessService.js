/**
 * Leave Business Service
 * 
 * Contains all leave-related business logic and workflows.
 * Responsibilities:
 * - Leave request creation with validation
 * - Leave approval/rejection workflows
 * - Leave cancellation with balance restoration
 * - Leave balance checks
 * - Date overlap validation
 * - RBAC validation
 * 
 * @class LeaveBusinessService
 * @extends BaseBusinessService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const BaseBusinessService = require('./BaseBusinessService');
const { ValidationError, NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../../utils/errors');
const db = require('../../models');

class LeaveBusinessService extends BaseBusinessService {
  constructor(leaveDataService, leaveBalanceDataService, employeeDataService) {
    super();
    this.leaveDataService = leaveDataService;
    this.leaveBalanceDataService = leaveBalanceDataService;
    this.employeeDataService = employeeDataService;
  }

  /**
   * Create leave request
   * 
   * Business Rules:
   * - Start date must be in future
   * - End date must be after start date
   * - No overlapping leaves (Approved/Pending)
   * - Employee must exist
   * - Leave type must exist
   * - Sufficient leave balance
   * 
   * @param {Object} data - Leave request data
   * @param {Object} currentUser - Current user (for RBAC)
   * @returns {Promise<Object>} Created leave request
   */
  async createLeaveRequest(data, currentUser) {
    this.log('createLeaveRequest', { employeeId: data.employeeId, leaveTypeId: data.leaveTypeId });

    // RBAC: Employee can only create for self; admin/HR can create for others
    if (currentUser.role === 'employee') {
      if (!currentUser.employee?.id) {
        throw new ForbiddenError('Employee record not found');
      }
      data.employeeId = currentUser.employee.id;
    } else if (!data.employeeId) {
      // Admin/HR using the leave form without specifying an employee —
      // auto-assign their own employeeId if they have an employee record
      if (currentUser.employee?.id) {
        data.employeeId = currentUser.employee.id;
      } else {
        throw new BadRequestError('employeeId is required when creating leave for another employee');
      }
    }

    // Validate business rules
    await this.validateLeaveRequest(data);

    // Calculate total days
    const totalDays = this.calculateLeaveDays(data.startDate, data.endDate, data.isHalfDay);

    // Create leave request
    const leave = await this.leaveDataService.create({
      ...data,
      totalDays,
      status: 'Pending',
      appliedAt: new Date()
    });

    // Update leave balance: deduct from balance, add to pending
    const leaveYear = new Date(data.startDate).getFullYear();
    const leaveBalance = await db.LeaveBalance.findOne({
      where: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        year: leaveYear
      }
    });

    if (leaveBalance) {
      leaveBalance.balance = Number(leaveBalance.balance) - totalDays;
      leaveBalance.totalPending = Number(leaveBalance.totalPending) + totalDays;
      await leaveBalance.save();
    }

    this.log('createLeaveRequest:success', { id: leave.id });
    return this.leaveDataService.findByIdWithDetails(leave.id);
  }

  /**
   * Approve leave request
   * 
   * Business Rules:
   * - Only Pending leaves can be approved
   * - Deducts from leave balance (transaction-safe)
   * - Records approver ID and timestamp
   * 
   * @param {string} id - Leave request UUID
   * @param {Object} currentUser - Current user (approver)
   * @param {string} comments - Approval comments
   * @returns {Promise<Object>} Approved leave request
   */
  async approveLeaveRequest(id, currentUser, comments = '') {
    this.log('approveLeaveRequest', { id });

    // RBAC: Only managers, HR, or admins can approve
    if (!['manager', 'admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only managers, HR, or admins can approve leaves');
    }

    const transaction = await this.startTransaction();
    
    try {
      // Get leave request
      const leaveRequest = await this.leaveDataService.findById(id);

      // Prevent self-approval
      if (leaveRequest && leaveRequest.employeeId === (currentUser.employee?.id || currentUser.employeeId)) {
        throw new ForbiddenError('You cannot approve your own leave request');
      }
      
      if (!leaveRequest) {
        throw new NotFoundError('Leave request');
      }

      if (leaveRequest.status !== 'Pending') {
        throw new BadRequestError('Leave request is not in pending status');
      }

      // Check leave balance (with lock for consistency)
      const leaveBalance = await db.LeaveBalance.findOne({
        where: { 
          employeeId: leaveRequest.employeeId, 
          leaveTypeId: leaveRequest.leaveTypeId 
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!leaveBalance) {
        throw new NotFoundError('Leave balance record not found');
      }

      // Re-validate: ensure balance hasn't gone negative since request was created
      // (e.g., admin manually adjusted balance downward after leave was submitted)
      const currentBalance = Number(leaveBalance.balance);
      const requestedDays = Number(leaveRequest.totalDays);
      const currentPending = Number(leaveBalance.totalPending);
      if (currentBalance + currentPending < requestedDays) {
        throw new BadRequestError(
          `Insufficient leave balance to approve. Available (balance + pending): ${currentBalance + currentPending}, Required: ${requestedDays}`
        );
      }

      // Balance was already deducted at request creation time
      // Now move from pending to taken
      leaveBalance.totalPending = currentPending - requestedDays;
      leaveBalance.totalTaken = Number(leaveBalance.totalTaken) + requestedDays;
      await leaveBalance.save({ transaction });

      // Update leave request
      const approverId = currentUser.employee?.id || currentUser.id;
      await this.leaveDataService.update(id, {
        status: 'Approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        approverComments: comments
      }, { transaction });

      await transaction.commit();
      
      this.log('approveLeaveRequest:success', { id });
      return this.leaveDataService.findByIdWithDetails(id);

    } catch (error) {
      await transaction.rollback();
      this.log('approveLeaveRequest:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Reject leave request
   * 
   * @param {string} id - Leave request UUID
   * @param {Object} currentUser - Current user (approver)
   * @param {string} comments - Rejection comments
   * @returns {Promise<Object>} Rejected leave request
   */
  async rejectLeaveRequest(id, currentUser, comments) {
    this.log('rejectLeaveRequest', { id });

    // RBAC: Only managers, HR, or admins can reject
    if (!['manager', 'admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only managers, HR, or admins can reject leaves');
    }

    if (!comments) {
      throw new BadRequestError('Rejection comments are required');
    }

    const leaveRequest = await this.leaveDataService.findById(id);
    
    if (!leaveRequest) {
      throw new NotFoundError('Leave request');
    }

    if (leaveRequest.status !== 'Pending') {
      throw new BadRequestError('Leave request is not in pending status');
    }

    const approverId = currentUser.employee?.id || currentUser.id;

    // Wrap balance restore + status update in a transaction to prevent phantom balance credits
    const transaction = await db.sequelize.transaction();
    try {
      // Restore leave balance (was deducted at request creation time)
      const leaveYear = new Date(leaveRequest.startDate).getFullYear();
      const leaveBalance = await db.LeaveBalance.findOne({
        where: {
          employeeId: leaveRequest.employeeId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year: leaveYear
        },
        transaction
      });
      if (leaveBalance) {
        leaveBalance.balance = Number(leaveBalance.balance) + Number(leaveRequest.totalDays);
        leaveBalance.totalPending = Number(leaveBalance.totalPending) - Number(leaveRequest.totalDays);
        await leaveBalance.save({ transaction });
      }

      await this.leaveDataService.update(id, {
        status: 'Rejected',
        approvedBy: approverId,
        rejectedAt: new Date(),
        approverComments: comments
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    this.log('rejectLeaveRequest:success', { id });
    return this.leaveDataService.findByIdWithDetails(id);
  }

  /**
   * Cancel leave request
   * 
   * Business Rules:
   * - Only Pending or Approved leaves can be cancelled
   * - If Approved, restores leave balance (transaction-safe)
   * 
   * @param {string} id - Leave request UUID
   * @param {Object} currentUser - Current user
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled leave request
   */
  async cancelLeaveRequest(id, currentUser, reason = '') {
    this.log('cancelLeaveRequest', { id });

    const leaveRequest = await this.leaveDataService.findById(id);
    
    if (!leaveRequest) {
      throw new NotFoundError('Leave request');
    }

    // RBAC: Employee can only cancel own leaves
    if (currentUser.role === 'employee' && leaveRequest.employeeId !== currentUser.employee?.id) {
      throw new ForbiddenError('You can only cancel your own leave requests');
    }

    if (!['Pending', 'Approved'].includes(leaveRequest.status)) {
      throw new BadRequestError('Can only cancel Pending or Approved leaves');
    }

    const transaction = await this.startTransaction();
    
    try {
      if (leaveRequest.status === 'Approved') {
        // Approved leave: set to 'Cancellation Requested', needs manager approval
        await this.leaveDataService.update(id, {
          status: 'Cancellation Requested',
          cancellationNote: reason || 'Cancellation requested by user'
        }, { transaction });
      } else {
        // Pending leave: cancel directly and restore balance
        const leaveYear = new Date(leaveRequest.startDate).getFullYear();
        const leaveBalance = await db.LeaveBalance.findOne({
          where: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year: leaveYear
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (leaveBalance) {
          leaveBalance.balance = Number(leaveBalance.balance) + Number(leaveRequest.totalDays);
          leaveBalance.totalPending = Number(leaveBalance.totalPending) - Number(leaveRequest.totalDays);
          await leaveBalance.save({ transaction });
        }

        await this.leaveDataService.update(id, {
          status: 'Cancelled',
          cancellationNote: reason || 'Cancelled by user'
        }, { transaction });
      }

      await transaction.commit();
      
      this.log('cancelLeaveRequest:success', { id });
      return this.leaveDataService.findByIdWithDetails(id);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Approve cancellation of a leave request
   * Only for leaves in 'Cancellation Requested' status
   * Restores leave balance and sets status to Cancelled
   */
  async approveCancellation(id, currentUser, comments = '') {
    this.log('approveCancellation', { id });

    if (!['manager', 'admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only managers, HR, or admins can approve cancellations');
    }

    const leaveRequest = await this.leaveDataService.findById(id);
    if (!leaveRequest) {
      throw new NotFoundError('Leave request');
    }

    if (leaveRequest.status !== 'Cancellation Requested') {
      throw new BadRequestError('Can only approve cancellation for leaves with status "Cancellation Requested"');
    }

    const transaction = await this.startTransaction();
    try {
      // Restore leave balance
      const leaveYear = new Date(leaveRequest.startDate).getFullYear();
      const leaveBalance = await db.LeaveBalance.findOne({
        where: {
          employeeId: leaveRequest.employeeId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year: leaveYear
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (leaveBalance) {
        leaveBalance.totalTaken = Number(leaveBalance.totalTaken) - Number(leaveRequest.totalDays);
        leaveBalance.balance = Number(leaveBalance.balance) + Number(leaveRequest.totalDays);
        await leaveBalance.save({ transaction });
      }

      await this.leaveDataService.update(id, {
        status: 'Cancelled',
        approverComments: comments || 'Cancellation approved'
      }, { transaction });

      await transaction.commit();
      this.log('approveCancellation:success', { id });
      return this.leaveDataService.findByIdWithDetails(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update leave request
   * 
   * @param {string} id - Leave request UUID
   * @param {Object} data - Update data
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Updated leave request
   */
  async updateLeaveRequest(id, data, currentUser) {
    this.log('updateLeaveRequest', { id });

    const leaveRequest = await this.leaveDataService.findById(id);
    
    if (!leaveRequest) {
      throw new NotFoundError('Leave request');
    }

    // RBAC: Employee can only update own pending leaves
    if (currentUser.role === 'employee') {
      if (leaveRequest.employeeId !== currentUser.employee?.id) {
        throw new ForbiddenError('You can only update your own leave requests');
      }
      if (leaveRequest.status !== 'Pending') {
        throw new BadRequestError('Can only update pending leave requests');
      }
    }

    // If dates or half-day are changing, recalculate total days and adjust balance
    if (data.startDate || data.endDate || data.isHalfDay !== undefined) {
      const startDate = data.startDate || leaveRequest.startDate;
      const endDate = data.endDate || leaveRequest.endDate;
      const isHalfDay = data.isHalfDay !== undefined ? data.isHalfDay : leaveRequest.isHalfDay;
      const newTotalDays = this.calculateLeaveDays(startDate, endDate, isHalfDay);
      const oldTotalDays = Number(leaveRequest.totalDays);
      const daysDiff = newTotalDays - oldTotalDays;

      data.totalDays = newTotalDays;

      if (daysDiff !== 0) {
        const transaction = await db.sequelize.transaction();
        try {
          const leaveYear = new Date(startDate).getFullYear();
          const leaveBalance = await db.LeaveBalance.findOne({
            where: {
              employeeId: leaveRequest.employeeId,
              leaveTypeId: data.leaveTypeId || leaveRequest.leaveTypeId,
              year: leaveYear
            },
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (leaveBalance) {
            // If requesting more days, check balance
            if (daysDiff > 0 && Number(leaveBalance.balance) < daysDiff) {
              throw new BadRequestError(
                `Insufficient leave balance for updated dates. Available: ${leaveBalance.balance}, Additional needed: ${daysDiff}`
              );
            }
            leaveBalance.balance = Number(leaveBalance.balance) - daysDiff;
            leaveBalance.totalPending = Number(leaveBalance.totalPending) + daysDiff;
            await leaveBalance.save({ transaction });
          }

          await this.leaveDataService.update(id, data, { transaction });
          await transaction.commit();

          this.log('updateLeaveRequest:success', { id });
          return this.leaveDataService.findByIdWithDetails(id);
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      }
    }

    await this.leaveDataService.update(id, data);
    
    this.log('updateLeaveRequest:success', { id });
    return this.leaveDataService.findByIdWithDetails(id);
  }

  // ========================================================================
  // PRIVATE VALIDATION METHODS
  // ========================================================================

  /**
   * Validate leave request business rules
   * @private
   */
  async validateLeaveRequest(data) {
    const { employeeId, leaveTypeId, startDate, endDate } = data;

    // Validate employee exists
    const employee = await this.employeeDataService.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Validate leave type exists
    const leaveType = await db.LeaveType.findByPk(leaveTypeId);
    if (!leaveType) {
      throw new NotFoundError('Leave type not found');
    }

    // Validate dates — compare date portions only (timezone-safe)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    // Normalize all to UTC midnight for consistent date-only comparison
    const startDateOnly = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endDateOnly = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const todayDateOnly = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    
    if (startDateOnly > endDateOnly) {
      throw new ValidationError('End date must be after or equal to start date');
    }

    // Allow retroactive leave requests up to 14 days in the past
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    if (startDateOnly < todayDateOnly - fourteenDaysMs) {
      throw new ValidationError('Start date cannot be more than 2 weeks in the past');
    }

    // Check for overlapping leaves
    const overlappingLeaves = await this.leaveDataService.findByDateRange(startDate, endDate, {
      where: {
        employeeId,
        status: ['Approved', 'Pending']
      }
    });

    if (overlappingLeaves.data && overlappingLeaves.data.length > 0) {
      throw new ConflictError('Leave request overlaps with existing leave');
    }

    // Check leave balance
    const totalDays = this.calculateLeaveDays(startDate, endDate, data.isHalfDay);
    const leaveYear = new Date(startDate).getFullYear();
    const leaveBalance = await this.leaveBalanceDataService.findSpecificBalance(
      employeeId,
      leaveTypeId,
      leaveYear
    );

    if (!leaveBalance) {
      throw new NotFoundError('Leave balance not found for this leave type');
    }

    if (leaveBalance.balance < totalDays) {
      throw new ValidationError(
        `Insufficient leave balance. Available: ${leaveBalance.balance}, Requested: ${totalDays}`
      );
    }
  }

  /**
   * Calculate leave days (inclusive, excludes weekends)
   * @private
   */
  calculateLeaveDays(startDate, endDate, isHalfDay = false) {
    if (isHalfDay) return 0.5;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Exclude Saturday & Sunday
        count++;
      }
    }
    return count || 1; // At minimum 1 day
  }
}

module.exports = LeaveBusinessService;
