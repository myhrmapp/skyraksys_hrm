/**
 * TimesheetCalculationService
 * 
 * Handles all timesheet calculations, validations, and business logic rules.
 * Supports weekly grid structure: multiple rows (project/task) per week with daily columns (Mon-Sun).
 * Integrates with leave system to exclude approved leave days from timesheet requirements.
 * 
 * Week Structure:
 * - One week = Multiple timesheet records (different project/task combinations)
 * - Each record has 7 daily hour columns (Monday-Sunday)
 * - Total weekly hours across ALL records must be ≤ 168 hours
 * - Leave days are automatically excluded (no timesheet entry required)
 */

const moment = require('moment');
const { Op } = require('sequelize');
const { ValidationError } = require('../../utils/errors');

class TimesheetCalculationService {
  constructor(db) {
    this.db = db;
    this.Timesheet = db.Timesheet;
    this.LeaveRequest = db.LeaveRequest;
  }

  /**
   * ========================================
   * WEEK DATE CALCULATIONS
   * ========================================
   */

  /**
   * Calculate the Monday (week start date) for any given date
   * @param {Date|string} date - Any date in the week
   * @returns {Date} Monday of that week
   */
  calculateWeekStartDate(date) {
    const momentDate = moment(date);
    // ISO week starts on Monday (1), ends on Sunday (7)
    return momentDate.clone().startOf('isoWeek').toDate();
  }

  /**
   * Calculate the Sunday (week end date) for a given week start date
   * @param {Date|string} weekStartDate - Monday of the week
   * @returns {Date} Sunday of that week
   */
  calculateWeekEndDate(weekStartDate) {
    return moment(weekStartDate).clone().endOf('isoWeek').toDate();
  }

  /**
   * Calculate ISO week number (1-53) for a given date
   * @param {Date|string} date - Any date
   * @returns {number} Week number (1-53)
   */
  calculateWeekNumber(date) {
    return moment(date).isoWeek();
  }

  /**
   * Get array of 7 dates (Monday-Sunday) for a given week
   * @param {Date|string} weekStartDate - Monday of the week
   * @returns {Date[]} Array of 7 dates [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
   */
  getWeekDates(weekStartDate) {
    const dates = [];
    const start = moment(weekStartDate);
    
    for (let i = 0; i < 7; i++) {
      dates.push(start.clone().add(i, 'days').toDate());
    }
    
    return dates;
  }

  /**
   * ========================================
   * HOUR VALIDATIONS (SINGLE ROW)
   * ========================================
   */

  /**
   * Validate daily hours (0-24 per day)
   * @param {number} hours - Hours for a single day
   * @param {string} dayName - Day name for error message (e.g., 'Monday')
   * @throws {ValidationError} If hours invalid
   */
  validateDailyHours(hours, dayName = 'Day') {
    if (hours < 0) {
      throw new ValidationError(`${dayName} hours cannot be negative`);
    }
    if (hours > 24) {
      throw new ValidationError(`${dayName} hours cannot exceed 24 hours`);
    }
    
    // Check precision (max 2 decimal places)
    this.validateHoursPrecision(hours, dayName);
  }

  /**
   * Validate hours precision (max 2 decimal places)
   * @param {number} hours - Hours value
   * @param {string} context - Context for error message
   * @throws {ValidationError} If precision > 2 decimal places
   */
  validateHoursPrecision(hours, context = 'Hours') {
    const decimalPlaces = (hours.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      throw new ValidationError(`${context} must have maximum 2 decimal places. Received: ${hours}`);
    }
  }

  /**
   * Validate weekly hours for a single timesheet record (0-168)
   * @param {number} totalHours - Total hours for one row
   * @throws {ValidationError} If hours invalid
   */
  validateWeeklyHoursForTimesheet(totalHours) {
    if (totalHours < 0) {
      throw new ValidationError('Total hours cannot be negative');
    }
    if (totalHours > 168) {
      throw new ValidationError('Total hours cannot exceed 168 hours per week (24 hours × 7 days)');
    }
    
    this.validateHoursPrecision(totalHours, 'Total hours');
  }

  /**
   * Calculate total hours from daily breakdown (sum of 7 days)
   * @param {Object} dailyHours - Object with mondayHours, tuesdayHours, etc.
   * @returns {number} Total hours (rounded to 2 decimals)
   */
  calculateRowTotal(dailyHours) {
    const {
      mondayHours = 0,
      tuesdayHours = 0,
      wednesdayHours = 0,
      thursdayHours = 0,
      fridayHours = 0,
      saturdayHours = 0,
      sundayHours = 0
    } = dailyHours;

    const total = 
      Number(mondayHours) + 
      Number(tuesdayHours) + 
      Number(wednesdayHours) + 
      Number(thursdayHours) + 
      Number(fridayHours) + 
      Number(saturdayHours) + 
      Number(sundayHours);

    // Round to 2 decimal places
    return Math.round(total * 100) / 100;
  }

