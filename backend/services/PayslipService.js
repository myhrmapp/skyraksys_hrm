/**
 * Payslip Service
 * Business logic layer for payslip operations
 * 
 * Responsibilities:
 * - Payslip generation (single & bulk)
 * - Validation and preview calculations
 * - Manual editing with audit trail
 * - Status transitions (draft → finalized → paid)
 * - PDF generation and export
 * - RBAC enforcement
 * 
 * @module services/PayslipService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-08
 */

const { Op } = require('sequelize');
const db = require('../models');
// Don't destructure - use db.ModelName for better testability
const { payslipCalculationService } = require('./payslipCalculation.service');
const { payslipTemplateService } = require('./payslipTemplate.service');
const holidayService = require('./holiday.service');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

class PayslipService {
  /**
   * Calculate payslip preview without persisting
   * @param {string} employeeId - Employee ID
   * @param {Object} salaryStructure - Salary structure (optional, uses employee's if not provided)
   * @param {Object} attendance - Attendance data
   * @param {Object} options - Calculation options
   * @param {Object} currentUser - Current user (for RBAC)
   * @returns {Promise<Object>} Calculation result
   */
  async calculatePreview(employeeId, salaryStructure = null, attendance = {}, options = {}, currentUser) {
    // RBAC: Only admin/HR can calculate previews
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can calculate payslip previews');
    }

