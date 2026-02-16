const LeaveService = require('../../services/LeaveService');
const db = require('../../models');
const { testDataHelpers } = require('../utils/testDataHelpers');

describe('LeaveService', () => {
  let testEmployee, testLeaveType, testLeaveRequest;

  beforeEach(async () => {
    await testDataHelpers.clearTestData();
    
    // Create test data
    testEmployee = await testDataHelpers.createTestEmployee({
      firstName: 'Test',
      lastName: 'Employee',
      email: 'test.employee@test.com'
    });

    testLeaveType = await db.LeaveType.create({
      name: 'Annual Leave',
      maxDaysPerYear: 20,
      description: 'Annual vacation leave'
    });

    // Create leave balance
    await db.LeaveBalance.create({
      employeeId: testEmployee.id,
      leaveTypeId: testLeaveType.id,
      totalAccrued: 20,
      totalTaken: 0,
      balance: 20,
      year: new Date().getFullYear()
    });
  });

  afterEach(async () => {
    await testDataHelpers.clearTestData();
  });

  describe('createLeaveRequest', () => {
    it('should create a valid leave request', async () => {
      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
        reason: 'Vacation',
        description: 'Family vacation'
      };

      const result = await LeaveService.createLeaveRequest(leaveData);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployee.id);
      expect(result.status).toBe('Pending');
      expect(result.totalDays).toBe(3); // 3 days leave
    });

    it('should reject overlapping leave requests', async () => {
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);

      // Create first leave request
      await LeaveService.createLeaveRequest({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate,
        endDate,
        reason: 'First leave'
      });

      // Try to create overlapping leave
      const overlappingData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        reason: 'Overlapping leave'
      };

      await expect(LeaveService.createLeaveRequest(overlappingData))
        .rejects.toThrow('Leave request overlaps with existing leave');
    });

    it('should reject past date leave requests', async () => {
      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        reason: 'Past leave'
      };

      await expect(LeaveService.createLeaveRequest(leaveData))
        .rejects.toThrow('Start date cannot be in the past');
    });
  });

  describe('approveLeaveRequest', () => {
    beforeEach(async () => {
      testLeaveRequest = await LeaveService.createLeaveRequest({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        reason: 'Test leave'
      });
    });

    it('should approve a pending leave request', async () => {
      const approver = await testDataHelpers.createTestEmployee({
        firstName: 'Approver',
        lastName: 'Manager',
        email: 'approver@test.com'
      });
      const approverId = approver.id; // FK references employees.id
      const comments = 'Approved for vacation';

      const result = await LeaveService.approveLeaveRequest(
        testLeaveRequest.id,
        approverId,
        comments
      );

      expect(result.status).toBe('Approved');
      expect(result.approvedBy).toBe(approverId);
      expect(result.approverComments).toBe(comments);
      expect(result.approvedAt).toBeDefined();
    });

    it('should reject non-pending leave requests', async () => {
      const approver = await testDataHelpers.createTestEmployee({
        firstName: 'Approver',
        lastName: 'Manager',
        email: 'approver2@test.com'
      });
      
      // First approve the leave
      await LeaveService.approveLeaveRequest(testLeaveRequest.id, approver.id, 'Approved');

      // Try to approve again
      await expect(LeaveService.approveLeaveRequest(testLeaveRequest.id, approver.id, 'Approved again'))
        .rejects.toThrow('Leave request is not in pending status');
    });
  });

  describe('getLeaveStats', () => {
    beforeEach(async () => {
      const currentYear = new Date().getFullYear() + 1;
      
      // Create various leave requests for the year
      await LeaveService.createLeaveRequest({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(currentYear, 0, 15), // January
        endDate: new Date(currentYear, 0, 17),
        reason: 'Leave 1'
      });

      const leave2 = await LeaveService.createLeaveRequest({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(currentYear, 1, 10), // February
        endDate: new Date(currentYear, 1, 12),
        reason: 'Leave 2'
      });

      const approver = await testDataHelpers.createTestEmployee({
        firstName: 'Approver',
        lastName: 'Manager',
        email: 'approver3@test.com'
      });

      // Approve one leave (approvedBy FK references employees.id)
      await LeaveService.approveLeaveRequest(leave2.id, approver.id, 'Approved');
    });

    it('should return correct leave statistics', async () => {
      const nextYear = new Date().getFullYear() + 1;
      const stats = await LeaveService.getLeaveStats(testEmployee.id, nextYear);

      expect(stats.total).toBe(2);
      expect(stats.approved).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.rejected).toBe(0);
      expect(stats.days.total).toBe(6); // 3 days each
      expect(stats.days.approved).toBe(3);
      expect(stats.days.pending).toBe(3);
    });
  });

  describe('validateLeaveRequest', () => {
    it('should validate correct leave request data', async () => {
      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      };

      const validation = await LeaveService.validateLeaveRequest(leaveData);

      expect(validation.isValid).toBe(true);
    });

    it('should reject invalid employee ID', async () => {
      const leaveData = {
        employeeId: '00000000-0000-0000-0000-000000000000',
        leaveTypeId: testLeaveType.id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      };

      const validation = await LeaveService.validateLeaveRequest(leaveData);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toBe('Employee not found');
    });

    it('should reject invalid date range', async () => {
      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // End before start
      };

      const validation = await LeaveService.validateLeaveRequest(leaveData);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toBe('End date must be after start date');
    });
  });
});
