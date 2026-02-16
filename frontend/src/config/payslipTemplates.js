// Comprehensive Payslip Template Configuration
export const DEFAULT_PAYSLIP_TEMPLATE = {
  id: 'default',
  name: 'Standard Payslip Template',
  version: '1.0',
  isActive: true,
  
  // Company branding configuration
  // These values should come from SystemSettings (payslip template settings)
  companyInfo: {
    name: '',
    address: '',
    email: '',
    website: '',
    contact: '',
    logo: null, // Can be set to logo URL
    gst: null,
    cin: null,
    pan: null
  },

  // Payslip structure configuration
  structure: {
    // Header information
    header: {
      title: "PAY SLIP",
      showMonth: true,
      showYear: true,
      showPayPeriod: true
    },

    // Employee information section
    employeeInfo: {
      fields: [
        { key: 'employeeId', label: 'Employee ID', required: true, editable: false },
        { key: 'fullName', label: 'Employee Name', required: true, editable: false },
        { key: 'designation', label: 'Designation', required: true, editable: false },
        { key: 'department', label: 'Department', required: true, editable: false },
        { key: 'joiningDate', label: 'Date of Joining', required: false, editable: false },
        { key: 'bankAccount', label: 'Bank Account', required: false, editable: true },
        { key: 'panNumber', label: 'PAN Number', required: false, editable: false },
        { key: 'pfNumber', label: 'PF Number', required: false, editable: true },
        { key: 'esiNumber', label: 'ESI Number', required: false, editable: true }
      ]
    },

    // Attendance information
    attendance: {
      enabled: true,
      fields: [
        { key: 'totalWorkingDays', label: 'Total Working Days', required: true, editable: true },
        { key: 'presentDays', label: 'Present Days', required: true, editable: true },
        { key: 'absentDays', label: 'Absent Days', required: false, editable: true, calculated: true },
        { key: 'lopDays', label: 'LOP Days', required: false, editable: true },
        { key: 'paidDays', label: 'Paid Days', required: true, editable: true, calculated: true },
        { key: 'overtimeHours', label: 'Overtime Hours', required: false, editable: true },
        { key: 'weeklyOffDays', label: 'Weekly Off Days', required: false, editable: true },
        { key: 'holidays', label: 'Holidays', required: false, editable: true }
      ]
    },

    // Earnings configuration
    earnings: {
      title: "EARNINGS",
      fields: [
        { 
          key: 'basicSalary', 
          label: 'Basic Salary', 
          required: true, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed', // fixed, percentage, formula
          description: 'Basic salary component'
        },
        { 
          key: 'houseRentAllowance', 
          label: 'House Rent Allowance (HRA)', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'percentage', // Can be percentage of basic
          percentage: 40,
          description: 'House rent allowance'
        },
        { 
          key: 'conveyanceAllowance', 
          label: 'Conveyance Allowance', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          maxAmount: 1600, // As per tax exemption
          description: 'Transport allowance'
        },
        { 
          key: 'medicalAllowance', 
          label: 'Medical Allowance', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          maxAmount: 15000, // Annual limit
          description: 'Medical reimbursement'
        },
        { 
          key: 'specialAllowance', 
          label: 'Special Allowance', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          description: 'Special allowance or city compensatory allowance'
        },
        { 
          key: 'performanceBonus', 
          label: 'Performance Bonus', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'variable',
          description: 'Performance based bonus'
        },
        { 
          key: 'overtimeAllowance', 
          label: 'Overtime Allowance', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'formula',
          formula: 'overtimeHours * hourlyRate * 2', // Double rate for overtime
          description: 'Overtime payment'
        },
        { 
          key: 'lta', 
          label: 'Leave Travel Allowance (LTA)', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          description: 'Leave travel allowance'
        },
        { 
          key: 'shiftAllowance', 
          label: 'Shift Allowance', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          description: 'Night/shift differential'
        },
        { 
          key: 'internetAllowance', 
          label: 'Internet Allowance', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          description: 'Internet/mobile reimbursement'
        },
        { 
          key: 'arrears', 
          label: 'Arrears', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'variable',
          description: 'Previous month arrears'
        },
        { 
          key: 'incentive', 
          label: 'Incentive', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'variable',
          description: 'Sales/target incentive'
        }
      ]
    },

    // Deductions configuration
    deductions: {
      title: "DEDUCTIONS",
      fields: [
        { 
          key: 'providentFund', 
          label: 'Provident Fund (PF)', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'percentage',
          percentage: 12, // 12% of basic
          maxAmount: 1800, // Current PF ceiling
          description: 'Employee provident fund contribution'
        },
        { 
          key: 'voluntaryPF', 
          label: 'Voluntary PF', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          description: 'Additional voluntary PF contribution'
        },
        { 
          key: 'esic', 
          label: 'ESIC', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'percentage',
          percentage: 0.75, // Employee share 0.75%
          maxAmount: 21000, // ESIC wage ceiling
          description: 'Employee state insurance contribution'
        },
        { 
          key: 'professionalTax', 
          label: 'Professional Tax', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'slab', // Based on salary slabs
          slabs: [
            { min: 0, max: 10000, amount: 0 },
            { min: 10001, max: 15000, amount: 150 },
            { min: 15001, max: 25000, amount: 200 },
            { min: 25001, max: 999999, amount: 250 }
          ],
          description: 'State professional tax'
        },
        { 
          key: 'tds', 
          label: 'Tax Deducted at Source (TDS)', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'formula', // Complex tax calculation
          description: 'Income tax deduction'
        },
        { 
          key: 'medicalPremium', 
          label: 'Medical Insurance Premium', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          description: 'Group medical insurance premium'
        },
        { 
          key: 'nps', 
          label: 'National Pension Scheme (NPS)', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'percentage',
          percentage: 10, // Employee contribution
          description: 'NPS employee contribution'
        },
        { 
          key: 'loanEmi', 
          label: 'Loan EMI', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'fixed',
          description: 'Employee loan EMI deduction'
        },
        { 
          key: 'advances', 
          label: 'Salary Advance', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'variable',
          description: 'Salary advance recovery'
        },
        { 
          key: 'canteenCharges', 
          label: 'Canteen Charges', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'variable',
          description: 'Canteen/meal deduction'
        },
        { 
          key: 'otherDeductions', 
          label: 'Other Deductions', 
          required: false, 
          editable: true, 
          type: 'currency',
          calculation: 'variable',
          description: 'Miscellaneous deductions'
        }
      ]
    },

    // Net pay and summary
    summary: {
      fields: [
        { key: 'grossSalary', label: 'Gross Salary', calculated: true },
        { key: 'totalDeductions', label: 'Total Deductions', calculated: true },
        { key: 'netSalary', label: 'Net Salary', calculated: true },
        { key: 'netSalaryWords', label: 'Net Salary (in words)', calculated: true, type: 'text' }
      ]
    },

    // Payment information
    payment: {
      fields: [
        { key: 'paymentMode', label: 'Payment Mode', required: true, editable: true, 
          options: ['Online Transfer', 'Cheque', 'Cash', 'UPI'] },
        { key: 'disbursementDate', label: 'Disbursement Date', required: true, editable: true, type: 'date' },
        { key: 'payPeriod', label: 'Pay Period', required: true, editable: true },
        { key: 'bankName', label: 'Bank Name', required: false, editable: false },
        { key: 'accountNumber', label: 'Account Number', required: false, editable: false }
      ]
    },

    // Footer
    footer: {
      showSignature: true,
      signatureText: "This is a computer generated payslip and does not require signature.",
      showDisclaimer: true,
      disclaimer: "This payslip is confidential and for the named employee only."
    }
  },

  // Calculation rules and formulas
  calculations: {
    // Gross salary calculation
    grossSalary: {
      formula: "SUM(earnings.*)",
      description: "Sum of all earnings"
    },
    
    // Total deductions calculation
    totalDeductions: {
      formula: "SUM(deductions.*)",
      description: "Sum of all deductions"
    },
    
    // Net salary calculation
    netSalary: {
      formula: "grossSalary - totalDeductions",
      description: "Gross salary minus total deductions"
    },

    // HRA calculation (if percentage based)
    houseRentAllowance: {
      formula: "basicSalary * 0.40",
      condition: "calculation === 'percentage'",
      description: "40% of basic salary"
    },

    // PF calculation
    providentFund: {
      formula: "MIN(basicSalary * 0.12, 1800)",
      description: "12% of basic salary, capped at ₹1800"
    },

    // ESIC calculation
    esic: {
      formula: "IF(grossSalary <= 21000, grossSalary * 0.0075, 0)",
      description: "0.75% of gross salary if gross <= ₹21000"
    },

    // Professional Tax calculation
    professionalTax: {
      formula: "LOOKUP(grossSalary, professionalTaxSlabs)",
      description: "Based on salary slabs"
    },

    // Absent days calculation
    absentDays: {
      formula: "totalWorkingDays - presentDays",
      description: "Total working days minus present days"
    },

    // Paid days calculation
    paidDays: {
      formula: "presentDays - lopDays",
      description: "Present days minus LOP days"
    }
  },

  // Validation rules
  validation: {
    rules: [
      {
        field: 'basicSalary',
        rule: 'required',
        message: 'Basic salary is required'
      },
      {
        field: 'basicSalary',
        rule: 'min',
        value: 0,
        message: 'Basic salary must be positive'
      },
      {
        field: 'totalWorkingDays',
        rule: 'range',
        min: 1,
        max: 31,
        message: 'Working days must be between 1 and 31'
      },
      {
        field: 'presentDays',
        rule: 'max_field',
        compareField: 'totalWorkingDays',
        message: 'Present days cannot exceed total working days'
      },
      {
        field: 'netSalary',
        rule: 'min',
        value: 0,
        message: 'Net salary cannot be negative'
      }
    ]
  },

  // Export/Import configuration
  csvMapping: {
    employeeId: 'employee_id',
    basicSalary: 'basic_salary',
    houseRentAllowance: 'hra',
    conveyanceAllowance: 'conveyance',
    medicalAllowance: 'medical',
    specialAllowance: 'special_allowance',
    performanceBonus: 'bonus',
    overtimeAllowance: 'overtime',
    providentFund: 'pf',
    esic: 'esic',
    professionalTax: 'pt',
    tds: 'tds',
    totalWorkingDays: 'working_days',
    presentDays: 'present_days',
    lopDays: 'lop_days'
  }
};