  /**
   * Validate that calculated total matches declared total
   * @param {Object} dailyHours - Daily hours object
   * @param {number} totalHoursWorked - Declared total
   * @throws {ValidationError} If mismatch
   */
  validateTotalHoursMatch(dailyHours, totalHoursWorked) {
    const calculated = this.calculateRowTotal(dailyHours);
    const declared = Number(totalHoursWorked);

    // Allow 0.01 tolerance for floating point comparison
    if (Math.abs(calculated - declared) > 0.01) {
      throw new ValidationError(
        `Total hours mismatch. Sum of daily hours (${calculated}) does not match totalHoursWorked (${declared})`
      );
    }
  }

  /**
   * Validate all daily hours and total for a timesheet row
   * @param {Object} timesheetData - Timesheet record data
   * @throws {ValidationError} If any validation fails
   */
  validateTimesheetHours(timesheetData) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hourFields = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 
                        'fridayHours', 'saturdayHours', 'sundayHours'];

    // Validate each daily hour
    hourFields.forEach((field, index) => {
      const hours = Number(timesheetData[field] || 0);
      this.validateDailyHours(hours, dayNames[index]);
    });

    // Validate total
    this.validateWeeklyHoursForTimesheet(timesheetData.totalHoursWorked);

    // Validate sum matches total
    this.validateTotalHoursMatch(timesheetData, timesheetData.totalHoursWorked);
  }

  /**
   * ========================================
   * WEEKLY AGGREGATIONS (MULTIPLE ROWS)
   * ========================================
   */

  /**
   * Calculate total hours across ALL timesheet rows for an employee's week
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} weekStartDate - Monday of the week
   * @returns {Promise<number>} Total hours across all rows
   */
  async calculateWeeklyTotalForEmployee(employeeId, weekStartDate) {
    const timesheets = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: moment(weekStartDate).format('YYYY-MM-DD'),
        deletedAt: null
      },
      attributes: ['totalHoursWorked']
    });

    const total = timesheets.reduce((sum, ts) => sum + (ts.totalHoursWorked || 0), 0);
    return Math.round(total * 100) / 100;
  }

  /**
   * Get weekly summary grouped by project
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} weekStartDate - Monday of the week
   * @returns {Promise<Object[]>} Array of {projectId, projectName, totalHours, taskCount}
   */
  async getWeeklySummaryByProject(employeeId, weekStartDate) {
    const timesheets = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: moment(weekStartDate).format('YYYY-MM-DD'),
        deletedAt: null
      },
      include: [
        {
          model: this.db.Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: this.db.Task,
          as: 'task',
          attributes: ['id', 'name']
        }
      ]
    });

    // Group by project
    const projectMap = new Map();
    
    timesheets.forEach(ts => {
      const projectId = ts.projectId;
      const projectName = ts.project?.name || 'Unknown Project';
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          projectId,
          projectName,
          totalHours: 0,
          taskCount: 0,
          tasks: new Set()
        });
      }
      
      const projectData = projectMap.get(projectId);
      projectData.totalHours += (ts.totalHoursWorked || 0);
      projectData.tasks.add(ts.taskId);
      projectData.taskCount = projectData.tasks.size;
    });

    return Array.from(projectMap.values()).map(p => ({
      projectId: p.projectId,
      projectName: p.projectName,
      totalHours: Math.round(p.totalHours * 100) / 100,
      taskCount: p.taskCount
    }));
  }

  /**
   * Validate that total hours across all rows ≤ 168 hours
   * Also excludes approved leave days from the expected working hours
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} weekStartDate - Monday of the week
   * @param {number} maxHours - Maximum hours (default 168)
   * @throws {ValidationError} If total exceeds max
   */
  async validateWeeklyHoursLimit(employeeId, weekStartDate, maxHours = 168) {
    const total = await this.calculateWeeklyTotalForEmployee(employeeId, weekStartDate);
    
    if (total > maxHours) {
      throw new ValidationError(
        `Weekly total hours (${total}) exceeds maximum allowed (${maxHours} hours per week)`
      );
    }
  }

  /**
   * ========================================
   * LEAVE INTEGRATION
   * ========================================
   */

  /**
   * Get approved leave days for an employee in a given week
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} weekStartDate - Monday of the week
   * @returns {Promise<Date[]>} Array of leave dates in the week
   */
  async getApprovedLeaveDaysForWeek(employeeId, weekStartDate) {
    const weekStart = moment(weekStartDate).startOf('day');
    const weekEnd = weekStart.clone().add(6, 'days').endOf('day');

    // Find all approved leave requests overlapping this week
    const leaveRequests = await this.LeaveRequest.findAll({
      where: {
        employeeId,
        status: 'Approved',
        startDate: { [this.db.Sequelize.Op.lte]: weekEnd.format('YYYY-MM-DD') },
        endDate: { [this.db.Sequelize.Op.gte]: weekStart.format('YYYY-MM-DD') },
        deletedAt: null
      }
    });

    const leaveDates = [];
    
    leaveRequests.forEach(leave => {
      const leaveStart = moment(leave.startDate);
      const leaveEnd = moment(leave.endDate);
      
      // Generate all dates in leave range that fall within the week
      let current = moment.max(leaveStart, weekStart);
      const end = moment.min(leaveEnd, weekEnd);
      
      while (current.isSameOrBefore(end, 'day')) {
        leaveDates.push(current.clone().toDate());
        current.add(1, 'day');
      }
    });

    return leaveDates;
  }

  /**
   * Calculate expected working hours for a week (excluding leave days)
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} weekStartDate - Monday of the week
   * @param {number} hoursPerDay - Expected hours per day (default 8)
   * @returns {Promise<Object>} { expectedHours, leaveDays, workingDays }
   */
  async calculateExpectedWorkingHours(employeeId, weekStartDate, hoursPerDay = 8) {
    const leaveDates = await this.getApprovedLeaveDaysForWeek(employeeId, weekStartDate);
    const leaveDays = leaveDates.length;
    const workingDays = 7 - leaveDays; // Assuming 7-day week (adjust if needed)
    const expectedHours = workingDays * hoursPerDay;

    return {
      expectedHours,
      leaveDays,
      workingDays,
      leaveDates: leaveDates.map(d => moment(d).format('YYYY-MM-DD'))
    };
  }

  /**
   * Check if a specific date is an approved leave day
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} date - Date to check
   * @returns {Promise<boolean>} True if date is approved leave
   */
  async isApprovedLeaveDay(employeeId, date) {
    const checkDate = moment(date).format('YYYY-MM-DD');
    
    const leaveCount = await this.LeaveRequest.count({
      where: {
        employeeId,
        status: 'Approved',
        startDate: { [this.db.Sequelize.Op.lte]: checkDate },
        endDate: { [this.db.Sequelize.Op.gte]: checkDate },
        deletedAt: null
      }
    });

    return leaveCount > 0;
  }

  /**
   * ========================================
   * STATUS LOGIC
   * ========================================
   */

  /**
   * Check if status transition is valid
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - Desired new status
   * @returns {boolean} True if transition allowed
   */
  canTransitionStatus(currentStatus, newStatus) {
    const validTransitions = {
      'Draft': ['Submitted'],
      'Submitted': ['Approved', 'Rejected'],
      'Approved': [], // Cannot change once approved
      'Rejected': ['Submitted'] // Can resubmit after rejection
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Check if timesheet is editable
   * @param {string} status - Current status
   * @returns {boolean} True if editable
   */
  isEditable(status) {
    return ['Draft', 'Rejected'].includes(status);
  }

  /**
   * Check if timesheet is submittable
   * @param {Object} timesheet - Timesheet record
   * @returns {boolean} True if can be submitted
   */
  isSubmittable(timesheet) {
    // Must be in Draft or Rejected status
    if (!['Draft', 'Rejected'].includes(timesheet.status)) {
      return false;
    }

    // Must have hours > 0
    if (Number(timesheet.totalHoursWorked) <= 0) {
      return false;
    }

    // Must have valid project and task
    if (!timesheet.projectId || !timesheet.taskId) {
      return false;
    }

    return true;
  }

  /**
   * ========================================
   * DUPLICATE DETECTION
   * ========================================
   */

  /**
   * Check for duplicate timesheet row (same employee/week/project/task)
   * @param {string} employeeId - Employee UUID
   * @param {Date|string} weekStartDate - Monday of the week
   * @param {string} projectId - Project UUID
   * @param {string} taskId - Task UUID
   * @param {string} excludeId - Timesheet ID to exclude (for updates)
   * @returns {Promise<Object|null>} Duplicate timesheet or null
   */
  async checkDuplicateTimesheetRow(employeeId, weekStartDate, projectId, taskId, excludeId = null) {
    const where = {
      employeeId,
      weekStartDate: moment(weekStartDate).format('YYYY-MM-DD'),
      projectId,
      taskId,
      deletedAt: null
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const duplicate = await this.Timesheet.findOne({ where });
    return duplicate;
  }
}

module.exports = TimesheetCalculationService;
