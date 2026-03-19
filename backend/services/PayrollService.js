const BaseService = require('./BaseService');
const db = require('../models');
const { PayrollData, Payslip, Employee, User, SalaryStructure, Department, Position, LeaveRequest, LeaveType } = db;
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const holidayService = require('./holiday.service');
const emailService = require('./email.service');

class PayrollService extends BaseService {
  constructor() {
    super(PayrollData);
  }

  async findAllWithDetails(options = {}) {
    const includeOptions = [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'role']
          },
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name']
          },
          {
            model: Position,
            as: 'position',
            attributes: ['id', 'title']
          },
          {
            model: SalaryStructure,
            as: 'salaryStructure',
            attributes: [
              'id', 'basicSalary', 'hra', 'allowances',
              'pfContribution', 'tds', 'professionalTax', 'otherDeductions',
              'currency', 'effectiveFrom', 'isActive'
            ]
          }
        ]
      }
    ];

    return super.findAll({
      ...options,
      include: includeOptions,
      order: [['payPeriodStart', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  async findByEmployee(employeeId, options = {}) {
    return this.findAllWithDetails({
      ...options,
      where: { 
        ...options.where,
        employeeId 
      }
    });
  }

  async findByPayPeriod(payPeriodStart, payPeriodEnd, options = {}) {
    return this.findAllWithDetails({
      ...options,
      where: {
        ...options.where,
        payPeriodStart: {
          [Op.gte]: payPeriodStart
        },
        payPeriodEnd: {
          [Op.lte]: payPeriodEnd
        }
      }
    });
  }

  async findByStatus(status, options = {}) {
    return this.findAllWithDetails({
      ...options,
      where: { 
        ...options.where,
        status 
      }
    });
  }

  async calculatePayroll(employeeId, payPeriodStart, payPeriodEnd, overrides = {}) {
    // Get employee with salary structure
    const employee = await Employee.findByPk(employeeId, {
      include: [
        {
          model: SalaryStructure,
          as: 'salaryStructure'
        }
      ]
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (!employee.salaryStructure) {
      throw new Error('Employee does not have a salary structure assigned');
    }

    const calculation = await this.performPayrollCalculation(
      employee,
      payPeriodStart,
      payPeriodEnd,
      overrides
    );

    return calculation;
  }

  async createPayroll(employeeId, payPeriodStart, payPeriodEnd, overrides = {}) {
    // Check if payroll already exists for this period
    const existingPayroll = await this.model.findOne({
      where: {
        employeeId,
        payPeriodStart,
        payPeriodEnd
      }
    });

    if (existingPayroll) {
      throw new Error('Payroll already exists for this employee and pay period');
    }

    // Calculate payroll
    const calculation = await this.calculatePayroll(
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      overrides
    );

    // Prepare variable earnings and deductions from calculation
    const variableEarnings = {};
    calculation.allowances.forEach(a => {
      variableEarnings[a.name] = a.amount;
    });

    const variableDeductions = {};
    calculation.deductions.forEach(d => {
      variableDeductions[d.name] = d.amount;
    });

    // Get employee to find creator
    const employee = await Employee.findByPk(employeeId);

    // Create payroll record
    const payroll = await super.create({
      employeeId,
      payPeriod: `${payPeriodStart.getFullYear()}-${(payPeriodStart.getMonth() + 1).toString().padStart(2, '0')}`,
      payPeriodStart,
      payPeriodEnd,
      grossSalary: calculation.grossPay,
      totalDeductions: calculation.totalDeductions,
      netSalary: calculation.netPay,
      variableEarnings,
      variableDeductions,
      status: 'draft',
      createdBy: overrides.createdBy || employee.userId,
      // Default attendance values (should be calculated properly)
      totalWorkingDays: calculation.payPeriodDays,
      presentDays: calculation.payPeriodDays,
      paidDays: calculation.payPeriodDays
    });

    // Return payroll with calculation details
    return {
      ...payroll.toJSON(),
      calculation,
      // Backward compatibility for tests
      payrollItems: [
        ...calculation.allowances.map(a => ({ type: 'allowance', ...a })),
        ...calculation.deductions.map(d => ({ type: 'deduction', ...d }))
      ]
    };
  }

  async performPayrollCalculation(employee, payPeriodStart, payPeriodEnd, overrides = {}) {
    const salaryStructure = employee.salaryStructure;
    const basicSalary = overrides.basicSalary || salaryStructure.basicSalary || 0;

    // Calculate pay period days
    const payPeriodDays = Math.ceil(
      (new Date(payPeriodEnd) - new Date(payPeriodStart)) / (1000 * 60 * 60 * 24)
    ) + 1;

    // For monthly payroll, assume 30 days in a month
    const monthlyBasicSalary = parseFloat(basicSalary);
    const dailyRate = monthlyBasicSalary / 30;
    const periodBasicSalary = payPeriodDays <= 31 ? monthlyBasicSalary : dailyRate * payPeriodDays;

    // Process allowances
    const allowances = [];
    let totalAllowances = 0;

    // Helper to add allowance
    const addAllowance = (name, amount) => {
      const val = parseFloat(amount || 0);
      if (val > 0) {
        allowances.push({ name, amount: val, isPercentage: false });
        totalAllowances += val;
      }
    };

    addAllowance('House Rent Allowance', salaryStructure.hra);
    addAllowance('Other Allowances', salaryStructure.allowances);

    // Process deductions
    const deductions = [];
    let totalDeductions = 0;

    // Helper to add deduction
    const addDeduction = (name, amount) => {
      const val = parseFloat(amount || 0);
      if (val > 0) {
        deductions.push({ name, amount: val, isPercentage: false });
        totalDeductions += val;
      }
    };

    addDeduction('PF Contribution', salaryStructure.pfContribution);
    addDeduction('Income Tax', salaryStructure.tds); // Mapped TDS to Income Tax
    addDeduction('Professional Tax', salaryStructure.professionalTax);
    addDeduction('Other Deductions', salaryStructure.otherDeductions);

    // Process dynamic JSON deductions
    if (salaryStructure.deductions && typeof salaryStructure.deductions === 'object') {
      const standardDedKeys = ['pf', 'tax', 'professionalTax'];
      const deductionObj = Array.isArray(salaryStructure.deductions) ? {} : salaryStructure.deductions;
      
      Object.entries(deductionObj).forEach(([key, value]) => {
        if (!standardDedKeys.includes(key)) {
           // Skip if it maps to 'otherDeductions' and that was already added (but currently it's not mapped in routes)
           const label = key === 'other' ? 'Other Misc Deductions' : key.split(/(?=[A-Z])|_/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
           addDeduction(label, value);
        }
      });
    }

    // Calculate attendance-based adjustments
    const attendanceAdjustment = await this.calculateAttendanceAdjustment(
      employee.id,
      payPeriodStart,
      payPeriodEnd,
      dailyRate
    );

    // Apply overrides
    if (overrides.allowances) {
      for (const override of overrides.allowances) {
        const existingIndex = allowances.findIndex(a => a.name === override.name);
        if (existingIndex >= 0) {
          totalAllowances -= allowances[existingIndex].amount;
          allowances[existingIndex].amount = override.amount;
          totalAllowances += override.amount;
        } else {
          allowances.push(override);
          totalAllowances += override.amount;
        }
      }
    }

    if (overrides.deductions) {
      for (const override of overrides.deductions) {
        const existingIndex = deductions.findIndex(d => d.name === override.name);
        if (existingIndex >= 0) {
          totalDeductions -= deductions[existingIndex].amount;
          deductions[existingIndex].amount = override.amount;
          totalDeductions += override.amount;
        } else {
          deductions.push(override);
          totalDeductions += override.amount;
        }
      }
    }

    const adjustedBasicSalary = periodBasicSalary + attendanceAdjustment.adjustment;
    const grossPay = adjustedBasicSalary + totalAllowances;
    const netPay = grossPay - totalDeductions;

    return {
      basicSalary: adjustedBasicSalary,
      totalAllowances,
      totalDeductions,
      grossPay,
      netPay,
      allowances,
      deductions,
      attendanceDetails: attendanceAdjustment,
      payPeriodDays
    };
  }

  async calculateAttendanceAdjustment(employeeId, payPeriodStart, payPeriodEnd, dailyRate) {
    try {
      // 1. Fetch all approved leaves for the period
      const approvedLeaves = await LeaveRequest.findAll({
        where: {
          employeeId,
          status: 'Approved',
          startDate: { [Op.lte]: payPeriodEnd },
          endDate: { [Op.gte]: payPeriodStart }
        },
        include: [{
          model: LeaveType,
          as: 'leaveType'
        }]
      });

      let unpaidDays = 0;
      let totalLeaveDays = 0;

      for (const leave of approvedLeaves) {
        // Calculate intersection with pay period
        const start = new Date(Math.max(new Date(leave.startDate), new Date(payPeriodStart)));
        const end = new Date(Math.min(new Date(leave.endDate), new Date(payPeriodEnd)));
        
        if (start <= end) {
          const diffTime = Math.abs(end - start);
          let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          if (leave.isHalfDay) {
            days = 0.5; // Warning: This assumes the overlap captures the half-day. Simplified.
          }

          totalLeaveDays += days;

          // Check for Loss of Pay / Unpaid
          const typeName = leave.leaveType ? leave.leaveType.name.toLowerCase() : '';
          if (typeName.includes('unpaid') || typeName.includes('loss of pay') || typeName.includes('lop')) {
            unpaidDays += days;
          }
        }
      }

      const adjustment = -1 * (unpaidDays * dailyRate);

      // Calculate actual working days (calendar days − weekends − holidays)
      const workingDays = await this._calculateWorkingDays(payPeriodStart, payPeriodEnd);

      return {
        workingDays,
        presentDays: workingDays - totalLeaveDays,
        absentDays: unpaidDays,
        adjustment: adjustment,
        details: unpaidDays > 0 ? `Deduction for ${unpaidDays} days of Loss of Pay (LOP)` : 'No deduction'
      };
    } catch (error) {
      logger.error('Error calculating attendance calculation:', { detail: error });
       return {
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        adjustment: 0,
        details: 'Error calculating attendance adjustment'
      };
    }
  }

  /**
   * Calculate actual working days between two dates (weekdays minus holidays)
   * @private
   */
  async _calculateWorkingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let weekdays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) weekdays++;
    }
    try {
      const holidayCount = await holidayService.countHolidaysBetween(startDate, endDate);
      return Math.max(0, weekdays - (holidayCount || 0));
    } catch (err) {
      logger.warn('Holiday lookup failed, returning weekday-only count:', { detail: err.message });
      return weekdays;
    }
  }

  async approvePayroll(id, approverId, comments = '') {
    const payroll = await this.findById(id);
    
    if (payroll.status !== 'draft') {
      throw new Error('Payroll is not in draft status');
    }

    return super.update(id, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
      approvalComments: comments
    });
  }

  async processPayroll(id, processedBy, paymentDetails = {}) {
    const payroll = await this.findById(id);
    
    if (payroll.status !== 'approved') {
      throw new Error('Payroll is not approved');
    }

    // In PayrollData, 'processed' might map to 'paid' or 'calculated'. 
    // Assuming 'paid' for now as it takes payment details.
    const result = await super.update(id, {
      status: 'paid',
      updatedBy: processedBy,
      paymentMode: paymentDetails.bankAccount ? 'bank_transfer' : 'cash', // Simple logic
      disbursementDate: new Date(),
      calculationNotes: JSON.stringify(paymentDetails) // Storing details here
    });

    // Send payslip notification email (fire-and-forget)
    this._sendPayslipNotification(payroll, 'paid').catch(() => {});

    return result;
  }

  async generatePayslip(payrollDataId) {
    const payroll = await this.findById(payrollDataId, [
      {
        model: Employee,
        as: 'employee',
        include: [
          {
            model: SalaryStructure,
            as: 'salaryStructure'
          },
          {
            model: Department,
            as: 'department'
          },
          {
            model: Position,
            as: 'position'
          }
        ]
      }
    ]);

    if (!payroll) {
      throw new Error('Payroll not found');
    }

    // Reconstruct earnings/deductions from JSON
    const earnings = payroll.variableEarnings || {};
    
    // Calculate total allowances from variableEarnings
    let totalAllowances = 0;
    if (payroll.variableEarnings) {
        totalAllowances = Object.values(payroll.variableEarnings).reduce((a, b) => a + parseFloat(b), 0);
    }

    const payslip = {
      payrollDataId: payroll.id,
      employee: {
        id: payroll.employee.id,
        name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
        employeeId: payroll.employee.employeeId,
        department: payroll.employee.department ? payroll.employee.department.name : 'Unknown',
        position: payroll.employee.position ? payroll.employee.position.title : 'Unknown'
      },
      payPeriod: {
        start: payroll.payPeriodStart,
        end: payroll.payPeriodEnd
      },
      earnings: {
        basicSalary: parseFloat(payroll.grossSalary) - totalAllowances,
        allowances: Object.entries(payroll.variableEarnings || {}).map(([name, amount]) => ({ name, amount })),
        totalAllowances: totalAllowances,
        grossPay: parseFloat(payroll.grossSalary)
      },
      deductions: Object.entries(payroll.variableDeductions || {}).map(([name, amount]) => ({ name, amount })),
      totalDeductions: parseFloat(payroll.totalDeductions),
      netPay: parseFloat(payroll.netSalary),
      generatedAt: new Date()
    };

    return payslip;
  }

  async getPayrollSummary(startDate, endDate, filters = {}) {
    const whereClause = {
      payPeriodStart: {
        [Op.gte]: startDate
      },
      payPeriodEnd: {
        [Op.lte]: endDate
      }
    };

    if (filters.department) {
      whereClause['$employee.department.name$'] = filters.department;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    const payrolls = await this.findAllWithDetails({
      where: whereClause
    });

    const summary = {
      totalEmployees: 0,
      totalGrossPay: 0,
      totalNetPay: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      statusBreakdown: {
        draft: 0,
        approved: 0,
        processed: 0,
        paid: 0
      },
      departmentBreakdown: {}
    };

    if (payrolls.data) {
      payrolls.data.forEach(payroll => {
        summary.totalEmployees++;
        summary.totalGrossPay += parseFloat(payroll.grossSalary) || 0;
        summary.totalNetPay += parseFloat(payroll.netSalary) || 0;
        summary.totalDeductions += parseFloat(payroll.totalDeductions) || 0;
        
        // Calculate allowances from variableEarnings
        let allowances = 0;
        if (payroll.variableEarnings) {
            allowances = Object.values(payroll.variableEarnings).reduce((a, b) => a + parseFloat(b), 0);
        }
        summary.totalAllowances += allowances;

        // Status breakdown
        const status = payroll.status.toLowerCase();
        if (summary.statusBreakdown[status] !== undefined) {
            summary.statusBreakdown[status]++;
        } else if (status === 'paid') { // Map processed to paid if needed
             summary.statusBreakdown.processed++;
        }

        // Department breakdown
        const dept = payroll.employee.department ? payroll.employee.department.name : 'Unknown';
        if (!summary.departmentBreakdown[dept]) {
          summary.departmentBreakdown[dept] = {
            employees: 0,
            grossPay: 0,
            netPay: 0
          };
        }
        summary.departmentBreakdown[dept].employees++;
        summary.departmentBreakdown[dept].grossPay += parseFloat(payroll.grossSalary) || 0;
        summary.departmentBreakdown[dept].netPay += parseFloat(payroll.netSalary) || 0;
      });
    }

    return summary;
  }

  /**
   * Send payslip notification email to the employee (fire-and-forget)
   * @private
   */
  async _sendPayslipNotification(payroll, status) {
    try {
      const employee = await Employee.findByPk(payroll.employeeId, {
        include: [{ model: User, as: 'user', attributes: ['email'] }]
      });
      if (!employee?.user?.email) return;

      await emailService.sendPayslipNotificationEmail(
        employee.user.email,
        `${employee.firstName} ${employee.lastName}`,
        {
          month: payroll.month || '',
          year: payroll.year || '',
          netSalary: payroll.netSalary,
          currency: 'THB'
        },
        status
      );
    } catch (err) {
      logger.warn('Payslip notification email failed:', { detail: err.message });
    }
  }
}

module.exports = new PayrollService();
