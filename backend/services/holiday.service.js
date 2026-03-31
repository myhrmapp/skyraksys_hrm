/**
 * Holiday Service (GAP Item 12.5)
 * 
 * Business logic for holiday calendar.
 * Provides utility methods for payroll/timesheet/attendance integration.
 */

const { Op } = require('sequelize');
const logger = require('../utils/logger');
const db = require('../models');
const { formatDateLocal } = require('../utils/dateUtils');

class HolidayService {
  /**
   * Get holidays for a given year
   */
  async getHolidaysByYear(year, options = {}) {
    const { type, includeInactive = false } = options;
    const where = { year: parseInt(year) };
    if (type) where.type = type;
    if (!includeInactive) where.isActive = true;

    return db.Holiday.findAll({
      where,
      order: [['date', 'ASC']]
    });
  }

  /**
   * Get holidays between two dates (for payroll/timesheet calculations)
   */
  async getHolidaysBetween(startDate, endDate, types = ['public', 'company']) {
    return db.Holiday.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] },
        type: { [Op.in]: types },
        isActive: true
      },
      attributes: ['id', 'name', 'date', 'type'],
      order: [['date', 'ASC']]
    });
  }

  /**
   * Count working-day holidays between two dates (for payroll deductions)
   */
  async countHolidaysBetween(startDate, endDate, types = ['public', 'company']) {
    return db.Holiday.count({
      where: {
        date: { [Op.between]: [startDate, endDate] },
        type: { [Op.in]: types },
        isActive: true
      }
    });
  }

  /**
   * Check if a specific date is a holiday
   * @returns {Object|null} — holiday record if the date is a holiday, null otherwise
   */
  async isHoliday(date) {
    return db.Holiday.findOne({
      where: {
        date,
        isActive: true
      }
    });
  }

  /**
   * Get the next N upcoming holidays from today
   */
  async getUpcomingHolidays(count = 5) {
    const today = formatDateLocal();
    return db.Holiday.findAll({
      where: {
        date: { [Op.gte]: today },
        isActive: true
      },
      order: [['date', 'ASC']],
      limit: count
    });
  }

  /**
   * Generate recurring holidays for a new year
   * Copies all isRecurring=true holidays from the previous year into the target year
   */
  async generateRecurringHolidays(targetYear, createdBy) {
    const recurring = await db.Holiday.findAll({
      where: {
        year: targetYear - 1,
        isRecurring: true,
        isActive: true
      }
    });

    if (recurring.length === 0) {
      logger.info(`No recurring holidays found for year ${targetYear - 1}`);
      return [];
    }

    const newHolidays = recurring.map(h => {
      const oldDate = new Date(h.date);
      const newDate = new Date(targetYear, oldDate.getMonth(), oldDate.getDate());
      return {
        name: h.name,
        date: formatDateLocal(newDate),
        type: h.type,
        year: targetYear,
        isRecurring: true,
        description: h.description,
        isActive: true,
        createdBy
      };
    });

    const created = await db.Holiday.bulkCreate(newHolidays, { ignoreDuplicates: true });
    logger.info(`Generated ${created.length} recurring holidays for ${targetYear}`);
    return created;
  }

  /**
   * Get holiday dates as a Set for fast O(1) lookups (used by attendance/timesheet)
   * @returns {Set<string>} — set of date strings in YYYY-MM-DD format
   */
  async getHolidayDateSet(startDate, endDate) {
    const holidays = await this.getHolidaysBetween(startDate, endDate);
    return new Set(holidays.map(h => h.date));
  }
}

module.exports = new HolidayService();
