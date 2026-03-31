const express = require('express');
const router = express.Router();
const os = require('os');
const process = require('process');
const { authenticateToken, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const requestTracker = require('../middleware/requestTracker');

// Use standard authorize middleware
const requireAdmin = authorize('admin');

// Get server performance metrics (Admin only)
router.get('/server-metrics', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    
    // Memory usage
    const memUsage = process.memoryUsage();
    
    // Get database connection pool info (if available)
    const db = require('../models');
    let dbMetrics = { status: 'disconnected' };
    
    try {
      // Test database connectivity and measure response time
      const dbStartTime = Date.now();
      await db.sequelize.authenticate();
      const dbResponseTime = Date.now() - dbStartTime;
      
      dbMetrics = {
        status: 'connected',
        responseTime: dbResponseTime,
        dialect: db.sequelize.getDialect(),
        version: db.sequelize.getDatabaseVersion ? await db.sequelize.getDatabaseVersion() : 'unknown'
      };
      
      // Get connection pool stats if available
      if (db.sequelize.connectionManager && db.sequelize.connectionManager.pool) {
        const pool = db.sequelize.connectionManager.pool;
        dbMetrics.connectionPool = {
          total: pool.options.max || 0,
          active: pool.size || 0,
          idle: pool.available || 0,
          waiting: pool.pending || 0
        };
      }
      
      // Get basic table count for health check
      const [results] = await db.sequelize.query(
        "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
      );
      dbMetrics.tableCount = results[0]?.table_count || 0;
      
    } catch (dbError) {
      logger.info('Database metrics error:', { detail: dbError.message });
      dbMetrics.error = dbError.message;
    }

    // Get additional system info (RHEL-specific)
    let systemInfo = {};
    try {
      const fs = require('fs');
      
      // Try to get OS version (works on RHEL/CentOS)
      try {
        const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
        const versionMatch = osRelease.match(/PRETTY_NAME="(.+)"/);
        systemInfo.osVersion = versionMatch ? versionMatch[1] : 'Unknown';
      } catch (e) {
        systemInfo.osVersion = `${os.platform()} ${os.release()}`;
      }
      
      // Get load average interpretation
      const loadAvgStatus = loadAvg[0] > cpus.length * 0.8 ? 'high' : 
                           loadAvg[0] > cpus.length * 0.5 ? 'moderate' : 'low';
      systemInfo.loadStatus = loadAvgStatus;
      
    } catch (e) {
      logger.info('Could not get extended system info:', { detail: e.message });
    }

    const metrics = {
      server: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        osVersion: systemInfo.osVersion || `${os.platform()} ${os.release()}`,
        loadStatus: systemInfo.loadStatus || 'unknown'
      },
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        loadAverage: {
          '1min': loadAvg[0],
          '5min': loadAvg[1], 
          '15min': loadAvg[2]
        },
        usage: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      memory: {
        system: {
          total: Math.round(totalMem / 1024 / 1024), // MB
          free: Math.round(freeMem / 1024 / 1024), // MB
          used: Math.round(usedMem / 1024 / 1024), // MB
          usagePercent: Math.round((usedMem / totalMem) * 100)
        },
        process: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        }
      },
      database: dbMetrics,
      network: {
        interfaces: Object.keys(os.networkInterfaces()).length,
        interfaceDetails: Object.entries(os.networkInterfaces())
          .filter(([name]) => !name.startsWith('lo')) // Exclude loopback
          .map(([name, addresses]) => ({
            name,
            addresses: addresses.filter(addr => addr.family === 'IPv4').length
          }))
      },
      process: {
        pid: process.pid,
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        cpu: cpuUsage,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error fetching server metrics:', { detail: error });
    next(error);
  }
});

// Get API performance metrics (Admin only)
router.get('/api-metrics', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // Real server metrics from Node.js process & OS
    const memUsage = process.memoryUsage();
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();

    // Calculate CPU usage percentage from os.cpus()
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsagePercent = ((1 - totalIdle / totalTick) * 100).toFixed(1);

    // Get tracked request metrics
    const trackedMetrics = requestTracker.getMetrics();

    const apiMetrics = {
      // Request tracking data (used by frontend dashboard)
      requests: trackedMetrics.requests,
      responseTime: trackedMetrics.responseTime,
      endpoints: trackedMetrics.endpoints,
      cache: { hitRate: 'N/A' },
      // Server resource data
      server: {
        cpuUsagePercent: parseFloat(cpuUsagePercent),
        loadAverage: {
          '1m': loadAvg[0].toFixed(2),
          '5m': loadAvg[1].toFixed(2),
          '15m': loadAvg[2].toFixed(2)
        },
        memory: {
          totalMB: Math.round(totalMem / 1024 / 1024),
          freeMB: Math.round(freeMem / 1024 / 1024),
          usedPercent: ((1 - freeMem / totalMem) * 100).toFixed(1) + '%'
        },
        processMemory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
        },
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: os.platform(),
        cpuCores: cpus.length
      },
      database: {
        status: 'unknown'
      },
      timestamp: new Date().toISOString()
    };

    // Check DB connection latency
    try {
      const db = require('../models');
      const dbStart = Date.now();
      await db.sequelize.authenticate();
      apiMetrics.database = {
        status: 'connected',
        latencyMs: Date.now() - dbStart
      };
    } catch (dbErr) {
      apiMetrics.database = {
        status: 'disconnected',
        error: dbErr.message
      };
    }

    res.json({
      success: true,
      data: apiMetrics
    });

  } catch (error) {
    logger.error('Error fetching API metrics:', { detail: error });
    next(error);
  }
});

// Get basic health metrics (All authenticated users)
router.get('/health-metrics', authenticateToken, async (req, res, next) => {
  try {
    const metrics = {
      server: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      database: {
        status: 'connected'
      }
    };

    // Test database connection
    try {
      const db = require('../models');
      await db.sequelize.authenticate();
    } catch (dbError) {
      metrics.database.status = 'disconnected';
      metrics.server.status = 'degraded';
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;