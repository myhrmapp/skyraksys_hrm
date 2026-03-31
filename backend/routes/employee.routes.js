/**
 * Employee Routes
 * Clean, maintainable route definitions using controller pattern
 * Refactored from 1,399 lines to <200 lines
 * 
 * @module routes/employee
 * @author SkyrakSys Development Team
 * @version 2.0.0
 * @refactored 2026-02-07
 */

const express = require('express');
const router = express.Router();

// Controller
const employeeController = require('../controllers/employeeController');

// Middleware
const { authenticateToken, authorize, canAccessEmployee, isAdminOrHR } = require('../middleware/auth');
const { validate, validateQuery, validateParams } = require('../middleware/validate');
const validators = require('../middleware/validators');
const { uploadEmployeePhoto, handleUploadError, validateMagicBytes } = require('../middleware/upload');
const { enhancedFieldAccessControl } = require('../middleware/enhancedFieldAccessControl');
const { profileUpdateLimiter } = require('../middleware/rateLimiter');

// Database and Services (for routes not yet migrated to controller)
const db = require('../models');
const { EmployeeSearchService, EmployeeBulkService } = require('../services/employee');
const logger = require('../utils/logger');
const searchService = new EmployeeSearchService(db);
const bulkService = new EmployeeBulkService(db);

// Apply global middleware
router.use(authenticateToken);
router.use(enhancedFieldAccessControl());

/**
 * @route GET /api/employees
 * @desc Get all employees with pagination and filtering
 * @access Private (RBAC: Employee sees self, Manager sees team, Admin/HR sees all)
 */
router.get('/', 
  validateQuery(validators.employeeQuerySchema), 
  employeeController.getAll
);

/**
 * @route GET /api/employees/me
 * @desc Get current user's employee profile
 * @access Private
 */
router.get('/me', employeeController.getMe);

/**
 * @route GET /api/employees/statistics
 * @desc Get employee statistics (total, active, inactive, etc.)
 * @access Private (Admin, HR)
 */
router.get('/statistics', isAdminOrHR, employeeController.getStatistics);

/**
 * @route GET /api/employees/meta/departments
 * @desc Get departments metadata for dropdowns
 * @access Private
 */
