/**
 * Employee Validation Schemas
 * 
 * Joi schemas for validating employee-related requests
 */

const Joi = require('joi');

/**
 * Schema for creating a new employee
 *
 * Note: employeeId is optional on create. If provided, it must match
 * SKYT + exactly 4 digits; if omitted, the backend will auto-generate one.
 */
const createEmployeeSchema = Joi.object({
  employeeId: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^SKYT\d{4}$/)
    .messages({
      'string.pattern.base': 'Employee ID must be in format SKYT#### (SKYT followed by exactly 4 digits)'
    }),

  firstName: Joi.string()
    .required()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .messages({
      'string.pattern.base': 'First name must contain only letters and spaces',
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 50 characters'
    }),

  lastName: Joi.string()
    .required()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .messages({
      'string.pattern.base': 'Last name must contain only letters and spaces'
    }),

  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  phone: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[0-9+]{10,15}$/)
    .messages({
      'string.pattern.base': 'Phone number must be between 10 and 15 digits (can include +)'
    }),

  dateOfBirth: Joi.date()
    .optional()
    .allow('', null)
    .max('now')
    .custom((value, helpers) => {
      if (!value) return value; // Allow empty/null
      const age = (new Date() - value) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        return helpers.error('any.invalid', { message: 'Employee must be at least 18 years old' });
      }
      return value;
    }),

  gender: Joi.string()
    .valid('Male', 'Female', 'Other')
    .optional(),

  maritalStatus: Joi.string()
    .valid('Single', 'Married', 'Divorced', 'Widowed')
    .optional(),

  address: Joi.string()
    .max(200)
    .optional(),

  city: Joi.string()
    .max(50)
    .optional(),

  state: Joi.string()
    .max(50)
    .optional(),

  pinCode: Joi.string()
    .pattern(/^\d{6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'PIN code must be exactly 6 digits'
    }),

  country: Joi.string()
    .max(50)
    .default('India'),

  departmentId: Joi.string()
    .required()
    .uuid()
    .messages({
      'string.guid': 'Department ID must be a valid UUID'
    }),

  positionId: Joi.string()
    .required()
    .uuid(),

  managerId: Joi.string()
    .uuid()
    .optional()
    .allow(null),

  hireDate: Joi.date()
    .required()
    .max('now'),

  joiningDate: Joi.date()
    .optional(),

  employmentType: Joi.string()
    .valid('Full-time', 'Part-time', 'Contract', 'Intern')
    .default('Full-time'),

  status: Joi.string()
    .valid('Active', 'Inactive', 'On Leave', 'Terminated')
    .default('Active'),

  workLocation: Joi.string()
    .max(200)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Work location must not exceed 200 characters'
    }),

  probationPeriod: Joi.number()
    .integer()
    .min(0)
    .max(24)
    .optional()
    .default(6)
    .messages({
      'number.base': 'Probation period must be a number',
      'number.integer': 'Probation period must be a whole number',
      'number.min': 'Probation period cannot be negative',
      'number.max': 'Probation period cannot exceed 24 months'
    }),

  noticePeriod: Joi.number()
    .integer()
    .min(0)
    .max(365)
    .optional()
    .default(30)
    .messages({
      'number.base': 'Notice period must be a number',
      'number.integer': 'Notice period must be a whole number',
      'number.min': 'Notice period cannot be negative',
      'number.max': 'Notice period cannot exceed 365 days'
    }),

  // Legacy basicSalary field (for backward compatibility)
  // Made optional - will be deprecated in favor of nested salary object
  basicSalary: Joi.number()
    .optional()
    .min(0)
    .max(10000000)
    .precision(2)
    .messages({
      'number.min': 'Basic salary must be a positive number',
      'number.max': 'Basic salary cannot exceed 10,000,000'
    }),

  // New comprehensive salary structure (nested JSON object)
  // This is the preferred format going forward
  // The entire salary object is optional, and basicSalary is optional within it
  salary: Joi.object({
    basicSalary: Joi.number()
      .optional()
      .min(0)
      .max(10000000)
      .precision(2)
      .messages({
        'number.min': 'Basic salary must be a positive number',
        'number.max': 'Basic salary cannot exceed 10,000,000'
      }),
    currency: Joi.string()
      .valid('INR', 'USD', 'EUR', 'GBP')
      .default('INR'),
    payFrequency: Joi.string()
      .valid('weekly', 'biweekly', 'monthly', 'annually')
      .insensitive()
      .default('monthly'),
    effectiveFrom: Joi.date()
      .optional()
      .allow(null),
    allowances: Joi.object({
      hra: Joi.number().min(0).default(0),
      transport: Joi.number().min(0).default(0),
      medical: Joi.number().min(0).default(0),
      food: Joi.number().min(0).default(0),
      communication: Joi.number().min(0).default(0),
      special: Joi.number().min(0).default(0),
      other: Joi.number().min(0).default(0)
    }).optional().default({}),
    deductions: Joi.object({
      pf: Joi.number().min(0).default(0),
      professionalTax: Joi.number().min(0).default(0),
      incomeTax: Joi.number().min(0).default(0),
      esi: Joi.number().min(0).default(0),
      other: Joi.number().min(0).default(0)
    }).optional().default({}),
    benefits: Joi.object({
      bonus: Joi.number().min(0).default(0),
      incentive: Joi.number().min(0).default(0),
      overtime: Joi.number().min(0).default(0)
    }).optional().default({}),
    taxInformation: Joi.object({
      taxRegime: Joi.string().valid('old', 'new').insensitive().default('old'),
      ctc: Joi.number().min(0).default(0),
      takeHome: Joi.number().min(0).default(0)
    }).optional().default({}),
    salaryNotes: Joi.string().max(500).allow('').optional()
  }).optional(),

  bankName: Joi.string()
    .max(100)
    .optional(),

  accountNumber: Joi.string()
    .max(20)
    .optional(),
    
  bankAccountNumber: Joi.string()
    .max(20)
    .optional()
    .allow('', null),

  ifscCode: Joi.string()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid IFSC code format'
    }),

  panNumber: Joi.string()
    .pattern(/^[A-Z]{5}\d{4}[A-Z]$/)
    .uppercase()
    .optional()
    .messages({
      'string.pattern.base': 'Invalid PAN number format (e.g., ABCDE1234F)'
    }),

  aadhaarNumber: Joi.string()
    .pattern(/^\d{12}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Aadhaar number must be exactly 12 digits'
    }),

  uanNumber: Joi.string()
    .pattern(/^[A-Z0-9]{12,}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'UAN number must be at least 12 alphanumeric characters'
    }),

  pfNumber: Joi.string()
    .max(50)
    .optional()
    .allow('', null),

  esiNumber: Joi.string()
    .pattern(/^[A-Z0-9]{10,17}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'ESI number must be 10-17 alphanumeric characters'
    }),

  // Emergency Contact Information
  emergencyContactName: Joi.string()
    .max(100)
    .optional()
    .allow('', null),

  emergencyContactPhone: Joi.string()
    .pattern(/^\d{10,15}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Emergency contact phone must be 10-15 digits'
    }),

  emergencyContactRelation: Joi.string()
    .valid('Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Guardian', 'Other')
    .optional()
    .allow('', null),

  // Additional Bank Details
  bankBranch: Joi.string()
    .max(200)
    .optional()
    .allow('', null),

  accountHolderName: Joi.string()
    .max(100)
    .optional()
    .allow('', null),

  // Work Dates
  confirmationDate: Joi.date()
    .optional()
    .allow(null),

  resignationDate: Joi.date()
    .optional()
    .allow(null),

  lastWorkingDate: Joi.date()
    .optional()
    .allow(null),

  // Photo URL
  photoUrl: Joi.string()
    .uri({ allowRelative: true })
    .optional()
    .allow('', null),

  nationality: Joi.string()
    .max(50)
    .optional()
    .default('Indian'),
  
  // User account fields (for employee creation with user account)
  password: Joi.string()
    .optional()
    .min(8)
    .max(100)
    .pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must not exceed 100 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    }),
  
  role: Joi.string()
    .valid('admin', 'hr', 'manager', 'employee')
    .optional()
    .default('employee')
    .messages({
      'any.only': 'Role must be one of: admin, hr, manager, employee'
    })
});

