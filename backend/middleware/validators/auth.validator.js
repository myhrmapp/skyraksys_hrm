/**
 * Authentication Validation Schemas
 * 
 * Joi schemas for validating authentication and user-related requests
 */

const Joi = require('joi');

/**
 * Schema for user login
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

/**
 * Schema for user registration
 */
const registerSchema = Joi.object({
  employeeId: Joi.string()
    .required()
    .pattern(/^SKYT\d{3,}$/)
    .messages({
      'string.pattern.base': 'Employee ID must start with SKYT followed by at least 3 digits'
    }),

  username: Joi.string()
    .required()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 30 characters'
    }),

  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  password: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters'
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('password'))
    .messages({
      'any.only': 'Passwords do not match'
    }),

  role: Joi.string()
    .valid('admin', 'hr', 'manager', 'employee')
    .default('employee')
});

/**
 * Schema for admin-initiated user registration (simplified)
 * Used when admin creates user accounts
 */
const adminRegisterSchema = Joi.object({
  firstName: Joi.string()
    .optional()
    .min(2)
    .max(50),

  lastName: Joi.string()
    .optional()
    .min(2)
    .max(50),

  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required'
    }),

  role: Joi.string()
    .optional()
    .valid('admin', 'hr', 'manager', 'employee')
    .default('employee')
    .messages({
      'any.only': 'Role must be one of: admin, hr, manager, employee'
    })
});

/**
 * Schema for password change
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.invalid': 'New password must be different from current password'
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.only': 'Passwords do not match'
    })
});

/**
 * Schema for password reset request
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

/**
 * Schema for password reset (admin/HR resetting user password)
 */
const adminResetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  forceChange: Joi.boolean()
    .optional()
    .default(true)
});

/**
 * Schema for password reset (user with reset token)
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),

  newPassword: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),

  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.only': 'Passwords do not match'
    })
});

/**
 * Schema for updating user profile
 */
const updateProfileSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .optional(),

  email: Joi.string()
    .email()
    .lowercase()
    .optional(),

  phone: Joi.string()
    .pattern(/^\d{10}$/)
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
}).min(1);

/**
 * Schema for updating user role (admin only)
 */
const updateRoleSchema = Joi.object({
  role: Joi.string()
    .valid('admin', 'hr', 'manager', 'employee')
    .required()
    .messages({
      'any.only': 'Role must be one of: admin, hr, manager, employee',
      'any.required': 'Role is required'
    })
});

/**
 * Schema for user activation/deactivation
 */
const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'any.required': 'isActive field is required'
    })
});

/**
 * Schema for admin account update (email and/or role)
 */
const adminUpdateAccountSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  role: Joi.string()
    .valid('admin', 'hr', 'manager', 'employee')
    .optional()
    .messages({
      'any.only': 'Role must be one of: admin, hr, manager, employee'
    })
}).min(1).messages({
  'object.min': 'At least one field (email or role) must be provided'
});

/**
 * Schema for locking/unlocking user account (admin only)
 */
const adminLockSchema = Joi.object({
  isLocked: Joi.boolean()
    .required()
    .messages({
      'any.required': 'isLocked field is required'
    })
});

/**
 * Schema for refresh token
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .optional()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

/**
 * Schema for validating userId parameter
 */
const userIdParamSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
});

/**
 * Schema for validating employeeId parameter
 */
const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid employee ID format',
      'any.required': 'Employee ID is required'
    })
});

/**
 * Schema for creating user account for existing employee
 */
const createEmployeeUserSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .min(8)
    .max(128)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required'
    }),

  role: Joi.string()
    .valid('admin', 'hr', 'manager', 'employee')
    .default('employee')
});

module.exports = {
  loginSchema,
  registerSchema,
  adminRegisterSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  adminResetPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updateRoleSchema,
  updateUserStatusSchema,
  adminUpdateAccountSchema,
  adminLockSchema,
  refreshTokenSchema,
  createEmployeeUserSchema,
  userIdParamSchema,
  employeeIdParamSchema
};
