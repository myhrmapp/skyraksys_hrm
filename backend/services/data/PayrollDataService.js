/**
 * Payroll Data Service
 * Data access layer for payroll operations
 * 
 * Responsibilities:
 * - Wrap PayrollService for data access
 * - Provide consistent interface for business layer
 * - Handle includes and relationships
 * - Abstract database operations
 * 
 * @module services/data/PayrollDataService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07
 */

const payrollService = require('../PayrollService');
const db = require('../../models');

class PayrollDataService {
  constructor() {
    this.service = payrollService;
  }

  /**
   * Find all payroll records with relationships
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAllWithDetails(options = {}) {
    return this.service.findAllWithDetails(options);
  }

  /**
   * Find payroll record by ID
   * @param {string} id - Payroll ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return this.service.findById(id);
  }

  /**
   * Find payroll record by ID with details
   * @param {string} id - Payroll ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithDetails(id) {
    return this.service.findById(id, {
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email'],
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['id', 'email', 'role']
            },
            {
              model: db.Department,
              as: 'department',
              attributes: ['id', 'name']
            },
            {
              model: db.Position,
              as: 'position',
              attributes: ['id', 'title']
            },
            {
              model: db.SalaryStructure,
              as: 'salaryStructure',
              attributes: [
                'id', 'basicSalary', 'hra', 'allowances',
                'pfContribution', 'tds', 'professionalTax', 'otherDeductions',
                'currency', 'effectiveFrom', 'isActive'
              ]
            }
          ]
        }
      ]
    });
  }

  /**
   * Find payroll records by employee
   * @param {string} employeeId - Employee ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByEmployee(employeeId, options = {}) {
    return this.service.findByEmployee(employeeId, options);
  }

  /**
   * Find payroll records by pay period
   * @param {Date} start - Period start date
   * @param {Date} end - Period end date
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByPayPeriod(start, end, options = {}) {
    return this.service.findByPayPeriod(start, end, options);
  }

  /**
   * Find payroll records by status
   * @param {string} status - Payroll status
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByStatus(status, options = {}) {
    return this.service.findByStatus(status, options);
  }

  /**
   * Calculate payroll for employee
   * @param {string} employeeId - Employee ID
   * @param {Date} periodStart - Pay period start
   * @param {Date} periodEnd - Pay period end
   * @param {Object} overrides - Manual overrides
   * @returns {Promise<Object>} Calculated payroll data
   */
  async calculatePayroll(employeeId, periodStart, periodEnd, overrides = {}) {
    return this.service.calculatePayroll(employeeId, periodStart, periodEnd, overrides);
  }

  /**
   * Create payroll record
   * @param {Object} data - Payroll data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    return this.service.create(data, options);
  }

  /**
   * Update payroll record
   * @param {string} id - Payroll ID
   * @param {Object} data - Update data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async update(id, data, options = {}) {
    return this.service.update(id, data, options);
  }

  /**
   * Delete payroll record
   * @param {string} id - Payroll ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return this.service.delete(id);
  }

  /**
   * Count payroll records
   * @param {Object} options - Query options
   * @returns {Promise<number>}
   */
  async count(options = {}) {
    return this.service.count(options);
  }

  /**
   * Generate payslip
   * @param {string} payrollId - Payroll record ID
   * @returns {Promise<Object>}
   */
  async generatePayslip(payrollId) {
    return this.service.generatePayslip(payrollId);
  }

  /**
   * Bulk generate payroll for multiple employees
   * @param {Array<string>} employeeIds - Employee IDs
   * @param {Date} periodStart - Pay period start
   * @param {Date} periodEnd - Pay period end
   * @returns {Promise<Array>}
   */
  async bulkGeneratePayroll(employeeIds, periodStart, periodEnd) {
    return this.service.bulkGeneratePayroll(employeeIds, periodStart, periodEnd);
  }

  /**
   * Get payroll summary with aggregations
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async getPayrollSummary(startDate, endDate, filters = {}) {
    return this.service.getPayrollSummary(startDate, endDate, filters);
  }
}

// Export singleton instance
module.exports = new PayrollDataService();
