/**
 * Payroll Data Routes (Refactored)
 * Clean, maintainable route definitions using controller pattern
 * Refactored from 926 lines to <300 lines
 * 
 * @module routes/payrollDataRoutes
 * @author SkyrakSys Development Team
 * @version 2.0.0
 * @refactored 2026-02-07
 */

const express = require('express');
const router = express.Router();

// Controller
const payrollController = require('../controllers/payrollController');

// Middleware
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, validateQuery, validateParams } = require('../middleware/validate');
const validators = require('../middleware/validators');

// Multer for CSV uploads
const multer = require('multer');

// Configure multer for CSV uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Apply global middleware
router.use(authenticateToken);
// NOTE: No global authorize - some routes allow employee access to own data

/**
 * @route GET /api/payroll-data
 * @desc Get all payroll data with filters and pagination
 * @access Admin/HR
 */
router.get('/',
  authorize(['admin', 'hr']),
  validateQuery(validators.payrollQuerySchema),
  payrollController.getAll
);

/**
 * @route GET /api/payroll-data/summary
 * @desc Get payroll summary statistics
 * @access Admin/HR
 */
router.get('/summary',
  authorize(['admin', 'hr']),
  payrollController.getSummary
);

/**
 * @route GET /api/payroll-data/employee/:employeeId
 * @desc Get payroll data for specific employee
 * @access Admin/HR/Employee (own data)
 */
router.get('/employee/:employeeId',
  // No authorize middleware - controller handles RBAC for employee own-data access
  validateParams(validators.employeeIdParamSchema),
  payrollController.getByEmployee
);

/**
 * @route GET /api/payroll-data/:id
 * @desc Get single payroll record by ID
 * @access Admin/HR/Employee (own data)
 */
router.get('/:id',
  // No authorize middleware - controller handles RBAC for employee own-data access
  validateParams(validators.uuidParamSchema),
  payrollController.getById
);

/**
 * @route POST /api/payroll-data/calculate
 * @desc Calculate payroll (preview) without saving
 * @access Admin/HR
 */
router.post('/calculate',
  authorize(['admin', 'hr']),
  validate(validators.calculatePayrollSchema),
  payrollController.calculatePayroll
);

/**
 * @route POST /api/payroll-data
 * @desc Create new payroll record
 * @access Admin/HR
 */
router.post('/',
  authorize(['admin', 'hr']),
  validate(validators.createPayrollSchema),
  payrollController.create
);

/**
 * @route PUT /api/payroll-data/:id
 * @desc Update payroll record (draft only)
 * @access Admin/HR
 */
router.put('/:id',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  validate(validators.updatePayrollSchema),
  payrollController.update
);

/**
 * @route POST /api/payroll-data/:id/submit
 * @desc Submit payroll for approval
 * @access Admin/HR
 */
router.post('/:id/submit',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  payrollController.submit
);

/**
 * @route POST /api/payroll-data/:id/approve
 * @desc Approve payroll
 * @access Admin/HR
 */
router.post('/:id/approve',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  payrollController.approve
);

/**
 * @route POST /api/payroll-data/:id/process
 * @desc Process payroll (mark as paid)
 * @access Admin
 */
router.post('/:id/process',
  authorize(['admin']),
  validateParams(validators.uuidParamSchema),
  payrollController.process
);

/**
 * @route POST /api/payroll-data/:id/payslip
 * @desc Generate payslip for payroll record
 * @access Admin/HR
 */
router.post('/:id/payslip',
  authorize(['admin', 'hr']),
  validateParams(validators.uuidParamSchema),
  payrollController.generatePayslip
);

/**
 * @route POST /api/payroll-data/bulk-approve
 * @desc Bulk approve payroll records
 * @access Admin/HR
 */
router.post('/bulk-approve',
  authorize(['admin', 'hr']),
  payrollController.bulkApprove
);

/**
 * @route DELETE /api/payroll-data/:id
 * @desc Delete payroll record (draft only)
 * @access Admin
 */
router.delete('/:id',
  authorize(['admin']),
  validateParams(validators.uuidParamSchema),
  payrollController.delete
);

// ============================================================================
// CSV IMPORT/EXPORT ROUTES
// ============================================================================

/**
 * @route POST /api/payroll-data/import-csv
 * @desc Import payroll data from CSV file
 * @access Admin
 */
router.post('/import-csv',
  authorize(['admin']),
  upload.single('file'),
  payrollController.importCSV
);

/**
 * @route GET /api/payroll-data/export-csv
 * @desc Export payroll data to CSV
 * @access Admin/HR
 */
router.get('/export-csv',
  authorize(['admin', 'hr']),
  payrollController.exportCSV
);

module.exports = router;
