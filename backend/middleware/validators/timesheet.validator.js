/**
 * Timesheet Validation Schemas
 * 
 * Joi schemas for validating timesheet-related requests
 */

const Joi = require('joi');

// L-01: timesheetEntrySchema (old daily-entry format) removed — never referenced anywhere

/**
 * Schema for creating a new timesheet
 */
const createTimesheetSchema = Joi.object({
    employeeId: Joi.string()
      .optional()
      .uuid(),

    projectId: Joi.string()
      .required()
      .uuid(),

    taskId: Joi.string()
      .required()
      .uuid(),

    weekStartDate: Joi.date()
      .required()
      .custom((value, helpers) => {
        // Validate that it's a Monday
        const day = value.getDay();
        if (day !== 1) {
          return helpers.error('any.invalid', { message: 'Week start date must be a Monday' });
        }
        return value;
      }),

    weekEndDate: Joi.date()
      .required()
      .custom((value, helpers) => {
        // Validate that it's a Sunday
        const day = value.getDay();
        if (day !== 0) {
          return helpers.error('any.invalid', { message: 'Week end date must be a Sunday' });
        }
        return value;
      })
      .greater(Joi.ref('weekStartDate'))
      .messages({
        'date.greater': 'Week end date must be after week start date'
      }),

    // Individual day hours
    mondayHours: Joi.number().min(0).max(24).default(0),
  tuesdayHours: Joi.number().min(0).max(24).default(0),
  wednesdayHours: Joi.number().min(0).max(24).default(0),
  thursdayHours: Joi.number().min(0).max(24).default(0),
  fridayHours: Joi.number().min(0).max(24).default(0),
  saturdayHours: Joi.number().min(0).max(24).default(0),
  sundayHours: Joi.number().min(0).max(24).default(0),

  description: Joi.string()
    .max(500)
    .allow('')
    .optional(),

  status: Joi.string()
    .valid('Draft', 'Submitted', 'Approved', 'Rejected')
    .default('Draft'),

  totalHours: Joi.number()
    .min(0)
    .max(168) // Max hours in a week
    .precision(2)
    .optional()
    .custom((value, helpers) => {
      // Prevent empty timesheets - must have at least 0.01 hours
      if (value !== undefined && value === 0) {
        return helpers.message('Timesheet must have at least 0.01 hours');
      }
      return value;
    })
  });

/**
 * Schema for bulk timesheet submission
 */
const bulkSubmitTimesheetSchema = Joi.object({
  timesheetIds: Joi.array()
    .items(Joi.string().uuid())
    .optional(),
    
  weekStartDate: Joi.date()
    .optional()
}).or('timesheetIds', 'weekStartDate');

/**
 * Schema for updating timesheet status
 */
const updateTimesheetStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Draft', 'Submitted', 'Approved', 'Rejected')
    .required(),

  approverComments: Joi.string()
    .max(500)
    .when('status', {
      is: 'Rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Comments are required when rejecting a timesheet'
    })
});

/**
 * Schema for updating timesheet entries
 * Note: employeeId and status cannot be changed via update (use dedicated endpoints)
 */
const updateTimesheetSchema = Joi.object({
  // Explicitly forbid changing ownership
  employeeId: Joi.forbidden(),
  
  // Explicitly forbid changing status (use dedicated submit/approve endpoints)
  status: Joi.forbidden(),
  
  // Allow updating project/task assignments
  projectId: Joi.string()
    .uuid()
    .optional(),

  taskId: Joi.string()
    .uuid()
    .optional(),

  // Allow updating individual day hours
  mondayHours: Joi.number().min(0).max(24).optional(),
  tuesdayHours: Joi.number().min(0).max(24).optional(),
  wednesdayHours: Joi.number().min(0).max(24).optional(),
  thursdayHours: Joi.number().min(0).max(24).optional(),
  fridayHours: Joi.number().min(0).max(24).optional(),
  saturdayHours: Joi.number().min(0).max(24).optional(),
  sundayHours: Joi.number().min(0).max(24).optional(),

  // Allow updating description
  description: Joi.string()
    .max(500)
    .optional(),

  // Allow updating total hours
  totalHours: Joi.number()
    .min(0)
    .max(168)
    .precision(2)
    .optional()
}).min(1); // At least one field must be provided

/**
 * Schema for timesheet query parameters
 */
const timesheetQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)  // L-02: reduced from 500 to prevent accidental large data dumps
    .default(10),

  employeeId: Joi.string()
    .uuid()
    .optional(),

  projectId: Joi.string()
    .uuid()
    .optional(),

  status: Joi.string()
    .valid('Draft', 'Submitted', 'Approved', 'Rejected', 'draft', 'submitted', 'approved', 'rejected')
    .optional(),

  weekStartDate: Joi.date()
    .optional(),

  startDate: Joi.date()
    .optional(),

  weekEndDate: Joi.date()
    .optional()
    .when('weekStartDate', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('weekStartDate'))
    }),

  // L-03: fromDate / toDate removed — no backend logic consumes them; use startDate / weekStartDate instead

  sort: Joi.string()
    .valid('weekStartDate', 'weekEndDate', 'totalHoursWorked', 'status', 'createdAt')
    .default('weekStartDate'),

  order: Joi.string()
    .valid('asc', 'desc', 'ASC', 'DESC')
    .default('desc')
});

/**
 * Schema for week parameter validation
 */
const weekParamSchema = Joi.object({
  weekStart: Joi.date()
    .required()
    .custom((value, helpers) => {
      const day = value.getDay();
      if (day !== 1) {
        return helpers.error('any.invalid', { message: 'Week start must be a Monday' });
      }
      return value;
    })
});

/**
 * Schema for timesheet approval/rejection
 */
const timesheetApprovalSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'reject')
    .required()
    .messages({
      'any.required': 'Action (approve or reject) is required'
    }),

  comments: Joi.string()
    .max(500)
    .when('action', {
      is: 'reject',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
});

module.exports = {
  createTimesheetSchema,
  bulkSubmitTimesheetSchema,
  updateTimesheetStatusSchema,
  updateTimesheetSchema,
  timesheetQuerySchema,
  weekParamSchema,
  timesheetApprovalSchema
};
