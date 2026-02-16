// Payslip Calculation Engine
import { DEFAULT_PAYSLIP_TEMPLATE } from '../config/payslipTemplates';
import { formatCurrency, LOCALE } from './formatCurrency';

export class PayslipCalculationEngine {
  constructor(template = DEFAULT_PAYSLIP_TEMPLATE) {
    this.template = template;
  }

  // Number to words conversion for Indian currency
  numberToWords(amount) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
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
      } else if (num > 9) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };

    if (amount === 0) return 'Zero Rupees Only';
    
    const crores = Math.floor(amount / 10000000);
    const lakhs = Math.floor((amount % 10000000) / 100000);
    const thousands = Math.floor((amount % 100000) / 1000);
    const hundreds = amount % 1000;
    
    let result = '';
    if (crores > 0) result += convertHundreds(crores) + 'Crore ';
    if (lakhs > 0) result += convertHundreds(lakhs) + 'Lakh ';
    if (thousands > 0) result += convertHundreds(thousands) + 'Thousand ';
    if (hundreds > 0) result += convertHundreds(hundreds);
    
    return result.trim() + ' Rupees Only';
  }

  // Professional Tax calculation based on slabs
  calculateProfessionalTax(grossSalary) {
    const slabs = this.template.structure.deductions.fields
      .find(field => field.key === 'professionalTax')?.slabs || [];
    
    for (const slab of slabs) {
      if (grossSalary >= slab.min && grossSalary <= slab.max) {
        return slab.amount;
      }
    }
    return 0;
  }

  // ESIC calculation
  calculateESIC(grossSalary) {
    const esicField = this.template.structure.deductions.fields
      .find(field => field.key === 'esic');
    
    if (esicField && grossSalary <= esicField.maxAmount) {
      return grossSalary * (esicField.percentage / 100);
    }
    return 0;
  }

  // PF calculation
  calculatePF(basicSalary) {
    const pfField = this.template.structure.deductions.fields
      .find(field => field.key === 'providentFund');
    
    if (pfField) {
      const pfAmount = basicSalary * (pfField.percentage / 100);
      return Math.min(pfAmount, pfField.maxAmount || pfAmount);
    }
    return 0;
  }

  // HRA calculation
  calculateHRA(basicSalary) {
    const hraField = this.template.structure.earnings.fields
      .find(field => field.key === 'houseRentAllowance');
    
    if (hraField && hraField.calculation === 'percentage') {
      return basicSalary * (hraField.percentage / 100);
    }
    return 0;
  }

  // Overtime calculation
  calculateOvertime(overtimeHours, basicSalary, totalWorkingDays = 21) {
    if (!overtimeHours || overtimeHours <= 0) return 0;
    
    const workingHoursPerDay = 8;
    const totalWorkingHours = totalWorkingDays * workingHoursPerDay;
    const hourlyRate = basicSalary / totalWorkingHours;
    
    // Overtime is typically paid at 2x rate
    return overtimeHours * hourlyRate * 2;
  }

  // Salary proration based on attendance
  calculateProratedSalary(fullAmount, presentDays, totalWorkingDays) {
    if (totalWorkingDays === 0) return 0;
    return (fullAmount * presentDays) / totalWorkingDays;
  }

  // Main calculation method
  calculatePayslip(employeeData, payrollData, salaryStructure = {}) {
    const calculated = { ...payrollData };
    
    // Extract values with defaults
    const basicSalary = salaryStructure.basicSalary || payrollData.basicSalary || 0;
    const totalWorkingDays = payrollData.totalWorkingDays || 21;
    const presentDays = payrollData.presentDays || totalWorkingDays;
    const lopDays = payrollData.lopDays || 0;
    const paidDays = presentDays - lopDays;
    const overtimeHours = payrollData.overtimeHours || 0;

    // Calculate attendance-related fields
    calculated.absentDays = totalWorkingDays - presentDays;
    calculated.paidDays = Math.max(0, paidDays);

    // Calculate earnings
    const earnings = {};
    
    // Basic salary (prorated if needed)
    earnings.basicSalary = this.calculateProratedSalary(basicSalary, paidDays, totalWorkingDays);

    // HRA calculation
    if (salaryStructure.houseRentAllowance !== undefined) {
      earnings.houseRentAllowance = this.calculateProratedSalary(
        salaryStructure.houseRentAllowance, 
        paidDays, 
        totalWorkingDays
      );
    } else {
      earnings.houseRentAllowance = this.calculateProratedSalary(
        this.calculateHRA(basicSalary), 
        paidDays, 
        totalWorkingDays
      );
    }

    // Other allowances (prorated)
    const allowanceFields = ['conveyanceAllowance', 'medicalAllowance', 'specialAllowance', 
                           'lta', 'shiftAllowance', 'internetAllowance'];
    
    allowanceFields.forEach(field => {
      const amount = salaryStructure[field] || payrollData[field] || 0;
      earnings[field] = this.calculateProratedSalary(amount, paidDays, totalWorkingDays);
    });

    // Variable earnings (not prorated)
    const variableFields = ['performanceBonus', 'arrears', 'incentive'];
    variableFields.forEach(field => {
      earnings[field] = payrollData[field] || 0;
    });

    // Overtime calculation
    earnings.overtimeAllowance = this.calculateOvertime(overtimeHours, basicSalary, totalWorkingDays);

    // Calculate gross salary
    const grossSalary = Object.values(earnings).reduce((sum, amount) => sum + (amount || 0), 0);
    
    // Calculate deductions
    const deductions = {};

    // PF calculation
    deductions.providentFund = this.calculatePF(earnings.basicSalary);

    // ESIC calculation
    deductions.esic = this.calculateESIC(grossSalary);

    // Professional Tax
    deductions.professionalTax = this.calculateProfessionalTax(grossSalary);

    // Other deductions
    const deductionFields = ['voluntaryPF', 'tds', 'medicalPremium', 'nps', 'loanEmi', 
                           'advances', 'canteenCharges', 'otherDeductions'];
    
    deductionFields.forEach(field => {
      deductions[field] = payrollData[field] || 0;
    });

    // Calculate totals
    const totalDeductions = Object.values(deductions).reduce((sum, amount) => sum + (amount || 0), 0);
    const netSalary = grossSalary - totalDeductions;

    // Prepare final payslip data
    const payslipData = {
      ...calculated,
      employee: employeeData,
      earnings,
      deductions,
      grossSalary,
      totalDeductions,
      netSalary,
      netSalaryWords: this.numberToWords(Math.round(netSalary)),
      
      // Payment information
      paymentMode: payrollData.paymentMode || 'Online Transfer',
      disbursementDate: payrollData.disbursementDate || new Date().toLocaleDateString('en-GB'),
      payPeriod: payrollData.payPeriod || this.getCurrentPayPeriod(),
      
      // Additional metadata
      generatedDate: new Date().toISOString(),
      template: this.template.id,
      version: this.template.version
    };

    return payslipData;
  }

  // Get current pay period
  getCurrentPayPeriod() {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    return `${month} ${year}`;
  }

  // Validate calculations
  validateCalculations(payslipData) {
    const errors = [];

    // Check if gross salary matches sum of earnings
    const calculatedGross = Object.values(payslipData.earnings).reduce((sum, amount) => sum + (amount || 0), 0);
    if (Math.abs(calculatedGross - payslipData.grossSalary) > 0.01) {
      errors.push('Gross salary calculation mismatch');
    }

    // Check if total deductions matches sum of deductions
    const calculatedDeductions = Object.values(payslipData.deductions).reduce((sum, amount) => sum + (amount || 0), 0);
    if (Math.abs(calculatedDeductions - payslipData.totalDeductions) > 0.01) {
      errors.push('Total deductions calculation mismatch');
    }

    // Check if net salary is correct
    const calculatedNet = payslipData.grossSalary - payslipData.totalDeductions;
    if (Math.abs(calculatedNet - payslipData.netSalary) > 0.01) {
      errors.push('Net salary calculation mismatch');
    }

    // Check for negative net salary
    if (payslipData.netSalary < 0) {
      errors.push('Net salary cannot be negative');
    }

    // Check attendance logic
    if (payslipData.presentDays > payslipData.totalWorkingDays) {
      errors.push('Present days cannot exceed total working days');
    }

    return errors;
  }

  // Generate multiple payslips for bulk processing
  calculateBulkPayslips(employeesData, payrollDataArray, salaryStructures = {}) {
    const results = [];
    
    payrollDataArray.forEach((payrollData, index) => {
      try {
        const employeeData = employeesData.find(emp => 
          emp.employeeId === payrollData.employeeId || emp.id === payrollData.employeeId
        );
        
        if (!employeeData) {
          results.push({
            employeeId: payrollData.employeeId,
            error: 'Employee not found',
            success: false
          });
          return;
        }

        const salaryStructure = salaryStructures[employeeData.id] || {};
        const payslipData = this.calculatePayslip(employeeData, payrollData, salaryStructure);
        
        const validationErrors = this.validateCalculations(payslipData);
        
        results.push({
          employeeId: employeeData.employeeId,
          payslipData,
          validationErrors,
          success: validationErrors.length === 0
        });
        
      } catch (error) {
        results.push({
          employeeId: payrollData.employeeId,
          error: error.message,
          success: false
        });
      }
    });
    
    return results;
  }

  // Export payslip data to CSV format
  exportToCSV(payslipData) {
    const csvMapping = this.template.csvMapping;
    const csvData = {};
    
    Object.entries(csvMapping).forEach(([key, csvKey]) => {
      if (payslipData.earnings && payslipData.earnings[key] !== undefined) {
        csvData[csvKey] = payslipData.earnings[key];
      } else if (payslipData.deductions && payslipData.deductions[key] !== undefined) {
        csvData[csvKey] = payslipData.deductions[key];
      } else if (payslipData[key] !== undefined) {
        csvData[csvKey] = payslipData[key];
      }
    });
    
    return csvData;
  }

  // Create salary structure template for an employee
  createSalaryStructureTemplate(basicSalary) {
    const structure = {
      basicSalary,
      houseRentAllowance: this.calculateHRA(basicSalary),
      conveyanceAllowance: 1600, // Standard conveyance allowance
      medicalAllowance: 1250, // Monthly medical allowance
      specialAllowance: 0,
      performanceBonus: 0,
      overtimeAllowance: 0,
      lta: 0,
      shiftAllowance: 0,
      internetAllowance: 0,
      arrears: 0,
      incentive: 0
    };

    // Calculate PF and other statutory deductions
    const grossEstimate = Object.values(structure).reduce((sum, amount) => sum + amount, 0);
    
    return {
      earnings: structure,
      deductions: {
        providentFund: this.calculatePF(basicSalary),
        voluntaryPF: 0,
        esic: this.calculateESIC(grossEstimate),
        professionalTax: this.calculateProfessionalTax(grossEstimate),
        tds: 0,
        medicalPremium: 0,
        nps: 0,
        loanEmi: 0,
        advances: 0,
        canteenCharges: 0,
        otherDeductions: 0
      }
    };
  }
}

// Create default instance
export const payslipCalculator = new PayslipCalculationEngine();

// Utility functions
export { formatCurrency } from './formatCurrency';

export const formatNumber = (number) => {
  return new Intl.NumberFormat(LOCALE).format(number || 0);
};

export const parseCSVNumber = (value) => {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
  }
  return parseFloat(value) || 0;
};