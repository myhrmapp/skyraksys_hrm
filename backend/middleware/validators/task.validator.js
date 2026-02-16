/**
 * Task Validation Schemas (Joi)
 * Migrated from deprecated middleware/validation.js
 */
const Joi = require('joi');

const taskSchema = {
  create: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(1000).optional().allow(''),
    projectId: Joi.string().uuid().required(),
    assignedTo: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).optional(),
    availableToAll: Joi.boolean().default(false),
    status: Joi.string().valid('Not Started', 'In Progress', 'Completed', 'On Hold').default('Not Started'),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').default('Medium'),
    dueDate: Joi.date().iso().optional().allow(null),
    estimatedHours: Joi.number().positive().precision(2).optional().allow(null),
    isActive: Joi.boolean().default(true)
  }),
  
  update: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    assignedTo: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).optional(),
    availableToAll: Joi.boolean().optional(),
    status: Joi.string().valid('Not Started', 'In Progress', 'Completed', 'On Hold').optional(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').optional(),
    dueDate: Joi.date().iso().optional().allow(null, ''),
    estimatedHours: Joi.number().positive().precision(2).optional(),
    actualHours: Joi.number().min(0).precision(2).optional(),
    isActive: Joi.boolean().optional()
  })
};

module.exports = { taskSchema };
