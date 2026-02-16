const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { seedAllDemoData, purgeDemoData } = require('../utils/demoSeed');
const logger = require('../utils/logger');

// Protect all routes: admin only
router.use(authenticateToken, authorize('admin'));

/**
 * @swagger
 * tags:
 *   - name: Admin Config
 *     description: Admin-only configuration and diagnostics
 */

/**
 * @swagger
 * /admin/config:
 *   get:
 *     summary: Get effective server configuration (safe subset)
 *     tags: [Admin Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
// GET current effective configuration (safe subset)
router.get('/', (req, res) => {
  const safeEnv = {
    nodeEnv: process.env.NODE_ENV,
    corsAllowAll: process.env.CORS_ALLOW_ALL === 'true',
    seedDemoData: process.env.SEED_DEMO_DATA === 'true',
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
      authEnabled: process.env.RATE_LIMIT_AUTH_ENABLED !== 'false',
      authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10),
      authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20', 10)
    },
    apiBaseUrl: process.env.API_BASE_URL,
    domain: process.env.DOMAIN,
    db: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      ssl: process.env.DB_SSL === 'true'
    }
  };
  res.json({ success: true, data: safeEnv });
});

/**
 * @swagger
 * /admin/config/toggle-seeding:
 *   post:
 *     summary: Toggle demo data seeding flag in-memory for current server process
 *     tags: [Admin Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Seeding flag toggled
 */
// POST toggle seeding flag in-memory (for current process only)
router.post('/toggle-seeding', async (req, res, next) => {
  const desired = req.body?.enabled;
  if (typeof desired !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Body must include { "enabled": boolean }' });
  }
  process.env.SEED_DEMO_DATA = desired ? 'true' : 'false';
  return res.json({ success: true, message: `SEED_DEMO_DATA set to ${process.env.SEED_DEMO_DATA}` });
});

/**
 * @swagger
 * /admin/config/seed-now:
 *   post:
 *     summary: Run demo data seeding immediately
 *     tags: [Admin Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seeding executed
 */
// POST run seeding now (idempotent-ish; will insert known keys)
router.post('/seed-now', async (req, res, next) => {
  try {
    await seedAllDemoData();
    res.json({ success: true, message: 'Demo data seed executed' });
  } catch (err) {
    logger.error('Seeding error:', { detail: err });
    next(error);
  }
});

/**
 * @swagger
 * /admin/config/purge-demo:
 *   post:
 *     summary: Purge previously seeded demo data (known identifiers)
 *     tags: [Admin Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Demo data purged
 */
// POST purge demo data (destructive for known seeded entities)
router.post('/purge-demo', async (req, res, next) => {
  try {
    await purgeDemoData();
    res.json({ success: true, message: 'Demo data purged' });
  } catch (err) {
    logger.error('Purge error:', { detail: err });
    next(error);
  }
});

module.exports = router;