    // Fetch employee with salary structure
    const employee = await db.Employee.findByPk(employeeId, {
      include: [
        {
          model: db.SalaryStructure,
          as: 'salaryStructure',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Use provided or employee's salary structure
    const effectiveSalaryStructure = salaryStructure || (employee.salaryStructure ? employee.salaryStructure.toJSON() : null);

    if (!effectiveSalaryStructure || !effectiveSalaryStructure.basicSalary) {
      throw new ValidationError('Salary structure with basicSalary is required');
    }

    // Calculate using calculation service
    const result = payslipCalculationService.calculatePayslip(
      employee.toJSON(),
      effectiveSalaryStructure,
      attendance,
      options
    );

    if (!result.success) {
      throw new ValidationError(result.error || 'Calculation failed');
    }

    return {
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName
      },
      calculation: result
    };
  }

  /**
   * Validate employees before payslip generation
   * @param {Array} employeeIds - Employee IDs to validate
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Promise<Object>} Validation result
   */
  async validateEmployees(employeeIds, month, year) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new ValidationError('employeeIds array is required and cannot be empty');
    }

    if (!month || !year) {
      throw new ValidationError('month and year are required');
    }

    // Fetch all employees with related data
    const employees = await db.Employee.findAll({
      where: { id: { [Op.in]: employeeIds } },
      include: [
        { 
          model: db.SalaryStructure, 
          as: 'salaryStructure',
          required: false 
        },
        {
          model: db.Department,
          as: 'department',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    const validation = {
      totalEmployees: employees.length,
      validEmployees: [],
      invalidEmployees: [],
      warnings: []
    };

    // Pre-fetch timesheets and existing payslips in bulk (avoids N+1 queries)
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    const employeeIdList = employees.map(e => e.id);
    const [timesheets, existingPayslips] = await Promise.all([
      db.Timesheet.findAll({
        where: {
          employeeId: { [Op.in]: employeeIdList },
          weekStartDate: { [Op.between]: [periodStart, periodEnd] }
        },
        attributes: ['employeeId', 'status']
      }),
      db.Payslip.findAll({
        where: { employeeId: { [Op.in]: employeeIdList }, month, year },
        attributes: ['employeeId', 'payslipNumber', 'status']
      })
    ]);
    const timesheetMap = new Map(timesheets.map(t => [t.employeeId, t]));
    const existingPayslipMap = new Map(existingPayslips.map(p => [p.employeeId, p]));

    // Validate each employee
    for (const emp of employees) {
      const issues = [];

      // Check 1: Salary structure exists
      if (!emp.salaryStructure) {
        issues.push('No salary structure configured');
      } else if (!emp.salaryStructure.isActive) {
        issues.push('Salary structure is inactive');
      }

      // Check 2: Timesheet data (informational only — payroll uses leave + holiday model)
      const timesheet = timesheetMap.get(emp.id);

      if (!timesheet) {
        validation.warnings.push(`${emp.firstName} ${emp.lastName}: No timesheet data — payroll will use default full attendance`);
      } else if (timesheet.status?.toLowerCase() !== 'approved') {
        validation.warnings.push(`${emp.firstName} ${emp.lastName}: Timesheet not approved (status: ${timesheet.status}) — payroll will use default full attendance`);
      }

      // Check 3: Payslip already exists
      const existing = existingPayslipMap.get(emp.id);

      if (existing) {
        issues.push(`Payslip already exists (${existing.payslipNumber}, status: ${existing.status})`);
      }

      // Check 4: Employee status
      if (emp.status !== 'Active') {
        issues.push(`Employee status is ${emp.status}`);
      }

      // Categorize employee
      const employeeData = {
        id: emp.id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department ? emp.department.name : 'N/A',
        status: emp.status
      };

      if (issues.length > 0) {
        validation.invalidEmployees.push({
          ...employeeData,
          issues
        });
      } else {
        validation.validEmployees.push(employeeData);
      }
    }

    // Calculate success rate
    validation.canProceed = validation.validEmployees.length > 0;
    validation.successRate = validation.totalEmployees > 0 
      ? ((validation.validEmployees.length / validation.totalEmployees) * 100).toFixed(1)
      : '0.0';

    // Add summary message
    if (validation.validEmployees.length === validation.totalEmployees) {
      validation.message = 'All employees are valid for payslip generation';
    } else if (validation.validEmployees.length === 0) {
      validation.message = 'No employees are valid for payslip generation';
    } else {
      validation.message = `${validation.validEmployees.length} out of ${validation.totalEmployees} employees are valid`;
    }

    return validation;
  }

  /**
   * Generate payslips for employees
   * @param {Array} employeeIds - Employee IDs
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @param {String} templateId - Template ID (optional)
   * @param {Object} options - Generation options
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Generated payslips and errors
   */
  async generatePayslips(employeeIds, month, year, templateId = null, options = {}, currentUser) {
    // RBAC: Only admin/HR can generate payslips
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can generate payslips');
    }

    const transaction = await db.sequelize.transaction();

    try {
      // Get or create default template
      let template;
      if (templateId) {
        const result = await payslipTemplateService.getTemplateById(templateId);
        template = result.data;
      } else {
        const result = await payslipTemplateService.getDefaultTemplateFromDB();
        template = result.data;
      }

      const generatedPayslips = [];
      const errors = [];

      // Pre-fetch all employees with salary structures to avoid N+1 queries
      const allEmployees = await db.Employee.findAll({
        where: { id: { [Op.in]: employeeIds } },
        include: [
          { model: db.SalaryStructure, as: 'salaryStructure', where: { isActive: true }, required: false },
          { model: db.Department, as: 'department', required: false },
          { model: db.Position, as: 'position', required: false }
        ],
        transaction
      });
      const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

      for (const employeeId of employeeIds) {
        try {
          // Check if payslip already exists (with row lock to prevent concurrent duplicates)
          const existing = await db.Payslip.findOne({
            where: { employeeId, month, year },
            lock: transaction.LOCK.UPDATE,
            transaction
          });

          if (existing) {
            errors.push({
              employeeId,
              message: 'Payslip already exists for this period'
            });
            continue;
          }

          // Use pre-fetched employee (avoids N+1 queries)
          const employee = employeeMap.get(employeeId);

          if (!employee) {
            errors.push({
              employeeId,
              message: 'Employee not found'
            });
            continue;
          }

          if (!employee.salaryStructure) {
            errors.push({
              employeeId,
              message: 'No active salary structure found'
            });
            continue;
          }

          // Fetch attendance data (convert month/year to date range)
          const periodStart = new Date(year, month - 1, 1);
          const periodEnd = new Date(year, month, 0); // last day of month
          const attendance = await this._getAttendanceData(employeeId, periodStart, periodEnd);

          // Apply manual overtime override if provided
          if (options.overtimeOverrides && options.overtimeOverrides[employeeId] != null) {
            const otHours = parseFloat(options.overtimeOverrides[employeeId]);
            if (otHours >= 0) {
              attendance.overtimeHours = otHours;
            }
          }

          // Calculate payslip using calculation service
          const calculation = payslipCalculationService.calculatePayslip(
            employee,
            employee.salaryStructure,
            attendance,
            options
          );

          if (!calculation.success) {
            errors.push({
              employeeId,
              message: calculation.error || 'Calculation failed'
            });
            continue;
          }

          // Generate payslip number
          const payslipNumber = `PS${year}${month.toString().padStart(2, '0')}${employee.employeeId}`;

          // Create company info
          const companyInfo = {
            name: 'Skyraksys Technologies',
            address: 'Mumbai',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            pan: 'XXXXXX0000X',
            tan: 'MUMX00000X'
          };

          // Create employee info snapshot
          const employeeInfo = {
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email,
            designation: employee.position?.name || 'N/A',
            department: employee.department?.name || 'N/A',
            dateOfJoining: employee.hireDate,
            panNumber: employee.panNumber,
            uanNumber: employee.uanNumber,
            pfNumber: employee.pfNumber,
            esiNumber: employee.esiNumber,
            bankAccountNumber: employee.bankAccountNumber,
            bankName: employee.bankName
          };

          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);

          // Create PayrollData record first
          const payrollData = await db.PayrollData.create({
            employeeId,
            payPeriod: `${this._getMonthName(month)} ${year}`,
            payPeriodStart: startDate,
            payPeriodEnd: endDate,
            totalWorkingDays: attendance.totalWorkingDays,
            presentDays: attendance.presentDays,
            lopDays: attendance.lopDays,
            paidDays: attendance.paidDays,
            overtimeHours: attendance.overtimeHours,
            grossSalary: calculation.grossSalary,
            totalDeductions: calculation.totalDeductions,
            netSalary: calculation.netPay,
            status: 'draft',
            createdBy: currentUser.id,
            variableEarnings: {},
            variableDeductions: {},
            leaveAdjustments: {}
          }, { transaction });

          // Create payslip
          const payslip = await db.Payslip.create({
            payrollDataId: payrollData.id,
            employeeId,
            month,
            year,
            payPeriod: `${this._getMonthName(month)} ${year}`,
            payPeriodStart: startDate,
            payPeriodEnd: endDate,
            templateId: template.id || null,
            templateVersion: '1.0',
            employeeInfo,
            companyInfo,
            earnings: calculation.earnings,
            deductions: calculation.deductions,
            attendance: calculation.attendance,
            grossEarnings: calculation.grossSalary,
            totalDeductions: calculation.totalDeductions,
            netPay: calculation.netPay,
            netPayInWords: calculation.netPayInWords,
            payslipNumber,
            payDate: new Date(),
            generatedDate: new Date(),
            generatedBy: currentUser.id,
            status: 'draft',
            calculationDetails: calculation.calculationMetadata
          }, { transaction });

          generatedPayslips.push(payslip);

        } catch (empError) {
          logger.error(`Error generating payslip for employee ${employeeId}:`, { detail: empError });
          errors.push({
            employeeId,
            message: empError.message
          });
        }
      }

      await transaction.commit();

      return {
        payslips: generatedPayslips,
        count: generatedPayslips.length,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update payslip (manual edit) - draft only
   * @param {String} payslipId - Payslip ID
   * @param {Object} updates - Updates (earnings, deductions)
   * @param {String} reason - Reason for edit (audit trail)
   * @param {Object} currentUser - Current user
   * @param {String} ipAddress - IP address
   * @param {String} userAgent - User agent
   * @returns {Promise<Object>} Updated payslip
   */
  async updatePayslip(payslipId, updates, reason, currentUser, ipAddress = null, userAgent = null) {
    // RBAC: Only admin/HR can edit payslips
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can edit payslips');
    }

    const { earnings, deductions, attendance } = updates;

    // Validation
    if (!earnings || typeof earnings !== 'object' || Object.keys(earnings).length === 0) {
      throw new ValidationError('Earnings object is required and must have at least one component');
    }

    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('Detailed reason is required (minimum 10 characters) for audit trail');
    }

    const transaction = await db.sequelize.transaction();

    try {
      // Fetch payslip
      const payslip = await db.Payslip.findByPk(payslipId, {
        include: [
          {
            model: db.Employee,
            as: 'employee',
            attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email']
          }
        ],
        transaction
      });

      if (!payslip) {
        throw new NotFoundError('Payslip not found');
      }

      // Security check: Only draft payslips can be edited
      if (payslip.status !== 'draft') {
        throw new ValidationError(`Cannot edit payslip with status "${payslip.status}". Only draft payslips can be edited.`);
      }

      // Calculate new totals
      const grossEarnings = Object.values(earnings).reduce((sum, val) => sum + parseFloat(val || 0), 0);
      const totalDeductions = deductions 
        ? Object.values(deductions).reduce((sum, val) => sum + parseFloat(val || 0), 0)
        : 0;
      const netPay = grossEarnings - totalDeductions;

      // Validate net pay
      if (netPay < 0) {
        throw new ValidationError('Net pay cannot be negative. Please adjust earnings or deductions.');
      }

      // Store original values for audit log
      const originalValues = {
        earnings: payslip.earnings,
        deductions: payslip.deductions,
        grossEarnings: payslip.grossEarnings,
        totalDeductions: payslip.totalDeductions,
        netPay: payslip.netPay,
        attendance: payslip.attendance
      };

      // Merge attendance updates (e.g. overtimeHours) with existing attendance data
      const updatedAttendance = attendance
        ? { ...(payslip.attendance || {}), ...attendance }
        : payslip.attendance;

      // Update payslip
      await payslip.update({
        earnings,
        deductions: deductions || {},
        grossEarnings,
        totalDeductions,
        netPay,
        attendance: updatedAttendance,
        manuallyEdited: true,
        lastEditedBy: currentUser.id,
        lastEditedAt: new Date()
      }, { transaction });

      // Create audit log entry
      await db.PayslipAuditLog.create({
        payslipId: payslip.id,
        action: 'manual_edit',
        performedBy: currentUser.id,
        reason: reason.trim(),
        changes: {
          before: originalValues,
          after: {
            earnings,
            deductions: deductions || {},
            grossEarnings,
            totalDeductions,
            netPay,
            attendance: updatedAttendance
          }
        },
        ipAddress,
        userAgent
      }, { transaction });

      await transaction.commit();

      // Reload with associations
      await payslip.reload({
        include: [
          {
            model: db.Employee,
            as: 'employee',
            attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'departmentId']
          }
        ]
      });

      return payslip;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Finalize payslip (lock for editing)
   * @param {String} payslipId - Payslip ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Updated payslip
   */
  async finalizePayslip(payslipId, currentUser) {
    // RBAC: Only admin/HR can finalize
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can finalize payslips');
    }

    const payslip = await db.Payslip.findByPk(payslipId);

    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    if (payslip.status !== 'draft') {
      throw new ValidationError(`Cannot finalize payslip with status "${payslip.status}"`);
    }

    await payslip.update({
      status: 'finalized',
      finalizedAt: new Date(),
      approvedBy: currentUser.id
    });

    return payslip;
  }

  /**
   * Mark payslip as paid
   * @param {String} payslipId - Payslip ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Updated payslip
   */
  async markAsPaid(payslipId, currentUser) {
    // RBAC: Only admin/HR can mark as paid
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can mark payslips as paid');
    }

    const payslip = await db.Payslip.findByPk(payslipId);

    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    if (payslip.status !== 'finalized') {
      throw new ValidationError('Only finalized payslips can be marked as paid');
    }

    await payslip.update({
      status: 'paid',
      paidAt: new Date()
    });

    return payslip;
  }

  /**
   * Bulk finalize payslips
   * @param {Array} payslipIds - Payslip IDs
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Result with success/failed counts
   */
  async bulkFinalize(payslipIds, currentUser) {
    // RBAC
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can finalize payslips');
    }

    const results = {
      successful: [],
      failed: []
    };

    await db.sequelize.transaction(async (transaction) => {
      for (const id of payslipIds) {
        try {
          const payslip = await db.Payslip.findByPk(id, { lock: transaction.LOCK.UPDATE, transaction });
          if (!payslip) {
            results.failed.push({ id, error: 'Payslip not found' });
            continue;
          }
          if (payslip.status !== 'draft') {
            results.failed.push({ id, error: `Cannot finalize payslip with status "${payslip.status}"` });
            continue;
          }
          await payslip.update({
            status: 'finalized',
            finalizedAt: new Date(),
            approvedBy: currentUser.id
          }, { transaction });
          results.successful.push({ id, payslipNumber: payslip.payslipNumber });
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }
    });

    return results;
  }

  /**
   * Bulk mark as paid
   * @param {Array} payslipIds - Payslip IDs
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Result with success/failed counts
   */
  async bulkMarkAsPaid(payslipIds, currentUser) {
    // RBAC
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can mark payslips as paid');
    }

    const results = {
      successful: [],
      failed: []
    };

    await db.sequelize.transaction(async (transaction) => {
      for (const id of payslipIds) {
        try {
          const payslip = await db.Payslip.findByPk(id, { lock: transaction.LOCK.UPDATE, transaction });
          if (!payslip) {
            results.failed.push({ id, error: 'Payslip not found' });
            continue;
          }
          if (payslip.status !== 'finalized') {
            results.failed.push({ id, error: 'Only finalized payslips can be marked as paid' });
            continue;
          }
          await payslip.update({
            status: 'paid',
            paidAt: new Date()
          }, { transaction });
          results.successful.push({ id, payslipNumber: payslip.payslipNumber });
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }
    });

    return results;
  }

  /**
   * Bulk delete payslips (draft only)
   * @param {Array} payslipIds - Payslip IDs
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Result with success/failed counts
   */
  async bulkDelete(payslipIds, currentUser) {
    // RBAC: Only admin can delete
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('Only admin can delete payslips');
    }

    const results = {
      successful: [],
      failed: []
    };

    await db.sequelize.transaction(async (transaction) => {
      for (const id of payslipIds) {
        try {
          const payslip = await db.Payslip.findByPk(id, { lock: transaction.LOCK.UPDATE, transaction });
          
          if (!payslip) {
            results.failed.push({ id, error: 'Payslip not found' });
            continue;
          }

          if (payslip.status !== 'draft') {
            results.failed.push({ id, error: `Cannot delete ${payslip.status} payslip` });
            continue;
          }

          await payslip.destroy({ transaction });
          results.successful.push({ id, payslipNumber: payslip.payslipNumber });
        } catch (error) {
          results.failed.push({ id, error: error.message });
        }
      }
    });

    return results;
  }

  /**
   * Generate payslips for all active employees
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @param {String} templateId - Template ID (optional)
   * @param {String} departmentId - Department ID filter (optional)
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Generated payslips and errors
   */
  async generateAllPayslips(month, year, templateId = null, departmentId = null, currentUser) {
    // RBAC: Only admin/HR can generate all payslips
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can generate payslips for all employees');
    }

    // Build where clause
    const where = { status: 'Active' };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    // Find all active employees
    const employees = await db.Employee.findAll({
      where,
      attributes: ['id']
    });

    if (employees.length === 0) {
      throw new ValidationError('No active employees found');
    }

    const employeeIds = employees.map(e => e.id);

    // Use the existing generatePayslips method
    return await this.generatePayslips(employeeIds, month, year, templateId, {}, currentUser);
  }