router.get('/meta/departments', async (req, res, next) => {
  try {
    const departments = await searchService.getDepartmentMetadata();
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/departments
 * @desc Alias for /meta/departments (frontend compatibility)
 * @access Private
 */
router.get('/departments', async (req, res, next) => {
  try {
    const departments = await searchService.getDepartmentMetadata();
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/meta/positions
 * @desc Get positions metadata for dropdowns
 * @access Private
 */
router.get('/meta/positions', async (req, res, next) => {
  try {
    const positions = await searchService.getPositionMetadata();
    res.json({ success: true, data: positions });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/positions
 * @desc Alias for /meta/positions (frontend compatibility)
 * @access Private
 */
router.get('/positions', async (req, res, next) => {
  try {
    const positions = await searchService.getPositionMetadata();
    res.json({ success: true, data: positions });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/managers
 * @desc Get all managers for dropdown/selection
 * @access Private (Admin, HR, Manager — read-only for profile dropdowns)
 */
router.get('/managers', authorize('admin', 'hr', 'manager'), async (req, res, next) => {
  try {
    const managers = await db.Employee.findAll({
      include: [{
        model: db.User,
        as: 'user',
        where: { role: { [db.Sequelize.Op.in]: ['manager', 'admin', 'hr'] } },
        attributes: ['id', 'email', 'role']
      }],
      attributes: ['id', 'firstName', 'lastName', 'email', 'employeeId'],
      where: { status: 'Active' }
    });
    res.json({ success: true, data: managers });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/employees/export
 * @desc Export employees to CSV
 * @access Private (Admin, HR)
 */
router.get('/export', isAdminOrHR, async (req, res, next) => {
  try {
    const csvData = await bulkService.exportToCSV(req.query);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="employees.csv"');
    res.send(csvData);
  } catch (error) {
    logger.error('Export error:', { detail: error });
    next(error);
  }
});

/**
 * @route GET /api/employees/by-employee-id/:employeeId
 * @desc Get employee by employeeId (not UUID)
 * @access Private (RBAC)
 */
router.get('/by-employee-id/:employeeId', 
  canAccessEmployee, 
  employeeController.getByEmployeeId
);

/**
 * @route GET /api/employees/manager/:managerId/team
 * @desc Get manager's team members
 * @access Private (Manager, Admin, HR)
 */
router.get('/manager/:managerId/team', 
  authorize(['manager', 'admin', 'hr']),
  async (req, res, next) => {
    // Managers can only view their own team
    if (req.user.role === 'manager') {
      const employee = await db.Employee.findOne({ where: { userId: req.user.id } });
      if (!employee || employee.id !== req.params.managerId) {
        return res.status(403).json({ success: false, message: 'You can only view your own team' });
      }
    }
    return employeeController.getTeamMembers(req, res, next);
  }
);

/**
 * @route GET /api/employees/team-members
 * @desc Get current user's team members (if manager)
 * @access Private (Manager, Admin, HR)
 */
router.get('/team-members', 
  authorize(['manager', 'admin', 'hr']), 
  async (req, res, next) => {
    try {
      const employee = await db.Employee.findOne({ where: { userId: req.user.id } });
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee profile not found' });
      }
      
      const teamMembers = await db.Employee.findAll({
        where: { managerId: employee.id },
        include: [
          { model: db.Department, as: 'department', attributes: ['id', 'name'] },
          { model: db.Position, as: 'position', attributes: ['id', 'title'] }
        ]
      });
      
      res.json({ success: true, data: teamMembers });
    } catch (error) {
      logger.error('Get team members error:', { detail: error });
      next(error);
    }
});

/**
 * @route GET /api/employees/:id
 * @desc Get employee by ID (UUID)
 * @access Private (RBAC: Owner, Manager, Admin, HR)
 */
router.get('/:id', 
  canAccessEmployee, 
  validateParams(validators.uuidParamSchema), 
  employeeController.getById
);

/**
 * @route POST /api/employees
 * @desc Create new employee (with User account, Salary, Leave balances)
 * @access Private (Admin, HR)
 */
router.post('/', 
  isAdminOrHR, 
  uploadEmployeePhoto, 
  handleUploadError, 
  validateMagicBytes,
  validate(validators.createEmployeeSchema), 
  employeeController.create
);

/**
 * @route POST /api/employees/:id/photo
 * @desc Upload employee photo
 * @access Private (Admin, HR)
 */
router.post('/:id/photo', 
  isAdminOrHR, 
  uploadEmployeePhoto, 
  handleUploadError, 
  validateMagicBytes,
  validateParams(validators.uuidParamSchema), 
  employeeController.uploadPhoto
);

/**
 * @route POST /api/employees/bulk-update
 * @desc Bulk update employees
 * @access Private (Admin, HR)
 */
router.post('/bulk-update', isAdminOrHR, async (req, res, next) => {
  try {
    const result = await bulkService.bulkUpdateEmployees(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bulk update error:', { detail: error });
    next(error);
  }
});

/**
 * @route PUT /api/employees/:id
 * @desc Update employee (limited fields for self, all fields for Admin/HR)
 * @access Private (RBAC: Owner - limited, Admin/HR - all)
 */
router.put('/:id', 
  profileUpdateLimiter, 
  canAccessEmployee, 
  validateParams(validators.uuidParamSchema), 
  validate(validators.updateEmployeeSchema),
  employeeController.update
);

/**
 * @route PUT /api/employees/:id/compensation
 * @desc Update employee compensation/salary
 * @access Private (Admin, HR)
 */
router.put('/:id/compensation', 
  isAdminOrHR, 
  validateParams(validators.uuidParamSchema), 
  validate(validators.updateCompensationSchema), 
  employeeController.updateCompensation
);

/**
 * @route PATCH /api/employees/:id/status
 * @desc Update employee status (Active, Inactive, On Leave, Terminated)
 * @access Private (Admin, HR)
 */
router.patch('/:id/status', 
  isAdminOrHR, 
  validateParams(validators.uuidParamSchema), 
  validate(validators.updateStatusSchema), 
  async (req, res, next) => {
    try {
      const { status } = req.body;
      const { employeeDataService } = require('../services/data');
      
      await employeeDataService.update(req.params.id, { status });
      
      // If terminated, deactivate user
      if (status === 'Terminated') {
        const employee = await employeeDataService.findById(req.params.id);
        if (employee && employee.userId) {
          await db.User.update({ isActive: false }, { where: { id: employee.userId } });
        }
      }
      
      const updated = await employeeDataService.findById(req.params.id);
      res.json({ success: true, message: `Employee status updated to ${status}`, data: updated });
    } catch (error) {
      next(error);
    }
});

/**
 * @route DELETE /api/employees/:id
 * @desc Delete (deactivate) employee
 * @access Private (Admin, HR)
 */
router.delete('/:id', 
  isAdminOrHR, 
  validateParams(validators.uuidParamSchema), 
  employeeController.delete
);

module.exports = router;
