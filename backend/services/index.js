const BaseService = require('./BaseService');
const EmployeeService = require('./EmployeeService');
const LeaveService = require('./LeaveService');
const TimesheetService = require('./TimesheetService');
const PayrollService = require('./PayrollService');

// New service layer (Phase 2: Service Extraction)
const timesheetServices = require('./timesheet');

module.exports = {
  BaseService,
  EmployeeService,
  LeaveService,
  TimesheetService,
  PayrollService,
  // Phase 2 services
  timesheet: timesheetServices
};
