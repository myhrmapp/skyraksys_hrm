/**
 * Timesheet Data Service
 * Data access layer for timesheet operations
 * 
 * Responsibilities:
 * - Wrap TimesheetService for data access
 * - Provide consistent interface for business layer
 * - Handle includes and relationships
 * - Abstract database operations
 * 
 * @module services/data/TimesheetDataService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07
 */

const timesheetService = require('../TimesheetService');

class TimesheetDataService {
  constructor() {
    this.service = timesheetService;
  }

  /**
   * Find all timesheets with relationships
   */
  async findAllWithDetails(options = {}) {
    return this.service.findAllWithDetails(options);
  }

  /**
   * Find timesheet by ID (basic)
   */
  async findById(id) {
    return this.service.findById(id);
  }

  /**
   * Find timesheet by ID with relationships
   */
  async findByIdWithDetails(id) {
    const result = await this.service.findAllWithDetails({
      where: { id },
      limit: 1
    });
    
    return result.data?.[0] || null;
  }

  /**
   * Find timesheets by employee
   */
  async findByEmployee(employeeId, options = {}) {
    return this.service.findByEmployee(employeeId, options);
  }

  /**
   * Find timesheets by project
   */
  async findByProject(projectId, options = {}) {
    return this.service.findByProject(projectId, options);
  }

  /**
   * Find timesheets by date range
   */
  async findByDateRange(startDate, endDate, options = {}) {
    return this.service.findByDateRange(startDate, endDate, options);
  }

  /**
   * Find timesheets by week
   */
  async findByWeek(weekStart, options = {}) {
    return this.service.findByWeek(weekStart, options);
  }

  /**
   * Find timesheets by status
   */
  async findByStatus(status, options = {}) {
    return this.service.findAllWithDetails({
      ...options,
      where: { 
        ...options.where,
        status 
      }
    });
  }

  /**
   * Create timesheet entry (transaction-safe)
   */
  async create(data, options = {}) {
    return this.service.create(data, options);
  }

  /**
   * Update timesheet entry (transaction-safe)
   */
  async update(id, data, options = {}) {
    return this.service.update(id, data, options);
  }

  /**
   * Delete timesheet entry
   */
  async delete(id) {
    return this.service.delete(id);
  }

  /**
   * Count timesheets with filters
   */
  async count(options = {}) {
    return this.service.count(options);
  }

  /**
   * Get week start date (Monday)
   */
  getWeekStart(date) {
    return this.service.getWeekStart(date);
  }

  /**
   * Calculate total hours for entries
   */
  calculateTotalHours(entries) {
    return entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  }

  /**
   * Get timesheet summary
   * @param {string} employeeId - Employee UUID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>}
   */
  async getTimesheetSummary(employeeId, startDate, endDate) {
    return this.service.getTimesheetSummary(employeeId, startDate, endDate);
  }

  /**
   * Find all timesheets
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    return this.service.findAll(options);
  }
}

// Export singleton instance
module.exports = new TimesheetDataService();
