/**
 * Leave Balance Data Service
 * 
 * Pure data access layer for LeaveBalance model.
 * Contains only CRUD operations for leave balances.
 * 
 * @class LeaveBalanceDataService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const db = require('../../models');
const { LeaveBalance, LeaveType } = db;

class LeaveBalanceDataService {
  /**
   * Find leave balance by ID
   * @param {string} id - LeaveBalance UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return LeaveBalance.findByPk(id, {
      include: [{ model: LeaveType, as: 'leaveType' }]
    });
  }

  /**
   * Find leave balances for employee
   * @param {string} employeeId - Employee UUID
   * @param {number} year - Year
   * @returns {Promise<Array>}
   */
  async findByEmployeeId(employeeId, year = null) {
    const where = { employeeId };
    if (year) {
      where.year = year;
    }
    
    return LeaveBalance.findAll({ 
      where,
      include: [{ model: LeaveType, as: 'leaveType' }],
      order: [['year', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  /**
   * Find specific leave balance
   * @param {string} employeeId - Employee UUID
   * @param {string} leaveTypeId - LeaveType UUID
   * @param {number} year - Year
   * @returns {Promise<Object|null>}
   */
  async findSpecificBalance(employeeId, leaveTypeId, year) {
    return LeaveBalance.findOne({
      where: {
        employeeId,
        leaveTypeId,
        year
      }
    });
  }

  /**
   * Create new leave balance
   * @param {Object} data - Leave balance data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    return LeaveBalance.create(data, options);
  }

  /**
   * Update leave balance
   * @param {string} id - LeaveBalance UUID
   * @param {Object} data - Update data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async update(id, data, options = {}) {
    const balance = await LeaveBalance.findByPk(id);
    if (!balance) {
      throw new Error('Leave balance not found');
    }
    return balance.update(data, options);
  }

  /**
   * Update balance by employee and leave type
   * @param {string} employeeId - Employee UUID
   * @param {string} leaveTypeId - LeaveType UUID
   * @param {number} year - Year
   * @param {Object} data - Update data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async updateByEmployee(employeeId, leaveTypeId, year, data, options = {}) {
    const balance = await this.findSpecificBalance(employeeId, leaveTypeId, year);
    if (!balance) {
      throw new Error('Leave balance not found');
    }
    return balance.update(data, options);
  }

  /**
   * Delete leave balance
   * @param {string} id - LeaveBalance UUID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const balance = await LeaveBalance.findByPk(id);
    if (!balance) {
      return false;
    }
    await balance.destroy();
    return true;
  }
}

// Export singleton instance
module.exports = new LeaveBalanceDataService();
