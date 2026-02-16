const moment = require('moment');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../utils/errors');

/**
 * TimesheetSubmissionService
 * 
 * Handles timesheet submission workflow and status management.
 * Primary use case: Weekly bulk submission (all rows for one week).
 * 
 * @class TimesheetSubmissionService
 */
class TimesheetSubmissionService {
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
   * Submit a single timesheet entry
   * 
   * @param {string} timesheetId - UUID of timesheet to submit
   * @param {string} userId - UUID of submitting user
   * @returns {Promise<Object>} Updated timesheet
   * @throws {NotFoundError} If timesheet not found
   * @throws {ValidationError} If already submitted or invalid state
   */
  async submitSingleTimesheet(timesheetId, userId) {
    const timesheet = await this.Timesheet.findByPk(timesheetId);
    
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'Draft') {
      throw new ValidationError(`Cannot submit timesheet with status: ${timesheet.status}`);
    }

    if (timesheet.totalHoursWorked <= 0) {
      throw new ValidationError('Cannot submit timesheet with zero hours');
    }

    // Update status
    await timesheet.update({ status: 'Submitted', submittedAt: new Date() });

    // Log submission
    await this.logStatusChange(
      timesheetId,
      'Draft',
      'Submitted',
      userId,
      'Single timesheet submitted'
    );

