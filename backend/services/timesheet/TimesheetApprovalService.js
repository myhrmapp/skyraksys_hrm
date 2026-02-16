const moment = require('moment');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../utils/errors');

/**
 * TimesheetApprovalService
 * 
 * Handles timesheet approval and rejection workflows.
 * Primary use case: Weekly bulk approval by managers.
 * Includes permission checks and approval notifications.
 * 
 * @class TimesheetApprovalService
 */
class TimesheetApprovalService {
  /**
   * @param {Object} db - Sequelize database instance
   */
  constructor(db) {
    this.Timesheet = db.Timesheet;
    this.Employee = db.Employee;
    this.Project = db.Project;
    this.Task = db.Task;
    this.AuditLog = db.AuditLog;
    this.sequelize = db.sequelize;
  }

  /**
   * Approve a single timesheet
   * 
   * @param {string} timesheetId - UUID of timesheet to approve
   * @param {string} approverId - UUID of approving user
   * @param {string} comments - Optional approval comments
   * @returns {Promise<Object>} Approved timesheet
   * @throws {NotFoundError} If timesheet not found
   * @throws {ValidationError} If not in Submitted status
   * @throws {ForbiddenError} If user lacks permission
   */
  async approveSingleTimesheet(timesheetId, approverId, comments = null) {
    const timesheet = await this.Timesheet.findByPk(timesheetId, {
      include: [
        { model: this.Employee, as: 'employee', attributes: ['id', 'managerId'] }
      ]
    });

    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'Submitted') {
      throw new ValidationError(`Cannot approve timesheet with status: ${timesheet.status}`);
    }

    // Check permission
    await this.checkApprovalPermission(timesheet, approverId);

    // Approve
    await timesheet.update({
      status: 'Approved',
      approvedBy: approverId,
      approvedAt: new Date(),
      approverComments: comments || timesheet.approverComments
    });

    // Log approval
    await this.logApprovalAction(
      timesheetId,
      approverId,
      'APPROVED',
      comments
    );