/**
 * Schema for updating an employee (all fields optional)
 */
const updateEmployeeSchema = Joi.object({
  // Note: employeeId is intentionally excluded here to prevent
  // accidental changes to the primary employee identifier after creation.
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional(),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional(),

  phone: Joi.string()
    .pattern(/^[0-9+]{10,15}$/)
    .optional()
    .allow('', null),

  dateOfBirth: Joi.date()
    .optional()
    .allow('', null)
    .max('now')
    .custom((value, helpers) => {
      if (!value) return value;
      const age = (new Date() - value) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        return helpers.error('any.invalid', { message: 'Employee must be at least 18 years old' });
      }
      return value;
    }),

  gender: Joi.string()
    .valid('Male', 'Female', 'Other')
    .optional()
    .allow('', null),

  maritalStatus: Joi.string()
    .valid('Single', 'Married', 'Divorced', 'Widowed')
    .optional()
    .allow('', null),

  address: Joi.string()
    .max(200)
    .optional()
    .allow('', null),

  city: Joi.string()
    .max(50)
    .optional()
    .allow('', null),

  state: Joi.string()
    .max(50)
    .optional()
    .allow('', null),

  pinCode: Joi.string()
    .pattern(/^\d{6}$/)
    .optional()
    .allow('', null),

  country: Joi.string()
    .max(50)
    .optional()
    .allow('', null),

  departmentId: Joi.string()
    .uuid()
    .optional()
    .allow(null),

  positionId: Joi.string()
    .uuid()
    .optional()
    .allow(null),

  hireDate: Joi.date()
    .optional()
    .max('now'),

  managerId: Joi.string()
    .uuid()
    .optional()
    .allow(null),

  employmentType: Joi.string()
    .valid('Full-time', 'Part-time', 'Contract', 'Intern')
    .optional()
    .allow('', null),

  status: Joi.string()
    .valid('Active', 'Inactive', 'On Leave', 'Terminated')
    .optional(),

  joiningDate: Joi.date()
    .optional()
    .allow(null),

  workLocation: Joi.string()
    .max(200)
    .optional()
    .allow('', null),

  probationPeriod: Joi.number()
    .integer()
    .min(0)
    .max(24)
    .optional()
    .allow(null),

  noticePeriod: Joi.number()
    .integer()
    .min(0)
    .max(365)
    .optional()
    .allow(null),

  basicSalary: Joi.number()
    .min(0)
    .max(10000000)
    .precision(2)
    .optional()
    .allow(null),

  bankName: Joi.string()
    .max(100)
    .optional()
    .allow('', null),

  accountNumber: Joi.string()
    .max(20)
    .optional()
    .allow('', null),
    
  bankAccountNumber: Joi.string()
    .max(20)
    .optional()
    .allow('', null),

  ifscCode: Joi.string()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional()
    .allow('', null),

  panNumber: Joi.string()
    .pattern(/^[A-Z]{5}\d{4}[A-Z]$/)
    .uppercase()
    .optional()
    .allow('', null),

  aadhaarNumber: Joi.string()
    .pattern(/^\d{12}$/)
    .optional()
    .allow('', null),

  uanNumber: Joi.string()
    .pattern(/^[A-Z0-9]{12,}$/)
    .optional()
    .allow('', null),

  pfNumber: Joi.string()
    .max(50)
    .optional()
    .allow('', null),

  esiNumber: Joi.string()
    .pattern(/^[A-Z0-9]{10,17}$/)
    .optional()
    .allow('', null),

  // Emergency Contact Information
  emergencyContactName: Joi.string()
    .max(100)
    .optional()
    .allow('', null),

  emergencyContactPhone: Joi.string()
    .pattern(/^\d{10,15}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Emergency contact phone must be 10-15 digits'
    }),

  emergencyContactRelation: Joi.string()
    .valid('Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Guardian', 'Other')
    .optional()
    .allow('', null),

  // Additional Bank Details
  bankBranch: Joi.string()
    .max(200)
    .optional()
    .allow('', null),

  accountHolderName: Joi.string()
    .max(100)
    .optional()
    .allow('', null),

  // Work Dates
  confirmationDate: Joi.date()
    .optional()
    .allow(null),

  resignationDate: Joi.date()
    .optional()
    .allow(null),

  lastWorkingDate: Joi.date()
    .optional()
    .allow(null),

  // Photo URL
  photoUrl: Joi.string()
    .uri({ allowRelative: true })
    .optional()
    .allow('', null),

  nationality: Joi.string()
    .max(50)
    .optional()
    .allow('', null),

  // Comprehensive salary structure (new format)
  salary: Joi.object({
    basicSalary: Joi.number()
      .min(0)
      .max(10000000)
      .precision(2)
      .optional(),
    
    currency: Joi.string()
      .valid('INR', 'USD', 'EUR', 'GBP')
      .default('INR')
      .optional(),
    
    payFrequency: Joi.string()
      .valid('weekly', 'biweekly', 'monthly', 'annually')
      .insensitive()
      .default('monthly')
      .optional(),
    
    effectiveFrom: Joi.date()
      .optional()
      .allow(null),
    
    allowances: Joi.object({
      hra: Joi.number().min(0).default(0).optional(),
      transport: Joi.number().min(0).default(0).optional(),
      medical: Joi.number().min(0).default(0).optional(),
      food: Joi.number().min(0).default(0).optional(),
      communication: Joi.number().min(0).default(0).optional(),
      special: Joi.number().min(0).default(0).optional(),
      other: Joi.number().min(0).default(0).optional()
    }).optional().default({}),
    
    deductions: Joi.object({
      pf: Joi.number().min(0).default(0).optional(),
      professionalTax: Joi.number().min(0).default(0).optional(),
      incomeTax: Joi.number().min(0).default(0).optional(),
      esi: Joi.number().min(0).default(0).optional(),
      other: Joi.number().min(0).default(0).optional()
    }).optional().default({}),
    
    benefits: Joi.object({
      bonus: Joi.number().min(0).default(0).optional(),
      incentive: Joi.number().min(0).default(0).optional(),
      overtime: Joi.number().min(0).default(0).optional()
    }).optional().default({}),
    
    taxInformation: Joi.object({
      taxRegime: Joi.string().valid('old', 'new').insensitive().default('old').optional(),
      ctc: Joi.number().min(0).default(0).optional(),
      takeHome: Joi.number().min(0).default(0).optional()
    }).optional().default({}),
    
    salaryNotes: Joi.string()
      .max(500)
      .allow('', null)
      .optional()
  }).optional()
}).min(1); // At least one field must be provided

