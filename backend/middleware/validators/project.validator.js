/**
 * Project Validation Schemas (Joi)
 * Migrated from deprecated middleware/validation.js
 */
const Joi = require('joi');

const projectSchema = {
  create: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    code: Joi.string().max(50).optional().allow(''),
    description: Joi.string().max(1000).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(null),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().allow(null),
    status: Joi.string().valid('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled').default('Planning'),
    clientName: Joi.string().max(100).optional().allow(''),
    budget: Joi.number().positive().optional().allow(null),
    managerId: Joi.string().uuid().optional().allow(null),
    isActive: Joi.boolean().default(true)
  }),
  
  update: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    code: Joi.string().max(50).optional().allow('', null),
    description: Joi.string().max(1000).optional().allow('', null),
    startDate: Joi.date().iso().optional().allow(null, ''),
    endDate: Joi.date().iso().optional().allow(null, ''),
    status: Joi.string().valid('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled').optional(),
    clientName: Joi.string().max(100).optional().allow('', null),
    budget: Joi.number().positive().optional().allow(null),
    managerId: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).optional(),
    isActive: Joi.boolean().optional()
  })
};

module.exports = { projectSchema };
