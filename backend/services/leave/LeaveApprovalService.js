const { Op } = require('sequelize');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError, 
  ForbiddenError 
} = require('../../utils/errors');

/**
 * LeaveApprovalService
 * 
 * Handles leave request approval/rejection workflow:
 * - Approve/reject leave requests with permissions
 * - Handle cancellation request approvals
 * - Automatic balance adjustments
 * - Manager team queries
 * - Pending requests for managers
 */
class LeaveApprovalService {
  constructor(db) {
    this.db = db;
    this.LeaveRequest = db.LeaveRequest;
    this.LeaveBalance = db.LeaveBalance;
    this.LeaveType = db.LeaveType;
    this.Employee = db.Employee;
    this.User = db.User;
    this.Department = db.Department;
    this.sequelize = db.sequelize;
  }

  /**
   * Check if user has permission to approve/reject a leave request
   * @param {LeaveRequest} leaveRequest - Leave request to check
   * @param {string} approverId - Approver's employee ID
   * @param {string} approverRole - Approver's role
   * @returns {Promise<boolean>}
   * @throws {ForbiddenError} If permission denied
   */
  async checkApprovalPermission(leaveRequest, approverId, approverRole) {
    // Admin and HR can approve any request
    if (['admin', 'hr'].includes(approverRole)) {
      return true;
    }

    // Prevent self-approval
    if (leaveRequest.employeeId === approverId) {
      throw new ForbiddenError('You cannot approve your own leave request.');
    }

    // Managers can only approve their direct reports' requests
    if (approverRole === 'manager') {
      const employee = await this.Employee.findByPk(leaveRequest.employeeId);
      if (!employee || employee.managerId !== approverId) {
        throw new ForbiddenError('You can only approve leave requests for your team members.');
      }
      return true;
    }

    throw new ForbiddenError('You do not have permission to approve leave requests.');
  }

  /**
   * Approve a leave request
   * @param {string} leaveRequestId - Leave request UUID
   * @param {string} approverId - Approver's employee ID
   * @param {string} approverRole - Approver's role
   * @param {string} comments - Approval comments
   * @returns {Promise<LeaveRequest>}
   */
  async approveLeaveRequest(leaveRequestId, approverId, approverRole, comments = '') {
    const transaction = await this.sequelize.transaction();
    try {
      // Fetch leave request
      const leaveRequest = await this.LeaveRequest.findByPk(leaveRequestId, {
        include: [
          {
            model: this.Employee,
            as: 'employee',
            attributes: ['id', 'managerId']
          }
        ],
        transaction
      });

      if (!leaveRequest) {
        throw new NotFoundError('Leave request not found.');
      }

      // Check if request is in pending status
      if (leaveRequest.status !== 'Pending') {
        throw new BadRequestError('Leave request is not in pending status.');
      }

      // Permission check
      await this.checkApprovalPermission(leaveRequest, approverId, approverRole);

      // HANDLE CANCELLATION REQUEST APPROVAL
      if (leaveRequest.isCancellation) {
        await this.approveCancellationRequest(leaveRequest, approverId, transaction);
        await transaction.commit();
        return leaveRequest;
      }

      // Update leave request status
      leaveRequest.status = 'Approved';
      leaveRequest.approvedBy = approverId;
      leaveRequest.approvedAt = new Date();
      leaveRequest.approverComments = comments;
      await leaveRequest.save({ transaction });

      // If normal leave approval, move from pending to taken
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
          const days = parseFloat(leaveRequest.totalDays);
          leaveBalance.totalPending = parseFloat(leaveBalance.totalPending) - days;
          leaveBalance.totalTaken = parseFloat(leaveBalance.totalTaken) + days;
          await leaveBalance.save({ transaction });
        }
      }

