/**
 * Payslip Calculation Service
 * Centralized calculation logic for payslip generation
 * Follows Indian statutory rules for PF, ESIC, PT, TDS
 */

const logger = require('../utils/logger');

class PayslipCalculationService {
  constructor() {
    // Statutory limits and rates (FY 2025-26)
    this.limits = {
      PF_WAGE_LIMIT: 15000,           // PF calculated on max ₹15,000
      PF_RATE: 0.12,                  // 12% (employee + employer each)
      ESIC_WAGE_LIMIT: 21000,         // ESIC applicable if gross ≤ ₹21,000
      ESIC_EMPLOYEE_RATE: 0.0075,     // 0.75% employee contribution
      ESIC_EMPLOYER_RATE: 0.0325,     // 3.25% employer contribution
      PT_THRESHOLD_1: 21000,          // Professional Tax slab 1
      PT_THRESHOLD_2: 25000,          // Professional Tax slab 2
      PT_RATE_1: 0,                   // No PT if gross ≤ ₹21,000
      PT_RATE_2: 150,                 // ₹150 if ₹21k < gross ≤ ₹25k
      PT_RATE_3: 200,                 // ₹200 if gross > ₹25k
      TAX_EXEMPTION_LIMIT: 250000,    // Annual tax exemption (old regime)
      TAX_EXEMPTION_NEW: 300000,      // Annual tax exemption (new regime)
      STANDARD_DEDUCTION: 50000       // Standard deduction
    };
  }

  /**
   * Main payslip calculation method
   * @param {Object} employeeData - Employee information
   * @param {Object} salaryStructure - Salary configuration
   * @param {Object} attendance - Attendance data
   * @param {Object} options - Additional options
   * @returns {Object} Complete payslip calculation
   */
  calculatePayslip(employeeData, salaryStructure, attendance = {}, options = {}) {
    try {
      // Default attendance values
      const totalWorkingDays = attendance.totalWorkingDays || 26;
      const presentDays = attendance.presentDays ?? totalWorkingDays;
      const paidDays = attendance.paidDays ?? presentDays;
      const lopDays = attendance.lopDays || 0;
      const overtimeHours = attendance.overtimeHours || 0;

      // Salary proration uses paidDays (includes paid leave, excludes only LOP)
      const payableDays = Math.min(Math.max(0, paidDays), totalWorkingDays);

      // 1. Calculate Earnings
      const earnings = this.calculateEarnings(
        salaryStructure,
        totalWorkingDays,
        payableDays,
        overtimeHours,
        options
      );

      // 2. Calculate gross salary
      const grossSalary = Object.values(earnings).reduce((sum, amt) => sum + amt, 0);

      // 3. Calculate Deductions
      const deductions = this.calculateDeductions(
        earnings,
        grossSalary,
        salaryStructure,
        options
      );

      // 4. Calculate total deductions
      const totalDeductions = Object.values(deductions).reduce((sum, amt) => sum + amt, 0);

      // 5. Calculate net pay
      const netPay = Math.max(0, grossSalary - totalDeductions);

      // 6. Convert net pay to words
      const netPayInWords = this.numberToWords(netPay);

      // 7. Build attendance summary
      const attendanceSummary = {
        totalWorkingDays,
        presentDays,
        absentDays: Math.max(0, totalWorkingDays - presentDays),
        lopDays,
        paidDays: payableDays,
        overtimeHours,
        weeklyOffs: attendance.weeklyOffs || 0,
        holidays: attendance.holidays || 0
      };

      return {
        success: true,
        earnings,
        deductions,
        grossSalary: this.roundAmount(grossSalary),
        totalDeductions: this.roundAmount(totalDeductions),
        netPay: this.roundAmount(netPay),
        netPayInWords,
        attendance: attendanceSummary,
        calculationDate: new Date().toISOString(),
        calculationMetadata: {
          pfWageLimit: this.limits.PF_WAGE_LIMIT,
          esicApplicable: grossSalary <= this.limits.ESIC_WAGE_LIMIT,
          taxRegime: options.taxRegime || 'old'
        }
      };
    } catch (error) {
      logger.error('Payslip calculation error:', { detail: error });
      return {
        success: false,
        error: error.message,
        earnings: {},
        deductions: {},
        grossSalary: 0,
        totalDeductions: 0,
        netPay: 0
      };
    }
  }

