/**
 * Cron Scheduler (GAP Item 12.2)
 * 
 * Automated scheduled tasks using node-cron:
 * - Monthly leave accrual (1st of each month at 00:05 AM)
 * - Year-end carry-forward (Jan 1st at 00:01 AM)
 * - Token cleanup (daily at 02:00 AM)
 * 
 * Usage: require('./services/scheduler') in server.js after DB is ready
 */

const logger = require('../utils/logger');

let cron;
try {
  cron = require('node-cron');
} catch {
  logger.warn('node-cron not installed — scheduled tasks disabled. Run: npm install node-cron');
}

function initScheduler() {
  if (!cron) {
    logger.warn('Scheduler not initialized — node-cron is not available');
    return;
  }

  logger.info('Initializing cron scheduler...');

  // ─── Monthly Leave Accrual ────────────────────────────────────
  // Runs on the 1st of every month at 00:05 AM
  cron.schedule('5 0 1 * *', async () => {
    logger.info('[CRON] Running monthly leave accrual...');
    try {
      const leaveAccrualService = require('./leave-accrual.service');
      const now = new Date();
      const result = await leaveAccrualService.runMonthlyAccrual(
        now.getFullYear(),
        now.getMonth() + 1
      );
      logger.info('[CRON] Monthly leave accrual completed', result);
    } catch (error) {
      logger.error('[CRON] Monthly leave accrual failed', { error: error.message });
    }
  }, {
    timezone: process.env.TZ || 'Asia/Kolkata'
  });

  // ─── Year-End Carry-Forward ───────────────────────────────────
  // Runs on January 1st at 00:01 AM (BEFORE the monthly accrual)
  cron.schedule('1 0 1 1 *', async () => {
    logger.info('[CRON] Running year-end leave carry-forward...');
    try {
      const leaveAccrualService = require('./leave-accrual.service');
      const newYear = new Date().getFullYear();
      const result = await leaveAccrualService.runYearEndCarryForward(newYear);
      logger.info('[CRON] Year-end carry-forward completed', result);
    } catch (error) {
      logger.error('[CRON] Year-end carry-forward failed', { error: error.message });
    }
  }, {
    timezone: process.env.TZ || 'Asia/Kolkata'
  });

  // ─── Token Cleanup ────────────────────────────────────────────
  // Runs daily at 02:00 AM — cleans up expired password reset tokens
  cron.schedule('0 2 * * *', async () => {
    logger.info('[CRON] Running token cleanup...');
    try {
      const tokenService = require('./password-reset-token.service');
      const result = await tokenService.cleanupExpiredData();
      logger.info('[CRON] Token cleanup completed', result);
    } catch (error) {
      logger.error('[CRON] Token cleanup failed', { error: error.message });
    }
  }, {
    timezone: process.env.TZ || 'Asia/Kolkata'
  });

  logger.info('Cron scheduler initialized — 3 scheduled tasks registered');
}

module.exports = { initScheduler };
