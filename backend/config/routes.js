/**
 * Route Configuration
 * Extracted from server.js for better organization
 * 
 * All API routes are mounted here with versioning support
 * Uses actual route file names from /backend/routes directory
 */

// Import route modules (using actual file names)
const authRoutes = require('../routes/auth.routes');
const userRoutes = require('../routes/user.routes');
const employeeRoutes = require('../routes/employee.routes');
const departmentRoutes = require('../routes/department.routes');
const positionRoutes = require('../routes/position.routes');
const projectRoutes = require('../routes/project.routes');
const taskRoutes = require('../routes/task.routes');
const timesheetRoutes = require('../routes/timesheet.routes');
const leaveRoutes = require('../routes/leave.routes');
const leaveBalanceAdminRoutes = require('../routes/leave-balance-admin.routes');
const leaveTypeAdminRoutes = require('../routes/leave-type-admin.routes');
const leaveAccrualRoutes = require('../routes/leave-accrual.routes');
const attendanceRoutes = require('../routes/attendance.routes');
const holidayRoutes = require('../routes/holiday.routes');
const payrollDataRoutes = require('../routes/payrollDataRoutes');
const payslipRoutes = require('../routes/payslipRoutes');
const payslipTemplateRoutes = require('../routes/payslipTemplateRoutes');
const salaryStructureRoutes = require('../routes/salaryStructureRoutes');
const performanceRoutes = require('../routes/performance.routes');
const employeeReviewRoutes = require('../routes/employee-review.routes');
const goalRoutes = require('../routes/goal.routes');
const clientRoutes = require('../routes/client.routes');
const invoiceRoutes = require('../routes/invoice.routes');
const invoiceTemplateRoutes = require('../routes/invoice-template.routes');
const dashboardRoutes = require('../routes/dashboard.routes');
const settingsRoutes = require('../routes/settings.routes');
const emailRoutes = require('../routes/email.routes');
const notificationRoutes = require('../routes/notification.routes');
const adminRoutes = require('../routes/admin.routes');
const adminConfigRoutes = require('../routes/admin-config.routes');
const systemConfigRoutes = require('../routes/system-config.routes');
const restoreRoutes = require('../routes/restore.routes');
const vaultRoutes = require('../routes/vault.routes');
const debugRoutes = require('../routes/debug.routes');

/**
 * Setup all application routes with API versioning
 * 
 * Mounts all routes on both:
 * - /api/v1/* - New versioned API (recommended for all new clients)
 * - /api/*    - Legacy API (deprecated, maintains backward compatibility)
 * 
 * Legacy routes include deprecation headers:
 * - X-API-Version: legacy
 * - X-Deprecation-Warning: Migration notice with 6-month timeline
 * 
 * @param {import('express').Application} app - Express application instance
 * @returns {import('express').Application} Configured Express application
 * 
 * @example
 * const { setupRoutes } = require('./config/routes');
 * setupRoutes(app);
 */