  /**
   * Calculate all earning components
   */
  calculateEarnings(salaryStructure, totalWorkingDays, payableDays, overtimeHours, options) {
    const earnings = {};

    // Basic Salary (prorated)
    const monthlyBasic = parseFloat(salaryStructure.basicSalary) || 0;
    earnings.basicSalary = this.roundAmount((monthlyBasic / totalWorkingDays) * payableDays);

    // HRA - 50% of basic or as configured (use ?? to allow explicit 0)
    const hraRate = salaryStructure.hraRate || 0.5;
    const monthlyHRA = (salaryStructure.hra != null && salaryStructure.hra !== '') ? parseFloat(salaryStructure.hra) : (monthlyBasic * hraRate);
    earnings.hra = this.roundAmount((monthlyHRA / totalWorkingDays) * payableDays);

    // Other Allowances (prorated) - model has a single DECIMAL 'allowances' field
    const monthlyAllowances = parseFloat(salaryStructure.allowances) || 0;
    if (monthlyAllowances > 0) {
      earnings.allowances = this.roundAmount((monthlyAllowances / totalWorkingDays) * payableDays);
    }

    // Overtime Pay
    if (overtimeHours > 0) {
      const hourlyRate = (monthlyBasic / totalWorkingDays) / 8; // Assuming 8 hours/day
      const overtimeRate = options.overtimeRate || 1.5; // 1.5x for overtime
      earnings.overtimePay = this.roundAmount(overtimeHours * hourlyRate * overtimeRate);
    }

    // Bonus (if applicable)
    if (options.bonus) {
      earnings.bonus = this.roundAmount(parseFloat(options.bonus) || 0);
    }

    // Arrears (if applicable)
    if (options.arrears) {
      earnings.arrears = this.roundAmount(parseFloat(options.arrears) || 0);
    }

    // Other earnings
    if (options.otherEarnings) {
      Object.entries(options.otherEarnings).forEach(([key, value]) => {
        earnings[key] = this.roundAmount(parseFloat(value) || 0);
      });
    }

    return earnings;
  }

  /**
   * Calculate all deduction components
   */
  calculateDeductions(earnings, grossSalary, salaryStructure, options) {
    const deductions = {};

    // 1. Provident Fund (PF) - 12% of basic (capped at ₹15,000)
    if (!options.skipPF && earnings.basicSalary > 0) {
      const pfWage = Math.min(earnings.basicSalary, this.limits.PF_WAGE_LIMIT);
      deductions.providentFund = this.roundAmount(pfWage * this.limits.PF_RATE);
    }

    // 2. ESIC - 0.75% if gross ≤ ₹21,000
    if (!options.skipESIC && grossSalary <= this.limits.ESIC_WAGE_LIMIT) {
      deductions.esic = this.roundAmount(grossSalary * this.limits.ESIC_EMPLOYEE_RATE);
    }

    // 3. Professional Tax (state-specific, using Maharashtra rates)
    if (!options.skipPT) {
      deductions.professionalTax = this.calculateProfessionalTax(grossSalary, options.state);
    }

    // 4. TDS (Tax Deducted at Source)
    if (!options.skipTDS) {
      // Support YTD-based TDS calculation for accuracy
      const currentMonth = options.currentMonth || new Date().getMonth() + 1; // 1-12
      const ytdIncome = options.ytdIncome || 0; // Total gross income earned in prior months of FY
      const ytdTDS = options.ytdTDS || 0; // Total TDS already deducted in prior months of FY
      const projectedAnnualGross = ytdIncome + grossSalary + (grossSalary * (12 - currentMonth));
      deductions.tds = this.calculateTDS(projectedAnnualGross, {
        ...options,
        currentMonth,
        ytdTDS,
        remainingMonths: 12 - currentMonth + 1 // including current month
      });
    }

    // 5. Other deductions from salary structure model
    if (salaryStructure.otherDeductions) {
      deductions.otherDeductions = this.roundAmount(
        parseFloat(salaryStructure.otherDeductions) || 0
      );
    }

    // 7. Other deductions (One-time overrides)
    if (options.otherDeductions) {
      Object.entries(options.otherDeductions).forEach(([key, value]) => {
        deductions[key] = this.roundAmount(parseFloat(value) || 0);
      });
    }

    return deductions;
  }

