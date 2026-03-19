/**
 * Position Validation Schemas (Joi)
 */
const Joi = require('joi');

const positionSchema = {
  create: Joi.object({
    title: Joi.string().trim().min(2).max(100).required(),
    departmentId: Joi.string().uuid().required(),
    description: Joi.string().max(500).optional().allow('', null),
    level: Joi.string().valid('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director').optional().allow('', null),
    code: Joi.string().trim().max(20).optional().allow('', null),
    minSalary: Joi.number().min(0).optional().allow(null),
    maxSalary: Joi.number().min(0).optional().allow(null),
    requirements: Joi.string().max(2000).optional().allow('', null),
    responsibilities: Joi.string().max(2000).optional().allow('', null),
    isActive: Joi.boolean().optional()
  }),

  update: Joi.object({
    title: Joi.string().trim().min(2).max(100).optional(),
    departmentId: Joi.string().uuid().optional(),
    description: Joi.string().max(500).optional().allow('', null),
    level: Joi.string().valid('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director').optional().allow('', null),
    code: Joi.string().trim().max(20).optional().allow('', null),
    minSalary: Joi.number().min(0).optional().allow(null),
    maxSalary: Joi.number().min(0).optional().allow(null),
    requirements: Joi.string().max(2000).optional().allow('', null),
    responsibilities: Joi.string().max(2000).optional().allow('', null),
    isActive: Joi.boolean().optional()
  })
};

module.exports = { positionSchema };
