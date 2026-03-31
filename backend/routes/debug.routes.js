const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const os = require('os');
const db = require('../models');
const logService = require('../services/log.service');
const configService = require('../services/config.service');
const databaseService = require('../services/database.service');
const { authenticateToken, authorize } = require('../middleware/auth');

// ⚠️ SECURITY: Debug routes disabled in production and staging
// These endpoints are for development/testing only
const allowedEnvs = ['development', 'test'];
if (!allowedEnvs.includes(process.env.NODE_ENV)) {
    console.log('🔒 Debug routes disabled in ' + (process.env.NODE_ENV || 'unknown') + ' environment');
    module.exports = router; // Return empty router
} else {
    console.log('⚠️ Debug routes enabled - Development/Test environment only');

// All debug routes require admin authentication
router.use(authenticateToken, authorize('admin'));

const Employee = db.Employee;
const User = db.User;
const Department = db.Department;
const Position = db.Position;
const LeaveRequest = db.LeaveRequest;
const Timesheet = db.Timesheet; // Weekly timesheets
const Payslip = db.Payslip;
const Project = db.Project;
const Task = db.Task;

// Debug endpoints — requires admin authentication
// Access is also gated by environment check (development/test only)

// Dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [employeeCount, userCount, departmentCount, positionCount, pendingLeaves, timesheetCount, payslipCount] = await Promise.all([
            Employee.count({ where: { deletedAt: null } }),
            User.count({ where: { deletedAt: null } }),
            Department.count(), // No soft delete on departments
            Position.count(), // No soft delete on positions
            LeaveRequest.count({ where: { status: 'Pending', deletedAt: null } }), // Capitalized enum value
            Timesheet.count({ where: { deletedAt: null } }),
            Payslip.count({ where: { deletedAt: null } })
        ]);

        res.json({
            success: true,
            data: {
                employees: employeeCount,
                users: userCount,
                departments: departmentCount,
                positions: positionCount,
                pendingLeaves,
                timesheets: timesheetCount,
                payslips: payslipCount
            }
        });
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all employees
router.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.findAll({
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name'] },
                { model: Position, as: 'position', attributes: ['id', 'title'] },
                { model: User, as: 'user', attributes: ['id', 'email', 'role', 'isActive'] }
            ],
            order: [['firstName', 'ASC']],
            limit: 1000
        });
        res.json({ success: true, data: employees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
            order: [['email', 'ASC']],
            limit: 1000
        });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all departments
