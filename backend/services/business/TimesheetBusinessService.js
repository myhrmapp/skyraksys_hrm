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
const { Op } = require('sequelize');
const { formatDateLocal } = require('../../utils/dateUtils');

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
    // Non-employee roles: auto-fill own employeeId when not specified
    else if (!data.employeeId) {
      if (currentUser.employee?.id) {
        data.employeeId = currentUser.employee.id;
      } else {
        throw new BadRequestError('employeeId is required');
      }
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

    // Upsert: check if an entry already exists for this unique key
    // (employeeId + weekStartDate + projectId + taskId)
    const weekStartStr = typeof data.weekStartDate === 'string'
      ? data.weekStartDate.split('T')[0]
      : formatDateLocal(new Date(data.weekStartDate));

    const existingEntry = await db.Timesheet.findOne({
      where: {
        employeeId: data.employeeId,
        weekStartDate: weekStartStr,
        ...(data.projectId ? { projectId: data.projectId } : { projectId: { [Op.is]: null } }),
        ...(data.taskId    ? { taskId:    data.taskId }    : { taskId:    { [Op.is]: null } }),
      }
    });

    let timeEntry;
    if (existingEntry) {
      // Allow updates only on Draft or Rejected timesheets; Submitted/Approved are locked
      if (['Submitted', 'Approved'].includes(existingEntry.status)) {
        throw new BadRequestError(
          `Cannot modify a ${existingEntry.status} timesheet. Please contact your manager.`
        );
      }
      // Update the existing draft/rejected entry
      const updateFields = { ...data };
      delete updateFields.employeeId; // never overwrite ownership
      await this.timesheetDataService.update(existingEntry.id, updateFields);
      this.log('createTimeEntry:updated', { id: existingEntry.id });
      timeEntry = existingEntry;
    } else {
      // No existing entry — create a new one
      timeEntry = await this.timesheetDataService.create(data);
    }

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

    // Recalculate totalHoursWorked BEFORE validateTimeEntry so the validator sees
    // the correct new total (not the stale value from the DB record)
    if (hasDayChange) {
      const merged = { ...timeEntry.dataValues, ...data };
      const dailySum = dayColumns.reduce((sum, col) => sum + parseFloat(merged[col] || 0), 0);
      data.totalHoursWorked = Number(dailySum.toFixed(2));
    }

    if (hasDayChange || data.weekStartDate || data.weekEndDate || data.projectId || data.taskId) {
      await this.validateTimeEntry({ ...timeEntry.dataValues, ...data });
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

    // Find all draft timesheets for this week for the employee (exact date match)
    const timesheets = await this.timesheetDataService.findAll({
      where: {
        employeeId,
        weekStartDate,
        status: 'Draft',
      },
    });

    const tsArray = Array.isArray(timesheets) ? timesheets : (timesheets?.data || []);

    if (!tsArray || tsArray.length === 0) {
      throw new NotFoundError('No draft timesheets found for this week');
    }

    // Single bulk UPDATE — fixes N+1 (was 2 queries × N timesheets)
    const ids = tsArray.map((t) => t.id);
    await db.Timesheet.update(
      { status: 'Submitted', submittedAt: new Date() },
      { where: { id: { [db.Sequelize.Op.in]: ids } } },
    );

    this.log('submitWeeklyTimesheets:success', { weekStartDate, count: ids.length });
    return { count: ids.length };
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

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  /**
   * Submit multiple timesheets by ID array.
   *
   * All IDs must belong to the authenticated employee and be in Draft status.
   *
   * @param {string[]} timesheetIds
   * @param {Object}   currentUser
   * @returns {Promise<{count: number}>}
   */
  async bulkSubmitTimesheets(timesheetIds, currentUser) {
    this.log('bulkSubmitTimesheets', { count: timesheetIds.length });

    const employeeId = currentUser.employee?.id || currentUser.employeeId || currentUser.id;
    if (!employeeId) {
      throw new ForbiddenError('Employee context is missing for timesheet submission');
    }

    const timesheets = await db.Timesheet.findAll({
      where: {
        id:         { [db.Sequelize.Op.in]: timesheetIds },
        employeeId,
        status:     'Draft',
      },
    });

    if (timesheets.length === 0) {
      throw new NotFoundError('No draft timesheets found');
    }

    await db.Timesheet.update(
      { status: 'Submitted', submittedAt: new Date() },
      { where: { id: { [db.Sequelize.Op.in]: timesheets.map((t) => t.id) } } },
    );

    this.log('bulkSubmitTimesheets:success', { count: timesheets.length });
    return { count: timesheets.length };
  }

  /**
   * Approve multiple submitted timesheets.
   *
   * @param {string[]} timesheetIds
   * @param {Object}   currentUser
   * @param {string}   [comments]
   * @returns {Promise<{count: number}>}
   */
  async bulkApproveTimesheets(timesheetIds, currentUser, comments = '') {
    this.log('bulkApproveTimesheets', { count: timesheetIds.length });

    if (!['manager', 'admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only managers, HR, or admins can approve timesheets');
    }

    const approverId = currentUser.employee?.id || currentUser.id;

    // C-02: Build team-scoped where clause for managers
    const where = { id: { [db.Sequelize.Op.in]: timesheetIds }, status: 'Submitted' };
    if (currentUser.role === 'manager') {
      const subordinates = await db.Employee.findAll({
        where: { managerId: approverId },
        attributes: ['id'],
      });
      const teamIds = subordinates.map((e) => e.id);
      if (teamIds.length === 0) {
        throw new ForbiddenError('You have no direct reports to approve for');
      }
      where.employeeId = { [db.Sequelize.Op.in]: teamIds };
    }

    const timesheets = await db.Timesheet.findAll({ where });

    if (timesheets.length === 0) {
      throw new NotFoundError('No submitted timesheets found in your team');
    }

    await db.Timesheet.update(
      {
        status:           'Approved',
        approvedBy:       approverId,
        approvedAt:       new Date(),
        approverComments: comments,
      },
      { where: { id: { [db.Sequelize.Op.in]: timesheets.map((t) => t.id) } } },
    );

    this.log('bulkApproveTimesheets:success', { count: timesheets.length });
    return { count: timesheets.length };
  }

  /**
   * Reject multiple submitted timesheets.
   *
   * @param {string[]} timesheetIds
   * @param {Object}   currentUser
   * @param {string}   comments  - Required by business rule
   * @returns {Promise<{count: number}>}
   */
  async bulkRejectTimesheets(timesheetIds, currentUser, comments) {
    this.log('bulkRejectTimesheets', { count: timesheetIds.length });

    if (!['manager', 'admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only managers, HR, or admins can reject timesheets');
    }

    if (!comments || !comments.trim()) {
      throw new BadRequestError('Rejection comments are required');
    }

    const rejectorId = currentUser.employee?.id || currentUser.id;

    // C-02: Build team-scoped where clause for managers
    const where = { id: { [db.Sequelize.Op.in]: timesheetIds }, status: 'Submitted' };
    if (currentUser.role === 'manager') {
      const subordinates = await db.Employee.findAll({
        where: { managerId: rejectorId },
        attributes: ['id'],
      });
      const teamIds = subordinates.map((e) => e.id);
      if (teamIds.length === 0) {
        throw new ForbiddenError('You have no direct reports to reject for');
      }
      where.employeeId = { [db.Sequelize.Op.in]: teamIds };
    }

    const timesheets = await db.Timesheet.findAll({ where });

    if (timesheets.length === 0) {
      throw new NotFoundError('No submitted timesheets found in your team');
    }

    await db.Timesheet.update(
      {
        status:           'Rejected',
        rejectedBy:       rejectorId,   // C-01: now writes to the correct column
        rejectedAt:       new Date(),
        approverComments: comments,
      },
      { where: { id: { [db.Sequelize.Op.in]: timesheets.map((t) => t.id) } } },
    );

    this.log('bulkRejectTimesheets:success', { count: timesheets.length });
    return { count: timesheets.length };
  }

  // --------------------------------------------------------------------------
  // Query / Stats helpers (C-03 — moved from inline controller handlers)
  // --------------------------------------------------------------------------

  /**
   * Get pending timesheets for approval, scoped to the requesting user's team.
   *
   * @param {Object} currentUser
   * @returns {Promise<Array>}
   */
  async getPendingApprovalsForUser(currentUser) {
    this.log('getPendingApprovalsForUser', { role: currentUser.role });

    const where = { status: 'Submitted' };

    if (currentUser.role === 'manager') {
      const managerId = currentUser.employee?.id || currentUser.employeeId;
      const subordinates = await db.Employee.findAll({
        where:      { managerId },
        attributes: ['id'],
      });
      where.employeeId = { [db.Sequelize.Op.in]: subordinates.map((e) => e.id) };
    }
    // Admin / HR see all submitted timesheets (no additional filter)

    return db.Timesheet.findAll({
      where,
      include: [
        { model: db.Employee, as: 'employee', attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email'] },
        { model: db.Project,  as: 'project',  attributes: ['id', 'name'] },
        { model: db.Task,     as: 'task',      attributes: ['id', 'name'] },
      ],
      order: [['weekStartDate', 'ASC']],
    });
  }

  /**
   * Get aggregated timesheet statistics, optionally scoped by role.
   *
   * @param {Object} currentUser
   * @param {Object} [filters] - { startDate, endDate }
   * @returns {Promise<Object>} summary
   */
  async getTimesheetStats(currentUser, filters = {}) {
    this.log('getTimesheetStats', { role: currentUser.role });

    const where = {};

    if (currentUser.role === 'employee') {
      where.employeeId = currentUser.employee?.id || currentUser.employeeId;
    }

    if (filters.startDate && filters.endDate) {
      where.weekStartDate = {
        [db.Sequelize.Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
      };
    }

    const rows = await db.Timesheet.findAll({
      where,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')),               'count'],
        [db.sequelize.fn('SUM',   db.sequelize.col('totalHoursWorked')), 'totalHours'],
      ],
      group: ['status'],
      raw:   true,
    });

    const summary = { draft: 0, submitted: 0, approved: 0, rejected: 0, totalHours: 0 };
    rows.forEach((row) => {
      const key = row.status.toLowerCase();
      if (key in summary) summary[key] = parseInt(row.count, 10) || 0;
      summary.totalHours = Number((summary.totalHours + (parseFloat(row.totalHours) || 0)).toFixed(2));
    });

    return summary;
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

    // Validate at least one day has hours (skip for initial blank entries)
    const dayColumns = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
    const hasAnyDayField = dayColumns.some(day => data[day] !== undefined && data[day] !== null);
    if (hasAnyDayField) {
      const hasAnyHours = dayColumns.some(day => data[day] && parseFloat(data[day]) > 0);
      if (!hasAnyHours) {
        throw new ValidationError('At least one day must have hours');
      }
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

    // Date validation - week cannot be more than 1 week in the future
    // Use date-string comparison to avoid timezone pitfalls with new Date()
    const weekStartStr = typeof data.weekStartDate === 'string'
      ? data.weekStartDate.split('T')[0]
      : formatDateLocal(new Date(data.weekStartDate));
    const todayStr = formatDateLocal(); // YYYY-MM-DD in server local timezone
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStr = formatDateLocal(nextWeekDate);

    if (weekStartStr > nextWeekStr) {
      throw new ValidationError('Cannot create time entries more than 1 week in advance');
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
