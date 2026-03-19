/**
 * Employee Review Validation Schemas (Joi)
 */
const Joi = require('joi');

const ratingField = Joi.number().min(1).max(5);

const employeeReviewSchema = {
  create: Joi.object({
    employeeId: Joi.string().uuid().required(),
    reviewerId: Joi.string().uuid().optional().allow(null),
    reviewPeriod: Joi.string().trim().min(2).max(50).required(),
    reviewType: Joi.string().valid('quarterly', 'annual', 'probationary', 'performance_improvement').default('quarterly'),
    overallRating: ratingField.optional().allow(null),
    technicalSkills: ratingField.optional().allow(null),
    communication: ratingField.optional().allow(null),
    teamwork: ratingField.optional().allow(null),
    leadership: ratingField.optional().allow(null),
    punctuality: ratingField.optional().allow(null),
    achievements: Joi.string().max(2000).optional().allow('', null),
    areasForImprovement: Joi.string().max(2000).optional().allow('', null),
    goals: Joi.string().max(2000).optional().allow('', null),
    reviewerComments: Joi.string().max(2000).optional().allow('', null),
    reviewDate: Joi.date().iso().optional().allow(null),
    nextReviewDate: Joi.date().iso().optional().allow(null),
    status: Joi.string().valid('draft', 'pending_employee_input', 'pending_approval', 'completed', 'archived').optional()
  }),  

  update: Joi.object({
    reviewerId: Joi.string().uuid().optional().allow(null),
    reviewPeriod: Joi.string().trim().min(2).max(50).optional(),
    reviewType: Joi.string().valid('quarterly', 'annual', 'probationary', 'performance_improvement').optional(),
    overallRating: ratingField.optional().allow(null),
    technicalSkills: ratingField.optional().allow(null),
    communication: ratingField.optional().allow(null),
    teamwork: ratingField.optional().allow(null),
    leadership: ratingField.optional().allow(null),
    punctuality: ratingField.optional().allow(null),
    achievements: Joi.string().max(2000).optional().allow('', null),
    areasForImprovement: Joi.string().max(2000).optional().allow('', null),
    goals: Joi.string().max(2000).optional().allow('', null),
    reviewerComments: Joi.string().max(2000).optional().allow('', null),
    reviewDate: Joi.date().iso().optional().allow(null),
    nextReviewDate: Joi.date().iso().optional().allow(null),
    status: Joi.string().valid('draft', 'pending_employee_input', 'pending_approval', 'completed', 'archived').optional()
  }).min(1),

  updateStatus: Joi.object({
    status: Joi.string().valid('draft', 'pending_employee_input', 'pending_approval', 'completed', 'archived').required(),
    hrApproved: Joi.boolean().optional(),
    reason: Joi.string().max(500).optional().allow('', null)
  })
};

module.exports = { employeeReviewSchema };
