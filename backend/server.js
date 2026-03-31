require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const responseTime = require('response-time');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { logger, accessLogStream } = require('./config/logger');

const app = express();

// Production-safe performance monitoring
// Enhanced error handling to prevent production crashes
const initializeStatusMonitoring = () => {
  const isWindows = process.platform === 'win32';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const enableStatusMonitor = process.env.ENABLE_STATUS_MONITOR !== 'false';
  
  // Only enable advanced monitoring in non-Windows environments or when explicitly enabled
  if (!isWindows && enableStatusMonitor) {
    try {
      const statusMonitor = require('express-status-monitor');
      app.use(statusMonitor({
        title: 'SkyrakSys HRM - Server Status',
        path: '/status',
        spans: [{
          interval: 1,      // Every second
          retention: 60     // Keep 60 datapoints (1 minute)
        }, {
          interval: 5,      // Every 5 seconds
          retention: 60     // Keep 60 datapoints (5 minutes)
        }, {
          interval: 15,     // Every 15 seconds
          retention: 60     // Keep 60 datapoints (15 minutes)
        }],
        chartVisibility: {
          cpu: true,
          mem: true,
          load: true,
          responseTime: true,
          rps: true,
          statusCodes: true
        },
        healthChecks: [{
          protocol: 'http',
          host: 'localhost',
          path: '/api/health',
          port: process.env.PORT || 5000
        }],
        // Production safety: ignore errors from pidusage
        ignoreStartsWith: '/favicon',
        iframe: true
      }));
      logger.info('📊 Advanced status monitor enabled at /status');
      return true;
    } catch (error) {
      logger.warn(`⚠️ Advanced status monitor failed to initialize: ${error.message}`);
      logger.warn('   Falling back to basic status monitoring...');
    }
  }
  
  // Fallback: Basic status endpoint (Windows-compatible, production-safe)
  app.get('/status', (req, res) => {
    try {
      const uptime = process.uptime();
      const memory = process.memoryUsage();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        platform: process.platform,
        nodeVersion: process.version,
        uptime: {
          seconds: Math.floor(uptime),
          human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
        },
        memory: {
          used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
        },
        pid: process.pid,
        monitoring: isWindows ? 'basic (Windows compatibility)' : 'basic (fallback)'
      });
    } catch (error) {
      logger.error('Status endpoint error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Status check failed',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  if (isWindows) {
    logger.info('⚠️ Status monitor: Windows compatibility mode (basic monitoring)');
  } else if (!enableStatusMonitor) {
    logger.info('⚠️ Status monitor: Disabled via environment variable');
  } else {
    logger.info('⚠️ Status monitor: Basic mode (advanced monitoring failed)');
  }
  
  return false;
};

// Initialize monitoring with error handling
try {
  initializeStatusMonitoring();
} catch (error) {
  logger.error('Critical error initializing status monitoring:', error);
  logger.info('Server will continue without status monitoring...');
}

// Response time tracking
app.use(responseTime((req, res, time) => {
  // Log slow requests (>500ms)
  if (time > 500) {
    logger.warn(`Slow request: ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
  }
  
  // Add response time header
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
}));

// Request tracking for performance metrics
const requestTracker = require('./middleware/requestTracker');
app.use(requestTracker.middleware());

// Security middleware
app.use(helmet());

// XSS sanitization — strips script tags from request body/query/params
// Uses sanitize-html instead of deprecated xss-clean
const sanitizeHtml = require('sanitize-html');
const xssSanitize = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, { allowedTags: [], allowedAttributes: {} });
  }
  if (Array.isArray(obj)) {
    return obj.map(xssSanitize);
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = xssSanitize(value);
    }
    return sanitized;
  }
  return obj;
};
app.use((req, res, next) => {
  if (req.body) req.body = xssSanitize(req.body);
  if (req.query) req.query = xssSanitize(req.query);
  if (req.params) req.params = xssSanitize(req.params);
  next();
});
logger.info('XSS sanitization enabled');

// HTTP Parameter Pollution protection
try {
  const hpp = require('hpp');
  app.use(hpp());
  logger.info('HPP protection enabled');
} catch (e) {
  logger.warn('hpp not installed — run: npm install hpp');
}

// Trust proxy (needed when behind Nginx/any reverse proxy)
// Enables correct client IP detection (req.ip) for logging and rate limiting
if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
  // Trust the first proxy (e.g., Nginx on the same host 127.0.0.1)
  app.set('trust proxy', 1);
  logger.info('Express trust proxy enabled (trusting first proxy)');
}

// CORS configuration
const devOrigins = process.env.NODE_ENV === 'production' ? [] : [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082'
];

const allowedOrigins = [
  ...devOrigins,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Optional override for troubleshooting in DEVELOPMENT ONLY
    if (process.env.CORS_ALLOW_ALL === 'true' && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'],
  maxAge: 600
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting (enabled by default; set RATE_LIMIT_DISABLED=true to disable in dev/test)
if (process.env.RATE_LIMIT_DISABLED !== 'true') {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX || '300', 10); // default 300 per 15m
  const generalLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
  });
  app.use('/api', generalLimiter);

  // Stricter limiter for auth endpoints if configured
  if (process.env.RATE_LIMIT_AUTH_ENABLED !== 'false') {
    const authWindow = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10); // 15m
    const authMax = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10); // 5 login attempts / 15m
    const authLimiter = rateLimit({
      windowMs: authWindow,
      max: authMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
    });
    app.use('/api/auth/', authLimiter);
  }
  logger.info(`Rate limiting enabled (max=${process.env.RATE_LIMIT_MAX || '300'} per ${(windowMs/60000)}m)`);
} else {
  logger.info('Rate limiting disabled (RATE_LIMIT_DISABLED=true)');
}

// Parsing middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Cookie parser middleware for httpOnly cookies
app.use(cookieParser());

// Request logging middleware (adds request IDs and structured logging)
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

// Logging with Winston and Morgan
if (process.env.NODE_ENV !== 'test') {
  // Morgan for HTTP access logs (written to access.log)
  app.use(morgan('combined', { stream: accessLogStream }));
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
}

// Log application start
logger.info('='.repeat(80));
logger.info('Skyraksys HRM Backend Server Starting...');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Node Version: ${process.version}`);
logger.info('='.repeat(80));

// Static files — authenticated access only (employee photos, documents)
const { authenticateToken } = require('./middleware/auth');
app.use('/uploads', authenticateToken, express.static(path.join(__dirname, 'uploads')));

// Database connection
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

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const employeeRoutes = require('./routes/employee.routes');
const departmentRoutes = require('./routes/department.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const positionRoutes = require('./routes/position.routes');
const timesheetRoutes = require('./routes/timesheet.routes');
const leaveRoutes = require('./routes/leave.routes');
const leaveBalanceAdminRoutes = require('./routes/leave-balance-admin.routes');
const leaveTypeAdminRoutes = require('./routes/leave-type-admin.routes');
const payslipRoutes = require('./routes/payslipRoutes');
const payslipTemplateRoutes = require('./routes/payslipTemplateRoutes');
const salaryStructureRoutes = require('./routes/salaryStructureRoutes');
const payrollDataRoutes = require('./routes/payrollDataRoutes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');
const debugRoutes = require('./routes/debug.routes');
const emailRoutes = require('./routes/email.routes');
const performanceRoutes = require('./routes/performance.routes');
const adminRoutes = require('./routes/admin.routes');
const restoreRoutes = require('./routes/restore.routes'); // Admin restore endpoints for soft-deleted records
const employeeReviewRoutes = require('./routes/employee-review.routes'); // Employee performance reviews
const holidayRoutes = require('./routes/holiday.routes'); // Holiday calendar (GAP 12.5)
const attendanceRoutes = require('./routes/attendance.routes'); // Attendance tracking (GAP 12.1)
const leaveAccrualRoutes = require('./routes/leave-accrual.routes'); // Leave accrual automation (GAP 12.2)

// Swagger configuration
const { specs, swaggerOptions } = require('./config/swagger');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/leaves', leaveRoutes); // Alias — frontend uses both /leave and /leaves
app.use('/api/admin/leave-balances', leaveBalanceAdminRoutes);
app.use('/api/admin/leave-types', leaveTypeAdminRoutes);
app.use('/api/payroll', payrollDataRoutes);
app.use('/api/payroll-data', payrollDataRoutes); // Alias — frontend uses both /payroll and /payroll-data
app.use('/api/payslips', payslipRoutes);
app.use('/api/payslip-templates', payslipTemplateRoutes);
app.use('/api/salary-structures', salaryStructureRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/admin', adminRoutes); // Admin configuration routes
app.use('/api/restore', restoreRoutes); // Admin restore endpoints for soft-deleted records
app.use('/api/employee-reviews', employeeReviewRoutes); // Employee performance reviews
app.use('/api/holidays', holidayRoutes); // Holiday calendar (GAP 12.5)
app.use('/api/attendance', attendanceRoutes); // Attendance tracking (GAP 12.1)
app.use('/api/leave-accrual', leaveAccrualRoutes); // Leave accrual automation (GAP 12.2)

// System Config Routes (requires admin role + password re-authentication)
const systemConfigRoutes = require('./routes/system-config.routes');
app.use('/api/system-config', systemConfigRoutes);

// Debug Routes (conditionally enabled for development/test only)
const debugEnvs = ['development', 'test'];
if (debugEnvs.includes(process.env.NODE_ENV)) {
  app.use('/api/debug', debugRoutes);
  logger.warn('⚠️  Debug routes enabled (development/test mode only)');
} else {
  logger.info('🔒 Debug routes disabled in production/staging');
}

// Admin Config Routes (protected)
const adminConfigRoutes = require('./routes/admin-config.routes');
app.use('/api/admin/config', adminConfigRoutes);

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Swagger JSON endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// NOTE: Duplicate /api/health was removed (10.1) — the canonical definition is above with DB auth check.

// Catch-all handler (handles ALL HTTP methods, not just GET)
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      '/api/auth/*',
      '/api/users/*',
      '/api/employees/*',
      '/api/departments/*',
      '/api/projects/*',
      '/api/tasks/*',
      '/api/timesheets/*',
      '/api/leave/*',
      '/api/payrolls/*',
      '/api/salary-structures/*',
      '/api/health'
    ]
  });
});

// Error handling middleware
// First, centralized error logging middleware
const errorLogger = require('./middleware/errorLogger');
const { AppError } = require('./utils/errors');

app.use(errorLogger);

// Then, error response handler
app.use((error, req, res, next) => {
  // Note: Error already logged by errorLogger middleware above
  
  // Handle custom AppError instances (includes ValidationError, NotFoundError, etc.)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors
    });
  }
  
  // Handle Sequelize validation errors
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }
  
  // Handle Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected',
      field: error.errors?.[0]?.path || 'unknown'
    });
  }
  
  // Handle Sequelize foreign key constraint errors
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Cannot complete this operation because the record is referenced by other data. Remove related records first.',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});


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
  
  // Don't crash in production for unhandled promises
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Continuing execution in production mode...');
  } else {
    process.exit(1);
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  // Close server and database connections
  setTimeout(() => {
    logger.info('Process terminated');
    process.exit(0);
  }, 5000); // Give 5 seconds for cleanup
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
