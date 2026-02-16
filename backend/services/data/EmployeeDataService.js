/**
 * Employee Data Service
 * 
 * Pure data access layer for Employee model.
 * Contains only CRUD operations and database queries.
 * No business logic - that belongs in EmployeeBusinessService.
 * 
 * This is a wrapper around the existing EmployeeService to maintain
 * backward compatibility during Phase 2 migration.
 * 
 * @class EmployeeDataService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const EmployeeService = require('../EmployeeService');

class EmployeeDataService {
  constructor() {
    // Use existing EmployeeService as the underlying data access layer
    this.service = EmployeeService;
  }

  /**
   * Find all employees with details
   * @param {Object} options - Query options (page, limit, search, etc.)
   * @returns {Promise<Object>} { data: [], pagination: {} }
   */
  async findAllWithDetails(options = {}) {
    return this.service.findAllWithDetails(options);
  }

  /**
   * Find employee by ID with full details
   * @param {string} id - Employee UUID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithDetails(id) {
    return this.service.findByIdWithDetails(id);
  }

  /**
   * Find employee by ID (basic)
   * @param {string} id - Employee UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return this.service.findById(id);
  }

  /**
   * Find employee by employee ID (SKYT####)
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object|null>}
   */
  async findByEmployeeId(employeeId) {
    return this.service.findByEmployeeId(employeeId);
  }

  /**
   * Find employee by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return this.service.findByEmail(email);
  }

  /**
   * Find employees by department
   * @param {string} departmentId - Department UUID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByDepartment(departmentId, options = {}) {
    return this.service.findByDepartment(departmentId, options);
  }

  /**
   * Find employees by position
   * @param {string} positionId - Position UUID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByPosition(positionId, options = {}) {
    return this.service.findByPosition(positionId, options);
  }

  /**
   * Create new employee
   * @param {Object} data - Employee data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    return this.service.create(data, options);
  }

  /**
   * Update employee
   * @param {string} id - Employee UUID
   * @param {Object} data - Update data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async update(id, data, options = {}) {
    return this.service.update(id, data, options);
  }

  /**
   * Delete employee (soft delete)
   * @param {string} id - Employee UUID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return this.service.delete(id);
  }

  /**
   * Get all managers (employees who are managers)
   * @returns {Promise<Array>}
   */
  async getAllManagers() {
    return this.service.getAllManagers();
  }

  /**
   * Get employee statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    return this.service.getStatistics();
  }

  /**
   * Search employees by term
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async searchEmployees(searchTerm, options = {}) {
    return this.service.searchEmployees(searchTerm, options);
  }

  /**
   * Get employee stats
   * @returns {Promise<Object>}
   */
  async getEmployeeStats() {
    return this.service.getEmployeeStats();
  }

  /**
   * Find one employee
   * @param {Object} where - Where conditions
   * @returns {Promise<Object|null>}
   */
  async findOne(where) {
    return this.service.findOne(where);
  }

  /**
   * Get subordinates of manager
   * @param {string} managerId - Manager employee UUID
   * @returns {Promise<Array>}
   */
  async getSubordinates(managerId) {
    return this.service.getSubordinates(managerId);
  }
}

// Export singleton instance
module.exports = new EmployeeDataService();
