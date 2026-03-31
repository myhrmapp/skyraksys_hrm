/**
 * Base Business Service
 * 
 * Abstract base class for all business services.
 * Business services contain pure business logic with no HTTP knowledge.
 * 
 * Responsibilities:
 * - Orchestrate business workflows
 * - Validate business rules
 * - Coordinate multiple data services
 * - Transaction management
 * - Business calculations
 * 
 * Business services should NOT:
 * - Handle HTTP requests/responses
 * - Access req/res objects
 * - Know about REST/GraphQL
 * 
 * @abstract
 * @class BaseBusinessService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');
const db = require('../../models');
const logger = require('../../utils/logger');

class BaseBusinessService {
  /**
   * Constructor
   * @param {string} name - Service name (for logging)
   */
  constructor(name) {
    this.name = name;
    this.db = db;
  }

  /**
   * Start a database transaction
   * @returns {Promise<Transaction>}
   */
  async startTransaction() {
    return this.db.sequelize.transaction();
  }

  /**
   * Validate business rules (override in subclasses)
   * @param {Object} data - Data to validate
   * @param {string} context - Validation context ('create', 'update', etc.)
   * @returns {Promise<void>}
   * @throws {ValidationError}
   */
  async validate(data, context = 'create') {
    // Override in subclasses
    return;
  }

  /**
   * Calculate age from date of birth
   * @param {Date|string} dateOfBirth
   * @returns {number}
   */
  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if date is in future
   * @param {Date|string} date
   * @returns {boolean}
   */
  isFutureDate(date) {
    return new Date(date) > new Date();
  }

  /**
   * Check if date is in past
   * @param {Date|string} date
   * @returns {boolean}
   */
  isPastDate(date) {
    return new Date(date) < new Date();
  }

  /**
   * Format date to YYYY-MM-DD using local time components.
   * Safe for DATEONLY columns regardless of server timezone.
   * @param {Date|string} date
   * @returns {string}
   */
  formatDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Log business event (for audit/debugging)
   * @param {string} action - Action performed
   * @param {Object} data - Additional data
   */
  log(action, data = {}) {
    logger.info(`[${this.name}] ${action}`, { detail: data });
  }
}

module.exports = BaseBusinessService;
