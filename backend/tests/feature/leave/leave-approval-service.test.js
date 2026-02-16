const db = require('../../../models');
const { LeaveApprovalService } = require('../../../services/leave');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../../utils/errors');

describe('LeaveApprovalService', () => {
  let leaveApprovalService;
  let testDepartment;
  let testLeaveType;
  let testAdmin;
  let testManager;
  let testEmployee;
  let testOtherEmployee;

  beforeAll(async () => {
    // Clean up any leftover data from previous test runs
    await db.LeaveRequest.destroy({ where: {}, force: true });
    await db.LeaveBalance.destroy({ where: {}, force: true });
    
    leaveApprovalService = new LeaveApprovalService(db);

    const timestamp = Date.now();

    // Create test department
    testDepartment = await db.Department.create({
      name: `Test Department ${timestamp}`,
      isActive: true
    });

    // Create test leave type
    testLeaveType = await db.LeaveType.create({
      name: `Test Leave ${timestamp}`,
      description: 'Test leave type',
      maxDaysPerYear: 20,
      carryForward: false,
      isActive: true
    });

    // Create test admin
    testAdmin = await db.Employee.create({
      employeeId: `SKYTE${timestamp}`,
      firstName: 'Test',
      lastName: 'Admin',
      email: `admin${timestamp}@test.com`,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      departmentId: testDepartment.id
    });

    // Create test manager
    testManager = await db.Employee.create({
      employeeId: `SKYTE${timestamp + 1}`,
      firstName: 'Test',
      lastName: 'Manager',
      email: `manager${timestamp}@test.com`,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      departmentId: testDepartment.id
    });

    // Create test employee (reports to manager)
    testEmployee = await db.Employee.create({
      employeeId: `SKYTE${timestamp + 2}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `employee${timestamp}@test.com`,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      departmentId: testDepartment.id,
      managerId: testManager.id
    });

    // Create another employee (not in manager's team)
    testOtherEmployee = await db.Employee.create({
      employeeId: `SKYTE${timestamp + 3}`,
      firstName: 'Other',
      lastName: 'Employee',
      email: `other${timestamp}@test.com`,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      departmentId: testDepartment.id
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation
    try {
      await db.LeaveRequest.destroy({ where: {}, force: true });
      await db.LeaveBalance.destroy({ where: {}, force: true });
      await db.Employee.destroy({ where: { id: [testAdmin.id, testManager.id, testEmployee.id, testOtherEmployee.id] }, force: true });
      await db.LeaveType.destroy({ where: { id: testLeaveType.id }, force: true });
      await db.Department.destroy({ where: { id: testDepartment.id }, force: true });
      
      // Force cleanup any orphaned balances
      await db.sequelize.query('DELETE FROM leave_balances WHERE TRUE', { type: db.sequelize.QueryTypes.DELETE });
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }

    await db.sequelize.close();
  });

  describe('checkApprovalPermission', () => {
    let testLeaveRequest;

    beforeEach(async () => {
      // Create a leave request for permission tests
      testLeaveRequest = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-10-01',
        endDate: '2024-10-05',
        totalDays: 5,
        reason: 'Permission test',
        status: 'Pending'
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: testLeaveRequest.id }, force: true });
    });

    test('should allow admin to approve any leave request', async () => {
      await expect(
        leaveApprovalService.checkApprovalPermission(testLeaveRequest, testAdmin.id, 'admin')
      ).resolves.not.toThrow();
    });

    test('should allow HR to approve any leave request', async () => {
      await expect(
        leaveApprovalService.checkApprovalPermission(testLeaveRequest, testAdmin.id, 'hr')
      ).resolves.not.toThrow();
    });

    test('should allow manager to approve team member leave', async () => {
      await expect(
        leaveApprovalService.checkApprovalPermission(testLeaveRequest, testManager.id, 'manager')
      ).resolves.not.toThrow();
    });

    test('should reject manager approving non-team member leave', async () => {
      const otherLeave = await db.LeaveRequest.create({
        employeeId: testOtherEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-10-01',
        endDate: '2024-10-05',
        totalDays: 5,
        reason: 'Other employee leave',
        status: 'Pending'
      });

      await expect(
        leaveApprovalService.checkApprovalPermission(otherLeave, testManager.id, 'manager')
      ).rejects.toThrow(ForbiddenError);

      await db.LeaveRequest.destroy({ where: { id: otherLeave.id }, force: true });
    });

    test('should reject employee role from approving', async () => {
      await expect(
        leaveApprovalService.checkApprovalPermission(testLeaveRequest, testOtherEmployee.id, 'employee')
      ).rejects.toThrow(ForbiddenError);
    });

    test('should reject self-approval', async () => {
      await expect(
        leaveApprovalService.checkApprovalPermission(testLeaveRequest, testEmployee.id, 'manager')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('approveLeaveRequest', () => {
    let testLeaveRequest;
    let leaveBalance;

    beforeEach(async () => {
      // Clean up any existing balances for this employee/leavetype/year
      await db.LeaveBalance.destroy({
        where: {
          employeeId: testEmployee.id,
          leaveTypeId: testLeaveType.id,
          year: 2024
        },
        force: true
      });

      // Create fresh leave balance
      leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2024,
        totalAccrued: 20,
        totalTaken: 0,
        totalPending: 5,
        balance: 15
      });

      // Create pending leave request
      testLeaveRequest = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-11-01',
        endDate: '2024-11-05',
        totalDays: 5,
        reason: 'Approval test',
        status: 'Pending'
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: testLeaveRequest.id }, force: true });
      await db.LeaveBalance.destroy({ where: { id: leaveBalance.id }, force: true });
    });

    test('should approve leave request and update balance', async () => {
      const result = await leaveApprovalService.approveLeaveRequest(
        testLeaveRequest.id,
        testAdmin.id,
        'admin',
        'Approved for vacation'
      );

      expect(result.status).toBe('Approved');
      expect(result.approvedBy).toBe(testAdmin.id);
      expect(result.approverComments).toBe('Approved for vacation');
      expect(result.approvedAt).toBeDefined();

      // Check balance updated
      await leaveBalance.reload();
      expect(parseFloat(leaveBalance.totalPending)).toBe(0);
      expect(parseFloat(leaveBalance.totalTaken)).toBe(5);
      expect(parseFloat(leaveBalance.balance)).toBe(15);
    });

    test('should reject approval without permission', async () => {
      await expect(
        leaveApprovalService.approveLeaveRequest(
          testLeaveRequest.id,
          testOtherEmployee.id,
          'employee'
        )
      ).rejects.toThrow(ForbiddenError);
    });

    test('should reject approval of already approved leave', async () => {
      // First approval
      await leaveApprovalService.approveLeaveRequest(
        testLeaveRequest.id,
        testAdmin.id,
        'admin'
      );

      // Try to approve again
      await expect(
        leaveApprovalService.approveLeaveRequest(
          testLeaveRequest.id,
          testAdmin.id,
          'admin'
        )
      ).rejects.toThrow(BadRequestError);
    });

    test('should reject approval of non-existent leave', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        leaveApprovalService.approveLeaveRequest(fakeId, testAdmin.id, 'admin')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('rejectLeaveRequest', () => {
    let testLeaveRequest;
    let leaveBalance;

    beforeEach(async () => {
      // Use year 2023 to avoid conflicts with other test suites
      // Clean up any existing balances for this employee/leavetype/year
      await db.LeaveBalance.destroy({
        where: {
          employeeId: testEmployee.id,
          leaveTypeId: testLeaveType.id,
          year: 2023
        },
        force: true
      });

      // Create fresh leave balance
      leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2023,
        totalAccrued: 20,
        totalTaken: 0,
        totalPending: 5,
        balance: 15
      });

      // Create pending leave request
      testLeaveRequest = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2023-12-01',
        endDate: '2023-12-05',
        totalDays: 5,
        reason: 'Rejection test',
        status: 'Pending'
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: testLeaveRequest.id }, force: true });
      await db.LeaveBalance.destroy({ where: { id: leaveBalance.id }, force: true });
    });

    test('should reject leave request and restore balance', async () => {
      // Reload to get current state
      await leaveBalance.reload();
      const initialBalance = parseFloat(leaveBalance.balance);
      const initialPending = parseFloat(leaveBalance.totalPending);
      const requestDays = parseFloat(testLeaveRequest.totalDays);

      const result = await leaveApprovalService.rejectLeaveRequest(
        testLeaveRequest.id,
        testAdmin.id,
        'admin',
        'Not enough staff coverage'
      );

      expect(result.status).toBe('Rejected');
      expect(result.approvedBy).toBe(testAdmin.id);
      expect(result.approverComments).toBe('Not enough staff coverage');
      expect(result.rejectedAt).toBeDefined();

      // Check balance restored
      await leaveBalance.reload();
      expect(parseFloat(leaveBalance.totalPending)).toBe(initialPending - requestDays);
      expect(parseFloat(leaveBalance.balance)).toBe(initialBalance + requestDays);
    });

    test('should require comments when rejecting', async () => {
      await expect(
        leaveApprovalService.rejectLeaveRequest(
          testLeaveRequest.id,
          testAdmin.id,
          'admin',
          '' // Empty comments
        )
      ).rejects.toThrow(BadRequestError);
    });

    test('should reject rejection without permission', async () => {
      await expect(
        leaveApprovalService.rejectLeaveRequest(
          testLeaveRequest.id,
          testOtherEmployee.id,
          'employee',
          'No permission'
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('approveCancellationRequest', () => {
    let originalLeaveRequest;
    let cancellationRequest;
    let leaveBalance;

    beforeEach(async () => {
      // Clean up any existing balances for this employee/leavetype/year
      await db.LeaveBalance.destroy({
        where: {
          employeeId: testEmployee.id,
          leaveTypeId: testLeaveType.id,
          year: 2025
        },
        force: true
      });

      // Create fresh leave balance
      leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2025,
        totalAccrued: 20,
        totalTaken: 5,
        totalPending: 0,
        balance: 15
      });

      // Create approved leave request
      originalLeaveRequest = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2025-01-10',
        endDate: '2025-01-14',
        totalDays: 5,
        reason: 'Original leave',
        status: 'Approved',
        approvedBy: testAdmin.id,
        approvedAt: new Date()
      });

      // Create cancellation request
      cancellationRequest = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2025-01-10',
        endDate: '2025-01-14',
        totalDays: 5,
        reason: 'Cancellation',
        status: 'Pending',
        isCancellation: true,
        originalLeaveRequestId: originalLeaveRequest.id,
        cancellationNote: 'Emergency - cannot take leave'
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: [originalLeaveRequest.id, cancellationRequest.id] }, force: true });
      await db.LeaveBalance.destroy({ where: { id: leaveBalance.id }, force: true });
    });

    test('should approve cancellation and restore balance', async () => {
      // Reload to get current state
      await leaveBalance.reload();
      const initialTaken = parseFloat(leaveBalance.totalTaken);
      const initialBalance = parseFloat(leaveBalance.balance);
      const requestDays = parseFloat(originalLeaveRequest.totalDays);
      
      const result = await leaveApprovalService.approveLeaveRequest(
        cancellationRequest.id,
        testAdmin.id,
        'admin',
        'Cancellation approved'
      );

      // Check cancellation is approved
      expect(result.status).toBe('Approved');

      // Check original leave is cancelled
      await originalLeaveRequest.reload();
      expect(originalLeaveRequest.status).toBe('Cancelled');

      // Check balance restored
      await leaveBalance.reload();
      expect(parseFloat(leaveBalance.totalTaken)).toBe(initialTaken - requestDays);
      expect(parseFloat(leaveBalance.balance)).toBe(initialBalance + requestDays);
    });

    test('should reject cancellation and keep original leave active', async () => {
      const result = await leaveApprovalService.rejectLeaveRequest(
        cancellationRequest.id,
        testAdmin.id,
        'admin',
        'Cannot cancel at this time'
      );

      // Check cancellation is rejected
      expect(result.status).toBe('Rejected');

      // Check original leave unchanged
      await originalLeaveRequest.reload();
      expect(originalLeaveRequest.status).toBe('Approved');

      // Check balance unchanged
      await leaveBalance.reload();
      expect(parseFloat(leaveBalance.totalTaken)).toBe(5);
    });
  });

  describe('getPendingLeaveRequestsForManager', () => {
    let pendingLeave1;
    let pendingLeave2;
    let approvedLeave;

    beforeEach(async () => {
      // Create pending leaves for team member
      pendingLeave1 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-08-01',
        endDate: '2024-08-05',
        totalDays: 5,
        reason: 'Pending 1',
        status: 'Pending'
      });

      pendingLeave2 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-08-10',
        endDate: '2024-08-15',
        totalDays: 5,
        reason: 'Pending 2',
        status: 'Pending'
      });

      // Create approved leave (should not appear)
      approvedLeave = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-07-01',
        endDate: '2024-07-05',
        totalDays: 5,
        reason: 'Already approved',
        status: 'Approved',
        approvedBy: testManager.id,
        approvedAt: new Date()
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: [pendingLeave1.id, pendingLeave2.id, approvedLeave.id] }, force: true });
    });

    test('should return pending leaves for manager team', async () => {
      const result = await leaveApprovalService.getPendingLeaveRequestsForManager(testManager.id, 'manager');

      expect(result.length).toBeGreaterThanOrEqual(2);
      const pendingIds = result.map(req => req.id);
      expect(pendingIds).toContain(pendingLeave1.id);
      expect(pendingIds).toContain(pendingLeave2.id);
      expect(pendingIds).not.toContain(approvedLeave.id);
    });

    test('should return empty for manager with no team', async () => {
      const managerNoTeam = await db.Employee.create({
        employeeId: `SKYTE${Date.now()}`,
        firstName: 'Solo',
        lastName: 'Manager',
        email: `solo${Date.now()}@test.com`,
        dateOfJoining: new Date(),
        hireDate: new Date(),
        departmentId: testDepartment.id
      });

      const result = await leaveApprovalService.getPendingLeaveRequestsForManager(managerNoTeam.id, 'manager');

      expect(result.length).toBe(0);

      await db.Employee.destroy({ where: { id: managerNoTeam.id }, force: true });
    });

    test('should return empty for non-manager (employee has no team)', async () => {
      const result = await leaveApprovalService.getPendingLeaveRequestsForManager(testEmployee.id, 'employee');
      
      // Employee has no team members, returns empty
      expect(result.length).toBe(0);
    });
  });

  describe('getAllPendingLeaveRequests', () => {
    let pendingLeave;

    beforeEach(async () => {
      pendingLeave = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-09-01',
        endDate: '2024-09-05',
        totalDays: 5,
        reason: 'All pending test',
        status: 'Pending'
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: pendingLeave.id }, force: true });
    });

    test('should return all pending requests for admin', async () => {
      const result = await leaveApprovalService.getAllPendingLeaveRequests(testAdmin.id, 'admin');

      expect(result.length).toBeGreaterThanOrEqual(1);
      const pendingIds = result.map(req => req.id);
      expect(pendingIds).toContain(pendingLeave.id);
    });

    test('should return team pending requests for manager', async () => {
      const result = await leaveApprovalService.getAllPendingLeaveRequests(testManager.id, 'manager');

      expect(result.length).toBeGreaterThanOrEqual(1);
      const pendingIds = result.map(req => req.id);
      expect(pendingIds).toContain(pendingLeave.id);
    });

    test('should return all pending requests for employee (no filtering)', async () => {
      const result = await leaveApprovalService.getAllPendingLeaveRequests(testEmployee.id, 'employee');
      
      // Employee role doesn't have special filtering, returns all pending
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getRecentApprovals', () => {
    let recentApproval;

    beforeEach(async () => {
      recentApproval = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        totalDays: 5,
        reason: 'Recent approval test',
        status: 'Approved',
        approvedBy: testManager.id,
        approvedAt: new Date()
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: recentApproval.id }, force: true });
    });

    test('should return recent approvals for manager', async () => {
      const result = await leaveApprovalService.getRecentApprovals(testManager.id, 'manager', 10);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const approvalIds = result.map(req => req.id);
      expect(approvalIds).toContain(recentApproval.id);
    });

    test('should limit results', async () => {
      const result = await leaveApprovalService.getRecentApprovals(testManager.id, 'manager', 1);

      expect(result.length).toBeLessThanOrEqual(1);
    });

    test('should return empty for employee (no approval permissions)', async () => {
      const result = await leaveApprovalService.getRecentApprovals(testEmployee.id, 'employee', 10);
      
      // Employee hasn't approved any leaves, returns empty
      expect(result.length).toBe(0);
    });
  });

  describe('getApprovalStatistics', () => {
    let stat1, stat2, stat3;

    beforeEach(async () => {
      stat1 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-05-01',
        endDate: '2024-05-05',
        totalDays: 5,
        reason: 'Stat pending',
        status: 'Pending'
      });

      stat2 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-05-10',
        endDate: '2024-05-15',
        totalDays: 5,
        reason: 'Stat approved',
        status: 'Approved',
        approvedBy: testManager.id,
        approvedAt: new Date()
      });

      stat3 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-05-20',
        endDate: '2024-05-25',
        totalDays: 5,
        reason: 'Stat rejected',
        status: 'Rejected',
        approvedBy: testManager.id,
        rejectedAt: new Date(),
        approverComments: 'Test rejection'
      });
    });

    afterEach(async () => {
      await db.LeaveRequest.destroy({ where: { id: [stat1.id, stat2.id, stat3.id] }, force: true });
    });

    test('should return statistics for manager', async () => {
      const result = await leaveApprovalService.getApprovalStatistics(testManager.id, 'manager');

      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('approved');
      expect(result).toHaveProperty('rejected');
      expect(result.pending).toBeGreaterThanOrEqual(1);
      expect(result.approved).toBeGreaterThanOrEqual(1);
      expect(result.rejected).toBeGreaterThanOrEqual(1);
    });

    test('should return all statistics for admin', async () => {
      const result = await leaveApprovalService.getApprovalStatistics(testAdmin.id, 'admin');

      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('approved');
      expect(result).toHaveProperty('rejected');
      expect(result.pending).toBeGreaterThanOrEqual(1);
    });

    test('should return statistics for employee (no filtering)', async () => {
      const result = await leaveApprovalService.getApprovalStatistics(testEmployee.id, 'employee');
      
      // Returns all statistics (no role-based filtering in this method)
      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('approved');
      expect(result).toHaveProperty('rejected');
    });
  });
});
