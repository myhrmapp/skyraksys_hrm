/**
 * Salary Data Service
 * 
 * Pure data access layer for SalaryStructure model.
 * Contains only CRUD operations for salary structures.
 * 
 * @class SalaryDataService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const db = require('../../models');
const { SalaryStructure } = db;

class SalaryDataService {
  /**
   * Find salary by ID
   * @param {string} id - Salary UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return SalaryStructure.findByPk(id);
  }

  /**
   * Find salary by employee ID
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Object|null>}
   */
  async findByEmployeeId(employeeId) {
    return SalaryStructure.findOne({ 
      where: { employeeId },
      order: [['effectiveFrom', 'DESC']]
    });
  }

  /**
   * Find all salaries for employee
   * @param {string} employeeId - Employee UUID
   * @returns {Promise<Array>}
   */
  async findAllByEmployeeId(employeeId) {
    return SalaryStructure.findAll({ 
      where: { employeeId },
      order: [['effectiveFrom', 'DESC']]
    });
  }

  /**
   * Create new salary structure
   * @param {Object} data - Salary data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    // Set effectiveFrom to current date if not provided
    if (!data.effectiveFrom) {
      data.effectiveFrom = new Date();
    }
    return SalaryStructure.create(data, options);
  }

  /**
   * Update salary structure
   * @param {string} id - Salary UUID
   * @param {Object} data - Update data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async update(id, data, options = {}) {
    const salary = await SalaryStructure.findByPk(id);
    if (!salary) {
      throw new Error('Salary structure not found');
    }
    return salary.update(data, options);
  }

  /**
   * Delete salary structure
   * @param {string} id - Salary UUID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const salary = await SalaryStructure.findByPk(id);
    if (!salary) {
      return false;
    }
    await salary.destroy();
    return true;
  }
}

// Export singleton instance
module.exports = new SalaryDataService();
