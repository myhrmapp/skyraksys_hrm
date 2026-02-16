const { EmployeeService, LeaveService, TimesheetService, PayrollService } = require('../../services');

describe('Service Layer Integration', () => {
  it('should load all services correctly', () => {
    expect(EmployeeService).toBeDefined();
    expect(LeaveService).toBeDefined();
    expect(TimesheetService).toBeDefined();
    expect(PayrollService).toBeDefined();
  });

  it('should have proper service methods', () => {
    // Check EmployeeService methods
    expect(typeof EmployeeService.findAll).toBe('function');
    expect(typeof EmployeeService.findById).toBe('function');
    expect(typeof EmployeeService.create).toBe('function');
    expect(typeof EmployeeService.update).toBe('function');
    expect(typeof EmployeeService.delete).toBe('function');

    // Check LeaveService methods
    expect(typeof LeaveService.createLeaveRequest).toBe('function');
    expect(typeof LeaveService.approveLeaveRequest).toBe('function');
    expect(typeof LeaveService.validateLeaveRequest).toBe('function');

    // Check TimesheetService methods (weekly schema — createTimeEntry was replaced with inherited .create)
    expect(typeof TimesheetService.create).toBe('function');
    expect(typeof TimesheetService.submitTimesheet).toBe('function');
    expect(typeof TimesheetService.approveTimesheet).toBe('function');

    // Check PayrollService methods
    expect(typeof PayrollService.calculatePayroll).toBe('function');
    expect(typeof PayrollService.createPayroll).toBe('function');
    expect(typeof PayrollService.generatePayslip).toBe('function');
  });
});
