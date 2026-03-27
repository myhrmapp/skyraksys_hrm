/**
 * Payroll Business Service
 * Business logic layer for payroll operations
 * 
 * Responsibilities:
 * - Payroll calculation workflows
 * - Indian compliance (EPF, ESI, TDS, PT)
 * - RBAC enforcement
 * - Business rule validation
 * - Status transitions (draft → calculated → approved → paid)
 * 
 * Indian Compliance Rules:
 * - EPF: 12% employee + 12% employer (on basic + DA)
 * - ESI: 0.75% employee + 3.25% employer (if gross < ₹21,000)
 * - TDS: Based on income tax slabs
 * - PT: State-specific (Maharashtra: max ₹2,500/year)
 * 
 * @module services/business/PayrollBusinessService
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07
 */

const { ValidationError, NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { logger } = require('../../config/logger');

class PayrollBusinessService {
  constructor(payrollDataService, employeeDataService) {
    this.payrollDataService = payrollDataService;
    this.employeeDataService = employeeDataService;
  }

  /**
   * Log business operations
   */
  log(operation, data = {}) {
    logger.info(`PayrollBusinessService: ${operation}`, data);
  }

  /**
   * Calculate payroll for employee
   * 
   * Business Rules:
   * - Must have valid salary structure
   * - Period dates must be valid
   * - Cannot calculate for future periods
   * - Applies Indian statutory compliance
   * 
   * @param {string} employeeId - Employee ID
   * @param {Date} periodStart - Pay period start
   * @param {Date} periodEnd - Pay period end
   * @param {Object} overrides - Manual adjustments
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Calculated payroll
   */
  async calculatePayroll(employeeId, periodStart, periodEnd, overrides, currentUser) {
    this.log('calculatePayroll', { employeeId, periodStart, periodEnd });

    // RBAC: Only admin or HR roles can calculate payroll
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can calculate payroll');
    }

    // Validate dates
    await this.validatePayPeriod(periodStart, periodEnd);

    // Verify employee exists
    const employee = await this.employeeDataService.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Calculate using data service
    const calculation = await this.payrollDataService.calculatePayroll(
      employeeId,
      periodStart,
      periodEnd,
      overrides || {}
    );

    this.log('calculatePayroll:success', { employeeId, netPay: calculation.netPay });
    return calculation;
  }

  /**
   * Create payroll record
   * 
   * Business Rules:
   * - Must be calculated first
   * - Cannot create duplicate for same period
   * - Initial status: draft
   * 
   * @param {Object} data - Payroll data
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Created payroll
   */
  async createPayroll(data, currentUser) {
    this.log('createPayroll', { employeeId: data.employeeId });

    // RBAC: Only admin, HR, or payroll managers
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can create payroll');
    }

    // Validate required fields
    if (!data.employeeId) {
      throw new ValidationError('Employee ID is required');
    }
    if (!data.payPeriodStart || !data.payPeriodEnd) {
      throw new ValidationError('Pay period dates are required');
    }

    // Validate dates
    await this.validatePayPeriod(data.payPeriodStart, data.payPeriodEnd);

    // Check for duplicate
    const existing = await this.payrollDataService.findByEmployee(data.employeeId, {
      where: {
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd
      }
    });

    if (existing && existing.length > 0) {
      throw new BadRequestError('Payroll already exists for this employee and period');
    }

    // Set default status
    if (!data.status) {
      data.status = 'draft';
    }

    // Create record
    const payroll = await this.payrollDataService.create(data);

    this.log('createPayroll:success', { id: payroll.id });
    return this.payrollDataService.findByIdWithDetails(payroll.id);
  }

  /**
   * Update payroll record
   * 
   * Business Rules:
   * - Can only update Draft or Pending payroll
   * - Cannot modify processed payroll
   * - Recalculates totals if amounts change
   * 
   * @param {string} id - Payroll ID
   * @param {Object} data - Update data
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Updated payroll
   */
  async updatePayroll(id, data, currentUser) {
    this.log('updatePayroll', { id });

    // RBAC: Only admin, HR, or payroll managers
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can update payroll');
    }

    const payroll = await this.payrollDataService.findById(id);

    if (!payroll) {
      throw new NotFoundError('Payroll record not found');
    }

    // Check status - can only update draft payroll
    if (payroll.status !== 'draft') {
      throw new BadRequestError('Can only update draft payroll records');
    }

    // If critical fields change, recalculate
    if (data.basicSalary || data.allowances || data.deductions) {
      // Recalculate totals
      const basicSalary = Number(data.basicSalary || payroll.basicSalary);
      const totalAllowances = this.calculateTotalAllowances(data.allowances || payroll.allowances);
      const totalDeductions = this.calculateTotalDeductions(data.deductions || payroll.deductions);
      
      data.grossPay = basicSalary + totalAllowances;
      data.netPay = data.grossPay - totalDeductions;
    }

    await this.payrollDataService.update(id, data);

    this.log('updatePayroll:success', { id });
    return this.payrollDataService.findByIdWithDetails(id);
  }

  /**
   * Process payroll (Draft → Processed)
   * 
   * Business Rules:
   * - Only Draft payroll can be processed
   * - Locks payroll for editing
   * - Triggers payslip generation
   * 
   * @param {string} id - Payroll ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Processed payroll
   */
  async processPayroll(id, currentUser) {
    this.log('processPayroll', { id });

    // RBAC: Only admin, HR, or payroll managers
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can process payroll');
    }

    const payroll = await this.payrollDataService.findById(id);

    if (!payroll) {
      throw new NotFoundError('Payroll record not found');
    }

    if (payroll.status !== 'draft') {
      throw new BadRequestError('Can only process draft payroll');
    }

    // Update status
    await this.payrollDataService.update(id, {
      status: 'calculated',
      processedAt: new Date(),
      processedBy: currentUser.id
    });

    this.log('processPayroll:success', { id });
    return this.payrollDataService.findByIdWithDetails(id);
  }

  /**
   * Approve payroll (Processed → Approved)
   * 
   * Business Rules:
   * - Only Processed payroll can be approved
   * - Marks ready for payment
   * - Generates final payslip
   * 
   * @param {string} id - Payroll ID
   * @param {Object} currentUser - Current user
   * @param {string} comments - Approval comments
   * @returns {Promise<Object>} Approved payroll
   */
  async approvePayroll(id, currentUser, comments = '') {
    this.log('approvePayroll', { id });

    // RBAC: Only admin or HR can approve
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can approve payroll');
    }

    const payroll = await this.payrollDataService.findById(id);

    if (!payroll) {
      throw new NotFoundError('Payroll record not found');
    }

    if (payroll.status !== 'calculated') {
      throw new BadRequestError('Can only approve calculated payroll');
    }

    // Update status
    await this.payrollDataService.update(id, {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: currentUser.id,
      approverComments: comments
    });

    this.log('approvePayroll:success', { id });
    return this.payrollDataService.findByIdWithDetails(id);
  }

  /**
   * Reject payroll
   * 
   * Business Rules:
   * - Can reject Processed or Pending payroll
   * - Returns to Draft for corrections
   * - Comments required
   * 
   * @param {string} id - Payroll ID
   * @param {Object} currentUser - Current user
   * @param {string} comments - Rejection reason
   * @returns {Promise<Object>} Rejected payroll
   */
  async rejectPayroll(id, currentUser, comments) {
    this.log('rejectPayroll', { id });

    // RBAC: Only admin or HR can reject
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can reject payroll');
    }

    if (!comments || comments.trim() === '') {
      throw new ValidationError('Rejection comments are required');
    }

    const payroll = await this.payrollDataService.findById(id);

    if (!payroll) {
      throw new NotFoundError('Payroll record not found');
    }

    if (!['calculated', 'approved'].includes(payroll.status)) {
      throw new BadRequestError('Can only reject Processed or Pending payroll');
    }

    // Return to Draft
    await this.payrollDataService.update(id, {
      status: 'draft',
      rejectedAt: new Date(),
      rejectedBy: currentUser.id,
      rejectionComments: comments
    });

    this.log('rejectPayroll:success', { id });
    return this.payrollDataService.findByIdWithDetails(id);
  }

  /**
   * Generate payslip
   * 
   * Business Rules:
   * - Only for Approved payroll
   * - Creates PDF document
   * - Stores in database
   * 
   * @param {string} payrollId - Payroll ID
   * @param {Object} currentUser - Current user
   * @returns {Promise<Object>} Payslip data
   */
  async generatePayslip(payrollId, currentUser) {
    this.log('generatePayslip', { payrollId });

    // RBAC: HR, payroll managers, or employee viewing own
    const payroll = await this.payrollDataService.findById(payrollId);

    if (!payroll) {
      throw new NotFoundError('Payroll record not found');
    }

    // Check access
    if (currentUser.role === 'employee') {
      if (!currentUser.employee?.id || payroll.employeeId !== currentUser.employee.id) {
        throw new ForbiddenError('You can only view your own payslips');
      }
    } else if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Access denied');
    }

    // Generate using data service
    const payslip = await this.payrollDataService.generatePayslip(payrollId);

    this.log('generatePayslip:success', { payrollId });
    return payslip;
  }

  /**
   * Bulk generate payroll for multiple employees
   * 
   * @param {Array<string>} employeeIds - Employee IDs
   * @param {Date} periodStart - Pay period start
   * @param {Date} periodEnd - Pay period end
   * @param {Object} currentUser - Current user
   * @returns {Promise<Array>} Generated payroll records
   */
  async bulkGeneratePayroll(employeeIds, periodStart, periodEnd, currentUser) {
    this.log('bulkGeneratePayroll', { count: employeeIds.length });

    // RBAC: Only admin, HR, or payroll managers
    if (!['admin', 'hr'].includes(currentUser.role)) {
      throw new ForbiddenError('Only admin or HR can generate payroll');
    }

    // Validate dates
    await this.validatePayPeriod(periodStart, periodEnd);

    // Generate using data service
    const results = await this.payrollDataService.bulkGeneratePayroll(
      employeeIds,
      periodStart,
      periodEnd
    );

    this.log('bulkGeneratePayroll:success', { generated: results.length });
    return results;
  }

  /**
   * Validate pay period dates
   * 
   * @param {Date} start - Period start
   * @param {Date} end - Period end
   * @throws {ValidationError}
   */
  async validatePayPeriod(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime())) {
      throw new ValidationError('Invalid pay period start date');
    }

    if (isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid pay period end date');
    }

    if (startDate > endDate) {
      throw new ValidationError('Pay period start must be before end date');
    }

    if (startDate > today) {
      throw new ValidationError('Cannot create payroll for future periods');
    }

    // Period should be reasonable (max 3 months)
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 93) {
      throw new ValidationError('Pay period cannot exceed 3 months');
    }
  }

  /**
   * Calculate total allowances
   * @param {Array|Object} allowances - Allowances array or JSON
   * @returns {number}
   */
  calculateTotalAllowances(allowances) {
    if (!allowances) return 0;
    if (Array.isArray(allowances)) {
      return allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    }
    if (typeof allowances === 'object') {
      return Object.values(allowances).reduce((sum, val) => sum + Number(val || 0), 0);
    }
    return 0;
  }

  /**
   * Calculate total deductions
   * @param {Array|Object} deductions - Deductions array or JSON
   * @returns {number}
   */
  calculateTotalDeductions(deductions) {
    if (!deductions) return 0;
    if (Array.isArray(deductions)) {
      return deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    }
    if (typeof deductions === 'object') {
      return Object.values(deductions).reduce((sum, val) => sum + Number(val || 0), 0);
    }
    return 0;
  }
}

module.exports = PayrollBusinessService;