  /**
   * Get payslip summary report
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @param {String} departmentId - Department ID (optional)
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Summary report
   */
  async getSummaryReport(month, year, departmentId = null, currentUser) {
    // RBAC: Only admin/HR can view summary reports
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can view summary reports');
    }

    const where = {
      month: parseInt(month),
      year: parseInt(year)
    };

    // Fetch payslips
    const payslips = await db.Payslip.findAll({
      where,
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'departmentId'],
          ...(departmentId && {
            where: { departmentId }
          })
        }
      ]
    });

    // Calculate summary
    const summary = {
      totalPayslips: payslips.length,
      totalGrossEarnings: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      statusBreakdown: {
        draft: 0,
        finalized: 0,
        paid: 0,
        cancelled: 0
      },
      departmentWise: {}
    };

    payslips.forEach(payslip => {
      summary.totalGrossEarnings += parseFloat(payslip.grossEarnings) || 0;
      summary.totalDeductions += parseFloat(payslip.totalDeductions) || 0;
      summary.totalNetPay += parseFloat(payslip.netPay) || 0;
      summary.statusBreakdown[payslip.status] = (summary.statusBreakdown[payslip.status] || 0) + 1;
      
      const deptId = payslip.employee?.departmentId || 'Unknown';
      if (!summary.departmentWise[deptId]) {
        summary.departmentWise[deptId] = {
          count: 0,
          totalNetPay: 0
        };
      }
      summary.departmentWise[deptId].count++;
      summary.departmentWise[deptId].totalNetPay += parseFloat(payslip.netPay) || 0;
    });

    return {
      period: `${this._getMonthName(month)} ${year}`,
      summary
    };
  }

  /**
   * Get payslips for export
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @param {Object} currentUser - Current user
   * @returns {Promise<Array>} Payslip data for export
   */
  async getPayslipsForExport(month, year, currentUser) {
    // RBAC: Only admin/HR can export
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can export payslips');
    }

    const payslips = await db.Payslip.findAll({
      where: {
        month: parseInt(month),
        year: parseInt(year)
      },
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['employeeId', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['employeeId', 'ASC']]
    });

    return payslips;
  }

  /**
   * Get payslip with full details (for PDF generation)
   * @param {String} payslipId - Payslip ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Payslip with associations
   */
  async getPayslipForPDF(payslipId, currentUser) {
    const payslip = await db.Payslip.findByPk(payslipId, {
      include: [
        {
          model: db.Employee,
          as: 'employee'
        },
        {
          model: db.PayslipTemplate,
          as: 'template'
        }
      ]
    });

    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    // RBAC: Employees can only view own payslips
    if (currentUser.role === 'employee' && payslip.employeeId !== currentUser.employeeId) {
      throw new ForbiddenError('Access denied');
    }

    return payslip;
  }

  /**
   * Get all payslips with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Paginated payslips
   */
  async getAllPayslips(filters, currentUser) {
    const { page = 1, limit = 20, month, year, status, employeeId, departmentId } = filters;

    // Build where clause
    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    // RBAC: Employees can only see their own payslips
    if (currentUser.role === 'employee') {
      where.employeeId = currentUser.employeeId;
    }

    // Build include clause
    const include = [
      {
        model: db.Employee,
        as: 'employee',
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'departmentId'],
        ...(departmentId && !where.employeeId && {
          where: { departmentId }
        }),
        include: [
          {
            model: db.Department,
            as: 'department',
            attributes: ['id', 'name']
          }
        ]
      }
    ];

    // Fetch with pagination
    const offset = (page - 1) * limit;
    const result = await db.Payslip.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    return {
      payslips: result.rows,
      totalCount: result.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(result.count / limit)
    };
  }

  /**
   * Get payslip history for an employee
   * @param {String} employeeIdParam - Employee ID (UUID or employeeId string)
   * @param {Object} currentUser - Current user
   * @returns {Promise<Array>} Payslip history
   */
  async getPayslipHistory(employeeIdParam, currentUser) {
    // RBAC: Employees can only view own history
    if (currentUser.role === 'employee' && employeeIdParam !== currentUser.employeeId && employeeIdParam !== currentUser.id) {
      throw new ForbiddenError('You can only view your own payslip history');
    }

    // Determine if employeeIdParam is UUID or employeeId string
    const where = {};
    if (employeeIdParam.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      where.employeeId = employeeIdParam; // UUID
    } else {
      // Find employee by employeeId string
      const employee = await db.Employee.findOne({
        where: { employeeId: employeeIdParam }
      });
      if (!employee) {
        throw new NotFoundError('Employee not found');
      }
      where.employeeId = employee.id;
    }

    const payslips = await db.Payslip.findAll({
      where,
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName']
        }
      ],
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    return payslips;
  }

  /**
   * Get single payslip by ID
   * @param {String} payslipId - Payslip ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Payslip
   */
  async getPayslipById(payslipId, currentUser) {
    const payslip = await db.Payslip.findByPk(payslipId, {
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'departmentId'],
          include: [
            {
              model: db.Department,
              as: 'department',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (!payslip) {
      throw new NotFoundError('Payslip not found');
    }

    // RBAC: Employees can only view own payslip
    if (currentUser.role === 'employee' && payslip.employeeId !== currentUser.employeeId) {
      throw new ForbiddenError('Access denied');
    }

    return payslip;
  }

  /**
   * Get current user's payslips
   * @param {Object} currentUser - Current user
   * @returns {Promise<Array>} User's payslips
   */
  async getMyPayslips(currentUser) {
    if (!currentUser.employeeId) {
      throw new ValidationError('Employee ID not found for user');
    }

    const payslips = await db.Payslip.findAll({
      where: { employeeId: currentUser.employeeId },
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName']
        }
      ],
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    return payslips;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Format a Date as 'YYYY-MM-DD' using **local** time components.
   * Avoids the timezone shift caused by toISOString() (which returns UTC).
   * @private
   */
  _formatDateLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Get attendance data for payslip generation.
   * Uses "default full attendance" model:
   *   Working Days = weekdays in month − public holidays on weekdays
   *   LOP Days     = approved unpaid-leave days that fall within the period
   *   Payable Days = Working Days − LOP Days
   * @private
   */
  async _getAttendanceData(employeeId, startDate, endDate) {
    // 1. Build holiday set for fast lookup
    const holidayDateSet = await holidayService.getHolidayDateSet(
      this._formatDateLocal(startDate),
      this._formatDateLocal(endDate)
    );

    // 2. Count working days (weekdays that are NOT holidays)
    const totalWorkingDays = this._calculateWorkingDaysInMonth(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      holidayDateSet
    );

    // 3. Fetch approved leave requests that overlap this period
    const leaveRequests = await db.LeaveRequest.findAll({
      where: {
        employeeId,
        status: 'Approved',
        isCancellation: { [Op.ne]: true },
        startDate: { [Op.lte]: endDate },
        endDate: { [Op.gte]: startDate }
      },
      include: [{
        model: db.LeaveType,
        as: 'leaveType',
        attributes: ['id', 'name', 'isPaid']
      }]
    });

    // 4. Count leave days per type (paid vs unpaid), only for days within the period
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    for (const lr of leaveRequests) {
      // Clamp leave range to pay-period boundaries
      const leaveStart = new Date(Math.max(new Date(lr.startDate), startDate));
      const leaveEnd = new Date(Math.min(new Date(lr.endDate), endDate));

      let leaveDaysInPeriod = 0;

      if (lr.isHalfDay) {
        // Half-day leave counts as 0.5 regardless of date range
        leaveDaysInPeriod = 0.5;
      } else {
        // Count weekdays (non-weekend, non-holiday) in the leave range
        const cursor = new Date(leaveStart);
        while (cursor <= leaveEnd) {
          const dow = cursor.getDay();
          const dateStr = this._formatDateLocal(cursor);
          if (dow !== 0 && dow !== 6 && !holidayDateSet.has(dateStr)) {
            leaveDaysInPeriod++;
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      if (lr.leaveType && lr.leaveType.isPaid === false) {
        unpaidLeaveDays += leaveDaysInPeriod;
      } else {
        paidLeaveDays += leaveDaysInPeriod;
      }
    }

    const lopDays = unpaidLeaveDays;
    const presentDays = totalWorkingDays - paidLeaveDays - unpaidLeaveDays;
    const paidDays = totalWorkingDays - lopDays;

    return {
      totalWorkingDays,
      presentDays: Math.max(0, presentDays),
      paidDays: Math.max(0, paidDays),
      absentDays: paidLeaveDays + unpaidLeaveDays,
      lopDays,
      overtimeHours: 0,
      leaveDays: paidLeaveDays + unpaidLeaveDays,
      paidLeaveDays,
      unpaidLeaveDays
    };
  }

  /**
   * Calculate working days in a month (weekdays minus holidays on weekdays)
   * @param {number} year
   * @param {number} month - 1-based
   * @param {Set<string>} [holidayDateSet] - Set of 'YYYY-MM-DD' holiday strings
   * @private
   */
  _calculateWorkingDaysInMonth(year, month, holidayDateSet) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = this._formatDateLocal(date);
        if (!holidayDateSet || !holidayDateSet.has(dateStr)) {
          workingDays++;
        }
      }
    }

    return workingDays;
  }

  /**
   * Get month name
   * @private
   */
  _getMonthName(month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }
}

// Helper function for working days calculation (keep for backward compatibility if used in routes)
function calculateWorkingDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  return workingDays;
}

// Helper function for month names (keep for backward compatibility)
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

// Export singleton instance
const payslipService = new PayslipService();

module.exports = {
  PayslipService,
  payslipService,
  calculateWorkingDaysInMonth, // Export helper for backward compatibility
  getMonthName // Export helper for backward compatibility
};
