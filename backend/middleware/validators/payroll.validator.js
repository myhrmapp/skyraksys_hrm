/**
 * Payroll Validation Schemas
 * 
 * Joi schemas for validating payroll and payslip-related requests
 * 
 * @module middleware/validators/payroll.validator
 * @requires joi
 */

const Joi = require('joi');

/**
 * Common UUID validation pattern
 */
const uuidSchema = Joi.string()
  .uuid({ version: 'uuidv4' })
  .messages({
    'string.guid': 'Invalid UUID format'
  });

/**
 * UUID parameter validation
 */
const uuidParamSchema = Joi.object({
  id: uuidSchema.required()
});

/**
 * Query schema for payroll data list
 */
const payrollQuerySchema = Joi.object({
  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional()
    .messages({
      'number.min': 'Month must be between 1 and 12',
      'number.max': 'Month must be between 1 and 12'
    }),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(new Date().getFullYear() + 5)
    .optional()
    .messages({
      'number.min': 'Year must be 2020 or later',
      'number.max': `Year must be ${new Date().getFullYear() + 5} or earlier`
    }),

  employeeId: uuidSchema.optional(),

  status: Joi.string()
    .valid('draft', 'calculated', 'approved', 'paid', 'cancelled')
    .optional(),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional()
});

/**
 * Schema for calculating payroll
 */
const calculatePayrollSchema = Joi.object({
  employeeId: uuidSchema.required(),

  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .required(),

  attendance: Joi.object({
    totalWorkingDays: Joi.number().integer().min(0).max(31).optional(),
    presentDays: Joi.number().integer().min(0).max(31).optional(),
    lopDays: Joi.number().integer().min(0).max(31).optional(),
    overtimeHours: Joi.number().min(0).optional()
  }).optional()
});

/**
 * Schema for creating payroll data
 */
const createPayrollSchema = Joi.object({
  employeeId: uuidSchema.required(),

  payPeriod: Joi.string()
    .required()
    .messages({
      'string.empty': 'Pay period is required'
    }),

  payPeriodStart: Joi.date()
    .required(),

  payPeriodEnd: Joi.date()
    .required()
    .greater(Joi.ref('payPeriodStart'))
    .messages({
      'date.greater': 'Pay period end must be after pay period start'
    }),

  totalWorkingDays: Joi.number()
    .integer()
    .min(0)
    .max(31)
    .required(),

  presentDays: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('totalWorkingDays'))
    .required(),

  lopDays: Joi.number()
    .integer()
    .min(0)
    .default(0),

  paidDays: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('totalWorkingDays'))
    .optional(),

  overtimeHours: Joi.number()
    .min(0)
    .default(0),

  grossSalary: Joi.number()
    .min(0)
    .required(),

  totalDeductions: Joi.number()
    .min(0)
    .default(0),

  netSalary: Joi.number()
    .min(0)
    .required(),

  status: Joi.string()
    .valid('draft', 'calculated', 'approved', 'paid')
    .default('draft'),

  variableEarnings: Joi.object().optional(),
  variableDeductions: Joi.object().optional(),
  leaveAdjustments: Joi.object().optional(),
  remarks: Joi.string().max(500).optional()
});

/**
 * Schema for updating payroll data
 */
const updatePayrollSchema = Joi.object({
  totalWorkingDays: Joi.number().integer().min(0).max(31).optional(),
  presentDays: Joi.number().integer().min(0).max(31).optional(),
  lopDays: Joi.number().integer().min(0).max(31).optional(),
  paidDays: Joi.number().integer().min(0).max(31).optional(),
  overtimeHours: Joi.number().min(0).optional(),
  grossSalary: Joi.number().min(0).optional(),
  totalDeductions: Joi.number().min(0).optional(),
  netSalary: Joi.number().min(0).optional(),
  variableEarnings: Joi.object().optional(),
  variableDeductions: Joi.object().optional(),
  leaveAdjustments: Joi.object().optional(),
  remarks: Joi.string().max(500).optional()
}).min(1); // At least one field must be provided

/**
 * Schema for payslip generation
 */
const generatePayslipSchema = Joi.object({
  employeeIds: Joi.array()
    .items(uuidSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one employee ID is required'
    }),

  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .required(),

  templateId: uuidSchema.optional(),

  options: Joi.object({
    overtimeHours: Joi.number().min(0).optional(),
    bonuses: Joi.object().optional(),
    deductions: Joi.object().optional()
  }).optional()
});

/**
 * Schema for generating all payslips
 */
const generateAllPayslipsSchema = Joi.object({
  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .required(),

  templateId: uuidSchema.optional(),

  departmentId: uuidSchema.optional()
});

/**
 * Schema for payslip preview calculation
 */
