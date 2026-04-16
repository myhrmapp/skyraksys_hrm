/**
 * Attendance Validation Schemas (Joi)
 */
const Joi = require('joi');

const attendanceSchema = {
  checkIn: Joi.object({
    date: Joi.date().iso().optional().allow(null),
    checkIn: Joi.date().iso().optional().allow(null),
    location: Joi.string().max(200).optional().allow('', null),
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  checkOut: Joi.object({
    date: Joi.date().iso().optional().allow(null),
    checkOut: Joi.date().iso().optional().allow(null),
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  mark: Joi.object({
    employeeId: Joi.string().uuid().required(),
    date: Joi.date().iso().required(),
    status: Joi.string().valid('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday', 'weekend').required(),
    checkIn: Joi.date().iso().optional().allow(null),
    checkOut: Joi.date().iso().optional().allow(null),
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  query: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    departmentId: Joi.string().uuid().optional(),
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().positive().max(100).default(10)
  }),

  update: Joi.object({
    date: Joi.date().iso().optional(),
    status: Joi.string().valid('present', 'absent', 'late', 'half-day', 'on-leave', 'holiday', 'weekend').optional(),
    checkIn: Joi.date().iso().optional().allow(null),
    checkOut: Joi.date().iso().optional().allow(null),
    notes: Joi.string().max(500).optional().allow('', null)
  }),

  monthlyReport: Joi.object({
    year: Joi.number().integer().min(2000).max(2100).required(),
    month: Joi.number().integer().min(1).max(12).required()
  })
};

module.exports = { attendanceSchema };
