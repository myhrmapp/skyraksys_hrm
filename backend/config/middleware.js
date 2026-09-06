/**
 * Middleware Configuration
 * Centralizes all Express middleware setup
 * 
 * Middleware Order (critical for security and functionality):
 * 1. Status monitoring
 * 2. Response time tracking
 * 3. Request tracking
 * 4. Security (helmet, XSS, HPP)
 * 5. Trust proxy configuration
 * 6. CORS
 * 7. Rate limiting
 * 8. Body parsing
 * 9. Cookie parser
 * 10. Request logging
 * 11. Static files (authenticated)
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const responseTime = require('response-time');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { logger, accessLogStream } = require('./logger');

/**
 * XSS Sanitization Function
 * Recursively sanitizes strings, arrays, and objects
 * Strips ALL HTML tags to prevent XSS attacks
 */
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

/**
 * Initialize Status Monitoring
 * Tries advanced monitoring (express-status-monitor)
 * Falls back to basic monitoring on Windows or failure
 * 
 * @param {Express.Application} app - Express app instance
 * @returns {boolean} - True if advanced monitoring enabled
 */
const initializeStatusMonitoring = (app) => {
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

/**
 * Setup Response Time Tracking
 * Logs slow requests and adds X-Response-Time header
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupResponseTimeTracking = (app) => {
  app.use(responseTime((req, res, time) => {
    // Log slow requests (>500ms)
    if (time > 500) {
      logger.warn(`Slow request: ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
    }
    
    // Add response time header
    res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
  }));
};

/**
 * Setup Request Tracking
 * Adds request IDs and performance metrics
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupRequestTracking = (app) => {
  const requestTracker = require('../middleware/requestTracker');
  app.use(requestTracker.middleware());
};

/**
 * Setup Security Middleware
 * Helmet, XSS sanitization, HPP protection
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupSecurityMiddleware = (app) => {
  // Helmet for security headers
  app.use(helmet());
  
  // XSS sanitization middleware
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
};

/**
 * Setup Trust Proxy Configuration
 * Required when behind Nginx or any reverse proxy
 * Enables correct client IP detection for logging and rate limiting
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupTrustProxy = (app) => {
  if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
    // Trust the first proxy (e.g., Nginx on the same host 127.0.0.1)
    app.set('trust proxy', 1);
    logger.info('Express trust proxy enabled (trusting first proxy)');
  }
};

/**
 * Setup CORS Configuration
 * Development origins (localhost) + production origins (env vars)
 * Supports credentials, custom headers, and preflight requests
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupCORS = (app) => {
  // Development origins (only in non-production)
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

  // Combine dev origins, FRONTEND_URL, and CORS_ORIGIN env var
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
};

/**
 * Setup Rate Limiting
 * General rate limiter for all API routes
 * Stricter rate limiter for authentication endpoints
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupRateLimiting = (app) => {
  // Skip rate limiting if disabled (e.g., in development/test)
  if (process.env.RATE_LIMIT_DISABLED === 'true') {
    logger.info('Rate limiting disabled (RATE_LIMIT_DISABLED=true)');
    return;
  }

  // General API rate limiter
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
};

/**
 * Setup Body Parsing Middleware
 * JSON and URL-encoded body parsing with size limits
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupBodyParsing = (app) => {
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
};

/**
 * Setup Cookie Parser
 * Required for httpOnly cookies (JWT refresh tokens)
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupCookieParser = (app) => {
  app.use(cookieParser());
};

/**
 * Setup Request Logging
 * Winston + Morgan for structured logging and HTTP access logs
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupRequestLogging = (app) => {
  // Request logger middleware (adds request IDs and structured logging)
  const requestLogger = require('../middleware/requestLogger');
  app.use(requestLogger);

  // Skip logging in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Morgan for HTTP access logs (written to access.log)
  app.use(morgan('combined', { stream: accessLogStream }));
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
};

/**
 * Setup Static Files
 * Serves uploaded files (photos, documents) with authentication
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupStaticFiles = (app) => {
  const { authenticateToken } = require('../middleware/auth');
  app.use('/uploads', authenticateToken, express.static(path.join(__dirname, '..', 'uploads')));
};

/**
 * Main Middleware Setup Function
 * Configures all middleware in the correct order
 * 
 * @param {Express.Application} app - Express app instance
 */
const setupMiddleware = (app) => {
  // Log application start
  logger.info('='.repeat(80));
  logger.info('Skyraksys HRM Backend Server Starting...');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Node Version: ${process.version}`);
  logger.info('='.repeat(80));

  // Initialize all middleware in correct order
  try {
    initializeStatusMonitoring(app);
  } catch (error) {
    logger.error('Critical error initializing status monitoring:', error);
    logger.info('Server will continue without status monitoring...');
  }

  setupResponseTimeTracking(app);
  setupRequestTracking(app);
  setupSecurityMiddleware(app);
  setupTrustProxy(app);
  setupCORS(app);
  setupRateLimiting(app);
  setupBodyParsing(app);
  setupCookieParser(app);
  setupRequestLogging(app);
  setupStaticFiles(app);

  logger.info('✅ All middleware configured successfully');
};

module.exports = {
  setupMiddleware,
  xssSanitize // Export for testing
};
