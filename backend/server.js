const explicitNodeEnv = process.env.NODE_ENV;
require('dotenv').config();
if (explicitNodeEnv) {
  process.env.NODE_ENV = explicitNodeEnv;
}
require('./config/validateEnv').validateAndExit();
const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { specs, swaggerOptions } = require('./config/swagger');
const { logger } = require('./config/logger');
const { setupMiddleware } = require('./config/middleware');
const { setupErrorHandlers } = require('./config/errorHandlers');
const socket = require('./socket');

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
setupMiddleware(app);

// ============================================
// DATABASE CONNECTION
// ============================================
const db = require('./models');

// Test database connection
db.sequelize.authenticate()
  .then(() => {
    try {
      const dialect = db.sequelize.getDialect();
      const cfg = db.sequelize.config || {};
      const host = cfg.host || process.env.DB_HOST || 'localhost';
      const port = cfg.port || process.env.DB_PORT || '5432';
      const database = cfg.database || process.env.DB_NAME || '(unknown_db)';
      const username = cfg.username || process.env.DB_USER || process.env.DB_USERNAME || '(unknown_user)';
      const sslEnabled = !!(cfg.dialectOptions && (cfg.dialectOptions.ssl || cfg.dialectOptions?.sslmode));
      const pool = cfg.pool || {};
      logger.info(`Database connection established: ${dialect}://${username}@${host}:${port}/${database}${sslEnabled ? ' (SSL enabled)' : ''}`);
      if (dialect === 'postgres') {
        logger.info(`Pool: min=${pool.min ?? 0} max=${pool.max ?? 5} acquire=${pool.acquire ?? 60000} idle=${pool.idle ?? 10000}`);
      }
    } catch (infoErr) {
      logger.info('Database connection established (details unavailable due to introspection error)', { detail: infoErr?.message });
    }
  })
  .catch(err => {
    logger.error('Unable to connect to database', { error: err.message });
  });

// Demo data seeding utilities
const { seedAllDemoData } = require('./utils/demoSeed');

// Initialize database with demo data (gated)
async function initializeDatabase() {
  try {
    // Skip sync in production since we use migrations
    // await db.sequelize.sync({ alter: false });
    logger.info('Database connection verified (sync skipped - using migrations)');

    if (process.env.SEED_DEMO_DATA === 'true') {
      logger.info('SEED_DEMO_DATA=true -> seeding demo users, projects, and tasks');
      await seedAllDemoData();
    } else {
      logger.info('SEED_DEMO_DATA not enabled -> skipping demo data seeding');
    }
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
  }
}

// Routes
// Simple health check for Docker (no database check for faster response)
app.get('/health', (req, res) => {
  res.status(200).send('healthy');
});

// Health check endpoint (for monitoring and load balancers)
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await db.sequelize.authenticate();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// ============================================
// API ROUTES v1 + Legacy Support
// ============================================
// Centralized route configuration with API versioning
// - /api/v1/* - New versioned routes (recommended)
// - /api/* - Legacy routes (deprecated, backward compatible)
const { setupRoutes } = require('./config/routes');
setupRoutes(app);

// Swagger Documentation (on legacy /api/docs for compatibility)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Swagger JSON endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// NOTE: Duplicate /api/health was removed (10.1) — the canonical definition is above with DB auth check.

// ============================================
// ERROR HANDLERS
// ============================================
setupErrorHandlers(app);

// ============================================
// SERVER STARTUP
// ============================================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

if (require.main === module) {
  // Validate required secrets before accepting any connections
  if (process.env.NODE_ENV !== 'test') {
    if (!process.env.JWT_SECRET) {
      logger.error('FATAL: JWT_SECRET environment variable is not set. Set it in .env and restart.');
      process.exit(1);
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      logger.error('FATAL: JWT_REFRESH_SECRET environment variable is not set. Set it in .env and restart.');
      process.exit(1);
    }
  }

  // Only start the server if this file is run directly
  initializeDatabase().then(() => {
    const dbInfo = `PostgreSQL (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`;
    
    // Initialize cron scheduler after DB is ready (GAP 12.2)
    try {
      const { initScheduler } = require('./services/scheduler');
      initScheduler();
    } catch (err) {
      logger.warn('Scheduler initialization skipped', { error: err.message });
    }
    
    // Environment-aware base URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.API_BASE_URL || `https://${process.env.DOMAIN || 'localhost'}`)
      : `http://localhost:${PORT}`;
    
    const server = app.listen(PORT, HOST, () => {
      global.serverInstance = server;
      socket.init(server);
      const logMessage = `🚀 HRM System server running on ${HOST}:${PORT}`;
      logger.info(logMessage);
      logger.info(`🌐 API Base URL: ${baseUrl}/api`);
      logger.info(`📚 API Documentation: ${baseUrl}/api/docs`);
      logger.info(`🩺 Health: ${baseUrl}/api/health`);
      logger.info(`💾 Database: ${dbInfo}`);
      logger.info('🗄  PostgreSQL-only mode (SQLite permanently disabled)');
      logger.info('\n📖 For comprehensive documentation, visit:');
      logger.info(`- Interactive API Docs: ${baseUrl}/api-docs`);
      logger.info(`- API JSON Schema: ${baseUrl}/api-docs.json`);
      logger.info('- Developer Guide: ../docs/README.md');
      
      // Production-specific logs
      if (process.env.NODE_ENV === 'production') {
        logger.info('\n🔐 Production Environment Detected');
        logger.info('- Set API_BASE_URL or DOMAIN environment variable for proper URLs');
        logger.info(`- Current base URL: ${baseUrl}`);
      }
    });
    
    server.on('error', (error) => {
      logger.error('Failed to start server:', error);
      process.exit(1);
    });
  }).catch(error => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  });
}

// Production-safe error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  
  // Graceful shutdown in production
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  
  // Node.js recommends exiting on unhandled rejections to prevent unpredictable state
  if (process.env.NODE_ENV === 'production') {
    logger.error('Exiting due to unhandled promise rejection to maintain clean state...');
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    process.exit(1);
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  if (global.serverInstance) {
    logger.info('Closing HTTP server...');
    global.serverInstance.close(() => {
      logger.info('HTTP server closed.');
    });
  }

  try {
    if (db && db.sequelize) {
      logger.info('Closing database connection...');
      await db.sequelize.close();
      logger.info('Database connection closed.');
    }
  } catch (err) {
    logger.error('Error during database disconnection:', err);
  }

  // Force exit after 5 seconds just in case
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);

  // If we reach here synchronously, wait a bit for asynchronous closes
  setTimeout(() => {
    logger.info('Process terminated gracefully');
    process.exit(0);
  }, 1000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