const calculatePreviewSchema = Joi.object({
  employeeId: uuidSchema.required(),

  salaryStructure: Joi.object({
    basicSalary: Joi.number().min(0).required(),
    hra: Joi.number().min(0).optional(),
    allowances: Joi.object().optional(),
    deductions: Joi.object().optional()
  }).optional(),

  attendance: Joi.object({
    totalWorkingDays: Joi.number().integer().min(0).max(31).optional(),
    presentDays: Joi.number().integer().min(0).max(31).optional(),
    lopDays: Joi.number().integer().min(0).max(31).optional(),
    overtimeHours: Joi.number().min(0).optional()
  }).optional(),

  options: Joi.object().optional()
});

/**
 * Schema for validating employees before payslip generation
 */
const validateEmployeesSchema = Joi.object({
  employeeIds: Joi.array()
    .items(uuidSchema)
    .min(1)
    .required(),

  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .required()
});

/**
 * Schema for updating payslip (manual edit)
 */
const updatePayslipSchema = Joi.object({
  earnings: Joi.object()
    .required()
    .min(1)
    .pattern(
      Joi.string(),
      Joi.number().min(0)
    )
    .messages({
      'object.min': 'At least one earning component is required'
    }),

  deductions: Joi.object()
    .optional()
    .pattern(
      Joi.string(),
      Joi.number().min(0)
    ),

  reason: Joi.string()
    .required()
    .min(10)
    .max(500)
    .messages({
      'string.min': 'Reason must be at least 10 characters for audit trail',
      'string.max': 'Reason must not exceed 500 characters'
    })
});

/**
 * Schema for bulk operations
 */
const bulkOperationSchema = Joi.object({
  payslipIds: Joi.array()
    .items(uuidSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one payslip ID is required'
    }),

  reason: Joi.string()
    .optional()
    .max(500)
});

/**
 * Schema for export query
 */
const exportQuerySchema = Joi.object({
  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .required(),

  format: Joi.string()
    .valid('xlsx', 'csv')
    .default('xlsx')
    .optional(),

  departmentId: uuidSchema.optional()
});

/**
 * Schema for summary report query
 */
const summaryReportQuerySchema = Joi.object({
  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2030)
    .required(),

  departmentId: uuidSchema.optional()
});

/**
 * Schema for salary structure query parameters
 */
const salaryStructureQuerySchema = Joi.object({
  employeeId: uuidSchema.optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

/**
 * Schema for creating salary structure
 */
const createSalaryStructureSchema = Joi.object({
  employeeId: uuidSchema.required(),
  basicSalary: Joi.number().min(0).required(),
  hra: Joi.number().min(0).optional(),
  allowances: Joi.number().min(0).optional(),
  transportAllowance: Joi.number().min(0).optional(),
  medicalAllowance: Joi.number().min(0).optional(),
  specialAllowance: Joi.number().min(0).optional(),
  pfContribution: Joi.number().min(0).optional(),
  providentFund: Joi.number().min(0).optional(),
  tds: Joi.number().min(0).optional(),
  incomeTax: Joi.number().min(0).optional(),
  professionalTax: Joi.number().min(0).optional(),
  otherDeductions: Joi.number().min(0).optional(),
  effectiveFrom: Joi.date().optional(),
  isActive: Joi.boolean().optional()
});

/**
 * Schema for updating salary structure
 */
const updateSalaryStructureSchema = Joi.object({
  basicSalary: Joi.number().min(0).optional(),
  hra: Joi.number().min(0).optional(),
  allowances: Joi.number().min(0).optional(),
  transportAllowance: Joi.number().min(0).optional(),
  medicalAllowance: Joi.number().min(0).optional(),
  specialAllowance: Joi.number().min(0).optional(),
  pfContribution: Joi.number().min(0).optional(),
  providentFund: Joi.number().min(0).optional(),
  tds: Joi.number().min(0).optional(),
  incomeTax: Joi.number().min(0).optional(),
  professionalTax: Joi.number().min(0).optional(),
  otherDeductions: Joi.number().min(0).optional(),
  effectiveFrom: Joi.date().optional(),
  isActive: Joi.boolean().optional()
}).min(1);

module.exports = {
  // Common
  uuidParamSchema,

  // Payroll Data
  payrollQuerySchema,
  calculatePayrollSchema,
  createPayrollSchema,
  updatePayrollSchema,

  // Salary Structure
  salaryStructureQuerySchema,
  createSalaryStructureSchema,
  updateSalaryStructureSchema,

  // Payslip Generation
  generatePayslipSchema,
  generateAllPayslipsSchema,
  calculatePreviewSchema,
  validateEmployeesSchema,

  // Payslip Operations
  updatePayslipSchema,
  bulkOperationSchema,

  // Reports
  exportQuerySchema,
  summaryReportQuerySchema
};
