/**
 * Department Validation Schemas (Joi)
 */
const Joi = require('joi');

const departmentSchema = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().max(500).optional().allow('', null),
    managerId: Joi.string().uuid().optional().allow(null)
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().max(500).optional().allow('', null),
    managerId: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.allow(null)
    ).optional()
  })
};

module.exports = { departmentSchema };
