/**
 * Business Services Index
 * 
 * Instantiates all business services with their dependencies.
 * This file manages dependency injection for business services.
 * 
 * @module services/business
 * @author SkyrakSys Development Team
 * @version 1.0.0
 * @created 2026-02-07 (Phase 2)
 */

// Import Business Service Classes
const EmployeeBusinessService = require('./EmployeeBusinessService');
const LeaveBusinessService = require('./LeaveBusinessService');
const TimesheetBusinessService = require('./TimesheetBusinessService');
const PayrollBusinessService = require('./PayrollBusinessService');

// Import Data Services
const employeeDataService = require('../data/EmployeeDataService');
const userDataService = require('../data/UserDataService');
const salaryDataService = require('../data/SalaryDataService');
const leaveBalanceDataService = require('../data/LeaveBalanceDataService');
const leaveDataService = require('../data/LeaveDataService');
const timesheetDataService = require('../data/TimesheetDataService');
const payrollDataService = require('../data/PayrollDataService');

// Instantiate Business Services with Dependencies
const employeeBusinessService = new EmployeeBusinessService(
  employeeDataService,
  userDataService,
  salaryDataService,
  leaveBalanceDataService
);

const leaveBusinessService = new LeaveBusinessService(
  leaveDataService,
  leaveBalanceDataService,
  employeeDataService
);

const timesheetBusinessService = new TimesheetBusinessService(
  timesheetDataService,
  employeeDataService
);

const payrollBusinessService = new PayrollBusinessService(
  payrollDataService,
  employeeDataService
);

// Export Business Services and Data Services
module.exports = {
  // Business Services
  employeeBusinessService,
  leaveBusinessService,
  timesheetBusinessService,
  payrollBusinessService,
  
  // Data Services (for read-only operations in controllers)
  timesheetDataService
};
