/**
 * Holiday Routes (GAP Item 12.5)
 * 
 * CRUD endpoints for holiday calendar management.
 * Admin/HR only for create/update/delete. All authenticated users can read.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { holidaySchema } = require('../middleware/validators/holiday.validator');
const logger = require('../utils/logger');
const db = require('../models');
const { Op } = require('sequelize');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET / — List holidays (with optional year/type filters & pagination)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      year = new Date().getFullYear(),
      type,
      page = 1,
      limit = 50,
      includeInactive = 'false'
    } = req.query;

    const where = { year: parseInt(year) };
    if (type) where.type = type;
    if (includeInactive !== 'true') where.isActive = true;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await db.Holiday.findAndCountAll({
      where,
      include: [
        { model: db.User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['date', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Error fetching holidays', { error: error.message });
    next(error);
  }
});

/**
 * GET /count — Count holidays in a date range (for payroll integration)
 */
router.get('/count', async (req, res, next) => {
  try {
    const { startDate, endDate, type = 'public' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const count = await db.Holiday.count({
      where: {
        date: { [Op.between]: [startDate, endDate] },
        type: type === 'all' ? { [Op.ne]: null } : type,
        isActive: true
      }
    });

    // Also return the holiday dates for display
    const holidays = await db.Holiday.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] },
        type: type === 'all' ? { [Op.ne]: null } : type,
        isActive: true
      },
      attributes: ['id', 'name', 'date', 'type'],
      order: [['date', 'ASC']]
    });

    res.json({ success: true, count, holidays });
  } catch (error) {
    logger.error('Error counting holidays', { error: error.message });
    next(error);
  }
});

/**
 * GET /:id — Get single holiday
 */
router.get('/:id', async (req, res, next) => {
  try {
    const holiday = await db.Holiday.findByPk(req.params.id, {
      include: [
        { model: db.User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    res.json({ success: true, data: holiday });
  } catch (error) {
    logger.error('Error fetching holiday', { error: error.message });
    next(error);
  }
});

/**
 * POST / — Create holiday (admin/HR only)
 */
router.post('/', authorize('admin', 'hr'), async (req, res, next) => {
  try {
    const { error, value } = holidaySchema.create.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }

    const { name, date, type, isRecurring, description } = value;

    const year = new Date(date).getFullYear();

    const holiday = await db.Holiday.create({
      name,
      date,
      type,
      year,
      isRecurring,
      description,
      createdBy: req.user.id
    });

    logger.info('Holiday created', { id: holiday.id, name, date });
    res.status(201).json({ success: true, data: holiday });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A holiday with this date and name already exists' });
    }
    logger.error('Error creating holiday', { error: error.message });
    next(error);
  }
});

/**
 * PUT /:id — Update holiday (admin/HR only)
 */
router.put('/:id', authorize('admin', 'hr'), async (req, res, next) => {
  try {
    const holiday = await db.Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    const { error, value } = holidaySchema.update.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }

    const { name, date, type, isRecurring, description, isActive } = value;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (date !== undefined) {
      updates.date = date;
      updates.year = new Date(date).getFullYear();
    }
    if (type !== undefined) updates.type = type;
    if (isRecurring !== undefined) updates.isRecurring = isRecurring;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    await holiday.update(updates);

    logger.info('Holiday updated', { id: holiday.id });
    res.json({ success: true, data: holiday });
  } catch (error) {
    logger.error('Error updating holiday', { error: error.message });
    next(error);
  }
});

/**
 * DELETE /:id — Delete holiday (admin only)
 */
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const holiday = await db.Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    await holiday.destroy();

    logger.info('Holiday deleted', { id: req.params.id, name: holiday.name });
    res.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) {
    logger.error('Error deleting holiday', { error: error.message });
    next(error);
  }
});

/**
 * POST /bulk — Bulk create holidays (admin/HR only — for importing annual calendars)
 */
router.post('/bulk', authorize('admin', 'hr'), async (req, res, next) => {
  try {
    const { error, value } = holidaySchema.bulkCreate.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details.map(d => d.message) });
    }

    const { holidays } = value;

    const records = holidays.map(h => ({
      ...h,
      year: new Date(h.date).getFullYear(),
      createdBy: req.user.id
    }));

    const created = await db.Holiday.bulkCreate(records, { ignoreDuplicates: true });

    logger.info(`Bulk created ${created.length} holidays`);
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (error) {
    logger.error('Error bulk creating holidays', { error: error.message });
    next(error);
  }
});

module.exports = router;
