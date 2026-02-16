/**
 * Leave Accrual Routes (GAP Item 12.2)
 * 
 * Admin endpoints for leave accrual management:
 * - Preview upcoming accrual
 * - Manually trigger monthly accrual
 * - Trigger year-end carry-forward
 * - View accrual status
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const leaveAccrualService = require('../services/leave-accrual.service');

// All routes require admin/HR authentication
router.use(authenticateToken);
router.use(authorize('admin', 'hr'));

/**
 * GET /status — View accrual status for all employees
 * Query: year (default current year)
 */
router.get('/status', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const data = await leaveAccrualService.getAccrualStatus(year);
    res.json({ success: true, data, year });
  } catch (error) {
    logger.error('Error fetching accrual status', { error: error.message });
    next(error);
  }
});

/**
 * GET /preview — Preview what next accrual would do (dry-run)
 * Query: year, month
 */
router.get('/preview', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    const preview = await leaveAccrualService.previewAccrual(year, month);
    res.json({ success: true, data: preview, year, month });
  } catch (error) {
    logger.error('Error previewing accrual', { error: error.message });
    next(error);
  }
});

/**
 * POST /run — Manually trigger monthly accrual (admin only)
 * Body: { year, month }
 */
router.post('/run', authorize('admin'), async (req, res, next) => {
  try {
    const year = parseInt(req.body.year) || new Date().getFullYear();
    const month = parseInt(req.body.month) || new Date().getMonth() + 1;

    logger.info(`Manual accrual triggered by user ${req.user.id} for ${year}-${month}`);
    const result = await leaveAccrualService.runMonthlyAccrual(year, month);

    res.json({ success: true, data: result, year, month });
  } catch (error) {
    logger.error('Error running manual accrual', { error: error.message });
    next(error);
  }
});

/**
 * POST /carry-forward — Trigger year-end carry-forward (admin only)
 * Body: { newYear }
 */
router.post('/carry-forward', authorize('admin'), async (req, res, next) => {
  try {
    const newYear = parseInt(req.body.newYear) || new Date().getFullYear();

    logger.info(`Year-end carry-forward triggered by user ${req.user.id} for year ${newYear}`);
    const result = await leaveAccrualService.runYearEndCarryForward(newYear);

    res.json({ success: true, data: result, newYear });
  } catch (error) {
    logger.error('Error running carry-forward', { error: error.message });
    next(error);
  }
});

module.exports = router;
