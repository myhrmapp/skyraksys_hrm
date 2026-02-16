/**
 * Settings Validation Schemas (Joi)
 */
const Joi = require('joi');

const settingsSchema = {
  updatePayslipTemplate: Joi.object({
    companyName: Joi.string().trim().min(2).max(200).optional(),
    companyAddress: Joi.string().max(500).optional().allow('', null),
    footerText: Joi.string().max(1000).optional().allow('', null)
  }).min(1)
};

module.exports = { settingsSchema };