/**
 * Schema for employee query parameters
 */
const employeeQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(10),

  search: Joi.string()
    .max(100)
    .optional(),

  department: Joi.string()
    .uuid()
    .optional(),

  departmentId: Joi.string()
    .uuid()
    .optional(),

  position: Joi.string()
    .uuid()
    .optional(),

  status: Joi.string()
    .valid('Active', 'Inactive', 'On Leave', 'Terminated', 'active', 'inactive', 'on_leave', 'terminated')
    .optional(),

  employmentType: Joi.string()
    .valid('Full-time', 'Part-time', 'Contract', 'Intern')
    .optional(),

  workLocation: Joi.string()
    .max(100)
    .optional(),

  sort: Joi.string()
    .valid('firstName', 'lastName', 'employeeId', 'hireDate', 'email')
    .default('firstName'),

  order: Joi.string()
    .valid('asc', 'desc', 'ASC', 'DESC')
    .default('asc')
});

/**
 * Schema for UUID parameter validation
 */
const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid ID format'
    })
});

/**
 * Schema for updating employee compensation
 */
const updateCompensationSchema = Joi.object({
  salary: Joi.object({
    basicSalary: Joi.number().min(0).max(10000000).precision(2).required(),
    currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').default('INR').optional(),
    payFrequency: Joi.string().valid('weekly', 'biweekly', 'monthly', 'annually').insensitive().default('monthly').optional(),
    effectiveFrom: Joi.date().optional().allow(null),
    allowances: Joi.object({
      hra: Joi.number().min(0).default(0).optional(),
      transport: Joi.number().min(0).default(0).optional(),
      medical: Joi.number().min(0).default(0).optional(),
      food: Joi.number().min(0).default(0).optional(),
      communication: Joi.number().min(0).default(0).optional(),
      special: Joi.number().min(0).default(0).optional(),
      other: Joi.number().min(0).default(0).optional()
    }).optional().default({}),
    deductions: Joi.object({
      pf: Joi.number().min(0).default(0).optional(),
      professionalTax: Joi.number().min(0).default(0).optional(),
      incomeTax: Joi.number().min(0).default(0).optional(),
      other: Joi.number().min(0).default(0).optional()
    }).optional().default({}),
    salaryNotes: Joi.string().max(500).allow('', null).optional()
  }).required()
});

/**
 * Schema for updating employee status
 */
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Active', 'Inactive', 'On Leave', 'Terminated')
    .required()
    .messages({
      'any.only': 'Status must be one of: Active, Inactive, On Leave, Terminated',
      'any.required': 'Status is a required field'
    })
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  uuidParamSchema,
  updateCompensationSchema,
  updateStatusSchema
};