// Additional template configurations
export const TEMPLATE_VARIANTS = {
  'executive': {
    ...DEFAULT_PAYSLIP_TEMPLATE,
    id: 'executive',
    name: 'Executive Payslip Template',
    structure: {
      ...DEFAULT_PAYSLIP_TEMPLATE.structure,
      earnings: {
        ...DEFAULT_PAYSLIP_TEMPLATE.structure.earnings,
        fields: [
          ...DEFAULT_PAYSLIP_TEMPLATE.structure.earnings.fields,
          { key: 'stockOptions', label: 'Stock Options', required: false, editable: true, type: 'currency' },
          { key: 'executiveAllowance', label: 'Executive Allowance', required: false, editable: true, type: 'currency' }
        ]
      }
    }
  },
  
  'intern': {
    ...DEFAULT_PAYSLIP_TEMPLATE,
    id: 'intern',
    name: 'Intern Payslip Template',
    structure: {
      ...DEFAULT_PAYSLIP_TEMPLATE.structure,
      earnings: {
        title: "STIPEND & ALLOWANCES",
        fields: [
          { key: 'stipend', label: 'Monthly Stipend', required: true, editable: true, type: 'currency' },
          { key: 'transportAllowance', label: 'Transport Allowance', required: false, editable: true, type: 'currency' },
          { key: 'mealAllowance', label: 'Meal Allowance', required: false, editable: true, type: 'currency' }
        ]
      },
      deductions: {
        title: "DEDUCTIONS",
        fields: [
          { key: 'tds', label: 'TDS (if applicable)', required: false, editable: true, type: 'currency' }
        ]
      }
    }
  },

  'consultant': {
    ...DEFAULT_PAYSLIP_TEMPLATE,
    id: 'consultant',
    name: 'Consultant Payment Template',
    structure: {
      ...DEFAULT_PAYSLIP_TEMPLATE.structure,
      earnings: {
        title: "PROFESSIONAL FEES",
        fields: [
          { key: 'consultingFee', label: 'Consulting Fee', required: true, editable: true, type: 'currency' },
          { key: 'projectBonus', label: 'Project Bonus', required: false, editable: true, type: 'currency' },
          { key: 'expenseReimbursement', label: 'Expense Reimbursement', required: false, editable: true, type: 'currency' }
        ]
      },
      deductions: {
        title: "DEDUCTIONS",
        fields: [
          { key: 'tds', label: 'TDS', required: true, editable: true, type: 'currency' },
          { key: 'gst', label: 'GST (if applicable)', required: false, editable: true, type: 'currency' }
        ]
      }
    }
  }
};

// Utility functions for template management
export const getTemplateById = (templateId) => {
  if (templateId === 'default') return DEFAULT_PAYSLIP_TEMPLATE;
  return TEMPLATE_VARIANTS[templateId] || DEFAULT_PAYSLIP_TEMPLATE;
};

export const getAllTemplates = () => {
  return [
    DEFAULT_PAYSLIP_TEMPLATE,
    ...Object.values(TEMPLATE_VARIANTS)
  ];
};

export const validatePayslipData = (data, template = DEFAULT_PAYSLIP_TEMPLATE) => {
  const errors = [];
  
  template.validation.rules.forEach(rule => {
    const value = data[rule.field];
    
    switch (rule.rule) {
      case 'required':
        if (!value && value !== 0) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
      case 'min':
        if (value < rule.value) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
      case 'max':
        if (value > rule.value) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
      case 'range':
        if (value < rule.min || value > rule.max) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
      case 'max_field':
        if (value > data[rule.compareField]) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
    }
  });
  
  return errors;
};