/**
 * Holiday Validation Schemas (Joi)
 */
const Joi = require('joi');

const holidaySchema = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    date: Joi.date().iso().required(),
    type: Joi.string().valid('public', 'company', 'optional', 'religious').default('public'),
    isRecurring: Joi.boolean().default(false),
    description: Joi.string().max(500).optional().allow('', null)
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    date: Joi.date().iso().optional(),
    type: Joi.string().valid('public', 'company', 'optional', 'religious').optional(),
    isRecurring: Joi.boolean().optional(),
    description: Joi.string().max(500).optional().allow('', null),
    isActive: Joi.boolean().optional()
  }),

  bulkCreate: Joi.object({
    holidays: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        date: Joi.date().iso().required(),
        type: Joi.string().valid('public', 'company', 'optional', 'religious').default('public'),
        isRecurring: Joi.boolean().default(false),
        description: Joi.string().max(500).optional().allow('', null)
      })
    ).min(1).max(100).required()
  }),

  query: Joi.object({
    year: Joi.number().integer().min(2000).max(2100).optional(),
    type: Joi.string().valid('public', 'company', 'optional', 'religious').optional(),
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().positive().max(100).default(20),
    includeInactive: Joi.boolean().optional()
  })
};

module.exports = { holidaySchema };
