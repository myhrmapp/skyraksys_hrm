/**
 * Payslip Controller
 * Handles HTTP requests for payslip operations
 * Delegates business logic to PayslipService
 * 
 * @module controllers/payslipController
 * @requires services/PayslipService
 * @requires utils/ApiResponse
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-08
 */

const { payslipService } = require('../services/PayslipService');
const ApiResponse = require('../utils/ApiResponse');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const logger = require('../utils/logger');

/**
 * PayslipController
 * Manages payslip generation, updates, status transitions, and reporting
 */
const PayslipController = {
  
  /**
   * Get all payslips with filtering and pagination
   * @route GET /api/payslips
   * @access Admin/HR/Employee (filtered)
   * @rbac Employees see only their own payslips
   */
  async getAll(req, res, next) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        month: req.query.month,
        year: req.query.year,
        status: req.query.status,
        employeeId: req.query.employeeId,
        departmentId: req.query.departmentId
      };

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role,
        employeeId: req.employeeId || req.user.employeeId
      };

      const result = await payslipService.getAllPayslips(filters, currentUser);

      return res.json(ApiResponse.success(
        {
          payslips: result.payslips || [],
          pagination: {
            totalRecords: result.totalCount || 0,
            currentPage: result.currentPage || 1,
            totalPages: result.totalPages || 1
          }
        },
        'Payslips retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current user's payslips
   * @route GET /api/payslips/my
   * @access Employee/All authenticated users
   */
  async getMyPayslips(req, res, next) {
    try {
      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role,
        employeeId: req.employeeId || req.user.employeeId
      };

      const payslips = await payslipService.getMyPayslips(currentUser);

      return res.json(ApiResponse.success(
        payslips,
        'Your payslips retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single payslip by ID
   * @route GET /api/payslips/:id
   * @access Admin/HR/Employee (own only)
   */
  async getById(req, res, next) {
    try {
      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role,
        employeeId: req.employeeId || req.user.employeeId
      };

      const payslip = await payslipService.getPayslipById(req.params.id, currentUser);

      return res.json(ApiResponse.success(
        payslip,
        'Payslip retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get payslip history for an employee
   * @route GET /api/payslips/history/:employeeId
   * @access Admin/HR/Employee (own only)
   */
  async getHistory(req, res, next) {
    try {
      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role,
        employeeId: req.employeeId || req.user.employeeId
      };

      const payslips = await payslipService.getPayslipHistory(req.params.employeeId, currentUser);

      return res.json(ApiResponse.success(
        payslips,
        'Payslip history retrieved successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Calculate payslip preview (without saving)
   * @route POST /api/payslips/calculate-preview
   * @access Admin/HR
   */
  async calculatePreview(req, res, next) {
    try {
      const { employeeId, salaryStructure, attendance, options } = req.body;

      if (!employeeId) {
        throw new ValidationError('employeeId is required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const result = await payslipService.calculatePreview(
        employeeId,
        salaryStructure,
        attendance,
        options,
        currentUser
      );

      return res.json(ApiResponse.success(
        result,
        'Payslip preview calculated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Validate employees before payslip generation
   * @route POST /api/payslips/validate
   * @access Admin/HR
   */
  async validateEmployees(req, res, next) {
    try {
      const { employeeIds, month, year } = req.body;

      const validation = await payslipService.validateEmployees(employeeIds, month, year);

      return res.json(ApiResponse.success(
        validation,
        validation.message || 'Validation completed'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate payslips for selected employees
   * @route POST /api/payslips/generate
   * @access Admin/HR
   */
  async generatePayslips(req, res, next) {
    try {
      const { employeeIds, month, year, templateId, options } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        throw new ValidationError('employeeIds array is required');
      }

      if (!month || !year) {
        throw new ValidationError('month and year are required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const result = await payslipService.generatePayslips(
        employeeIds,
        month,
        year,
        templateId,
        options || {},
        currentUser
      );

      return res.status(201).json(ApiResponse.success(
        result,
        `Generated ${result.count} payslip(s) successfully`
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate payslips for all active employees
   * @route POST /api/payslips/generate-all
   * @access Admin/HR
   */
  async generateAllPayslips(req, res, next) {
    try {
      const { month, year, templateId, departmentId } = req.body;

      if (!month || !year) {
        throw new ValidationError('month and year are required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const result = await payslipService.generateAllPayslips(
        month,
        year,
        templateId,
        departmentId,
        currentUser
      );

      return res.json(ApiResponse.success(
        result,
        `Generated ${result.count} payslip(s) for all employees`
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update payslip (manual edit) - draft only
   * @route PUT /api/payslips/:id
   * @access Admin/HR
   */
  async updatePayslip(req, res, next) {
    try {
      const { earnings, deductions, reason, status, attendance } = req.body;

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      // If only status is being updated, delegate to status-specific handlers
      if (status && !earnings && !deductions) {
        let payslip;
        if (status === 'finalized') {
          payslip = await payslipService.finalizePayslip(req.params.id, currentUser);
        } else if (status === 'paid') {
          payslip = await payslipService.markAsPaid(req.params.id, currentUser);
        } else {
          throw new ValidationError(`Invalid status transition to: ${status}`);
        }
        return res.json(ApiResponse.success(
          payslip,
          `Payslip status updated to ${status}`
        ));
      }

      if (!reason) {
        throw new ValidationError('Reason for edit is required for audit trail');
      }

      const payslip = await payslipService.updatePayslip(
        req.params.id,
        { earnings, deductions, attendance },
        reason,
        currentUser,
        req.ip,
        req.headers['user-agent']
      );

      return res.json(ApiResponse.success(
        payslip,
        'Payslip updated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Finalize payslip (lock for editing)
   * @route PUT /api/payslips/:id/finalize
   * @access Admin/HR
   */
  async finalizePayslip(req, res, next) {
    try {
      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const payslip = await payslipService.finalizePayslip(req.params.id, currentUser);

      return res.json(ApiResponse.success(
        payslip,
        'Payslip finalized successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mark payslip as paid
   * @route PUT /api/payslips/:id/mark-paid
   * @access Admin/HR
   */
  async markAsPaid(req, res, next) {
    try {
      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const payslip = await payslipService.markAsPaid(req.params.id, currentUser);

      return res.json(ApiResponse.success(
        payslip,
        'Payslip marked as paid successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk finalize payslips
   * @route POST /api/payslips/bulk-finalize
   * @access Admin/HR
   */
  async bulkFinalize(req, res, next) {
    try {
      const { payslipIds } = req.body;

      if (!Array.isArray(payslipIds) || payslipIds.length === 0) {
        throw new ValidationError('payslipIds array is required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const results = await payslipService.bulkFinalize(payslipIds, currentUser);

      return res.json(ApiResponse.success(
        results,
        `Finalized ${results.successful.length} payslip(s)`
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk mark payslips as paid
   * @route POST /api/payslips/bulk-paid
   * @access Admin/HR
   */
  async bulkMarkAsPaid(req, res, next) {
    try {
      const { payslipIds } = req.body;

      if (!Array.isArray(payslipIds) || payslipIds.length === 0) {
        throw new ValidationError('payslipIds array is required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const results = await payslipService.bulkMarkAsPaid(payslipIds, currentUser);

      return res.json(ApiResponse.success(
        results,
        `Marked ${results.successful.length} payslip(s) as paid`
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Bulk delete payslips (draft only)
   * @route DELETE /api/payslips/bulk
   * @access Admin
   */
  async bulkDelete(req, res, next) {
    try {
      const { payslipIds } = req.body;

      if (!Array.isArray(payslipIds) || payslipIds.length === 0) {
        throw new ValidationError('payslipIds array is required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const results = await payslipService.bulkDelete(payslipIds, currentUser);

      return res.json(ApiResponse.success(
        results,
        `Deleted ${results.successful.length} payslip(s)`
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download payslip as PDF
   * @route GET /api/payslips/:id/pdf
   * @access Admin/HR/Employee (own only)
   */
  async downloadPDF(req, res, next) {
    try {
      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role,
        employeeId: req.employeeId || req.user.employeeId
      };

      const payslip = await payslipService.getPayslipForPDF(req.params.id, currentUser);

      // Generate PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      // Handle stream errors after headers are sent
      doc.on('error', (err) => {
        logger.error('PDF generation stream error', { payslipId: req.params.id, error: err.message });
        if (!res.headersSent) {
          return next(err);
        }
        res.end();
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.payslipNumber}.pdf"`);
      
      doc.pipe(res);
      
      // Generate PDF content
      PayslipController._generatePayslipPDF(doc, payslip);
      
      doc.end();
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get payroll summary report
   * @route GET /api/payslips/reports/summary
   * @access Admin/HR
   */
  async getSummaryReport(req, res, next) {
    try {
      const { month, year, departmentId } = req.query;

      if (!month || !year) {
        throw new ValidationError('month and year are required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const result = await payslipService.getSummaryReport(
        parseInt(month),
        parseInt(year),
        departmentId,
        currentUser
      );

      return res.json(ApiResponse.success(
        result,
        'Summary report generated successfully'
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Export payslips to Excel/CSV
   * @route GET /api/payslips/reports/export
   * @access Admin/HR
   */
  async exportReport(req, res, next) {
    try {
      const { month, year, format = 'xlsx' } = req.query;

      if (!month || !year) {
        throw new ValidationError('month and year are required');
      }

      const currentUser = {
        id: req.user.id,
        role: req.userRole || req.user.role
      };

      const payslips = await payslipService.getPayslipsForExport(
        parseInt(month),
        parseInt(year),
        currentUser
      );

      if (format === 'xlsx') {
        // Generate Excel file
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payslips');
        
        // Headers
        worksheet.columns = [
          { header: 'Employee ID', key: 'employeeId', width: 15 },
          { header: 'Employee Name', key: 'employeeName', width: 25 },
          { header: 'Period', key: 'period', width: 15 },
          { header: 'Gross Earnings', key: 'grossEarnings', width: 15 },
          { header: 'Total Deductions', key: 'totalDeductions', width: 15 },
          { header: 'Net Pay', key: 'netPay', width: 15 },
          { header: 'Status', key: 'status', width: 12 }
        ];
        
        // Data rows
        payslips.forEach(payslip => {
          worksheet.addRow({
            employeeId: payslip.employee?.employeeId || '',
            employeeName: payslip.employeeInfo?.name || '',
            period: payslip.payPeriod,
            grossEarnings: parseFloat(payslip.grossEarnings) || 0,
            totalDeductions: parseFloat(payslip.totalDeductions) || 0,
            netPay: parseFloat(payslip.netPay) || 0,
            status: payslip.status
          });
        });
        
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' }
        };
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="payslips-${month}-${year}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
        
      } else {
        // CSV format
        const csv = [
          ['Employee ID', 'Employee Name', 'Period', 'Gross Earnings', 'Total Deductions', 'Net Pay', 'Status'].join(','),
          ...payslips.map(p => [
            p.employee?.employeeId || '',
            `"${p.employeeInfo?.name || ''}"`,
            p.payPeriod,
            p.grossEarnings,
            p.totalDeductions,
            p.netPay,
            p.status
          ].join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="payslips-${month}-${year}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      next(error);
    }
  },

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Generate PDF content for a payslip
   * @private
   */
  _generatePayslipPDF(doc, payslip) {
    const marginLeft = 50;
    const marginRight = 550;
    let y = 50;
    
    // Company Header
    doc.fontSize(20).text(payslip.companyInfo?.name || 'Company Name', marginLeft, y);
    y += 25;
    
    doc.fontSize(10).text(payslip.companyInfo?.address || '', marginLeft, y);
    y += 40;
    
    // Title
    doc.fontSize(16).text('PAYSLIP', marginLeft, y, { align: 'center', width: 500 });
    y += 30;
    
    // Period and Employee Info
    doc.fontSize(11).font('Helvetica');
    doc.text(`Pay Period: ${payslip.payPeriod}`, marginLeft, y);
    doc.text(`Payslip No: ${payslip.payslipNumber}`, marginRight - 150, y);
    y += 20;
    
    doc.text(`Employee ID: ${payslip.employeeInfo?.employeeId || ''}`, marginLeft, y);
    y += 15;
    doc.text(`Employee Name: ${payslip.employeeInfo?.name || ''}`, marginLeft, y);
    y += 15;
    doc.text(`Designation: ${payslip.employeeInfo?.designation || ''}`, marginLeft, y);
    y += 15;
    doc.text(`Department: ${payslip.employeeInfo?.department || ''}`, marginLeft, y);
    y += 30;
    
    // Earnings and Deductions Table
    const col1 = marginLeft;
    const col2 = 250;
    const col3 = 350;
    const col4 = 450;
    
    // Table Header
    doc.fontSize(11);
    doc.rect(col1, y, 500, 25).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('#000').text('Earnings', col1 + 5, y + 8);
    doc.text('Amount', col2 + 5, y + 8);
    doc.text('Deductions', col3 + 5, y + 8);
    doc.text('Amount', col4 + 5, y + 8);
    y += 25;
    
    // Table Content
    doc.font('Helvetica').fontSize(10);
    const earnings = payslip.earnings || {};
    const deductions = payslip.deductions || {};
    
    const earningsArray = Object.entries(earnings).filter(([k, v]) => v > 0);
    const deductionsArray = Object.entries(deductions).filter(([k, v]) => v > 0);
    const maxRows = Math.max(earningsArray.length, deductionsArray.length);
    
    for (let i = 0; i < maxRows; i++) {
      const rowHeight = 20;
      
      // Earnings
      if (i < earningsArray.length) {
        const [key, value] = earningsArray[i];
        const label = PayslipController._formatLabel(key);
        doc.text(label, col1 + 5, y + 5, { width: 200 });
        doc.text(`₹${parseFloat(value).toFixed(2)}`, col2 + 5, y + 5);
      }
      
      // Deductions
      if (i < deductionsArray.length) {
        const [key, value] = deductionsArray[i];
        const label = PayslipController._formatLabel(key);
        doc.text(label, col3 + 5, y + 5, { width: 90 });
        doc.text(`₹${parseFloat(value).toFixed(2)}`, col4 + 5, y + 5);
      }
      
      doc.rect(col1, y, 500, rowHeight).stroke('#ddd');
      y += rowHeight;
    }
    
    // Totals
    y += 10;
    doc.fontSize(11);
    doc.rect(col1, y, 500, 25).fillAndStroke('#e0e0e0', '#000');
    doc.fillColor('#000').text('Gross Earnings', col1 + 5, y + 8);
    doc.text(`₹${parseFloat(payslip.grossEarnings).toFixed(2)}`, col2 + 5, y + 8);
    doc.text('Total Deductions', col3 + 5, y + 8);
    doc.text(`₹${parseFloat(payslip.totalDeductions).toFixed(2)}`, col4 + 5, y + 8);
    y += 35;
    
    // Net Pay
    doc.fontSize(14);
    doc.rect(col1, y, 500, 30).fillAndStroke('#4CAF50', '#000');
    doc.fillColor('#fff').text('NET PAY', col1 + 5, y + 10);
    doc.text(`₹${parseFloat(payslip.netPay).toFixed(2)}`, col4 + 5, y + 10);
    y += 40;
    
    // Net Pay in Words
    doc.fillColor('#000').fontSize(10);
    doc.text(`Amount in words: ${payslip.netPayInWords}`, marginLeft, y);
    y += 30;
    
    // Attendance
    if (payslip.attendance) {
      doc.fontSize(11);
      doc.text('Attendance Summary:', marginLeft, y);
      y += 15;
      doc.fontSize(10);
      doc.text(`Working Days: ${payslip.attendance.totalWorkingDays || 0}`, marginLeft + 20, y);
      doc.text(`Present: ${payslip.attendance.presentDays || 0}`, marginLeft + 200, y);
      doc.text(`LOP: ${payslip.attendance.lopDays || 0}`, marginLeft + 350, y);
      y += 30;
    }
    
    // Footer
    doc.fontSize(9).font('Helvetica')
       .text('This is a computer-generated payslip and does not require a signature.', marginLeft, y, {
         align: 'center',
         width: 500
       });
  },

  /**
   * Format field label for display
   * @private
   */
  _formatLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
};

module.exports = PayslipController;
