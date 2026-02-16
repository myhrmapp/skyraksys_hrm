/**
 * Position Validation Schemas (Joi)
 */
const Joi = require('joi');

const positionSchema = {
  create: Joi.object({
    title: Joi.string().trim().min(2).max(100).required(),
    departmentId: Joi.string().uuid().required(),
    description: Joi.string().max(500).optional().allow('', null),
    level: Joi.string().valid('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Executive').optional().allow('', null)
  }),

  update: Joi.object({
    title: Joi.string().trim().min(2).max(100).optional(),
    departmentId: Joi.string().uuid().optional(),
    description: Joi.string().max(500).optional().allow('', null),
    level: Joi.string().valid('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Executive').optional().allow('', null)
  })
};

module.exports = { positionSchema };
