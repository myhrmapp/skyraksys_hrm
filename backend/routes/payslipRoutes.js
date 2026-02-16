/**
 * Payslip Routes
 * Thin routing layer for payslip operations
 * Delegates to PayslipController
 * 
 * @module routes/payslips
 * @requires controllers/payslipController
 * @author SkyrakSys Development Team
 * @version 2.0.0 - Refactored for clean architecture
 * @created 2026-02-08
 */

const express = require('express');
const router = express.Router();
const payslipController = require('../controllers/payslipController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Middleware: All routes require authentication
router.use(authenticateToken);

// Use standard authorize middleware instead of custom local functions
const isAdminOrHR = authorize('admin', 'hr');
const isAdmin = authorize('admin');

// =====================================================
// PAYSLIP QUERY ROUTES
// =====================================================

/**
 * GET /api/payslips
 * Get all payslips with filters (paginated)
 * Access: Admin/HR view all, Employees view own
 */
router.get('/', payslipController.getAll);

/**
 * GET /api/payslips/my
 * Get current user's payslips
 * Access: All authenticated users
 */
router.get('/my', payslipController.getMyPayslips);

/**
 * GET /api/payslips/history/:employeeId
 * Get payslip history for an employee
 * Access: Admin/HR view all, Employee view own
 */
router.get('/history/:employeeId', payslipController.getHistory);

/**
 * GET /api/payslips/reports/summary
 * Get payroll summary report
 * Access: Admin/HR only
 */
router.get('/reports/summary', isAdminOrHR, payslipController.getSummaryReport);

/**
 * GET /api/payslips/reports/export
 * Export payslips to Excel/CSV
 * Access: Admin/HR only
 */
router.get('/reports/export', isAdminOrHR, payslipController.exportReport);

/**
 * GET /api/payslips/:id
 * Get single payslip by ID
 * Access: Admin/HR view all, Employee view own
 */
router.get('/:id', payslipController.getById);

/**
 * GET /api/payslips/:id/pdf
 * Download payslip as PDF
 * Access: Admin/HR view all, Employee view own
 */
router.get('/:id/pdf', payslipController.downloadPDF);

// =====================================================
// PAYSLIP GENERATION ROUTES
// =====================================================

/**
 * POST /api/payslips/calculate-preview
 * Calculate payslip preview without saving
 * Access: Admin/HR only
 */
router.post('/calculate-preview', isAdminOrHR, payslipController.calculatePreview);

/**
 * POST /api/payslips/validate
 * Validate employees before payslip generation
 * Access: Admin/HR only
 */
router.post('/validate', isAdminOrHR, payslipController.validateEmployees);

/**
 * POST /api/payslips/generate
 * Generate payslips for selected employees
 * Access: Admin/HR only
 */
router.post('/generate', isAdminOrHR, payslipController.generatePayslips);

/**
 * POST /api/payslips/generate-all
 * Generate payslips for all active employees
 * Access: Admin/HR only
 */
router.post('/generate-all', isAdminOrHR, payslipController.generateAllPayslips);

// =====================================================
// PAYSLIP UPDATE ROUTES
// =====================================================

/**
 * PUT /api/payslips/:id
 * Update payslip (manual edit) - draft only
 * Access: Admin/HR only
 */
router.put('/:id', isAdminOrHR, payslipController.updatePayslip);

// =====================================================
// PAYSLIP STATUS ROUTES
// =====================================================

/**
 * PUT /api/payslips/:id/finalize
 * Finalize payslip (lock for editing)
 * Access: Admin/HR only
 */
router.put('/:id/finalize', isAdminOrHR, payslipController.finalizePayslip);

/**
 * PUT /api/payslips/:id/mark-paid
 * Mark payslip as paid
 * Access: Admin/HR only
 */
router.put('/:id/mark-paid', isAdminOrHR, payslipController.markAsPaid);

// =====================================================
// BULK OPERATION ROUTES
// =====================================================

/**
 * POST /api/payslips/bulk-finalize
 * Finalize multiple payslips
 * Access: Admin/HR only
 */
router.post('/bulk-finalize', isAdminOrHR, payslipController.bulkFinalize);

/**
 * POST /api/payslips/bulk-paid
 * Mark multiple payslips as paid
 * Access: Admin/HR only
 */
router.post('/bulk-paid', isAdminOrHR, payslipController.bulkMarkAsPaid);

/**
 * DELETE /api/payslips/bulk
 * Delete multiple payslips (draft only)
 * Access: Admin only
 */
router.delete('/bulk', isAdmin, payslipController.bulkDelete);

module.exports = router;