router.get('/departments', async (req, res) => {
    try {
        const departments = await Department.findAll({
            include: [{ 
                model: Employee, 
                as: 'employees', 
                attributes: ['id', 'firstName', 'lastName'],
                where: { deletedAt: null },
                required: false
            }],
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: departments });
    } catch (error) {
        console.error('❌ Departments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all positions
router.get('/positions', async (req, res) => {
    try {
        const positions = await Position.findAll({
            include: [{ 
                model: Employee, 
                as: 'employees', 
                attributes: ['id', 'firstName', 'lastName'],
                where: { deletedAt: null },
                required: false
            }],
            order: [['title', 'ASC']]
        });
        res.json({ success: true, data: positions });
    } catch (error) {
        console.error('❌ Positions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all leaves
router.get('/leaves', async (req, res) => {
    try {
        const leaves = await LeaveRequest.findAll({
            include: [{ 
                model: Employee, 
                as: 'employee', 
                attributes: ['id', 'firstName', 'lastName', 'employeeId'],
                required: false
            }],
            where: { deletedAt: null },
            order: [['startDate', 'DESC']],
            limit: 500
        });
        console.log(`📋 Leaves found: ${leaves.length}`);
        res.json({ success: true, data: leaves });
    } catch (error) {
        console.error('❌ Leaves error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all timesheets
router.get('/timesheets', async (req, res) => {
    try {
        const timesheets = await Timesheet.findAll({
            include: [{ 
                model: Employee, 
                as: 'employee', 
                attributes: ['id', 'firstName', 'lastName', 'employeeId']
            }],
            order: [['year', 'DESC'], ['weekNumber', 'DESC']],
            limit: 500
        });
        res.json({ success: true, data: timesheets });
    } catch (error) {
        console.error('❌ Timesheets error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all payslips
router.get('/payslips', async (req, res) => {
    try {
        const payslips = await Payslip.findAll({
            include: [{ 
                model: Employee, 
                as: 'employee', 
                attributes: ['id', 'firstName', 'lastName', 'employeeId']
            }],
            order: [['year', 'DESC'], ['month', 'DESC']],
            limit: 500
        });
        res.json({ success: true, data: payslips });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve leave
router.put('/leaves/:id/approve', async (req, res) => {
    try {
        const leave = await LeaveRequest.findByPk(req.params.id);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }
        leave.status = 'Approved'; // Capitalized enum value
        leave.approvedAt = new Date();
        await leave.save();
        res.json({ success: true, data: leave });
    } catch (error) {
        console.error('❌ Approve leave error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reject leave
router.put('/leaves/:id/reject', async (req, res) => {
    try {
        const leave = await LeaveRequest.findByPk(req.params.id);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave not found' });
        }
        leave.status = 'Rejected'; // Capitalized enum value
        leave.rejectedAt = new Date();
        await leave.save();
        res.json({ success: true, data: leave });
    } catch (error) {
        console.error('❌ Reject leave error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Seed demo data
router.post('/seed-demo', async (req, res) => {
    try {
        const result = { departments: 0, positions: 0 };

        const depts = [
            { name: 'Engineering', description: 'Software Development', isActive: true },
            { name: 'Human Resources', description: 'HR Department', isActive: true },
            { name: 'Sales', description: 'Sales Team', isActive: true }
        ];

        for (const dept of depts) {
            const [, created] = await Department.findOrCreate({
                where: { name: dept.name },
                defaults: dept
            });
            if (created) result.departments++;
        }

        const positions = [
            { title: 'Software Developer', level: 'Mid', isActive: true },
            { title: 'HR Manager', level: 'Senior', isActive: true },
            { title: 'Sales Executive', level: 'Junior', isActive: true }
        ];

        for (const pos of positions) {
            const [, created] = await Position.findOrCreate({
                where: { title: pos.title },
                defaults: pos
            });
            if (created) result.positions++;
        }

        res.json({ success: true, message: 'Demo data seeded', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// SQL Console
router.post('/sql', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, message: 'Query is required' });
        }

        // Safety check — whitelist: only SELECT statements are permitted
        const ALLOWED_QUERY_PATTERN = /^\s*SELECT\b/i;
        if (!ALLOWED_QUERY_PATTERN.test(query)) {
            return res.status(403).json({ success: false, message: 'Only SELECT statements are allowed in the SQL console.' });
        }

        const [results, metadata] = await db.sequelize.query(query);
        res.json({ success: true, data: results, metadata: { rowCount: results.length } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// ==========================================
// SYSTEM INFORMATION ENDPOINTS
// ==========================================

/**
 * Get system information
 */
router.get('/system/info', async (req, res) => {
    try {
        const systemInfo = {
            os: {
                platform: os.platform(),
                type: os.type(),
                release: os.release(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: os.uptime(),
                uptimeFormatted: formatUptime(os.uptime())
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                totalFormatted: formatBytes(os.totalmem()),
                freeFormatted: formatBytes(os.freemem()),
                usedFormatted: formatBytes(os.totalmem() - os.freemem()),
                usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
            },
            cpu: {
                model: os.cpus()[0].model,
                cores: os.cpus().length,
                speed: os.cpus()[0].speed
            },
            node: {
                version: process.version,
                env: process.env.NODE_ENV || 'development'
            },
            application: {
                name: 'Skyraksys HRM',
                version: '2.0.0',
                port: process.env.PORT || 5000,
                host: process.env.HOST || 'localhost'
            }
        };

        res.json({ success: true, data: systemInfo });
    } catch (error) {
        console.error('❌ System info error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get database status and connection info
 */
router.get('/system/database', async (req, res) => {
    try {
        // Test database connection
        await db.sequelize.authenticate();

        // Get database info
        const [[dbInfo]] = await db.sequelize.query(`
            SELECT 
                current_database() as database,
                current_user as user,
                version() as version,
                pg_database_size(current_database()) as size
        `);

        // Get table counts
        const tables = await db.sequelize.query(`
            SELECT 
                schemaname,
                relname as tablename,
                n_live_tup as row_count
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC
        `, { type: db.sequelize.QueryTypes.SELECT });

        // Get connection count
        const [[connections]] = await db.sequelize.query(`
            SELECT count(*) as count 
            FROM pg_stat_activity 
            WHERE datname = current_database()
        `);

        res.json({
            success: true,
            data: {
                connected: true,
                database: dbInfo.database,
                user: dbInfo.user,
                version: dbInfo.version,
                size: parseInt(dbInfo.size),
                sizeFormatted: formatBytes(parseInt(dbInfo.size)),
                connections: parseInt(connections.count),
                tables: tables,
                config: {
                    host: process.env.DB_HOST,
                    port: process.env.DB_PORT,
                    dialect: process.env.DB_DIALECT
                }
            }
        });
    } catch (error) {
        console.error('❌ Database status error:', error);
        res.status(500).json({
            success: false,
            connected: false,
            message: error.message
        });
    }
});

// ==========================================
// CONFIGURATION MANAGEMENT ENDPOINTS
// ==========================================

/**
 * Get all configuration
 */
router.get('/config', async (req, res) => {
    try {
        const config = await configService.getAllConfig();
        
        // Mask sensitive values
        const masked = { ...config.current };
        const sensitiveKeys = ['DB_PASSWORD', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SMTP_PASSWORD'];
        
        sensitiveKeys.forEach(key => {
            if (masked[key]) {
                masked[key] = '***MASKED***';
            }
        });

        res.json({
            success: true,
            data: {
                sections: config.sections,
                current: masked,
                environment: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        console.error('❌ Config read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Update single configuration variable
 */
router.put('/config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!value && value !== '') {
            return res.status(400).json({
                success: false,
                message: 'Value is required'
            });
        }

        const result = await configService.updateConfig(key, value);
        
        res.json({
            success: true,
            data: result,
            message: `${key} updated successfully. Server restart required to apply changes.`
        });
    } catch (error) {
        console.error('❌ Config update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Update multiple configuration variables
 */
router.put('/config', async (req, res) => {
    try {
        const { updates } = req.body;

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Updates object is required'
            });
        }

        const result = await configService.updateMultipleConfig(updates);
        
        res.json({
            success: true,
            data: result,
            message: `Configuration updated successfully. Server restart required to apply changes.`
        });
    } catch (error) {
        console.error('❌ Config update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Create configuration backup
 */
router.post('/config/backup', async (req, res) => {
    try {
        const result = await configService.createBackup();
        res.json({
            success: true,
            data: result,
            message: 'Configuration backup created successfully'
        });
    } catch (error) {
        console.error('❌ Config backup error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * List configuration backups
 */
router.get('/config/backups', async (req, res) => {
    try {
        const backups = await configService.listBackups();
        res.json({
            success: true,
            data: backups
        });
    } catch (error) {
        console.error('❌ List backups error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Restore configuration from backup
 */
router.post('/config/restore', async (req, res) => {
    try {
        const { backupFile } = req.body;

        if (!backupFile) {
            return res.status(400).json({
                success: false,
                message: 'Backup file name is required'
            });
        }

        const result = await configService.restoreFromBackup(backupFile);
        
        res.json({
            success: true,
            data: result,
            message: 'Configuration restored successfully. Server restart required.'
        });
    } catch (error) {
        console.error('❌ Config restore error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// LOG VIEWING ENDPOINTS
// ==========================================

/**
 * Get list of available log files
 */
router.get('/logs', async (req, res) => {
    try {
        const files = await logService.getLogFiles();
        const stats = await logService.getLogStats();
        
        res.json({
            success: true,
            data: {
                files,
                stats
            }
        });
    } catch (error) {
        console.error('❌ Log files error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Read specific log file with pagination
 */
router.get('/logs/:logType', async (req, res) => {
    try {
        const { logType } = req.params;
        const { lines = 100, offset = 0, search = '' } = req.query;

        const result = await logService.readLog(logType, {
            lines: parseInt(lines),
            offset: parseInt(offset),
            search
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Log read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Tail log file (get latest entries)
 */
router.get('/logs/:logType/tail', async (req, res) => {
    try {
        const { logType } = req.params;
        const { lines = 50 } = req.query;

        const result = await logService.tailLog(logType, parseInt(lines));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Log tail error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Clear specific log file
 */
router.delete('/logs/:logType', async (req, res) => {
    try {
        const { logType } = req.params;
        const result = await logService.clearLog(logType);

        res.json({
            success: true,
            data: result,
            message: `${logType} log cleared successfully`
        });
    } catch (error) {
        console.error('❌ Log clear error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// DATABASE TOOLS ENDPOINTS
// ==========================================

/**
 * Get list of all database tables
 */
router.get('/database/tables', async (req, res) => {
    try {
        const tables = await databaseService.getTables();
        res.json({
            success: true,
            data: tables
        });
    } catch (error) {
        console.error('❌ Get tables error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get schema for a specific table
 */
router.get('/database/schema/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const schema = await databaseService.getTableSchema(tableName);
        res.json({
            success: true,
            data: schema
        });
    } catch (error) {
        console.error('❌ Get schema error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get data from a specific table
 */
router.get('/database/table-data/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { limit, offset, orderBy, orderDir } = req.query;
        
        const result = await databaseService.getTableData(tableName, {
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0,
            orderBy: orderBy || 'id',
            orderDir: orderDir || 'ASC'
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ Get table data error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Execute SQL query
 */
router.post('/database/execute', async (req, res) => {
    try {
        const { query, readOnly = true, maxRows = 1000 } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'SQL query is required'
            });
        }
        
        const result = await databaseService.executeQuery(query, { readOnly, maxRows });
        res.json(result);
    } catch (error) {
        console.error('❌ Execute query error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            error: error.message 
        });
    }
});

/**
 * Get database statistics
 */
router.get('/database/stats', async (req, res) => {
    try {
        const stats = await databaseService.getDatabaseStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Get database stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get query execution plan
 */
router.post('/database/explain', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'SQL query is required'
            });
        }
        
        const result = await databaseService.explainQuery(query);
        res.json(result);
    } catch (error) {
        console.error('❌ Explain query error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Get active database connections
 */
router.get('/database/connections', async (req, res) => {
    try {
        const connections = await databaseService.getActiveConnections();
        res.json({
            success: true,
            data: connections
        });
    } catch (error) {
        console.error('❌ Get connections error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Backup a table
 */
router.post('/database/backup/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const result = await databaseService.backupTable(tableName);
        res.json(result);
    } catch (error) {
        console.error('❌ Backup table error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Debug endpoint to check projects and tasks
router.get('/projects-tasks', async (req, res) => {
  try {
    const projects = await db.Project.findAll({
      include: [{
        model: db.Task,
        as: 'tasks',
        required: false
      }]
    });

    const tasks = await db.Task.findAll({
      include: [{
        model: db.Project,
        as: 'project'
      }]
    });

    res.json({
      success: true,
      data: {
        projectsCount: projects.length,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          isActive: p.isActive,
          tasksCount: p.tasks?.length || 0
        })),
        tasksCount: tasks.length,
        tasks: tasks.map(t => ({
          id: t.id,
          name: t.name,
          projectId: t.projectId,
          projectName: t.project?.name,
          isActive: t.isActive,
          availableToAll: t.availableToAll,
          assignedTo: t.assignedTo
        }))
      }
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
}

} // End of production check - close the else block

module.exports = router;
