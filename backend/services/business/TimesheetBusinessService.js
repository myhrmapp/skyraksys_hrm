/**
 * Timesheet Business Service
 * Business logic layer for timesheet operations
 * 
 * Responsibilities:
 * - Enforce business rules (draft→submitted→approved, hours validation)
 * - RBAC (employees own timesheets, managers approve)
 * - Validation (date ranges, project/task existence, hours)
 * - Workflow transitions (submit, approve, reject)
 * 
 * @module services/business/TimesheetBusinessService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07
 */

const BaseBusinessService = require('./BaseBusinessService');
const { ValidationError, NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const db = require('../../models');

class TimesheetBusinessService extends BaseBusinessService {
  constructor(timesheetDataService, employeeDataService) {
    super();
    this.timesheetDataService = timesheetDataService;
    this.employeeDataService = employeeDataService;
  }

  /**
   * Create time entry
   * 
   * Business Rules:
   * - Employee must exist
   * - Project and task must exist if specified
   * - Hours must be positive and <= 24
   * - Date cannot be in future
   * - Entry defaults to Draft status
   * 
   * @param {Object} data - Time entry data
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Created time entry with details
   */
  async createTimeEntry(data, currentUser) {
    this.log('createTimeEntry', { employeeId: data.employeeId, projectId: data.projectId });

    // RBAC: Employees can only create for themselves
    if (currentUser.role === 'employee') {
      if (!currentUser.employee?.id) {
        throw new ForbiddenError('Employee record not found');
      }
      data.employeeId = currentUser.employee.id;
    }
    // Admin/HR must specify employeeId
    else if (!data.employeeId) {
      throw new BadRequestError('employeeId is required');
    }

    // Validate business rules
    await this.validateTimeEntry(data);

    // Default status to Draft
    if (!data.status) {
      data.status = 'Draft';
    }

    // Compute derived fields for weekly model
    if (data.weekStartDate) {
      const weekStartDate = new Date(data.weekStartDate);
      if (!data.weekNumber) {
        data.weekNumber = this.getWeekNumber(weekStartDate);
      }
      if (!data.year) {
        data.year = weekStartDate.getFullYear();
      }
    }

    // Map totalHours (API field) to totalHoursWorked (model field)
    if (data.totalHours !== undefined && data.totalHoursWorked === undefined) {
      data.totalHoursWorked = data.totalHours;
    }
    // Compute/validate totalHoursWorked against daily hours
    const dayColumns = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
    const dailySum = dayColumns.reduce((sum, col) => sum + parseFloat(data[col] || 0), 0);
    const computedTotal = Number(dailySum.toFixed(2));

    if (!data.totalHoursWorked) {
      if (computedTotal > 0) {
        data.totalHoursWorked = computedTotal;
      }
    } else if (computedTotal > 0 && Math.abs(parseFloat(data.totalHoursWorked) - computedTotal) > 0.01) {
      throw new BadRequestError(
        `Total hours (${data.totalHoursWorked}) does not match sum of daily hours (${computedTotal})`
      );
    }

    // Create entry
    const timeEntry = await this.timesheetDataService.create(data);

    this.log('createTimeEntry:success', { id: timeEntry.id });
    return this.timesheetDataService.findByIdWithDetails(timeEntry.id);
  }

  /**
   * Get Monday of the week for a given date
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * Get Sunday of the week for a given date
   */
  getWeekEnd(date) {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  }

  /**
   * Get ISO week number for a given date
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Update time entry
   * 
   * Business Rules:
   * - Can only update Draft timesheets
   * - Employees can only update own entries
   * - Admins can update any
   * 
   * @param {string} id - Time entry ID
   * @param {Object} data - Update data
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Updated time entry
   */
  async updateTimeEntry(id, data, currentUser) {
    this.log('updateTimeEntry', { id });

    const timeEntry = await this.timesheetDataService.findById(id);

    if (!timeEntry) {
      throw new NotFoundError('Timesheet entry not found');
    }

    // RBAC: Employees can only update own Draft entries
    if (currentUser.role === 'employee') {
      if (!currentUser.employee?.id) {
        throw new ForbiddenError('Employee record not found');
      }
      if (timeEntry.employeeId !== currentUser.employee.id) {
        throw new ForbiddenError('You can only update your own timesheets');
      }
      if (timeEntry.status !== 'Draft') {
        throw new BadRequestError('Can only update draft timesheets');
      }
    }

    // Validate if critical fields changed
    const dayColumns = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
    const hasDayChange = dayColumns.some(col => data[col] !== undefined);
    if (hasDayChange || data.weekStartDate || data.weekEndDate || data.projectId || data.taskId) {
      await this.validateTimeEntry({ ...timeEntry.dataValues, ...data });
    }

    // Recalculate totalHoursWorked when daily hours are updated
    if (hasDayChange) {
      const merged = { ...timeEntry.dataValues, ...data };
      const dailySum = dayColumns.reduce((sum, col) => sum + parseFloat(merged[col] || 0), 0);
      data.totalHoursWorked = Number(dailySum.toFixed(2));
    }

    // Validate totalHoursWorked if explicitly provided with daily hours
    if (data.totalHoursWorked !== undefined && !hasDayChange) {
      const merged = { ...timeEntry.dataValues, ...data };
      const dailySum = dayColumns.reduce((sum, col) => sum + parseFloat(merged[col] || 0), 0);
      const computedTotal = Number(dailySum.toFixed(2));
      if (computedTotal > 0 && Math.abs(parseFloat(data.totalHoursWorked) - computedTotal) > 0.01) {
        throw new BadRequestError(
          `Total hours (${data.totalHoursWorked}) does not match sum of daily hours (${computedTotal})`
        );
      }
    }

    await this.timesheetDataService.update(id, data);

    this.log('updateTimeEntry:success', { id });
    return this.timesheetDataService.findByIdWithDetails(id);
  }

  /**
   * Submit timesheet for approval
   * 
   * Business Rules:
   * - Only Draft timesheets can be submitted
   * - Employees submit own, admins can submit any
   * 
   * @param {string} id - Time entry ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Submitted timesheet
   */
  async submitTimesheet(id, currentUser) {
    this.log('submitTimesheet', { id });

    const timeEntry = await this.timesheetDataService.findById(id);

    if (!timeEntry) {
      throw new NotFoundError('Timesheet entry not found');
    }

    // RBAC: Employees submit own, admins/HR can submit any
    if (currentUser.role === 'employee') {
      if (!currentUser.employee?.id) {
        throw new ForbiddenError('Employee record not found');
      }
      if (timeEntry.employeeId !== currentUser.employee.id) {
        throw new ForbiddenError('You can only submit your own timesheets');
      }
    }

    if (timeEntry.status !== 'Draft') {
      throw new BadRequestError('Can only submit draft timesheets');
    }

    await this.timesheetDataService.update(id, { 
      status: 'Submitted',
      submittedAt: new Date()
    });

    this.log('submitTimesheet:success', { id });
    return this.timesheetDataService.findByIdWithDetails(id);
  }

  /**
   * Submit all timesheets for a week
   * 
   * Business Rules:
   * - Only Draft timesheets can be submitted
   * - All timesheets for the week must belong to the employee
   * 
   * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
   * @param {Object} currentUser - Current user
   * @returns {Promise<Array>} Submitted timesheets
   */
  async submitWeeklyTimesheets(weekStartDate, currentUser) {
    this.log('submitWeeklyTimesheets', { weekStartDate });

    if (!currentUser.employee?.id) {
      throw new ForbiddenError('Employee record not found');
    }

    const employeeId = currentUser.employee.id;

    // Find all draft timesheets for this week (date range query)
    const result = await this.timesheetDataService.findByWeek(weekStartDate, {
      where: {
        employeeId,
        status: 'Draft'
      },
      limit: 1000 // Get all timesheets for the week
    });

    const timesheets = result.data || [];

    if (!timesheets || timesheets.length === 0) {
      throw new NotFoundError('No draft timesheets found for this week');
    }

    // Submit all timesheets
    const updatePromises = timesheets.map(timesheet =>
      this.timesheetDataService.update(timesheet.id, {
        status: 'Submitted',
        submittedAt: new Date()
      })
    );

    await Promise.all(updatePromises);

    this.log('submitWeeklyTimesheets:success', { weekStartDate, count: timesheets.length });
    
    // Return updated timesheets (date range query)
    const updatedResult = await this.timesheetDataService.findByWeek(weekStartDate, {
      where: { employeeId },
      limit: 1000
    });

    return updatedResult.data || [];
  }

  /**
   * Approve timesheet
   * 
   * Business Rules:
   * - Only Submitted timesheets can be approved
   * - Only managers, HR, or admins can approve
   * 
   * @param {string} id - Time entry ID
   * @param {Object} currentUser - Current user
   * @param {string} comments - Approval comments
   * @returns {Promise<Object>} Approved timesheet
   */
  async approveTimesheet(id, currentUser, comments = '') {
    this.log('approveTimesheet', { id });

    // RBAC: Only managers, HR, or admins can approve
    if (!['manager', 'admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only managers, HR, or admins can approve timesheets');
    }

    const timeEntry = await this.timesheetDataService.findById(id);

    if (!timeEntry) {
      throw new NotFoundError('Timesheet entry not found');
    }

    if (timeEntry.status !== 'Submitted') {
      throw new BadRequestError('Can only approve submitted timesheets');
    }

    const approverId = currentUser.employee?.id || currentUser.id;

    await this.timesheetDataService.update(id, {
      status: 'Approved',
      approvedBy: approverId,
      approvedAt: new Date(),
      approverComments: comments
    });

    this.log('approveTimesheet:success', { id });
    return this.timesheetDataService.findByIdWithDetails(id);
  }

  /**
   * Reject timesheet
   * 
   * Business Rules:
   * - Only Submitted timesheets can be rejected
   * - Only managers, HR, or admins can reject
   * - Rejection comments are required
   * 
   * @param {string} id - Time entry ID
   * @param {Object} currentUser - Current user
   * @param {string} comments - Rejection reason
   * @returns {Promise<Object>} Rejected timesheet
   */
  async rejectTimesheet(id, currentUser, comments) {
    this.log('rejectTimesheet', { id });

    // RBAC: Only managers, HR, or admins can reject
    if (!['manager', 'admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only managers, HR, or admins can reject timesheets');
    }

    if (!comments || comments.trim() === '') {
      throw new BadRequestError('Rejection comments are required');
    }

    const timeEntry = await this.timesheetDataService.findById(id);

    if (!timeEntry) {
      throw new NotFoundError('Timesheet entry not found');
    }

    if (timeEntry.status !== 'Submitted') {
      throw new BadRequestError('Can only reject submitted timesheets');
    }

    const approverId = currentUser.employee?.id || currentUser.id;

    await this.timesheetDataService.update(id, {
      status: 'Rejected',
      approvedBy: approverId,
      rejectedAt: new Date(),
      approverComments: comments
    });

    this.log('rejectTimesheet:success', { id });
    return this.timesheetDataService.findByIdWithDetails(id);
  }

  /**
   * Delete timesheet entry
   * 
   * Business Rules:
   * - Employees can only delete their own Draft timesheets
   * - Admins can delete any timesheet
   * - Cannot delete Approved/Submitted timesheets (employees)
   * 
   * @param {string} id - Time entry ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<void>}
   */
  async deleteTimeEntry(id, currentUser) {
    this.log('deleteTimeEntry', { id });

    const timeEntry = await this.timesheetDataService.findById(id);

    if (!timeEntry) {
      throw new NotFoundError('Timesheet entry not found');
    }

    // RBAC: Employees can only delete own Draft entries
    if (currentUser.role === 'employee') {
      if (!currentUser.employee?.id) {
        throw new ForbiddenError('Employee record not found');
      }
      if (timeEntry.employeeId !== currentUser.employee.id) {
        throw new ForbiddenError('You can only delete your own timesheets');
      }
      if (timeEntry.status !== 'Draft') {
        throw new BadRequestError('Can only delete draft timesheets');
      }
    }

    await this.timesheetDataService.delete(id);

    this.log('deleteTimeEntry:success', { id });
  }

  /**
   * Validate time entry data (WEEKLY format)
   * @private
   */
  async validateTimeEntry(data) {
    // Required fields
    if (!data.employeeId) {
      throw new ValidationError('Employee ID is required');
    }

    if (!data.weekStartDate) {
      throw new ValidationError('Week start date is required');
    }

    if (!data.weekEndDate) {
      throw new ValidationError('Week end date is required');
    }

    // Validate at least one day has hours
    const dayColumns = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
    const hasAnyHours = dayColumns.some(day => data[day] && parseFloat(data[day]) > 0);
    if (!hasAnyHours) {
      throw new ValidationError('At least one day must have hours');
    }

    // Validate each day's hours
    for (const day of dayColumns) {
      if (data[day]) {
        const hours = parseFloat(data[day]);
        if (isNaN(hours) || hours < 0 || hours > 24) {
          throw new ValidationError(`${day} must be between 0 and 24`);
        }
      }
    }

    // Date validation - week cannot be in future
    const weekStart = new Date(data.weekStartDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (weekStart > today) {
      throw new ValidationError('Cannot create time entries for future weeks');
    }

    // Employee must exist
    const employee = await this.employeeDataService.findById(data.employeeId);
    if (!employee) {
      throw new ValidationError('Employee not found');
    }

    // Project must exist if specified
    if (data.projectId) {
      const project = await db.Project.findByPk(data.projectId);
      if (!project) {
        throw new ValidationError('Project not found');
      }
    }

    // Task must exist and belong to project if specified
    if (data.taskId) {
      const task = await db.Task.findByPk(data.taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }
      
      if (data.projectId && task.projectId !== data.projectId) {
        throw new ValidationError('Task does not belong to the specified project');
      }
    }

    return true;
  }
}

module.exports = TimesheetBusinessService;
