/**
 * Data Services Index
 * 
 * Centralized exports for all data access services.
 * Data services provide a clean interface to database operations
 * without business logic.
 * 
 * @module services/data
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-08
 */

const employeeDataService = require('./EmployeeDataService');
const userDataService = require('./UserDataService');
const salaryDataService = require('./SalaryDataService');
const leaveBalanceDataService = require('./LeaveBalanceDataService');
const leaveDataService = require('./LeaveDataService');
const timesheetDataService = require('./TimesheetDataService');
const payrollDataService = require('./PayrollDataService');

// Export singleton instances (already instantiated in each file)
module.exports = {
  employeeDataService,
  userDataService,
  salaryDataService,
  leaveBalanceDataService,
  leaveDataService,
  timesheetDataService,
  payrollDataService
};
