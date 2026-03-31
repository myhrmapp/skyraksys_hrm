/**
 * Attendance Service (GAP Item 12.1)
 * 
 * Business logic for attendance tracking: check-in/out, hours calculation,
 * monthly/daily reports, and integration with holidays.
 */

const { Op } = require('sequelize');
const logger = require('../utils/logger');
const db = require('../models');
const holidayService = require('./holiday.service');
const { formatDateLocal } = require('../utils/dateUtils');

// Default work hours (used as fallback when SystemConfig has no attendance entry)
const DEFAULT_WORK_START = '09:00';
const DEFAULT_WORK_END = '18:00';
const DEFAULT_STANDARD_HOURS = 8;
const DEFAULT_BREAK_MINUTES = 60;

/**
 * Load attendance work-schedule config from SystemConfig table.
 * Falls back to hardcoded defaults if no DB row exists.
 */
let _configCache = null;
let _configCacheTime = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

async function getAttendanceConfig() {
  const now = Date.now();
  if (_configCache && (now - _configCacheTime) < CONFIG_CACHE_TTL) {
    return _configCache;
  }
  try {
    const row = await db.SystemConfig.findOne({
      where: { category: 'attendance', key: 'work_schedule' }
    });
    if (row && row.value) {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      _configCache = {
        workStart: parsed.workStart || DEFAULT_WORK_START,
        workEnd: parsed.workEnd || DEFAULT_WORK_END,
        standardHours: parsed.standardHours ?? DEFAULT_STANDARD_HOURS,
        breakMinutes: parsed.breakMinutes ?? DEFAULT_BREAK_MINUTES,
      };
      _configCacheTime = now;
      return _configCache;
    }
  } catch (err) {
    logger.warn('Failed to load attendance config from SystemConfig, using defaults', { error: err.message });
  }
  return {
    workStart: DEFAULT_WORK_START,
    workEnd: DEFAULT_WORK_END,
    standardHours: DEFAULT_STANDARD_HOURS,
    breakMinutes: DEFAULT_BREAK_MINUTES,
  };
}