      await transaction.commit();
      return leaveRequest;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Approve a cancellation request (cancels original leave and restores balance)
   * @param {LeaveRequest} cancellationRequest - Cancellation request to approve
   * @param {string} approverId - Approver's employee ID
   * @param {Transaction} transaction - Sequelize transaction
   * @private
   */
  async approveCancellationRequest(cancellationRequest, approverId, transaction) {
    // Mark the cancellation request itself as approved
    cancellationRequest.status = 'Approved';
    cancellationRequest.approvedBy = approverId;
    cancellationRequest.approvedAt = new Date();
    await cancellationRequest.save({ transaction });

    // Cancel the original leave request
    const originalRequest = await this.LeaveRequest.findByPk(
      cancellationRequest.originalLeaveRequestId,
      { transaction }
    );

    if (originalRequest) {
      // Save original status before changing it
      const originalStatus = originalRequest.status;
      
      originalRequest.status = 'Cancelled';
      originalRequest.cancelledAt = new Date();
      await originalRequest.save({ transaction });

      // Restore leave balance
      const year = new Date(originalRequest.startDate).getFullYear();
      const leaveBalance = await this.LeaveBalance.findOne({
        where: {
          employeeId: originalRequest.employeeId,
          leaveTypeId: originalRequest.leaveTypeId,
          year: year
        },
        transaction
      });

      if (leaveBalance) {
        // Restore the balance based on original request's status
        const days = parseFloat(originalRequest.totalDays);
        if (originalStatus === 'Approved') {
          // Was taken, restore from totalTaken
          leaveBalance.totalTaken = parseFloat(leaveBalance.totalTaken) - days;
          leaveBalance.balance = parseFloat(leaveBalance.balance) + days;
        } else if (originalStatus === 'Pending') {
          // Was pending, restore from totalPending
          leaveBalance.totalPending = parseFloat(leaveBalance.totalPending) - days;
          leaveBalance.balance = parseFloat(leaveBalance.balance) + days;
        }
        await leaveBalance.save({ transaction });
      }
    }
  }

  /**
   * Reject a leave request
   * @param {string} leaveRequestId - Leave request UUID
   * @param {string} approverId - Approver's employee ID
   * @param {string} approverRole - Approver's role
   * @param {string} comments - Rejection reason (required)
   * @returns {Promise<LeaveRequest>}
   */
  async rejectLeaveRequest(leaveRequestId, approverId, approverRole, comments) {
    if (!comments || comments.trim().length === 0) {
      throw new BadRequestError('Rejection reason is required.');
    }

    const transaction = await this.sequelize.transaction();
    try {
      // Fetch leave request
      const leaveRequest = await this.LeaveRequest.findByPk(leaveRequestId, {
        include: [
          {
            model: this.Employee,
            as: 'employee',
            attributes: ['id', 'managerId']
          }
        ],
        transaction
      });

      if (!leaveRequest) {
        throw new NotFoundError('Leave request not found.');
      }

      // Check if request is in pending status
      if (leaveRequest.status !== 'Pending') {
        throw new BadRequestError('Leave request is not in pending status.');
      }

      // Permission check
      await this.checkApprovalPermission(leaveRequest, approverId, approverRole);

      // Update leave request status
      leaveRequest.status = 'Rejected';
      leaveRequest.approvedBy = approverId;
      leaveRequest.rejectedAt = new Date();
      leaveRequest.approverComments = comments;
      await leaveRequest.save({ transaction });

      // Restore leave balance (move from pending back to available)
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
          const days = parseFloat(leaveRequest.totalDays);
          leaveBalance.totalPending = parseFloat(leaveBalance.totalPending) - days;
          leaveBalance.balance = parseFloat(leaveBalance.balance) + days;
          await leaveBalance.save({ transaction });
        }
      }

      await transaction.commit();
      return leaveRequest;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update leave request status (generic approve/reject)
   * @param {string} leaveRequestId - Leave request UUID
   * @param {string} status - New status (Approved/Rejected)
   * @param {string} approverId - Approver's employee ID
   * @param {string} approverRole - Approver's role
   * @param {string} comments - Approver comments
   * @returns {Promise<LeaveRequest>}
   */
  async updateLeaveStatus(leaveRequestId, status, approverId, approverRole, comments = '') {
    if (status === 'Approved') {
      return await this.approveLeaveRequest(leaveRequestId, approverId, approverRole, comments);
    } else if (status === 'Rejected') {
      return await this.rejectLeaveRequest(leaveRequestId, approverId, approverRole, comments);
    } else {
      throw new BadRequestError('Invalid status. Use "Approved" or "Rejected".');
    }
  }

