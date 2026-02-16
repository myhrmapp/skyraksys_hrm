/**
 * Simple test for EmployeeBusinessService
 * Phase 2: Service Layer Extraction
 */

const { employeeBusinessService } = require('../../../services/business');

describe('Employee Business Service - Phase 2', () => {
  test('should be defined', () => {
    expect(employeeBusinessService).toBeDefined();
    expect(typeof employeeBusinessService.createEmployee).toBe('function');
    expect(typeof employeeBusinessService.updateEmployee).toBe('function');
    expect(typeof employeeBusinessService.terminateEmployee).toBe('function');
  });

  test('should have injected data services', () => {
    expect(employeeBusinessService.employeeDataService).toBeDefined();
    expect(employeeBusinessService.userDataService).toBeDefined();
    expect(employeeBusinessService.salaryDataService).toBeDefined();
    expect(employeeBusinessService.leaveBalanceDataService).toBeDefined();
  });
});