    return timesheet;
  }

  /**
   * Submit all draft timesheets for a specific week (PRIMARY USE CASE)
   * 
   * This is the main submission workflow - employees submit entire weeks at once.
   * All timesheet rows for the week (different project/task combinations) are submitted together.
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string|Date} weekStartDate - Monday of the week (YYYY-MM-DD)
   * @param {string} userId - UUID of submitting user
   * @returns {Promise<Object>} Submission result with submitted timesheets
   * @throws {ValidationError} If validation fails or exceeds 168 hours
   */
  async submitWeekTimesheets(employeeId, weekStartDate, userId) {
    const weekStart = moment(weekStartDate).format('YYYY-MM-DD');
    
    // Find all draft timesheets for this week
    const draftTimesheets = await this.findDraftTimesheetsForWeek(employeeId, weekStart);
    
    if (draftTimesheets.length === 0) {
      throw new ValidationError('No draft timesheets found for this week');
    }

    // Validate weekly total doesn't exceed 168 hours
    const totalHours = draftTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHoursWorked || 0), 0);
    if (totalHours > 168) {
      throw new ValidationError(`Weekly total (${totalHours} hours) exceeds maximum of 168 hours`);
    }

    if (totalHours === 0) {
      throw new ValidationError('Cannot submit week with zero total hours');
    }

    // Use transaction for atomic submission
    const transaction = await this.sequelize.transaction();
    
    try {
      const submittedTimesheets = [];
      const submittedAt = new Date();

      // Submit all timesheets in the week
      for (const timesheet of draftTimesheets) {
        await timesheet.update(
          { status: 'Submitted', submittedAt },
          { transaction }
        );
        submittedTimesheets.push(timesheet);

        // Log each submission
        await this.logStatusChange(
          timesheet.id,
          'Draft',
          'Submitted',
          userId,
          `Week submission: ${weekStart}`,
          transaction
        );
      }

      await transaction.commit();

      return {
        success: true,
        weekStartDate: weekStart,
        submittedCount: submittedTimesheets.length,
        totalHours,
        timesheets: submittedTimesheets
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Submit multiple specific timesheets by ID
   * 
   * @param {string[]} timesheetIds - Array of timesheet UUIDs
   * @param {string} userId - UUID of submitting user
   * @returns {Promise<Object>} Submission result
   * @throws {ValidationError} If any timesheet is invalid
   */
  async submitMultipleTimesheets(timesheetIds, userId) {
    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      throw new ValidationError('Timesheet IDs array cannot be empty');
    }

    const timesheets = await this.Timesheet.findAll({
      where: { id: timesheetIds }
    });

    if (timesheets.length !== timesheetIds.length) {
      throw new NotFoundError('One or more timesheets not found');
    }

    // Validate all are in Draft status
    const nonDraft = timesheets.filter(ts => ts.status !== 'Draft');
    if (nonDraft.length > 0) {
      throw new ValidationError(`${nonDraft.length} timesheet(s) are not in Draft status`);
    }

    // Validate all have hours
    const zeroHours = timesheets.filter(ts => ts.totalHoursWorked <= 0);
    if (zeroHours.length > 0) {
      throw new ValidationError(`${zeroHours.length} timesheet(s) have zero hours`);
    }

    const transaction = await this.sequelize.transaction();
    
    try {
      const submittedAt = new Date();
      
      for (const timesheet of timesheets) {
        await timesheet.update(
          { status: 'Submitted', submittedAt },
          { transaction }
        );

        await this.logStatusChange(
          timesheet.id,
          'Draft',
          'Submitted',
          userId,
          'Bulk submission',
          transaction
        );
      }

      await transaction.commit();

      return {
        success: true,
        submittedCount: timesheets.length,
        timesheets
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Find all draft timesheets for a specific week
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of draft timesheets
   */
  async findDraftTimesheetsForWeek(employeeId, weekStartDate) {
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days for full week

    return await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: weekStart,
        status: 'Draft'
      },
      include: [
        { model: this.Project, as: 'project', attributes: ['id', 'name'] },
        { model: this.Task, as: 'task', attributes: ['id', 'name'] }
      ],
      order: [['weekStartDate', 'ASC'], ['createdAt', 'ASC']]
    });
  }

  /**
   * Validate weekly submission (checks totals, status, required fields)
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @returns {Promise<Object>} Validation result with details
   */
  async validateWeeklySubmission(employeeId, weekStartDate) {
    const draftTimesheets = await this.findDraftTimesheetsForWeek(employeeId, weekStartDate);
    
    const errors = [];
    const warnings = [];
    
    if (draftTimesheets.length === 0) {
      errors.push('No draft timesheets found for this week');
      return { valid: false, errors, warnings };
    }

    // Calculate total hours
    const totalHours = draftTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHoursWorked || 0), 0);
    
    if (totalHours === 0) {
      errors.push('Total hours cannot be zero');
    }
    
    if (totalHours > 168) {
      errors.push(`Total hours (${totalHours}) exceeds weekly maximum of 168 hours`);
    }

    // Check for missing projects/tasks
    const missingData = draftTimesheets.filter(ts => !ts.projectId || !ts.taskId);
    if (missingData.length > 0) {
      errors.push(`${missingData.length} timesheet(s) missing project or task`);
    }

    // Warnings for low hours (but not blocking)
    if (totalHours < 40 && totalHours > 0) {
      warnings.push(`Total hours (${totalHours}) is below typical 40-hour week`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalHours,
      timesheetCount: draftTimesheets.length
    };
  }

  /**
   * Update timesheet status (with validation)
   * 
   * @param {string} timesheetId - UUID of timesheet
   * @param {string} newStatus - New status value
   * @param {string} userId - UUID of user making change
   * @param {string} comments - Optional comments
   * @returns {Promise<Object>} Updated timesheet
   * @throws {ValidationError} If status transition invalid
   */
  async updateTimesheetStatus(timesheetId, newStatus, userId, comments = null) {
    const timesheet = await this.Timesheet.findByPk(timesheetId);
    
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    const validStatuses = ['Draft', 'Submitted', 'Approved', 'Rejected'];
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError(`Invalid status: ${newStatus}`);
    }

    // Validate status transition
    const validTransitions = {
      'Draft': ['Submitted'],
      'Submitted': ['Approved', 'Rejected', 'Draft'], // Can recall
      'Approved': [], // Cannot change approved
      'Rejected': ['Draft'] // Can revise and resubmit
    };

    const allowedTransitions = validTransitions[timesheet.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${timesheet.status} to ${newStatus}`
      );
    }

    const oldStatus = timesheet.status;
    await timesheet.update({ 
      status: newStatus,
      approverComments: comments || timesheet.approverComments
    });

    await this.logStatusChange(timesheetId, oldStatus, newStatus, userId, comments);

    return timesheet;
  }

  /**
   * Bulk update status for multiple timesheets
   * 
   * @param {string[]} timesheetIds - Array of timesheet UUIDs
   * @param {string} newStatus - New status for all timesheets
   * @param {string} userId - UUID of user making change
   * @param {string} comments - Optional comments
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdateStatus(timesheetIds, newStatus, userId, comments = null) {
    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      throw new ValidationError('Timesheet IDs array cannot be empty');
    }

    const timesheets = await this.Timesheet.findAll({
      where: { id: timesheetIds }
    });

    if (timesheets.length !== timesheetIds.length) {
      throw new NotFoundError('One or more timesheets not found');
    }

    const transaction = await this.sequelize.transaction();
    
    try {
      const results = [];

      for (const timesheet of timesheets) {
        try {
          const oldStatus = timesheet.status;
          await this.updateTimesheetStatus(timesheet.id, newStatus, userId, comments);
          results.push({ id: timesheet.id, success: true, oldStatus, newStatus });
        } catch (error) {
          results.push({ id: timesheet.id, success: false, error: error.message });
        }
      }

      await transaction.commit();

      const successCount = results.filter(r => r.success).length;
      return {
        success: true,
        totalCount: timesheetIds.length,
        successCount,
        failureCount: timesheetIds.length - successCount,
        results
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Log status change to audit trail
   * 
   * @param {string} timesheetId - UUID of timesheet
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} userId - UUID of user making change
   * @param {string} comments - Optional comments
   * @param {Object} transaction - Optional Sequelize transaction
   * @returns {Promise<Object>} Audit log entry
   */
  async logStatusChange(timesheetId, oldStatus, newStatus, userId, comments = null, transaction = null) {
    const auditData = {
      userId,
      action: 'TIMESHEET_STATUS_CHANGE',
      entityType: 'Timesheet',
      entityId: timesheetId,
      details: JSON.stringify({
        oldStatus,
        newStatus,
        comments,
        timestamp: new Date().toISOString()
      })
    };

    if (transaction) {
      return await this.AuditLog.create(auditData, { transaction });
    }
    return await this.AuditLog.create(auditData);
  }

  /**
   * Check if a week can be submitted (validation check)
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @returns {Promise<Object>} Eligibility result
   */
  async canSubmitWeek(employeeId, weekStartDate) {
    const validation = await this.validateWeeklySubmission(employeeId, weekStartDate);
    
    return {
      canSubmit: validation.valid,
      reason: validation.errors.length > 0 ? validation.errors[0] : null,
      details: validation
    };
  }

  /**
   * Get week submission summary (for UI display)
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @returns {Promise<Object>} Summary with timesheets and totals
   */
  async getWeekSubmissionSummary(employeeId, weekStartDate) {
    const draftTimesheets = await this.findDraftTimesheetsForWeek(employeeId, weekStartDate);
    const validation = await this.validateWeeklySubmission(employeeId, weekStartDate);
    
    // Calculate daily totals by grouping entries by day of week
    const dailyTotals = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    };

    // Weekly schema: each timesheet has mondayHours-sundayHours columns
    draftTimesheets.forEach(ts => {
      dailyTotals.monday += parseFloat(ts.mondayHours || 0);
      dailyTotals.tuesday += parseFloat(ts.tuesdayHours || 0);
      dailyTotals.wednesday += parseFloat(ts.wednesdayHours || 0);
      dailyTotals.thursday += parseFloat(ts.thursdayHours || 0);
      dailyTotals.friday += parseFloat(ts.fridayHours || 0);
      dailyTotals.saturday += parseFloat(ts.saturdayHours || 0);
      dailyTotals.sunday += parseFloat(ts.sundayHours || 0);
    });

    return {
      weekStartDate,
      timesheets: draftTimesheets,
      totalHours: validation.totalHours,
      timesheetCount: draftTimesheets.length,
      dailyTotals,
      canSubmit: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }
}

module.exports = TimesheetSubmissionService;
