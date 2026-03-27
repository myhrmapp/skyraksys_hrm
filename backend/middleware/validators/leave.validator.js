/**
 * Leave Request Validation Schemas
 * 
 * Joi schemas for validating leave request-related operations
 */

const Joi = require('joi');

/**
 * Schema for creating a leave request
 */
const createLeaveRequestSchema = Joi.object({
  // employeeId is set server-side from the authenticated token (req.employeeId)
  // Frontend should NOT send employeeId. Make this optional so validation
  // accepts client requests that omit employeeId.
  employeeId: Joi.string()
    .uuid()
    .optional(),

  leaveTypeId: Joi.string()
    .uuid()
    .required(),

  startDate: Joi.date()
    .required(),

  endDate: Joi.date()
    .required()
    .min(Joi.ref('startDate'))
    .messages({
      'date.min': 'End date must be on or after start date'
    })
    .custom((value, helpers) => {
      const startDate = helpers.state.ancestors[0].startDate;
      const diffTime = Math.abs(value - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Limit to 90 days maximum
      if (diffDays > 90) {
        return helpers.error('any.invalid', { 
          message: 'Leave request cannot exceed 90 days' 
        });
      }
      return value;
    }),

  reason: Joi.string()
    .required()
    .min(10)
    .max(500)
    .messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 500 characters'
    }),

  isHalfDay: Joi.boolean()
    .optional()
    .default(false),

  halfDayType: Joi.string()
    .valid('First Half', 'Second Half')
    .when('isHalfDay', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Half day type is required when isHalfDay is true',
      'any.only': 'Half day type must be either "First Half" or "Second Half"'
    }),

  contactNumber: Joi.string()
    .pattern(/^\d{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Contact number must be between 10 and 15 digits'
    }),

  status: Joi.string()
    .valid('Pending', 'Approved', 'Rejected', 'Cancelled', 'Cancellation Requested')
    .default('Pending')
});

/**
 * Schema for updating leave request status
 */
const updateLeaveStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Approved', 'Rejected', 'Cancelled')
    .required(),

  approverComments: Joi.string()
    .max(500)
    .when('status', {
      is: 'Rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Comments are required when rejecting a leave request'
    }),

  approvedBy: Joi.string()
    .uuid()
    .optional()
});

/**
 * Schema for leave query parameters
 */
const leaveQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(10),

  employeeId: Joi.string()
    .uuid()
    .optional(),

  leaveTypeId: Joi.string()
    .uuid()
    .optional(),

  status: Joi.string()
    .valid('Pending', 'Approved', 'Rejected', 'Cancelled', 'Cancellation Requested')
    .optional(),

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .optional()
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().min(Joi.ref('startDate'))
    }),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(new Date().getFullYear() + 1)
    .optional(),

  month: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional(),

  sort: Joi.string()
    .valid('startDate', 'endDate', 'status', 'createdAt')
    .default('startDate'),

  order: Joi.string()
    .valid('asc', 'desc', 'ASC', 'DESC')
    .default('desc')
});

/**
 * Schema for leave balance query
 */
const leaveBalanceQuerySchema = Joi.object({
  employeeId: Joi.string()
    .uuid()
    .optional(),

  leaveTypeId: Joi.string()
    .uuid()
    .optional(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(new Date().getFullYear() + 1)
    .default(new Date().getFullYear())
});

/**
 * Schema for updating leave balance
 */
const updateLeaveBalanceSchema = Joi.object({
  employeeId: Joi.string()
    .uuid()
    .required(),

  leaveTypeId: Joi.string()
    .uuid()
    .required(),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(new Date().getFullYear() + 1)
    .required(),

  totalAccrued: Joi.number()
    .min(0)
    .max(365)
    .optional(),

  totalTaken: Joi.number()
    .min(0)
    .max(Joi.ref('totalAccrued'))
    .optional()
    .messages({
      'number.max': 'Total taken cannot exceed total accrued'
    }),

  carryForward: Joi.number()
    .min(0)
    .max(90)
    .optional()
}).min(1);

/**
 * Schema for bulk leave approval
 */
const bulkLeaveApprovalSchema = Joi.object({
  leaveRequestIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one leave request ID is required',
      'array.max': 'Cannot process more than 50 leave requests at once'
    }),

  action: Joi.string()
    .valid('approve', 'reject')
    .required(),

  comments: Joi.string()
    .max(500)
    .when('action', {
      is: 'reject',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
});

/**
 * Schema for leave calendar query
 */
const leaveCalendarSchema = Joi.object({
  departmentId: Joi.string()
    .uuid()
    .optional(),

  startDate: Joi.date()
    .required(),

  endDate: Joi.date()
    .required()
    .min(Joi.ref('startDate'))
    .custom((value, helpers) => {
      const startDate = helpers.state.ancestors[0].startDate;
      const diffTime = Math.abs(value - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Limit calendar view to 180 days
      if (diffDays > 180) {
        return helpers.error('any.invalid', { 
          message: 'Calendar view cannot exceed 180 days' 
        });
      }
      return value;
    })
});

module.exports = {
  createLeaveRequestSchema,
  updateLeaveStatusSchema,
  leaveQuerySchema,
  leaveBalanceQuerySchema,
  updateLeaveBalanceSchema,
  bulkLeaveApprovalSchema,
  leaveCalendarSchema
};
