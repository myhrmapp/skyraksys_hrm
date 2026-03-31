/**
 * Attendance Routes (GAP Item 12.1)
 * 
 * Employee self-service: check-in, check-out, view own attendance.
 * Admin/Manager: view all, daily report, manual mark, monthly report.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { attendanceSchema } = require('../middleware/validators/attendance.validator');
const logger = require('../utils/logger');
const attendanceService = require('../services/attendance.service');

// All routes require authentication
router.use(authenticateToken);

// ─── Main Attendance CRUD ──────────────────────────────────────

/**
 * GET /summary — Get attendance summary (must come before /:id)
 */
router.get('/summary', authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const db = require('../models');
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate) where.date = { [require('sequelize').Op.gte]: startDate };
    if (endDate) where.date = { ...where.date, [require('sequelize').Op.lte]: endDate };
    
    const summary = await db.Attendance.findAll({
      where,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error fetching attendance summary:', { detail: error });
    next(error);
  }
});

/**
 * GET / — List attendance records (role-based filtering)
 */
router.get('/', async (req, res, next) => {
  try {
    const db = require('../models');
    const { Op } = require('sequelize');
    
    let where = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await db.Employee.findOne({ where: { userId: req.user.id } });
      if (employee) {
        where.employeeId = employee.id;
      }
    } else if (req.user.role === 'manager') {
      const manager = await db.Employee.findOne({ where: { userId: req.user.id } });
      if (manager) {
        const teamMembers = await db.Employee.findAll({ 
          where: { managerId: manager.id },
          attributes: ['id']
        });
        where.employeeId = { [Op.in]: teamMembers.map(e => e.id) };
      }
    }
    // Admin/HR see all records (no filter)
    
    const records = await db.Attendance.findAll({
      where,
      include: [{
        model: db.Employee,
        as: 'employee',
        attributes: ['id', 'employeeId', 'firstName', 'lastName']
      }],
      order: [['date', 'DESC'], ['checkIn', 'DESC']]
    });
    
    res.json({ success: true, data: records });
  } catch (error) {
    logger.error('Error fetching attendance:', { detail: error });
    next(error);
  }
});

/**
 * POST / — Create attendance record (admin/hr only)
 */
router.post('/', authorize('admin', 'hr'), async (req, res, next) => {
  try {
    const { error, value } = attendanceSchema.mark.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }
    const db = require('../models');
    const { employeeId, date, status, checkIn, checkOut, notes } = value;
    const record = await db.Attendance.create({ employeeId, date, status, checkIn, checkOut, notes, source: 'manual', approvedBy: req.user.id });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error('Error creating attendance record:', { detail: error });
    next(error);
  }
});

/**
 * PUT /:id — Update attendance record
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { error, value } = attendanceSchema.update.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }

    const db = require('../models');
    
    const record = await db.Attendance.findByPk(req.params.id, {
      include: [{
        model: db.Employee,
        as: 'employee',
        attributes: ['userId']
      }]
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    // Authorization: Only admin/hr can update any record, employees can only update their own
    const isAdmin = ['admin', 'hr'].includes(req.user.role);
    const isOwnRecord = record.employee && record.employee.userId === req.user.id;
    
    if (!isAdmin && !isOwnRecord) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this attendance record'
      });
    }
    
    await record.update(value);
    res.json({ success: true, data: record });
  } catch (error) {
    logger.error('Error updating attendance record:', { detail: error });
    next(error);
  }
});

/**
 * DELETE /:id — Delete attendance record (admin/hr only)
 */
router.delete('/:id', authorize('admin', 'hr'), async (req, res, next) => {
  try {
    const db = require('../models');
    
    const record = await db.Attendance.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    await record.destroy();
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    logger.error('Error deleting attendance record:', { detail: error });
    next(error);
  }
});

/**
 * POST /clock-in — Alias for check-in (test compatibility)
 */
router.post('/clock-in', async (req, res, next) => {
  try {
    const { error, value } = attendanceSchema.checkIn.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    const data = await attendanceService.checkIn(req.user.id, value);
    res.status(201).json({ success: true, message: 'Clocked in successfully', data });
  } catch (error) {
    logger.error('Clock-in failed:', { detail: error });
    next(error);
  }
});

/**
 * POST /clock-out — Alias for check-out (test compatibility)
 */