  /**
   * Calculate Professional Tax (state-wise)
   * Default: Maharashtra rates
   */
  calculateProfessionalTax(grossSalary, state = 'Maharashtra') {
    // Maharashtra PT slabs (most common)
    if (state === 'Maharashtra' || !state) {
      if (grossSalary <= this.limits.PT_THRESHOLD_1) {
        return 0;
      } else if (grossSalary <= this.limits.PT_THRESHOLD_2) {
        return this.limits.PT_RATE_2;
      } else {
        return this.limits.PT_RATE_3;
      }
    }

    // Karnataka PT slabs
    if (state === 'Karnataka') {
      if (grossSalary <= 15000) return 0;
      if (grossSalary <= 20000) return 150;
      return 200;
    }

    // West Bengal PT slabs
    if (state === 'West Bengal') {
      if (grossSalary <= 10000) return 0;
      if (grossSalary <= 15000) return 110;
      if (grossSalary <= 25000) return 130;
      return 200;
    }

    // Tamil Nadu PT slabs
    if (state === 'Tamil Nadu') {
      if (grossSalary <= 21000) return 0;
      if (grossSalary <= 30000) return 135;
      if (grossSalary <= 45000) return 315;
      if (grossSalary <= 60000) return 690;
      if (grossSalary <= 75000) return 1025;
      return 1250;
    }

    // Gujarat PT slabs
    if (state === 'Gujarat') {
      if (grossSalary <= 12000) return 0;
      return 200;
    }

    // Andhra Pradesh PT slabs
    if (state === 'Andhra Pradesh') {
      if (grossSalary <= 15000) return 0;
      if (grossSalary <= 20000) return 150;
      return 200;
    }

    // Telangana PT slabs
    if (state === 'Telangana') {
      if (grossSalary <= 15000) return 0;
      if (grossSalary <= 20000) return 150;
      return 200;
    }

    // Kerala PT slabs
    if (state === 'Kerala') {
      if (grossSalary <= 11999) return 0;
      if (grossSalary <= 17999) return 120;
      if (grossSalary <= 29999) return 180;
      return 250;
    }

    // Madhya Pradesh PT slabs
    if (state === 'Madhya Pradesh') {
      if (grossSalary <= 18750) return 0;
      if (grossSalary <= 25000) return 125;
      return 208;
    }

    // Odisha PT slabs
    if (state === 'Odisha') {
      if (grossSalary <= 13304) return 0;
      if (grossSalary <= 25000) return 125;
      return 200;
    }

    // Assam PT slabs
    if (state === 'Assam') {
      if (grossSalary <= 10000) return 0;
      if (grossSalary <= 15000) return 150;
      return 208;
    }

    // Meghalaya PT slabs
    if (state === 'Meghalaya') {
      if (grossSalary <= 16667) return 0;
      return 208;
    }

    // Jharkhand PT slabs
    if (state === 'Jharkhand') {
      if (grossSalary <= 25000) return 0;
      if (grossSalary <= 41666) return 100;
      if (grossSalary <= 66666) return 150;
      if (grossSalary <= 83333) return 175;
      return 208;
    }

    // Bihar PT slabs
    if (state === 'Bihar') {
      if (grossSalary <= 25000) return 0;
      if (grossSalary <= 50000) return 100;
      return 150;
    }

    // Tripura PT slabs
    if (state === 'Tripura') {
      if (grossSalary <= 7500) return 0;
      if (grossSalary <= 10000) return 100;
      return 150;
    }

    // Sikkim PT slabs
    if (state === 'Sikkim') {
      if (grossSalary <= 20000) return 0;
      return 125;
    }

    // Chhattisgarh PT slabs
    if (state === 'Chhattisgarh') {
      if (grossSalary <= 12500) return 0;
      if (grossSalary <= 16667) return 40;
      return 150;
    }

    // Default: No PT (states like Rajasthan, Delhi, UP, etc. don't levy PT)
    return 0;
  }