  /**
   * Get pending leave requests for a manager's team
   * @param {string} managerId - Manager's employee ID
   * @param {string} userRole - User's role (for permission check)
   * @returns {Promise<LeaveRequest[]>}
   */
  async getPendingLeaveRequestsForManager(managerId, userRole) {
    // Get team members for this manager
    const teamMembers = await this.Employee.findAll({
      where: { managerId: managerId },
      attributes: ['id']
    });
    const teamMemberIds = teamMembers.map(e => e.id);

    if (teamMemberIds.length === 0) {
      return [];
    }

    // Get pending leave requests for team members
    const pendingLeaves = await this.LeaveRequest.findAll({
      where: {
        employeeId: { [Op.in]: teamMemberIds },
        status: 'Pending'
      },
      include: [
        {
          model: this.Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId']
        },
        {
          model: this.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name', 'maxDaysPerYear']
        },
        {
          model: this.LeaveRequest,
          as: 'originalLeaveRequest',
          attributes: ['id', 'startDate', 'endDate', 'status'],
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return pendingLeaves;
  }

  /**
   * Get all pending leave requests (role-based)
   * @param {string} userId - Current user's employee ID
   * @param {string} userRole - Current user's role
   * @returns {Promise<LeaveRequest[]>}
   */
  async getAllPendingLeaveRequests(userId, userRole) {
    let whereClause = { status: 'Pending' };

    // For managers, only show team member requests
    if (userRole === 'manager') {
      const subordinates = await this.Employee.findAll({
        where: { managerId: userId },
        attributes: ['id']
      });
      const subordinateIds = subordinates.map(e => e.id);
      whereClause.employeeId = { [Op.in]: subordinateIds };
    }
    // Admin and HR see all pending requests (no additional filter)

    const pendingLeaves = await this.LeaveRequest.findAll({
      where: whereClause,
      include: [
        {
          model: this.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email'],
          include: [
            {
              model: this.Department,
              as: 'department',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: this.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name', 'description', 'maxDaysPerYear']
        },
        {
          model: this.LeaveRequest,
          as: 'originalLeaveRequest',
          attributes: ['id', 'startDate', 'endDate', 'status'],
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return pendingLeaves;
  }

  /**
   * Get recent approvals (for manager dashboard)
   * @param {string} managerId - Manager's employee ID
   * @param {string} userRole - User's role
   * @param {number} limit - Number of records to return
   * @returns {Promise<LeaveRequest[]>}
   */
  async getRecentApprovals(managerId, userRole, limit = 10) {
    let whereClause = {
      status: { [Op.in]: ['Approved', 'Rejected'] },
      approvedBy: managerId
    };

    // Admin/HR can see all recent approvals
    if (['admin', 'hr'].includes(userRole)) {
      delete whereClause.approvedBy;
    }

    const recentApprovals = await this.LeaveRequest.findAll({
      where: whereClause,
      include: [
        {
          model: this.Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId']
        },
        {
          model: this.LeaveType,
          as: 'leaveType',
          attributes: ['id', 'name']
        },
        {
          model: this.Employee,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [['approvedAt', 'DESC']],
      limit: parseInt(limit)
    });

    return recentApprovals;
  }

  /**
   * Get approval statistics for manager
   * @param {string} managerId - Manager's employee ID
   * @param {string} userRole - User's role
   * @returns {Promise<Object>} Statistics object
   */
  async getApprovalStatistics(managerId, userRole) {
    let whereClause = {};

    // For managers, only count their team's requests
    if (userRole === 'manager') {
      const subordinates = await this.Employee.findAll({
        where: { managerId: managerId },
        attributes: ['id']
      });
      const subordinateIds = subordinates.map(e => e.id);
      whereClause.employeeId = { [Op.in]: subordinateIds };
    }
    // Admin/HR see all

    const [pending, approved, rejected] = await Promise.all([
      this.LeaveRequest.count({
        where: { ...whereClause, status: 'Pending' }
      }),
      this.LeaveRequest.count({
        where: { ...whereClause, status: 'Approved' }
      }),
      this.LeaveRequest.count({
        where: { ...whereClause, status: 'Rejected' }
      })
    ]);

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected
    };
  }
}

module.exports = LeaveApprovalService;
