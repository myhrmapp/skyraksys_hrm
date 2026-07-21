const Joi = require('joi');

const lineItemSchema = Joi.object({
  employeeId: Joi.string().uuid().optional().allow('', null),
  employeeName: Joi.string().trim().max(150).optional().allow('', null),
  employmentType: Joi.string().valid('permanent', 'contractor').required(),
  hoursSupported: Joi.number().min(0).required(),
  hourlyRate: Joi.number().min(0).required(),
  description: Joi.string().trim().max(500).optional().allow('', null)
});

const templateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().max(500).optional().allow('', null),
  currency: Joi.string().trim().max(10).default('INR'),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  templateData: Joi.object({
    title: Joi.string().trim().max(120).optional(),
    termsAndConditions: Joi.string().trim().max(2000).optional().allow('', null),
    footerNote: Joi.string().trim().max(2000).optional().allow('', null)
  }).unknown(true).optional()
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  description: Joi.string().trim().max(500).optional().allow('', null),
  currency: Joi.string().trim().max(10).optional(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  templateData: Joi.object({
    title: Joi.string().trim().max(120).optional(),
    termsAndConditions: Joi.string().trim().max(2000).optional().allow('', null),
    footerNote: Joi.string().trim().max(2000).optional().allow('', null)
  }).unknown(true).optional()
});

const createInvoiceSchema = Joi.object({
  clientCompany: Joi.string().trim().min(2).max(200).required(),
  clientGstin: Joi.string().trim().max(20).optional().allow('', null),
  clientAddress: Joi.string().trim().max(500).optional().allow('', null),
  billingMonth: Joi.number().integer().min(1).max(12).required(),
  billingYear: Joi.number().integer().min(2000).max(2100).required(),
  issueDate: Joi.date().iso().required(),
  dueDate: Joi.date().iso().required(),
  currency: Joi.string().trim().max(10).default('INR'),
  workerType: Joi.string().valid('permanent', 'contractor', 'mixed').default('mixed'),
  templateId: Joi.string().uuid().optional().allow('', null),
  taxPercent: Joi.number().min(0).max(100).default(18),
  notes: Joi.string().trim().max(5000).optional().allow('', null),
  lineItems: Joi.array().items(lineItemSchema).min(1).required()
});

const updateInvoiceSchema = Joi.object({
  clientCompany: Joi.string().trim().min(2).max(200).optional(),
  clientGstin: Joi.string().trim().max(20).optional().allow('', null),
  clientAddress: Joi.string().trim().max(500).optional().allow('', null),
  billingMonth: Joi.number().integer().min(1).max(12).optional(),
  billingYear: Joi.number().integer().min(2000).max(2100).optional(),
  issueDate: Joi.date().iso().optional(),
  dueDate: Joi.date().iso().optional(),
  currency: Joi.string().trim().max(10).optional(),
  workerType: Joi.string().valid('permanent', 'contractor', 'mixed').optional(),
  status: Joi.string().valid('draft', 'sent', 'paid', 'cancelled').optional(),
  templateId: Joi.string().uuid().optional().allow('', null),
  taxPercent: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().trim().max(5000).optional().allow('', null),
  lineItems: Joi.array().items(lineItemSchema).min(1).optional()
});

module.exports = {
  invoiceSchema: {
    createTemplate: templateSchema,
    updateTemplate: updateTemplateSchema,
    createInvoice: createInvoiceSchema,
    updateInvoice: updateInvoiceSchema
  }
};