  /**
   * Calculate TDS (simplified)
   * Supports both old and new tax regimes
   * Supports YTD-based calculation: subtracts ytdTDS from annual liability 
   * and divides remainder across remaining months for accuracy
   */
  calculateTDS(annualGross, options = {}) {
    const regime = options.taxRegime || 'old';
    const exemptionLimit = regime === 'new' 
      ? this.limits.TAX_EXEMPTION_NEW 
      : this.limits.TAX_EXEMPTION_LIMIT;

    // Standard deduction (only in old regime)
    const standardDeduction = regime === 'old' ? this.limits.STANDARD_DEDUCTION : 0;

    // Taxable income
    let taxableIncome = annualGross - standardDeduction;

    // Section 80C deductions (only in old regime)
    if (regime === 'old' && options.section80C) {
      taxableIncome -= Math.min(options.section80C, 150000);
    }

    // Calculate tax
    let annualTax = 0;

    if (taxableIncome <= exemptionLimit) {
      annualTax = 0;
    } else if (regime === 'new') {
      // New Tax Regime (FY 2025-26)
      const taxable = taxableIncome - exemptionLimit;
      if (taxable <= 300000) {
        annualTax = taxable * 0.05;
      } else if (taxable <= 600000) {
        annualTax = 15000 + (taxable - 300000) * 0.10;
      } else if (taxable <= 900000) {
        annualTax = 45000 + (taxable - 600000) * 0.15;
      } else if (taxable <= 1200000) {
        annualTax = 90000 + (taxable - 900000) * 0.20;
      } else {
        annualTax = 150000 + (taxable - 1200000) * 0.30;
      }
    } else {
      // Old Tax Regime
      const taxable = taxableIncome - exemptionLimit;
      if (taxable <= 250000) {
        annualTax = taxable * 0.05;
      } else if (taxable <= 500000) {
        annualTax = 12500 + (taxable - 250000) * 0.20;
      } else {
        annualTax = 62500 + (taxable - 500000) * 0.30;
      }
    }

    // Add 4% cess
    annualTax = annualTax * 1.04;

    // YTD-aware monthly TDS calculation
    const remainingMonths = options.remainingMonths || 12;
    const ytdTDS = options.ytdTDS || 0;
    
    // Calculate remaining TDS liability for the fiscal year
    const remainingTax = Math.max(0, annualTax - ytdTDS);
    
    // Spread remaining liability across remaining months
    return this.roundAmount(remainingTax / remainingMonths);
  }

  /**
   * Calculate employer contributions (for reporting)
   */
  calculateEmployerContributions(earnings, grossSalary) {
    const contributions = {};

    // Employer PF - 12% (same as employee)
    if (earnings.basicSalary > 0) {
      const pfWage = Math.min(earnings.basicSalary, this.limits.PF_WAGE_LIMIT);
      contributions.employerPF = this.roundAmount(pfWage * this.limits.PF_RATE);
    }

    // Employer ESIC - 3.25%
    if (grossSalary <= this.limits.ESIC_WAGE_LIMIT) {
      contributions.employerESIC = this.roundAmount(grossSalary * this.limits.ESIC_EMPLOYER_RATE);
    }

    return contributions;
  }

  /**
   * Bulk payslip calculation
   */
  calculateBulkPayslips(employeesData) {
    return employeesData.map(employee => {
      return {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        calculation: this.calculatePayslip(
          employee,
          employee.salaryStructure || {},
          employee.attendance || {},
          employee.options || {}
        )
      };
    });
  }

  /**
   * Number to words conversion (Indian format)
   */
  numberToWords(amount) {
    amount = Math.round(amount); // Strip decimals to avoid undefined array lookups
    if (amount === 0) return 'Zero Rupees Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 
                   'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertHundreds = (num) => {
      let result = '';
      if (num > 99) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num > 19) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      }
      if (num > 9) {
        result += teens[num - 10] + ' ';
        num = 0;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };

    let words = '';
    const crores = Math.floor(amount / 10000000);
    amount %= 10000000;

    if (crores > 0) {
      words += convertHundreds(crores) + 'Crore ';
    }

    const lakhs = Math.floor(amount / 100000);
    amount %= 100000;

    if (lakhs > 0) {
      words += convertHundreds(lakhs) + 'Lakh ';
    }

    const thousands = Math.floor(amount / 1000);
    amount %= 1000;

    if (thousands > 0) {
      words += convertHundreds(thousands) + 'Thousand ';
    }

    if (amount > 0) {
      words += convertHundreds(amount);
    }

    return words.trim() + ' Rupees Only';
  }

  /**
   * Round amount to 2 decimal places
   */
  roundAmount(amount) {
    return Math.round((parseFloat(amount) || 0) * 100) / 100;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Validate salary structure
   */
  validateSalaryStructure(salaryStructure) {
    const errors = [];

    if (!salaryStructure.basicSalary || salaryStructure.basicSalary <= 0) {
      errors.push('Basic salary is required and must be greater than 0');
    }

    if (salaryStructure.hra && salaryStructure.hra < 0) {
      errors.push('HRA cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create and export singleton instance
const payslipCalculationService = new PayslipCalculationService();

module.exports = {
  PayslipCalculationService,
  payslipCalculationService
};
