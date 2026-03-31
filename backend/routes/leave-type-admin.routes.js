const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const db = require('../models');
const logger = require('../utils/logger');

const LeaveType = db.LeaveType;
const router = express.Router();

// All routes require admin or HR role
router.use(authenticateToken);
router.use(authorize('admin', 'hr'));

// GET /api/admin/leave-types — List all leave types (including inactive)
router.get('/', async (req, res, next) => {
  try {
    const leaveTypes = await LeaveType.findAll({
      order: [['name', 'ASC']],
      paranoid: false // Include soft-deleted records if needed
    });
    res.json({ success: true, data: leaveTypes });
  } catch (error) {
    logger.error('Failed to fetch leave types:', error);
    next(error);
  }
});

// GET /api/admin/leave-types/:id — Get single leave type
router.get('/:id', async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id);
    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }
    res.json({ success: true, data: leaveType });
  } catch (error) {
    logger.error('Failed to fetch leave type:', error);
    next(error);
  }
});

// POST /api/admin/leave-types — Create a new leave type
router.post('/', async (req, res, next) => {
  try {
    const { name, description, maxDaysPerYear, carryForward, maxCarryForwardDays, isActive, isPaid } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Leave type name is required' });
    }

    // Check for duplicate name
    const existing = await LeaveType.findOne({ where: { name: name.trim() }, paranoid: false });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A leave type with this name already exists' });
    }

    const leaveType = await LeaveType.create({
      name: name.trim(),
      description: description?.trim() || null,
      maxDaysPerYear: maxDaysPerYear ?? 20,
      carryForward: carryForward ?? false,
      maxCarryForwardDays: maxCarryForwardDays ?? 0,
      isActive: isActive ?? true,
      isPaid: isPaid ?? true
    });

    logger.info(`Leave type created: ${leaveType.name} by user ${req.user.id}`);
    res.status(201).json({ success: true, data: leaveType });
  } catch (error) {
    logger.error('Failed to create leave type:', error);
    next(error);
  }
});

// PUT /api/admin/leave-types/:id — Update a leave type
router.put('/:id', async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id);
    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    const { name, description, maxDaysPerYear, carryForward, maxCarryForwardDays, isActive, isPaid } = req.body;

    // If name is being changed, check for duplicates
    if (name && name.trim() !== leaveType.name) {
      const existing = await LeaveType.findOne({
        where: { name: name.trim() },
        paranoid: false
      });
      if (existing && existing.id !== leaveType.id) {
        return res.status(409).json({ success: false, message: 'A leave type with this name already exists' });
      }
    }

    await leaveType.update({
      name: name?.trim() ?? leaveType.name,
      description: description !== undefined ? (description?.trim() || null) : leaveType.description,
      maxDaysPerYear: maxDaysPerYear ?? leaveType.maxDaysPerYear,
      carryForward: carryForward ?? leaveType.carryForward,
      maxCarryForwardDays: maxCarryForwardDays ?? leaveType.maxCarryForwardDays,
      isActive: isActive ?? leaveType.isActive,
      isPaid: isPaid ?? leaveType.isPaid
    });

    logger.info(`Leave type updated: ${leaveType.name} by user ${req.user.id}`);
    res.json({ success: true, data: leaveType });
  } catch (error) {
    logger.error('Failed to update leave type:', error);
    next(error);
  }
});

// DELETE /api/admin/leave-types/:id — Soft-delete a leave type
router.delete('/:id', async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id);
    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    // Check if any active leave balances reference this type
    const activeBalances = await db.LeaveBalance.count({
      where: { leaveTypeId: leaveType.id }
    });

    if (activeBalances > 0) {
      // Soft-deactivate instead of deleting
      await leaveType.update({ isActive: false });
      logger.info(`Leave type deactivated (has ${activeBalances} balances): ${leaveType.name} by user ${req.user.id}`);
      return res.json({
        success: true,
        message: `Leave type deactivated (${activeBalances} existing balances preserved)`,
        data: leaveType
      });
    }

    await leaveType.destroy(); // Soft delete (paranoid: true)
    logger.info(`Leave type deleted: ${leaveType.name} by user ${req.user.id}`);
    res.json({ success: true, message: 'Leave type deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete leave type:', error);
    next(error);
  }
});

module.exports = router;
