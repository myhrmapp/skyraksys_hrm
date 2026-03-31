const BaseService = require('./BaseService');
const db = require('../models');
const { LeaveRequest, LeaveType, Employee, User } = db;
const emailService = require('./email.service');
const logger = require('../utils/logger');

class LeaveService extends BaseService {
  constructor() {
    super(LeaveRequest);
  }

  async findAllWithDetails(options = {}) {
    const includeOptions = [
      {
        model: LeaveType,
        as: 'leaveType',
        attributes: ['id', 'name', 'maxDaysPerYear', 'description']
      },
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'role']
          }
        ]
      }
    ];

    return super.findAll({
      ...options,
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });
  }

  async findByIdWithDetails(id) {
    const includeOptions = [
      {
        model: LeaveType,
        as: 'leaveType',
        attributes: ['id', 'name', 'maxDaysPerYear', 'description']
      },
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'role']
          }
        ]
      }
    ];

    // BaseService.findById expects include array as second parameter
    return super.findById(id, includeOptions);
  }

  async findByEmployee(employeeId, options = {}) {
    return super.findAll({
      ...options,
      where: { employeeId }
    });
  }

  async findByStatus(status, options = {}) {
    return super.findAll({
      ...options,
      where: { status }
    });
  }

  async findByDateRange(startDate, endDate, options = {}) {
    const dateFilter = {
      [db.Sequelize.Op.or]: [
        {
          startDate: {
            [db.Sequelize.Op.between]: [startDate, endDate]
          }
        },
        {
          endDate: {
            [db.Sequelize.Op.between]: [startDate, endDate]
          }
        },
        {
          [db.Sequelize.Op.and]: [
            {
              startDate: {
                [db.Sequelize.Op.lte]: startDate
              }
            },
            {
              endDate: {
                [db.Sequelize.Op.gte]: endDate
              }
            }
          ]
        }
      ]
    };

    return super.findAll({
      ...options,
      where: {
        ...(options.where || {}),
        ...dateFilter
      }
    });
  }

  async createLeaveRequest(data) {
    // Validate leave request data
    const validation = await this.validateLeaveRequest(data);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // Calculate days
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    return super.create({
      ...data,
      totalDays: days,
      status: 'Pending'
    });
  }

  async approveLeaveRequest(id, approverId, comments = '') {
    const transaction = await db.sequelize.transaction();
    try {
      const leaveRequest = await this.findById(id);
      
      if (leaveRequest.status !== 'Pending') {
        throw new Error('Leave request is not in pending status');
      }

      // Check leave balance (again, inside transaction to ensure consistency)
      const leaveBalance = await db.LeaveBalance.findOne({
        where: { 
          employeeId: leaveRequest.employeeId, 
          leaveTypeId: leaveRequest.leaveTypeId 
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!leaveBalance) {
        throw new Error('Leave balance record not found');
      }

      if (leaveBalance.balance < leaveRequest.totalDays) {
        throw new Error(`Insufficient leave balance. Available: ${leaveBalance.balance}, Requested: ${leaveRequest.totalDays}`);
      }

      // Deduct Balance
      leaveBalance.totalTaken = Number(leaveBalance.totalTaken) + Number(leaveRequest.totalDays);
      leaveBalance.balance = Number(leaveBalance.balance) - Number(leaveRequest.totalDays);
      await leaveBalance.save({ transaction });

      // Update Request
      const updatedRequest = await super.update(id, {
        status: 'Approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        approverComments: comments
      }, { transaction });

      await transaction.commit();

      // Send email notification (fire-and-forget)
      this._sendLeaveNotification(leaveRequest, 'Approved', comments).catch(() => {});

      return updatedRequest;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async rejectLeaveRequest(id, approverId, comments) {
    const leaveRequest = await this.findById(id);
    
    if (leaveRequest.status !== 'Pending') {
      throw new Error('Leave request is not in pending status');
    }

    const result = await super.update(id, {
      status: 'Rejected',
      approvedBy: approverId,
      rejectedAt: new Date(),
      approverComments: comments
    });

    // Send email notification (fire-and-forget)
    this._sendLeaveNotification(leaveRequest, 'Rejected', comments).catch(() => {});

    return result;
  }

  async validateLeaveRequest(data) {
    const { employeeId, leaveTypeId, startDate, endDate } = data;

    // Check if employee exists
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return { isValid: false, message: 'Employee not found' };
    }

    // Check if leave type exists
    const leaveType = await LeaveType.findByPk(leaveTypeId);
    if (!leaveType) {
      return { isValid: false, message: 'Leave type not found' };
    }

    // Check date validity
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return { isValid: false, message: 'End date must be after start date' };
    }

    // Allow retroactive leave requests up to 14 days in the past
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setHours(0, 0, 0, 0);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    if (start < twoWeeksAgo) {
      return { isValid: false, message: 'Start date cannot be more than 2 weeks in the past' };
    }

    // Check for overlapping leaves
    const overlappingLeaves = await this.findByDateRange(startDate, endDate, {
      where: {
        employeeId,
        status: ['Approved', 'Pending']
      }
    });

    if (overlappingLeaves.data && overlappingLeaves.data.length > 0) {
      return { isValid: false, message: 'Leave request overlaps with existing leave' };
    }

    return { isValid: true };
  }

  async checkLeaveBalance(employeeId, leaveTypeId, requestedDays) {
    // Get leave balance for employee and leave type
    const leaveBalance = await db.LeaveBalance.findOne({
      where: { employeeId, leaveTypeId }
    });

    if (!leaveBalance) {
      return { isValid: false, message: 'Leave balance not found' };
    }

    if (leaveBalance.balance < requestedDays) {
      return { 
        isValid: false, 
        message: `Insufficient leave balance. Available: ${leaveBalance.balance}, Requested: ${requestedDays}` 
      };
    }

    return { isValid: true };
  }

  async getLeaveStats(employeeId, year = new Date().getFullYear()) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const leaves = await this.findByEmployee(employeeId, {
      where: {
        startDate: {
          [db.Sequelize.Op.between]: [startOfYear, endOfYear]
        }
      }
    });

    const stats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      days: {
        total: 0,
        approved: 0,
        pending: 0
      }
    };

    if (leaves.data) {
      leaves.data.forEach(leave => {
        stats.total++;
        stats.days.total += leave.totalDays || 0;

        switch (leave.status) {
          case 'Approved':
            stats.approved++;
            stats.days.approved += leave.totalDays || 0;
            break;
          case 'Pending':
            stats.pending++;
            stats.days.pending += leave.totalDays || 0;
            break;
          case 'Rejected':
            stats.rejected++;
            break;
        }
      });
    }

    return stats;
  }

  /**
   * Send leave status notification email to the employee (fire-and-forget)
   * @private
   */
  async _sendLeaveNotification(leaveRequest, newStatus, comments = '') {
    try {
      // Fetch employee with user email
      const employee = await Employee.findByPk(leaveRequest.employeeId, {
        include: [{ model: User, as: 'user', attributes: ['email'] }]
      });
      if (!employee?.user?.email) return;

      // Fetch leave type name
      const leaveType = leaveRequest.leaveTypeId 
        ? await LeaveType.findByPk(leaveRequest.leaveTypeId) 
        : null;

      await emailService.sendLeaveStatusEmail(
        employee.user.email,
        `${employee.firstName} ${employee.lastName}`,
        {
          leaveType: leaveType?.name || 'N/A',
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          totalDays: leaveRequest.totalDays,
          comments: comments || ''
        },
        newStatus
      );
    } catch (err) {
      logger.warn('Leave notification email failed:', { detail: err.message });
    }
  }
}

module.exports = new LeaveService();