function setupRoutes(app) {
  const logger = require('../utils/logger');
  
  // ============================================
  // API v1 Routes (New Versioned Routes)
  // ============================================
  app.use('/api/v1/vault', vaultRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/departments', departmentRoutes);
  app.use('/api/v1/positions', positionRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/timesheets', timesheetRoutes);
  app.use('/api/v1/leave', leaveRoutes);
  app.use('/api/v1/leaves', leaveRoutes); // Alias
  app.use('/api/v1/admin/leave-balances', leaveBalanceAdminRoutes);
  app.use('/api/v1/admin/leave-types', leaveTypeAdminRoutes);
  app.use('/api/v1/payroll', payrollDataRoutes);
  app.use('/api/v1/payroll-data', payrollDataRoutes); // Alias
  app.use('/api/v1/payslips', payslipRoutes);
  app.use('/api/v1/payslip-templates', payslipTemplateRoutes);
  app.use('/api/v1/salary-structures', salaryStructureRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/email', emailRoutes);
  app.use('/api/v1/performance', performanceRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/restore', restoreRoutes);
  app.use('/api/v1/employee-reviews', employeeReviewRoutes);
  app.use('/api/v1/holidays', holidayRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/leave-accrual', leaveAccrualRoutes);
  app.use('/api/v1/goals', goalRoutes);
  app.use('/api/v1/invoices', invoiceRoutes);
  app.use('/api/v1/invoice-templates', invoiceTemplateRoutes);
  app.use('/api/v1/clients', clientRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/system-config', systemConfigRoutes);
  
  // Debug routes (development/test only)
  const debugEnvs = ['development', 'test'];
  if (debugEnvs.includes(process.env.NODE_ENV)) {
    app.use('/api/v1/debug', debugRoutes);
  }

  // ============================================
  // Legacy Routes (Backward Compatibility)
  // ============================================
  // Deprecation middleware adds headers to warn clients
  const deprecationMiddleware = (req, res, next) => {
    res.setHeader('X-API-Version', 'legacy');
    res.setHeader('X-Deprecation-Warning', 'Please migrate to /api/v1/*. Legacy routes will be removed in 6 months (2027-02-08).');
    next();
  };

  // Mount all legacy routes with deprecation warning
  app.use('/api/vault', deprecationMiddleware, vaultRoutes);
  app.use('/api/auth', deprecationMiddleware, authRoutes);
  app.use('/api/users', deprecationMiddleware, userRoutes);
  app.use('/api/employees', deprecationMiddleware, employeeRoutes);
  app.use('/api/departments', deprecationMiddleware, departmentRoutes);
  app.use('/api/positions', deprecationMiddleware, positionRoutes);
  app.use('/api/projects', deprecationMiddleware, projectRoutes);
  app.use('/api/tasks', deprecationMiddleware, taskRoutes);
  app.use('/api/timesheets', deprecationMiddleware, timesheetRoutes);
  app.use('/api/leave', deprecationMiddleware, leaveRoutes);
  app.use('/api/leaves', deprecationMiddleware, leaveRoutes); // Alias — frontend uses both
  app.use('/api/leave-requests', deprecationMiddleware, leaveRoutes); // Alias
  app.use('/api/leave-management', deprecationMiddleware, leaveRoutes); // Alias
  app.use('/api/admin/leave-balances', deprecationMiddleware, leaveBalanceAdminRoutes);
  app.use('/api/admin/leave-types', deprecationMiddleware, leaveTypeAdminRoutes);
  app.use('/api/payroll', deprecationMiddleware, payrollDataRoutes);
  app.use('/api/payroll-data', deprecationMiddleware, payrollDataRoutes); // Alias — frontend uses both
  app.use('/api/payslips', deprecationMiddleware, payslipRoutes);
  app.use('/api/payslip-templates', deprecationMiddleware, payslipTemplateRoutes);
  app.use('/api/salary-structures', deprecationMiddleware, salaryStructureRoutes);
  app.use('/api/dashboard', deprecationMiddleware, dashboardRoutes);
  app.use('/api/settings', deprecationMiddleware, settingsRoutes);
  app.use('/api/email', deprecationMiddleware, emailRoutes);
  app.use('/api/performance', deprecationMiddleware, performanceRoutes);
  app.use('/api/admin', deprecationMiddleware, adminRoutes);
  app.use('/api/restore', deprecationMiddleware, restoreRoutes);
  app.use('/api/employee-reviews', deprecationMiddleware, employeeReviewRoutes);
  app.use('/api/holidays', deprecationMiddleware, holidayRoutes);
  app.use('/api/attendance', deprecationMiddleware, attendanceRoutes);
  app.use('/api/leave-accrual', deprecationMiddleware, leaveAccrualRoutes);
  app.use('/api/goals', deprecationMiddleware, goalRoutes);
  app.use('/api/invoices', deprecationMiddleware, invoiceRoutes);
  app.use('/api/invoice-templates', deprecationMiddleware, invoiceTemplateRoutes);
  app.use('/api/clients', deprecationMiddleware, clientRoutes);
  app.use('/api/notifications', deprecationMiddleware, notificationRoutes);
  app.use('/api/system-config', deprecationMiddleware, systemConfigRoutes);
  
  // Debug routes (development/test only) - legacy path
  if (debugEnvs.includes(process.env.NODE_ENV)) {
    app.use('/api/debug', deprecationMiddleware, debugRoutes);
    logger.warn('⚠️  Debug routes enabled (development/test mode only)');
  } else {
    logger.info('🔒 Debug routes disabled in production/staging');
  }

  logger.info('✅ API routes configured (v1 + legacy)');
  return app;
}

module.exports = { setupRoutes };
