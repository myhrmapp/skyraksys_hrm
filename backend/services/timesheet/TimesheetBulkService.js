const moment = require('moment');
const { Op } = require('sequelize');
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');

/**
 * TimesheetBulkService
 * 
 * Handles bulk timesheet operations and transaction management.
 * Primary use case: Weekly grid creation/update (all rows for one week).
 * Ensures data consistency with transactions and conflict resolution.
 * 
 * @class TimesheetBulkService
 */
class TimesheetBulkService {
  /**
   * @param {Object} db - Sequelize database instance
   */
  constructor(db) {
    this.Timesheet = db.Timesheet;
    this.Employee = db.Employee;
    this.Project = db.Project;
    this.Task = db.Task;
    this.sequelize = db.sequelize;
    this.Op = db.Sequelize.Op;
  }

  /**
   * Bulk create timesheets for a week (PRIMARY USE CASE)
   * 
   * Creates multiple timesheet rows for different project/task combinations.
   * One week = multiple rows (e.g., Project A/Task 1, Project B/Task 2, etc.)
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @param {Array} timesheetData - Array of timesheet objects
   * @returns {Promise<Object>} Creation result with created timesheets
   * @throws {ValidationError} If validation fails
   */
  async bulkCreateWeekTimesheets(employeeId, weekStartDate, timesheetData) {
    if (!Array.isArray(timesheetData) || timesheetData.length === 0) {
      throw new ValidationError('Timesheet data array cannot be empty');
    }

    const weekStart = moment(weekStartDate).format('YYYY-MM-DD');
    const weekEnd = moment(weekStartDate).add(6, 'days').format('YYYY-MM-DD');

    // Validate employee exists
    const employee = await this.Employee.findByPk(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Validate all projects and tasks exist
    await this.validateProjectsAndTasks(timesheetData);

    // Check for duplicates within the input data
    const duplicates = this.findDuplicatesInArray(timesheetData);
    if (duplicates.length > 0) {
      throw new ValidationError(
        `Duplicate project/task combinations found: ${duplicates.join(', ')}`
      );
    }

    // Check for existing timesheets (conflict detection)
    const conflicts = await this.checkExistingTimesheets(employeeId, weekStart, timesheetData);
    if (conflicts.length > 0) {
      throw new ConflictError(
        `Timesheets already exist for: ${conflicts.map(c => `${c.project}/${c.task}`).join(', ')}`
      );
    }

    // Calculate weekly total
    const weeklyTotal = this.calculateWeeklyTotal(timesheetData);
    if (weeklyTotal > 168) {
      throw new ValidationError(`Weekly total (${weeklyTotal} hours) exceeds maximum of 168 hours`);
    }

    const transaction = await this.sequelize.transaction();
    
    try {
      const createdTimesheets = [];

      for (const data of timesheetData) {
        const timesheet = await this.Timesheet.create({
          employeeId,
          projectId: data.projectId,
          taskId: data.taskId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          weekNumber: moment(weekStart).isoWeek(),
          year: moment(weekStart).year(),
          mondayHours: data.mondayHours || 0,
          tuesdayHours: data.tuesdayHours || 0,
          wednesdayHours: data.wednesdayHours || 0,
          thursdayHours: data.thursdayHours || 0,
          fridayHours: data.fridayHours || 0,
          saturdayHours: data.saturdayHours || 0,
          sundayHours: data.sundayHours || 0,
          totalHoursWorked: this.calculateRowTotal(data),
          status: 'Draft',
          description: data.description || null
        }, { transaction });

        createdTimesheets.push(timesheet);
      }

      await transaction.commit();

      return {
        success: true,
        weekStartDate: weekStart,
        createdCount: createdTimesheets.length,
        totalHours: weeklyTotal,
        timesheets: createdTimesheets
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Bulk update timesheets for a week
   * 
   * Updates multiple timesheet rows atomically.
   * Only Draft or Rejected timesheets can be updated.
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @param {Array} updateData - Array of update objects with id and fields
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdateWeekTimesheets(employeeId, weekStartDate, updateData) {
    if (!Array.isArray(updateData) || updateData.length === 0) {
      throw new ValidationError('Update data array cannot be empty');
    }

    const weekStart = moment(weekStartDate).format('YYYY-MM-DD');

    // Get all timesheets to update
    const timesheetIds = updateData.map(u => u.id);
    const timesheets = await this.Timesheet.findAll({
      where: {
        id: timesheetIds,
        employeeId,
        weekStartDate: weekStart
      }
    });

    if (timesheets.length !== timesheetIds.length) {
      throw new NotFoundError('One or more timesheets not found');
    }

    // Validate all are editable (Draft or Rejected)
    const nonEditable = timesheets.filter(ts => !['Draft', 'Rejected'].includes(ts.status));
    if (nonEditable.length > 0) {
      throw new ValidationError(
        `Cannot update ${nonEditable.length} timesheet(s) with status: ${nonEditable.map(ts => ts.status).join(', ')}`
      );
    }

    // Get ALL timesheets for the week to calculate total
    const allWeekTimesheets = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: weekStart
      }
    });

    // Apply updates to the relevant timesheets
    const updatedTimesheets = allWeekTimesheets.map(ts => {
      const update = updateData.find(u => u.id === ts.id);
      if (update) {
        return { ...ts.toJSON(), ...update };
      }
      return ts.toJSON();
    });

    const weeklyTotal = this.calculateWeeklyTotal(updatedTimesheets);
    if (weeklyTotal > 168) {
      throw new ValidationError(`Weekly total (${weeklyTotal} hours) exceeds maximum of 168 hours`);
    }

    const transaction = await this.sequelize.transaction();
    
    try {
      const results = [];

      for (const update of updateData) {
        const timesheet = timesheets.find(ts => ts.id === update.id);
        
        const updateFields = {
          mondayHours: update.mondayHours !== undefined ? update.mondayHours : timesheet.mondayHours,
          tuesdayHours: update.tuesdayHours !== undefined ? update.tuesdayHours : timesheet.tuesdayHours,
          wednesdayHours: update.wednesdayHours !== undefined ? update.wednesdayHours : timesheet.wednesdayHours,
          thursdayHours: update.thursdayHours !== undefined ? update.thursdayHours : timesheet.thursdayHours,
          fridayHours: update.fridayHours !== undefined ? update.fridayHours : timesheet.fridayHours,
          saturdayHours: update.saturdayHours !== undefined ? update.saturdayHours : timesheet.saturdayHours,
          sundayHours: update.sundayHours !== undefined ? update.sundayHours : timesheet.sundayHours,
          description: update.description !== undefined ? update.description : timesheet.description
        };

        updateFields.totalHoursWorked = this.calculateRowTotal(updateFields);

        await timesheet.update(updateFields, { transaction });
        results.push(timesheet);
      }

      await transaction.commit();

      return {
        success: true,
        weekStartDate: weekStart,
        updatedCount: results.length,
        totalHours: weeklyTotal,
        timesheets: results
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete multiple timesheets (only Draft status)
   * 
   * @param {string[]} timesheetIds - Array of timesheet UUIDs
   * @param {string} employeeId - UUID of employee (for permission check)
   * @returns {Promise<Object>} Deletion result
   */
  async bulkDeleteTimesheets(timesheetIds, employeeId) {
    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      throw new ValidationError('Timesheet IDs array cannot be empty');
    }

    const timesheets = await this.Timesheet.findAll({
      where: {
        id: timesheetIds,
        employeeId
      }
    });

    if (timesheets.length !== timesheetIds.length) {
      throw new NotFoundError('One or more timesheets not found');
    }

    // Can only delete Draft timesheets
    const nonDraft = timesheets.filter(ts => ts.status !== 'Draft');
    if (nonDraft.length > 0) {
      throw new ValidationError(
        `Cannot delete ${nonDraft.length} timesheet(s) with status: ${nonDraft.map(ts => ts.status).join(', ')}`
      );
    }

    const transaction = await this.sequelize.transaction();
    
    try {
      const deletedCount = await this.Timesheet.destroy({
        where: { id: timesheetIds },
        transaction
      });

      await transaction.commit();

      return {
        success: true,
        deletedCount
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Validate that all projects and tasks exist
   * 
   * @param {Array} timesheetData - Array of timesheet objects
   * @throws {NotFoundError} If any project/task not found
   */
  async validateProjectsAndTasks(timesheetData) {
    const projectIds = [...new Set(timesheetData.map(t => t.projectId))];
    const taskIds = [...new Set(timesheetData.map(t => t.taskId))];

    const [projects, tasks] = await Promise.all([
      this.Project.findAll({ where: { id: projectIds }, attributes: ['id'] }),
      this.Task.findAll({ where: { id: taskIds }, attributes: ['id'] })
    ]);

    if (projects.length !== projectIds.length) {
      throw new NotFoundError('One or more projects not found');
    }

    if (tasks.length !== taskIds.length) {
      throw new NotFoundError('One or more tasks not found');
    }
  }

  /**
   * Find duplicate project/task combinations in array
   * 
   * @param {Array} timesheetData - Array of timesheet objects
   * @returns {Array} Array of duplicate keys
   */
  findDuplicatesInArray(timesheetData) {
    const seen = new Set();
    const duplicates = [];

    for (const data of timesheetData) {
      const key = `${data.projectId}_${data.taskId}`;
      if (seen.has(key)) {
        duplicates.push(key);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  /**
   * Check for existing timesheets that would conflict
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @param {Array} timesheetData - Array of new timesheet objects
   * @returns {Promise<Array>} Array of conflicts
   */
  async checkExistingTimesheets(employeeId, weekStartDate, timesheetData) {
    const existing = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate
      },
      include: [
        { model: this.Project, as: 'project', attributes: ['name'] },
        { model: this.Task, as: 'task', attributes: ['name'] }
      ]
    });

    const conflicts = [];

    for (const data of timesheetData) {
      const conflict = existing.find(
        ts => ts.projectId === data.projectId && ts.taskId === data.taskId
      );
      
      if (conflict) {
        conflicts.push({
          project: conflict.project?.name || 'Unknown',
          task: conflict.task?.name || 'Unknown',
          existingId: conflict.id
        });
      }
    }

    return conflicts;
  }

  /**
   * Calculate total hours for one timesheet row
   * 
   * @param {Object} data - Timesheet data object
   * @returns {number} Total hours for the row
   */
  calculateRowTotal(data) {
    return (
      parseFloat(data.mondayHours || 0) +
      parseFloat(data.tuesdayHours || 0) +
      parseFloat(data.wednesdayHours || 0) +
      parseFloat(data.thursdayHours || 0) +
      parseFloat(data.fridayHours || 0) +
      parseFloat(data.saturdayHours || 0) +
      parseFloat(data.sundayHours || 0)
    );
  }

  /**
   * Calculate total hours across all timesheet rows
   * 
   * @param {Array} timesheetData - Array of timesheet objects
   * @returns {number} Total hours for all rows
   */
  calculateWeeklyTotal(timesheetData) {
    return timesheetData.reduce((sum, data) => {
      return sum + this.calculateRowTotal(data);
    }, 0);
  }

  /**
   * Copy previous week's timesheets to new week (template feature)
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} sourceWeekStartDate - Monday of source week
   * @param {string} targetWeekStartDate - Monday of target week
   * @returns {Promise<Object>} Copy result
   */
  async copyWeekTimesheets(employeeId, sourceWeekStartDate, targetWeekStartDate) {
    const sourceWeek = moment(sourceWeekStartDate).format('YYYY-MM-DD');
    const targetWeek = moment(targetWeekStartDate).format('YYYY-MM-DD');

    // Get source timesheets
    const sourceTimesheets = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: sourceWeek
      }
    });

    if (sourceTimesheets.length === 0) {
      throw new NotFoundError('No timesheets found in source week');
    }

    // Check for conflicts in target week
    const existingInTarget = await this.Timesheet.count({
      where: {
        employeeId,
        weekStartDate: targetWeek
      }
    });

    if (existingInTarget > 0) {
      throw new ConflictError('Target week already has timesheets');
    }

    const targetWeekEnd = moment(targetWeek).add(6, 'days').format('YYYY-MM-DD');

    const timesheetData = sourceTimesheets.map(ts => ({
      projectId: ts.projectId,
      taskId: ts.taskId,
      mondayHours: 0, // Reset hours to zero
      tuesdayHours: 0,
      wednesdayHours: 0,
      thursdayHours: 0,
      fridayHours: 0,
      saturdayHours: 0,
      sundayHours: 0,
      description: ts.description
    }));

    // Use bulk create to create the timesheets
    return await this.bulkCreateWeekTimesheets(employeeId, targetWeek, timesheetData);
  }

  /**
   * Get week summary for bulk operations UI
   * 
   * @param {string} employeeId - UUID of employee
   * @param {string} weekStartDate - Monday of the week
   * @returns {Promise<Object>} Week summary
   */
  async getWeekSummary(employeeId, weekStartDate) {
    const weekStart = moment(weekStartDate).format('YYYY-MM-DD');

    const timesheets = await this.Timesheet.findAll({
      where: {
        employeeId,
        weekStartDate: weekStart
      },
      include: [
        { model: this.Project, as: 'project', attributes: ['id', 'name'] },
        { model: this.Task, as: 'task', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHoursWorked || 0), 0);

    const byStatus = {
      Draft: timesheets.filter(ts => ts.status === 'Draft').length,
      Submitted: timesheets.filter(ts => ts.status === 'Submitted').length,
      Approved: timesheets.filter(ts => ts.status === 'Approved').length,
      Rejected: timesheets.filter(ts => ts.status === 'Rejected').length
    };

    return {
      weekStartDate: weekStart,
      timesheetCount: timesheets.length,
      totalHours,
      statusBreakdown: byStatus,
      timesheets
    };
  }
}

module.exports = TimesheetBulkService;
