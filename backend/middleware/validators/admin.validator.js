/**
 * Admin Input Validation - Task 3.4
 * Joi validation schemas for admin configuration endpoints
 * 
 * Purpose: Prevent invalid configuration values that could destabilize the system
 * Scope: Email configuration, System settings
 */

const Joi = require('joi');

/**
 * Email Configuration Schema
 * Used for: POST /api/admin/email-config
 * 
 * Validates SMTP settings to ensure proper email functionality
 */
const emailConfigSchema = Joi.object({
  smtpHost: Joi.string()
    .hostname()
    .required()
    .messages({
      'string.hostname': 'SMTP host must be a valid hostname or IP address',
      'any.required': 'SMTP host is required'
    }),
  
  smtpPort: Joi.number()
    .port() // 1-65535
    .required()
    .messages({
      'number.port': 'SMTP port must be between 1 and 65535',
      'any.required': 'SMTP port is required'
    }),
  
  smtpSecure: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'SMTP secure must be true or false'
    }),
  
  smtpUser: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'SMTP user must be a valid email address',
      'any.required': 'SMTP user is required'
    }),
  
  smtpPassword: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.min': 'SMTP password cannot be empty',
      'any.required': 'SMTP password is required'
    }),
  
  emailFrom: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'From email must be a valid email address',
      'any.required': 'From email is required'
    }),
  
  enabled: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Enabled must be true or false'
    })
});

/**
 * System Configuration Schema
 * Used for: POST /api/admin/system-config
 * 
 * Validates company-wide settings
 */
const systemConfigSchema = Joi.object({
  companyName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name must not exceed 100 characters',
      'any.required': 'Company name is required'
    }),
  
  currency: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      'string.length': 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR, GBP)',
      'string.uppercase': 'Currency code must be uppercase',
      'string.pattern.base': 'Currency must contain only letters',
      'any.required': 'Currency is required'
    }),
  
  timezone: Joi.string()
    .required()
    .messages({
      'any.required': 'Timezone is required'
    }),
  
  dateFormat: Joi.string()
    .valid('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')
    .required()
    .messages({
      'any.only': 'Date format must be DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD',
      'any.required': 'Date format is required'
    }),
  
  workingDaysPerWeek: Joi.number()
    .integer()
    .min(1)
    .max(7)
    .required()
    .messages({
      'number.min': 'Working days per week must be at least 1',
      'number.max': 'Working days per week cannot exceed 7',
      'number.integer': 'Working days per week must be a whole number',
      'any.required': 'Working days per week is required'
    }),
  
  hoursPerDay: Joi.number()
    .min(1)
    .max(24)
    .required()
    .messages({
      'number.min': 'Hours per day must be at least 1',
      'number.max': 'Hours per day cannot exceed 24',
      'any.required': 'Hours per day is required'
    })
});

/**
 * Test Email Schema
 * Used for: POST /api/admin/email-config/send-test
 * 
 * Validates test email requests (includes SMTP config for testing before saving)
 */
const testEmailSchema = Joi.object({
  // SMTP config to test
  smtpHost: Joi.string().hostname().required(),
  smtpPort: Joi.number().port().required(),
  smtpSecure: Joi.boolean().default(true),
  smtpUser: Joi.string().email().required(),
  smtpPassword: Joi.string().min(1).required(),
  emailFrom: Joi.string().email().required(),
  
  // Test recipient
  testEmail: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Test email must be a valid email address',
      'any.required': 'Test email address is required'
    })
});

module.exports = {
  emailConfigSchema,
  systemConfigSchema,
  testEmailSchema
};
