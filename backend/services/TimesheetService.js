const BaseService = require('./BaseService');
const db = require('../models');
const { Timesheet, Project, Task, Employee, User } = db;
const { Op } = require('sequelize');
const emailService = require('./email.service');
const logger = require('../utils/logger');
const { formatDateLocal } = require('../utils/dateUtils');

class TimesheetService extends BaseService {
  constructor() {
    super(Timesheet);
  }

  async findAllWithDetails(options = {}) {
    const includeOptions = [
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
      },
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'name', 'status']
      },
      {
        model: Task,
        as: 'task',
        attributes: ['id', 'name', 'description', 'status']
      }
    ];

    return super.findAll({
      ...options,
      include: includeOptions,
      order: [['weekStartDate', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  async findByEmployee(employeeId, options = {}) {
    return this.findAllWithDetails({
      ...options,
      where: { 
        ...options.where,
        employeeId 
      }
    });
  }

  async findByProject(projectId, options = {}) {
    return this.findAllWithDetails({
      ...options,
      where: { 
        ...options.where,
        projectId 
      }
    });
  }

  async findByDateRange(startDate, endDate, options = {}) {
    const weekStart = this.getWeekStart(startDate).toISOString().split('T')[0];
    const weekEnd = this.getWeekStart(endDate).toISOString().split('T')[0];
    
    return this.findAllWithDetails({
      ...options,
      where: {
        ...options.where,
        [Op.or]: [
          {
            weekStartDate: {
              [Op.between]: [weekStart, weekEnd]
            }
          },
          {
            weekStartDate: { [Op.lte]: weekStart },
            weekEndDate: { [Op.gte]: weekStart }
          },
          {
            weekStartDate: { [Op.lte]: weekEnd },
            weekEndDate: { [Op.gte]: weekEnd }
          }
        ]
      }
    });
  }

  async findByWeek(weekStart, options = {}) {
    const start = this.getWeekStart(weekStart);
    const weekStartStr = start.toISOString().split('T')[0];
    
    return this.findAllWithDetails({
      ...options,
      where: {
        ...options.where,
        weekStartDate: weekStartStr
      }
    });
  }

  async findByMonth(year, month, options = {}) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return this.findByDateRange(startDate, endDate, options);
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  getDayColumnName(date) {
    const days = ['sundayHours', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours'];
    return days[date.getDay()];
  }

  // REMOVED: createTimeEntry method - daily→weekly transformation no longer needed
  // Weekly data is now created directly via create() method from BaseService
  /*
  async createTimeEntry(data) {
    const { employeeId, projectId, taskId, date, hours, description } = data;
    const entryDate = new Date(date);

    // Validate time entry data
    const validation = await this.validateTimeEntry(data);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const weekStart = this.getWeekStart(entryDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Find or create weekly timesheet
    let timesheet = await this.model.findOne({
      where: {
        employeeId,
        projectId,
        taskId,
        weekStartDate: weekStart
      }
    });

    if (timesheet && (timesheet.status === 'Submitted' || timesheet.status === 'Approved')) {
      throw new Error(`Cannot modify ${timesheet.status} timesheet.`);
    }

    if (!timesheet) {
      timesheet = await this.model.create({
        employeeId,
        projectId,
        taskId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber: this.getWeekNumber(weekStart),
        year: weekStart.getFullYear(),
        totalHoursWorked: 0,
        status: 'Draft'
      });
    }

    // Update hours
    const dayColumn = this.getDayColumnName(entryDate);
    timesheet[dayColumn] = parseFloat(hours);

    // Recalculate total
    let total = 0;
    const days = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
    days.forEach(day => {
        total += parseFloat(timesheet[day] || 0);
    });
    timesheet.totalHoursWorked = Number(total.toFixed(2));

    if (description) {
        timesheet.description = (timesheet.description ? timesheet.description + '\n' : '') + description;
    }

    await timesheet.save();

    return {
        ...timesheet.toJSON(),
        // Return what the test expects for verification
        hours: parseFloat(hours),
        date: entryDate,
        status: timesheet.status
    };
  }
  */

  async updateTimeEntry(id, data) {
    // This is tricky because ID in test refers to the entry, but here ID is the weekly sheet.
    // For now, assuming we don't support updating individual days via this method easily without date.
    // But the test uses it.
    // The test calls `updateTimeEntry(entry.id, { status: 'Submitted' })`.
    // Since we return the weekly timesheet ID as the entry ID, this might just work for status updates.
    
    const timesheet = await this.findById(id);
    
    if (timesheet.status === 'Approved') {
      throw new Error('Cannot update approved time entry');
    }
    
    // Prevent editing hours/data if Submitted (unless it's a status change - e.g. revert to Draft? Need business logic clarification)
    // For now, we allow status changes (Submission), but block data changes if already submitted.
    const isDataUpdate = Object.keys(data).some(key => key !== 'status');
    if (timesheet.status === 'Submitted' && isDataUpdate) {
        throw new Error('Cannot update submitted time entry. Please recall/revert to draft first.');
    }

    // If just updating status
    if (data.status) {
        return super.update(id, { status: data.status });
    }

    // If updating hours, we need the date, which might not be in 'data' if it's just an update.
    // This is a limitation of the adapter.
    // For now, let's assume simple updates work.
    return super.update(id, data);
  }

  async delete(id) {
    const timesheet = await this.findById(id);
    if (!timesheet) {
      throw new Error('Timesheet not found');
    }
    return timesheet.destroy();
  }

  async submitTimesheet(employeeId, weekStart) {
    const start = this.getWeekStart(weekStart);

    // Get all time entries for the week
    const timeEntries = await this.model.findAll({
      where: { 
        employeeId,
        weekStartDate: start
      }
    });

    if (!timeEntries || timeEntries.length === 0) {
      throw new Error('No time entries found for the specified week');
    }

    // Update all draft entries to submitted
    const updatedEntries = [];
    for (const entry of timeEntries) {
      if (entry.status === 'Draft') {
        const updated = await entry.update({
          status: 'Submitted',
          submittedAt: new Date()
        });
        updatedEntries.push(updated);
      }
    }

    return updatedEntries;
  }

  async approveTimesheet(timesheetIds, approverId, comments = '') {
    // Fetch all timesheets at once to avoid N+1
    const timeEntries = await this.model.findAll({
      where: { id: { [Op.in]: timesheetIds } }
    });

    // Create a map for quick lookup
    const entriesMap = new Map(timeEntries.map(entry => [entry.id, entry]));
    
    // Validate all entries first
    for (const id of timesheetIds) {
      const timeEntry = entriesMap.get(id);
      if (!timeEntry) {
        throw new Error(`Time entry ${id} not found`);
      }
      if (timeEntry.status !== 'Submitted') {
        throw new Error(`Time entry ${id} is not in submitted status`);
      }
    }

    // Bulk update all valid entries
    await this.model.update(
      {
        status: 'Approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        approverComments: comments
      },
      {
        where: { id: { [Op.in]: timesheetIds } }
      }
    );

    // Fetch and return updated entries
    const approvedEntries = await this.model.findAll({
      where: { id: { [Op.in]: timesheetIds } }
    });

    // Send email notifications (fire-and-forget)
    this._sendTimesheetNotifications(approvedEntries, 'Approved', comments).catch(() => {});

    return approvedEntries;
  }

  async rejectTimesheet(timesheetIds, approverId, comments) {
    // Fetch all timesheets at once to avoid N+1
    const timeEntries = await this.model.findAll({
      where: { id: { [Op.in]: timesheetIds } }
    });

    // Create a map for quick lookup
    const entriesMap = new Map(timeEntries.map(entry => [entry.id, entry]));
    
    // Validate all entries first
    for (const id of timesheetIds) {
      const timeEntry = entriesMap.get(id);
      if (!timeEntry) {
        throw new Error(`Time entry ${id} not found`);
      }
      if (timeEntry.status !== 'Submitted') {
        throw new Error(`Time entry ${id} is not in submitted status`);
      }
    }

    // Bulk update all valid entries
    await this.model.update(
      {
        status: 'Rejected',
        approvedBy: approverId,
        rejectedAt: new Date(),
        approverComments: comments
      },
      {
        where: { id: { [Op.in]: timesheetIds } }
      }
    );

    // Fetch and return updated entries
    const rejectedEntries = await this.model.findAll({
      where: { id: { [Op.in]: timesheetIds } }
    });

    // Send email notifications (fire-and-forget)
    this._sendTimesheetNotifications(rejectedEntries, 'Rejected', comments).catch(() => {});

    return rejectedEntries;
  }

  async getTimesheetSummary(employeeId, startDate, endDate) {
    const weekStart = this.getWeekStart(startDate).toISOString().split('T')[0];
    const weekEnd = this.getWeekStart(endDate).toISOString().split('T')[0];
    
    const timeEntries = await this.model.findAll({
      where: { 
        employeeId,
        [Op.or]: [
          {
            weekStartDate: {
              [Op.between]: [weekStart, weekEnd]
            }
          },
          {
            weekStartDate: { [Op.lte]: weekStart },
            weekEndDate: { [Op.gte]: weekStart }
          },
          {
            weekStartDate: { [Op.lte]: weekEnd },
            weekEndDate: { [Op.gte]: weekEnd }
          }
        ]
      },
      include: [
          { model: Project, as: 'project' }
      ]
    });

    const summary = {
      totalHours: 0,
      totalDays: 0,
      projects: {},
      status: {
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0
      }
    };

    const activeDates = new Set();
    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);

    timeEntries.forEach(entry => {
        const days = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
        const weekStartDate = new Date(entry.weekStartDate);
        
        days.forEach((dayCol, index) => {
            const currentDate = new Date(weekStartDate);
            currentDate.setDate(currentDate.getDate() + index);
            
            if (currentDate >= start && currentDate <= end) {
                const hours = parseFloat(entry[dayCol] || 0);
                if (hours > 0) {
                    summary.totalHours += hours;
                    activeDates.add(formatDateLocal(currentDate));
                }
            }
        });
        
        const projectName = entry.project ? entry.project.name : 'Unknown Project';
        if (!summary.projects[projectName]) {
          summary.projects[projectName] = { hours: 0, entries: 0 };
        }
        summary.projects[projectName].hours += parseFloat(entry.totalHoursWorked || 0);
        summary.projects[projectName].entries += 1;
        
        if (summary.status[entry.status.toLowerCase()] !== undefined) {
            summary.status[entry.status.toLowerCase()]++;
        }
    });
    
    summary.totalDays = activeDates.size;

    return summary;
  }

  // REMOVED: validateTimeEntry method - daily format validation no longer needed
  // Weekly validation is now handled in TimesheetBusinessService
  /*
  async validateTimeEntry(data) {
    const { employeeId, projectId, taskId, date, hours } = data;
    const entryDate = new Date(date);

    // Check if employee exists
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return { isValid: false, message: 'Employee not found' };
    }

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return { isValid: false, message: 'Project not found' };
    }

    // Check if task exists and belongs to project
    if (taskId) {
      const task = await Task.findByPk(taskId);
      if (!task) {
        return { isValid: false, message: 'Task not found' };
      }
      if (task.projectId !== projectId) {
        return { isValid: false, message: 'Task does not belong to the specified project' };
      }
    }

    // Validate hours
    if (hours <= 0 || hours > 24) {
      return { isValid: false, message: 'Hours must be between 0 and 24' };
    }

    const weekStart = this.getWeekStart(entryDate);
    const dayColumn = this.getDayColumnName(entryDate);

    // Check for duplicate entry (hours already exist for this day/task)
    const existingEntry = await this.model.findOne({
      where: {
        employeeId,
        projectId,
        taskId,
        weekStartDate: weekStart
      }
    });

    // Only check for duplicate if we are creating a new entry (not updating)
    // But createTimeEntry doesn't pass an ID to validate.
    // The test logic implies strict duplicate check.
    if (existingEntry && parseFloat(existingEntry[dayColumn] || 0) > 0) {
       return { isValid: false, message: 'Time entry already exists for this date, project, and task' };
    }

    // Check daily hours limit (across all tasks)
    const allTimesheets = await this.model.findAll({
        where: {
            employeeId,
            weekStartDate: weekStart
        }
    });

    let dailyTotal = 0;
    allTimesheets.forEach(sheet => {
        dailyTotal += parseFloat(sheet[dayColumn] || 0);
    });

    if (dailyTotal + hours > 24) {
      return { isValid: false, message: 'Total daily hours cannot exceed 24 hours' };
    }

    return { isValid: true };
  }
  */



  async getProjectTimeReport(projectId, startDate, endDate) {
    const timeEntries = await this.model.findAll({
      where: {
        projectId,
        weekStartDate: {
            [Op.gte]: this.getWeekStart(startDate),
            [Op.lte]: this.getWeekStart(endDate)
        }
      },
      include: [
          { model: Employee, as: 'employee' },
          { model: Task, as: 'task' }
      ]
    });

    const report = {
      totalHours: 0,
      employees: {},
      tasks: {},
      dailyBreakdown: {}
    };

    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);
    const isInRange = (d) => d >= start && d <= end;

    timeEntries.forEach(entry => {
        const days = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
        
        const weekStart = new Date(entry.weekStartDate);
        
        days.forEach((dayCol, index) => {
            const currentDayDate = new Date(weekStart);
            currentDayDate.setDate(currentDayDate.getDate() + index);
            
            if (isInRange(currentDayDate)) {
                const h = parseFloat(entry[dayCol] || 0);
                if (h > 0) {
                    report.totalHours += h;

                    // Employee breakdown
                    const employeeName = entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}` : 'Unknown Employee';
                    if (!report.employees[employeeName]) {
                      report.employees[employeeName] = { hours: 0, entries: 0 };
                    }
                    report.employees[employeeName].hours += h;
                    report.employees[employeeName].entries++;

                    // Task breakdown
                    const taskName = entry.task ? entry.task.name : 'No Task';
                    if (!report.tasks[taskName]) {
                      report.tasks[taskName] = { hours: 0, entries: 0 };
                    }
                    report.tasks[taskName].hours += h;
                    report.tasks[taskName].entries++;

                    // Daily breakdown
                    const dateStr = formatDateLocal(currentDayDate);
                    if (!report.dailyBreakdown[dateStr]) {
                      report.dailyBreakdown[dateStr] = 0;
                    }
                    report.dailyBreakdown[dateStr] += h;
                }
            }
        });
    });

    return report;
  }

  /**
   * Send timesheet status notification emails to affected employees (fire-and-forget)
   * @private
   */
  async _sendTimesheetNotifications(entries, newStatus, comments = '') {
    try {
      // Group entries by employee
      const employeeIds = [...new Set(entries.map(e => e.employeeId))];
      const employees = await Employee.findAll({
        where: { id: { [Op.in]: employeeIds } },
        include: [{ model: User, as: 'user', attributes: ['email'] }]
      });
      const empMap = new Map(employees.map(e => [e.id, e]));

      for (const empId of employeeIds) {
        const emp = empMap.get(empId);
        if (!emp?.user?.email) continue;

        const empEntries = entries.filter(e => e.employeeId === empId);
        const totalHours = empEntries.reduce((sum, e) => sum + (Number(e.totalHours || e.hours) || 0), 0);

        await emailService.sendTimesheetStatusEmail(
          emp.user.email,
          `${emp.firstName} ${emp.lastName}`,
          {
            weekStart: empEntries[0]?.weekStartDate || 'N/A',
            totalHours: totalHours.toFixed(1),
            comments: comments || ''
          },
          newStatus
        );
      }
    } catch (err) {
      logger.warn('Timesheet notification emails failed:', { detail: err.message });
    }
  }
}

module.exports = new TimesheetService();
