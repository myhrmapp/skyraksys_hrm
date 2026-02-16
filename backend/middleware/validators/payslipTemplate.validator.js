/**
 * Payslip Template Validation Schemas (Joi)
 * Replaces express-validator usage in payslipTemplateRoutes.js
 */
const Joi = require('joi');

const uuidParam = Joi.object({
  id: Joi.string().uuid().required()
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().allow('').optional(),
  isActive: Joi.boolean().optional()
});

const createTemplate = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().max(500).allow('', null).optional(),
  headerFields: Joi.array().optional(),
  earningsFields: Joi.array().optional(),
  deductionsFields: Joi.array().optional(),
  footerFields: Joi.array().optional(),
  styling: Joi.object().optional(),
  isActive: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional()
});

const updateTemplate = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().max(500).allow('', null).optional(),
  headerFields: Joi.array().optional(),
  earningsFields: Joi.array().optional(),
  deductionsFields: Joi.array().optional(),
  footerFields: Joi.array().optional(),
  styling: Joi.object().optional(),
  isActive: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional()
});

const duplicateTemplate = Joi.object({
  name: Joi.string().trim().min(3).max(100).required()
});

module.exports = {
  uuidParam,
  listQuery,
  createTemplate,
  updateTemplate,
  duplicateTemplate
};
