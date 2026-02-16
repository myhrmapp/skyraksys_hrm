/**
 * User Data Service
 * 
 * Pure data access layer for User model.
 * Contains only CRUD operations for user accounts.
 * 
 * @class UserDataService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const db = require('../../models');
const { User } = db;

class UserDataService {
  /**
   * Find user by ID
   * @param {string} id - User UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return User.findByPk(id);
  }

  /**
   * Find user by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return User.findOne({ where: { email } });
  }

  /**
   * Create new user
   * @param {Object} data - User data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    return User.create(data, options);
  }

  /**
   * Update user
   * @param {string} id - User UUID
   * @param {Object} data - Update data
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>}
   */
  async update(id, data, options = {}) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user.update(data, options);
  }

  /**
   * Delete user
   * @param {string} id - User UUID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const user = await User.findByPk(id);
    if (!user) {
      return false;
    }
    await user.destroy();
    return true;
  }
}

// Export singleton instance
module.exports = new UserDataService();
