/**
 * Validator Index
 * 
 * Central export point for all validation schemas
 */

const authValidators = require('./auth.validator');
const employeeValidators = require('./employee.validator');
const timesheetValidators = require('./timesheet.validator');
const leaveValidators = require('./leave.validator');
const payrollValidators = require('./payroll.validator');
const { attendanceSchema } = require('./attendance.validator');
const { departmentSchema } = require('./department.validator');
const { positionSchema } = require('./position.validator');
const { holidaySchema } = require('./holiday.validator');
const { employeeReviewSchema } = require('./employeeReview.validator');
const { settingsSchema } = require('./settings.validator');

module.exports = {
  // Authentication validators
  ...authValidators,
  
  // Employee validators
  ...employeeValidators,
  
  // Timesheet validators
  ...timesheetValidators,
  
  // Leave validators
  ...leaveValidators,
  
  // Payroll validators
  ...payrollValidators,

  // Additional validators
  attendanceSchema,
  departmentSchema,
  positionSchema,
  holidaySchema,
  employeeReviewSchema,
  settingsSchema
};
