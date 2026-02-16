/**
 * Leave Data Service
 * 
 * Pure data access layer for LeaveRequest model.
 * Contains only CRUD operations and database queries.
 * 
 * @class LeaveDataService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const LeaveService = require('../LeaveService');

class LeaveDataService {
  constructor() {
    // Use existing LeaveService as the underlying data access layer
    this.service = LeaveService;
  }

  /**
   * Find all leave requests with details
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async findAllWithDetails(options = {}) {
    return this.service.findAllWithDetails(options);
  }

  /**
   * Find leave request by ID
   * @param {string} id - Leave request UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return this.service.findById(id);
  }

  /**
   * Find leave by ID with details
   * @param {string} id - Leave request UUID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithDetails(id) {
    return this.service.findByIdWithDetails(id);
  }

  /**
   * Find leaves by employee
   * @param {string} employeeId - Employee UUID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByEmployee(employeeId, options = {}) {
    return this.service.findByEmployee(employeeId, options);
  }

  /**
   * Find leaves by status
   * @param {string} status - Leave status
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByStatus(status, options = {}) {
    return this.service.findByStatus(status, options);
  }

  /**
   * Find leaves by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async findByDateRange(startDate, endDate, options = {}) {
    return this.service.findByDateRange(startDate, endDate, options);
  }

  /**
   * Create leave request
   * @param {Object} data - Leave data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    return this.service.create(data, options);
  }

  /**
   * Update leave request
   * @param {string} id - Leave request UUID
   * @param {Object} data - Update data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async update(id, data, options = {}) {
    return this.service.update(id, data, options);
  }

  /**
   * Delete leave request
   * @param {string} id - Leave request UUID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return this.service.delete(id);
  }

  /**
   * Count leave requests
   * @param {Object} options - Query options
   * @returns {Promise<number>}
   */
  async count(options = {}) {
    return this.service.count(options);
  }

  /**
   * Get leave statistics for employee
   * @param {string} employeeId - Employee UUID
   * @param {number} year - Year
   * @returns {Promise<Object>}
   */
  async getLeaveStats(employeeId, year) {
    return this.service.getLeaveStats(employeeId, year);
  }

  /**
   * Find all leaves with filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    return this.service.findAll(options);
  }
}

// Export singleton instance
module.exports = new LeaveDataService();