router.post('/clock-out', async (req, res, next) => {
  try {
    const { error, value } = attendanceSchema.checkOut.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
      });
    }

    const data = await attendanceService.checkOut(req.user.id, value);
    res.json({ success: true, message: 'Clocked out successfully', data });
  } catch (error) {
    logger.error('Clock-out failed:', { detail: error });
    next(error);
  }
});

// ─── Employee Self-Service ──────────────────────────────────────

/**
 * POST /check-in — Employee checks in
 */
router.post('/check-in', async (req, res, next) => {
  try {
    const { error, value } = attendanceSchema.checkIn.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const { notes } = value;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    const attendance = await attendanceService.checkIn(req.employeeId, {
      source: 'web',
      notes,
      ipAddress
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.warn('Check-in failed', { employeeId: req.employeeId, error: error.message });
    next(error);
  }
});

/**
 * POST /check-out — Employee checks out
 */
router.post('/check-out', async (req, res, next) => {
  try {
    const { notes } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    const attendance = await attendanceService.checkOut(req.employeeId, {
      notes,
      ipAddress
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.warn('Check-out failed', { employeeId: req.employeeId, error: error.message });
    next(error);
  }
});

/**
 * GET /today — Get today's attendance status for current employee
 */
router.get('/today', async (req, res, next) => {
  try {
    const attendance = await attendanceService.getTodayStatus(req.employeeId);
    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Error fetching today status', { error: error.message });
    next(error);
  }
});

/**
 * GET /my — Get current employee's attendance for a date range
 * Query: startDate, endDate
 */
router.get('/my', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const records = await attendanceService.getEmployeeAttendance(req.employeeId, startDate, endDate);
    res.json({ success: true, data: records });
  } catch (error) {
    logger.error('Error fetching my attendance', { error: error.message });
    next(error);
  }
});

/**
 * GET /my/report — Get monthly report for current employee
 * Query: year, month
 */
router.get('/my/report', async (req, res, next) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'year and month are required' });
    }

    const report = await attendanceService.getMonthlyReport(
      req.employeeId,
      parseInt(year),
      parseInt(month)
    );
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Error fetching monthly report', { error: error.message });
    next(error);
  }
});

// ─── Admin/Manager Routes ───────────────────────────────────────

/**
 * GET /daily — Get daily attendance for all employees (admin/manager)
 * Query: date, departmentId, page, limit
 */
router.get('/daily', authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const {
      date = new Date().toISOString().split('T')[0],
      departmentId,
      page = 1,
      limit = 50
    } = req.query;

    const result = await attendanceService.getDailyAttendance(date, {
      departmentId,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error fetching daily attendance', { error: error.message });
    next(error);
  }
});

/**
 * GET /employee/:employeeId/report — Get monthly report for specific employee (admin)
 * Query: year, month
 */
router.get('/employee/:employeeId/report', authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'year and month are required' });
    }

    const report = await attendanceService.getMonthlyReport(
      req.params.employeeId,
      parseInt(year),
      parseInt(month)
    );
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('Error fetching employee report', { error: error.message });
    next(error);
  }
});

/**
 * POST /mark — Manually mark/correct attendance (admin/HR)
 */
router.post('/mark', authorize('admin', 'hr'), async (req, res, next) => {
  try {
    const { error, value } = attendanceSchema.mark.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }

    const { employeeId, date, status, checkIn, checkOut, notes } = value;

    const attendance = await attendanceService.markAttendance({
      employeeId,
      date,
      status,
      checkIn,
      checkOut,
      notes,
      approvedBy: req.user.id,
      source: 'manual'
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    logger.error('Error marking attendance', { error: error.message });
    next(error);
  }
});

/**
 * GET /summary — Get attendance summary counts for a date range (dashboard)
 * Query: startDate, endDate
 */
router.get('/summary', authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const summary = await attendanceService.getAttendanceSummary(startDate, endDate);
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error fetching attendance summary', { error: error.message });
    next(error);
  }
});

// ─── Parameterized Routes (MUST come AFTER all named routes) ────

/**
 * GET /:id — Get specific attendance record
 * NOTE: Must be last GET route to avoid shadowing /today, /daily, /my, etc.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const db = require('../models');
    
    const record = await db.Attendance.findByPk(req.params.id, {
      include: [{
        model: db.Employee,
        as: 'employee',
        attributes: ['id', 'employeeId', 'firstName', 'lastName']
      }]
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    logger.error('Error fetching attendance record:', { detail: error });
    next(error);
  }
});

module.exports = router;