class AttendanceService {
  /**
   * Check-in for an employee
   */
  async checkIn(employeeId, options = {}) {
    const { source = 'web', notes, ipAddress } = options;
    const today = formatDateLocal();
    const now = new Date();

    return db.sequelize.transaction(async (transaction) => {
      // Load configurable work schedule
      const cfg = await getAttendanceConfig();

      // Check if already checked in today (with row lock to prevent race conditions)
      const existing = await db.Attendance.findOne({
        where: { employeeId, date: today },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (existing && existing.checkIn) {
        throw new Error('Already checked in today');
      }

      // Calculate late minutes
      const [startHour, startMin] = cfg.workStart.split(':').map(Number);
      const workStart = new Date(now);
      workStart.setHours(startHour, startMin, 0, 0);
      const lateMinutes = now > workStart ? Math.round((now - workStart) / 60000) : 0;
      const status = lateMinutes > 15 ? 'late' : 'present';

      if (existing) {
        // Update existing record (e.g., was marked absent, now checking in)
        await existing.update({
          checkIn: now,
          status,
          lateMinutes,
          source,
          notes,
          ipAddress
        }, { transaction });
        logger.info('Attendance check-in updated', { employeeId, date: today, status });
        return existing;
      }

      const attendance = await db.Attendance.create({
        employeeId,
        date: today,
        checkIn: now,
        status,
        lateMinutes,
        source,
        notes,
        ipAddress
      }, { transaction });

      logger.info('Attendance check-in recorded', { employeeId, date: today, status });
      return attendance;
    });
  }

  /**
   * Check-out for an employee
   */
  async checkOut(employeeId, options = {}) {
    const { notes, ipAddress } = options;
    const today = formatDateLocal();
    const now = new Date();

    return db.sequelize.transaction(async (transaction) => {
      // Load configurable work schedule
      const cfg = await getAttendanceConfig();

      const attendance = await db.Attendance.findOne({
        where: { employeeId, date: today },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!attendance) {
        throw new Error('No check-in found for today');
      }

      if (attendance.checkOut) {
        throw new Error('Already checked out today');
      }

      // Calculate hours worked
      const checkInTime = new Date(attendance.checkIn);
      const totalMinutes = Math.round((now - checkInTime) / 60000);
      const netMinutes = Math.max(0, totalMinutes - (attendance.breakDuration || cfg.breakMinutes));
      const hoursWorked = parseFloat((netMinutes / 60).toFixed(2));

      // Calculate overtime
      const overtimeHours = Math.max(0, parseFloat((hoursWorked - cfg.standardHours).toFixed(2)));

      // Calculate early leave
      const [endHour, endMin] = cfg.workEnd.split(':').map(Number);
      const workEnd = new Date(now);
      workEnd.setHours(endHour, endMin, 0, 0);
      const earlyLeaveMinutes = now < workEnd ? Math.round((workEnd - now) / 60000) : 0;

      // Determine status update
      let status = attendance.status;
      if (hoursWorked < cfg.standardHours / 2) {
        status = 'half-day';
      } else if (attendance.status === 'late') {
        status = 'late'; // Preserve late status
      }

      await attendance.update({
        checkOut: now,
        hoursWorked,
        overtimeHours,
        earlyLeaveMinutes,
        notes: notes || attendance.notes,
        ipAddress: ipAddress || attendance.ipAddress
      }, { transaction });

      logger.info('Attendance check-out recorded', { employeeId, date: today, hoursWorked, overtimeHours });
      return attendance;
    });
  }

  /**
   * Get today's attendance status for an employee
   */
  async getTodayStatus(employeeId) {
    const today = formatDateLocal();
    return db.Attendance.findOne({
      where: { employeeId, date: today }
    });
  }

  /**
   * Get attendance records for an employee in a date range
   */
  async getEmployeeAttendance(employeeId, startDate, endDate) {
    return db.Attendance.findAll({
      where: {
        employeeId,
        date: { [Op.between]: [startDate, endDate] }
      },
      order: [['date', 'ASC']]
    });
  }

  /**
   * Get attendance for all employees on a specific date (admin view)
   */
  async getDailyAttendance(date, options = {}) {
    const { departmentId, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const include = [
      {
        model: db.Employee,
        as: 'employee',
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'departmentId'],
        ...(departmentId && { where: { departmentId } }),
        include: [
          { model: db.Department, as: 'department', attributes: ['id', 'name'] }
        ]
      }
    ];

    const { count, rows } = await db.Attendance.findAndCountAll({
      where: { date },
      include,
      order: [['createdAt', 'ASC']],
      limit,
      offset
    });

    return {
      data: rows,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    };
  }

  /**
   * Generate monthly attendance report for an employee
   */
  async getMonthlyReport(employeeId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = formatDateLocal(new Date(year, month, 0)); // Last day of month

    const records = await this.getEmployeeAttendance(employeeId, startDate, endDate);
    const holidaySet = await holidayService.getHolidayDateSet(startDate, endDate);

    // Compute summary
    const summary = {
      totalDays: new Date(year, month, 0).getDate(),
      workingDays: 0,
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      lateDays: 0,
      holidays: 0,
      weekends: 0,
      leaveDays: 0,
      totalHoursWorked: 0,
      totalOvertimeHours: 0,
      averageHoursPerDay: 0
    };

    // Build a date map
    const recordMap = new Map(records.map(r => [r.date, r]));

    for (let d = 1; d <= summary.totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr).getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        summary.weekends++;
        continue;
      }
      if (holidaySet.has(dateStr)) {
        summary.holidays++;
        continue;
      }

      summary.workingDays++;
      const rec = recordMap.get(dateStr);

      if (!rec) {
        summary.absentDays++;
      } else {
        switch (rec.status) {
          case 'present': summary.presentDays++; break;
          case 'late': summary.lateDays++; summary.presentDays++; break;
          case 'half-day': summary.halfDays++; break;
          case 'on-leave': summary.leaveDays++; break;
          case 'absent': summary.absentDays++; break;
          default: summary.presentDays++;
        }
        summary.totalHoursWorked += parseFloat(rec.hoursWorked || 0);
        summary.totalOvertimeHours += parseFloat(rec.overtimeHours || 0);
      }
    }

    summary.totalHoursWorked = parseFloat(summary.totalHoursWorked.toFixed(2));
    summary.totalOvertimeHours = parseFloat(summary.totalOvertimeHours.toFixed(2));
    summary.averageHoursPerDay = summary.presentDays > 0
      ? parseFloat((summary.totalHoursWorked / summary.presentDays).toFixed(2))
      : 0;

    return { records, summary };
  }

  /**
   * Admin: Mark attendance manually (for corrections)
   */
  async markAttendance(data) {
    const { employeeId, date, status, checkIn, checkOut, notes, approvedBy, source = 'manual' } = data;

    const [attendance, created] = await db.Attendance.findOrCreate({
      where: { employeeId, date },
      defaults: { employeeId, date, status, checkIn, checkOut, notes, approvedBy, source }
    });

    if (!created) {
      await attendance.update({ status, checkIn, checkOut, notes, approvedBy, source });
    }

    // Recalculate hours if both times provided
    if (checkIn && checkOut) {
      const cfg = await getAttendanceConfig();
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);
      const totalMinutes = Math.round((checkOutTime - checkInTime) / 60000);
      const netMinutes = Math.max(0, totalMinutes - cfg.breakMinutes);
      const hoursWorked = parseFloat((netMinutes / 60).toFixed(2));
      const overtimeHours = Math.max(0, parseFloat((hoursWorked - cfg.standardHours).toFixed(2)));
      await attendance.update({ hoursWorked, overtimeHours });
    }

    logger.info(`Attendance ${created ? 'created' : 'updated'} manually`, { employeeId, date, status });
    return attendance;
  }

  /**
   * Get attendance summary counts for a date range (dashboard stats)
   */
  async getAttendanceSummary(startDate, endDate) {
    const results = await db.Attendance.findAll({
      where: { date: { [Op.between]: [startDate, endDate] } },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const summary = {};
    results.forEach(r => {
      summary[r.status] = parseInt(r.getDataValue('count'));
    });
    return summary;
  }
}

module.exports = new AttendanceService();