    return timesheet;
  }

  /**
   * Reject a single timesheet
   * 
   * @param {string} timesheetId - UUID of timesheet to reject
   * @param {string} approverId - UUID of rejecting user
   * @param {string} rejectionReason - Required reason for rejection
   * @returns {Promise<Object>} Rejected timesheet
   * @throws {ValidationError} If rejection reason missing
   */
  async rejectSingleTimesheet(timesheetId, approverId, rejectionReason) {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    const timesheet = await this.Timesheet.findByPk(timesheetId, {
      include: [
        { model: this.Employee, as: 'employee', attributes: ['id', 'managerId'] }
      ]
    });

    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'Submitted') {
      throw new ValidationError(`Cannot reject timesheet with status: ${timesheet.status}`);
    }

    // Check permission
    await this.checkApprovalPermission(timesheet, approverId);

    // Reject
    await timesheet.update({
      status: 'Rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      approverComments: rejectionReason
    });

    // Log rejection
    await this.logApprovalAction(
      timesheetId,
      approverId,
      'REJECTED',
      rejectionReason
    );

    return timesheet;
  }

  /**
   * Approve all submitted timesheets for a week (PRIMARY USE CASE)
   * 
   * Managers typically approve entire weeks at once for their team members.
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @param {string} approverId - UUID of approving manager
   * @param {string} comments - Optional approval comments
   * @returns {Promise<Object>} Approval result
   */
  async approveWeekTimesheets(employeeId, weekStartDate, approverId, comments = null) {
    const weekStart = moment(weekStartDate).format('YYYY-MM-DD');
    
    // Find all submitted timesheets for this week
    const submittedTimesheets = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: weekStart,
        status: 'Submitted'
      },
      include: [
        { model: this.Employee, as: 'employee', attributes: ['id', 'managerId'] }
      ]
    });

    if (submittedTimesheets.length === 0) {
      throw new ValidationError('No submitted timesheets found for this week');
    }

    // Check permission on first timesheet (all should have same employee)
    await this.checkApprovalPermission(submittedTimesheets[0], approverId);

    const transaction = await this.sequelize.transaction();
    
    try {
      const approvedAt = new Date();
      const approvedTimesheets = [];

      for (const timesheet of submittedTimesheets) {
        await timesheet.update({
          status: 'Approved',
          approvedBy: approverId,
          approvedAt,
          comments: comments || timesheet.comments
        }, { transaction });

        approvedTimesheets.push(timesheet);

        await this.logApprovalAction(
          timesheet.id,
          approverId,
          'APPROVED',
          `Week approval: ${weekStart}`,
          transaction
        );
      }

      await transaction.commit();

      return {
        success: true,
        weekStartDate: weekStart,
        approvedCount: approvedTimesheets.length,
        timesheets: approvedTimesheets
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reject all submitted timesheets for a week
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @param {string} approverId - UUID of rejecting manager
   * @param {string} rejectionReason - Required reason for rejection
   * @returns {Promise<Object>} Rejection result
   */
  async rejectWeekTimesheets(employeeId, weekStartDate, approverId, rejectionReason) {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    const weekStart = moment(weekStartDate).format('YYYY-MM-DD');
    
    const submittedTimesheets = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: weekStart,
        status: 'Submitted'
      },
      include: [
        { model: this.Employee, as: 'employee', attributes: ['id', 'managerId'] }
      ]
    });

    if (submittedTimesheets.length === 0) {
      throw new ValidationError('No submitted timesheets found for this week');
    }

    await this.checkApprovalPermission(submittedTimesheets[0], approverId);

    const transaction = await this.sequelize.transaction();
    
    try {
      const rejectedAt = new Date();
      const rejectedTimesheets = [];

      for (const timesheet of submittedTimesheets) {
        await timesheet.update({
          status: 'Rejected',
          approvedBy: approverId,
          approvedAt: rejectedAt,
          comments: rejectionReason
        }, { transaction });

        rejectedTimesheets.push(timesheet);

        await this.logApprovalAction(
          timesheet.id,
          approverId,
          'REJECTED',
          `Week rejection: ${rejectionReason}`,
          transaction
        );
      }

      await transaction.commit();

      return {
        success: true,
        weekStartDate: weekStart,
        rejectedCount: rejectedTimesheets.length,
        timesheets: rejectedTimesheets
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Bulk approve multiple specific timesheets
   * 
   * @param {string[]} timesheetIds - Array of timesheet UUIDs
   * @param {string} approverId - UUID of approving user
   * @param {string} comments - Optional approval comments
   * @returns {Promise<Object>} Approval result
   */
  async bulkApproveTimesheets(timesheetIds, approverId, comments = null) {
    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      throw new ValidationError('Timesheet IDs array cannot be empty');
    }

    const timesheets = await this.Timesheet.findAll({
      where: { id: timesheetIds },
      include: [
        { model: this.Employee, as: 'employee', attributes: ['id', 'managerId'] }
      ]
    });

    if (timesheets.length !== timesheetIds.length) {
      throw new NotFoundError('One or more timesheets not found');
    }

    const transaction = await this.sequelize.transaction();
    
    try {
      const approvedAt = new Date();
      const results = [];

      for (const timesheet of timesheets) {
        try {
          await this.checkApprovalPermission(timesheet, approverId);
          
          if (timesheet.status !== 'Submitted') {
            results.push({
              id: timesheet.id,
              success: false,
              error: `Invalid status: ${timesheet.status}`
            });
            continue;
          }

          await timesheet.update({
            status: 'Approved',
            approvedBy: approverId,
            approvedAt,
            comments: comments || timesheet.comments
          }, { transaction });

          await this.logApprovalAction(
            timesheet.id,
            approverId,
            'APPROVED',
            comments,
            transaction
          );

          results.push({ id: timesheet.id, success: true });
        } catch (error) {
          results.push({ id: timesheet.id, success: false, error: error.message });
        }
      }

      await transaction.commit();

      const successCount = results.filter(r => r.success).length;
      return {
        success: true,
        totalCount: timesheetIds.length,
        approvedCount: successCount,
        failureCount: timesheetIds.length - successCount,
        results
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Bulk reject multiple specific timesheets
   * 
   * @param {string[]} timesheetIds - Array of timesheet UUIDs
   * @param {string} approverId - UUID of rejecting user
   * @param {string} rejectionReason - Required reason for rejection
   * @returns {Promise<Object>} Rejection result
   */
  async bulkRejectTimesheets(timesheetIds, approverId, rejectionReason) {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      throw new ValidationError('Timesheet IDs array cannot be empty');
    }

    const timesheets = await this.Timesheet.findAll({
      where: { id: timesheetIds },
      include: [
        { model: this.Employee, as: 'employee', attributes: ['id', 'managerId'] }
      ]
    });

    if (timesheets.length !== timesheetIds.length) {
      throw new NotFoundError('One or more timesheets not found');
    }

    const transaction = await this.sequelize.transaction();
    
    try {
      const rejectedAt = new Date();
      const results = [];

      for (const timesheet of timesheets) {
        try {
          await this.checkApprovalPermission(timesheet, approverId);
          
          if (timesheet.status !== 'Submitted') {
            results.push({
              id: timesheet.id,
              success: false,
              error: `Invalid status: ${timesheet.status}`
            });
            continue;
          }

          await timesheet.update({
            status: 'Rejected',
            approvedBy: approverId,
            approvedAt: rejectedAt,
            comments: rejectionReason
          }, { transaction });

          await this.logApprovalAction(
            timesheet.id,
            approverId,
            'REJECTED',
            rejectionReason,
            transaction
          );

          results.push({ id: timesheet.id, success: true });
        } catch (error) {
          results.push({ id: timesheet.id, success: false, error: error.message });
        }
      }

      await transaction.commit();

      const successCount = results.filter(r => r.success).length;
      return {
        success: true,
        totalCount: timesheetIds.length,
        rejectedCount: successCount,
        failureCount: timesheetIds.length - successCount,
        results
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check if user has permission to approve/reject timesheet
   * 
   * Rules:
   * - Admin/HR can approve any timesheet
   * - Manager can approve their direct reports' timesheets
   * - Employees cannot approve their own timesheets
   * 
   * @param {Object} timesheet - Timesheet instance with employee relation
   * @param {string} approverId - UUID of user attempting approval
   * @throws {ForbiddenError} If user lacks permission
   */
  async checkApprovalPermission(timesheet, approverId) {
    // Get approver (approverId is the Employee ID)
    const approver = await this.Employee.findByPk(approverId, {
      include: [{ model: this.sequelize.models.User, as: 'user', attributes: ['role'] }]
    });

    if (!approver || !approver.user) {
      throw new NotFoundError('Approver not found');
    }

    // Admin/HR can approve anything
    if (['admin', 'hr'].includes(approver.user.role)) {
      return true;
    }

    // Cannot approve own timesheet
    if (timesheet.employeeId === approverId) {
      throw new ForbiddenError('Cannot approve your own timesheet');
    }

    // Manager can approve their direct reports
    if (timesheet.employee && timesheet.employee.managerId === approverId) {
      return true;
    }

    throw new ForbiddenError('You do not have permission to approve this timesheet');
  }

  /**
   * Get pending timesheets for approval (manager view)
   * 
   * @param {string} managerId - UUID of manager
   * @returns {Promise<Array>} Submitted timesheets for team
   */
  async getPendingTimesheetsForManager(managerId) {
    // Get manager's team members
    const teamMembers = await this.Employee.findAll({
      where: { managerId },
      attributes: ['id']
    });

    const teamMemberIds = teamMembers.map(emp => emp.id);

    return await this.Timesheet.findAll({
      where: {
        employeeId: teamMemberIds,
        status: 'Submitted'
      },
      include: [
        { model: this.Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'employeeId'] },
        { model: this.Project, as: 'project', attributes: ['id', 'name'] },
        { model: this.Task, as: 'task', attributes: ['id', 'name'] }
      ],
      order: [['weekStartDate', 'DESC'], ['createdAt', 'ASC']]
    });
  }

  /**
   * Get pending timesheets grouped by employee and week
   * 
   * @param {string} managerId - UUID of manager
   * @returns {Promise<Array>} Grouped pending submissions
   */
  async getPendingTimesheetsGroupedByWeek(managerId) {
    const pendingTimesheets = await this.getPendingTimesheetsForManager(managerId);
    
    // Group by employee and week
    const grouped = {};
    
    for (const timesheet of pendingTimesheets) {
      const weekStart = timesheet.weekStartDate;
      const key = `${timesheet.employeeId}_${weekStart}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          employeeId: timesheet.employeeId,
          employeeName: `${timesheet.employee.firstName} ${timesheet.employee.lastName}`,
          employeeCode: timesheet.employee.employeeId,
          weekStartDate: weekStart,
          weekEndDate: moment(weekStart).endOf('isoWeek').format('YYYY-MM-DD'),
          timesheets: [],
          totalHours: 0
        };
      }
      
      grouped[key].timesheets.push(timesheet);
      grouped[key].totalHours += parseFloat(timesheet.totalHoursWorked || 0);
    }
    
    return Object.values(grouped);
  }

  /**
   * Get approval statistics for a manager
   * 
   * @param {string} managerId - UUID of manager
   * @param {string} startDate - Optional start date filter
   * @param {string} endDate - Optional end date filter
   * @returns {Promise<Object>} Approval statistics
   */
  async getApprovalStatistics(managerId, startDate = null, endDate = null) {
    // Get team members
    const teamMembers = await this.Employee.findAll({
      where: { managerId },
      attributes: ['id']
    });

    const teamMemberIds = teamMembers.map(emp => emp.id);

    const where = { employeeId: teamMemberIds };
    
    if (startDate && endDate) {
      where.weekStartDate = {
        [this.sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }

    // Count by status
    const [pending, approved, rejected] = await Promise.all([
      this.Timesheet.count({ where: { ...where, status: 'Submitted' } }),
      this.Timesheet.count({ where: { ...where, status: 'Approved' } }),
      this.Timesheet.count({ where: { ...where, status: 'Rejected' } })
    ]);

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected
    };
  }

  /**
   * Log approval/rejection action to audit trail
   * 
   * @param {string} timesheetId - UUID of timesheet
   * @param {string} approverId - UUID of approver
   * @param {string} action - 'APPROVED' or 'REJECTED'
   * @param {string} comments - Optional comments
   * @param {Object} transaction - Optional Sequelize transaction
   * @returns {Promise<Object>} Audit log entry
   */
  async logApprovalAction(timesheetId, approverId, action, comments = null, transaction = null) {
    const auditData = {
      userId: approverId,
      action: `TIMESHEET_${action}`,
      entityType: 'Timesheet',
      entityId: timesheetId,
      details: JSON.stringify({
        action,
        comments,
        timestamp: new Date().toISOString()
      })
    };

    if (transaction) {
      return await this.AuditLog.create(auditData, { transaction });
    }
    return await this.AuditLog.create(auditData);
  }
}

module.exports = TimesheetApprovalService;
