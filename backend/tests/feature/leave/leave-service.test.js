const db = require('../../../models');
const LeaveService = require('../../../services/leave/LeaveService');
const { 
  NotFoundError, 
  ConflictError, 
  BadRequestError, 
  ForbiddenError 
} = require('../../../utils/errors');

describe('LeaveService', () => {
  let leaveService;
  let testEmployee, testLeaveType, testManager, testDepartment;
  const timestamp = Date.now();

  beforeAll(async () => {
    leaveService = new LeaveService(db);

    // Create test department
    testDepartment = await db.Department.create({
      name: `Test Department ${timestamp}`,
      description: 'Test department for leave service tests'
    });

    // Create test leave type
    testLeaveType = await db.LeaveType.create({
      name: `Test Leave ${timestamp}`,
      maxDaysPerYear: 20,
      isActive: true,
      allowCarryForward: false
    });

    // Create test manager
    testManager = await db.Employee.create({
      employeeId: `SKYTE${timestamp}`,
      firstName: 'Test',
      lastName: 'Manager',
      email: `manager${timestamp}@test.com`,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      departmentId: testDepartment.id
    });

    // Create test employee
    testEmployee = await db.Employee.create({
      employeeId: `SKYTE${timestamp + 1}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `employee${timestamp}@test.com`,
      dateOfJoining: new Date(),
      hireDate: new Date(),
      departmentId: testDepartment.id,
      managerId: testManager.id
    });
  });

  afterAll(async () => {
    // Clean up
    try {
      await db.LeaveRequest.destroy({ where: { employeeId: testEmployee.id }, force: true });
      await db.LeaveBalance.destroy({ where: { employeeId: testEmployee.id }, force: true });
      await db.Employee.destroy({ where: { id: [testEmployee.id, testManager.id] }, force: true });
      await db.LeaveType.destroy({ where: { id: testLeaveType.id }, force: true });
      await db.Department.destroy({ where: { id: testDepartment.id }, force: true });
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
    await db.sequelize.close();
  });

  describe('calculateWorkingDays', () => {
    test('should calculate working days excluding weekends', async () => {
      // Monday to Friday = 5 days
      const result = await leaveService.calculateWorkingDays('2024-01-01', '2024-01-05');
      expect(result).toBe(5);
    });

    test('should exclude weekends', async () => {
      // Monday to Sunday = 5 working days (excludes Sat & Sun)
      const result = await leaveService.calculateWorkingDays('2024-01-01', '2024-01-07');
      expect(result).toBe(5);
    });

    test('should handle single day', async () => {
      const result = await leaveService.calculateWorkingDays('2024-01-01', '2024-01-01');
      expect(result).toBe(1);
    });
  });

  describe('getOrCreateLeaveBalance', () => {
    test('should create leave balance if not exists', async () => {
      const transaction = await db.sequelize.transaction();
      try {
        const year = new Date().getFullYear();
        const balance = await leaveService.getOrCreateLeaveBalance(
          testEmployee.id,
          testLeaveType.id,
          year,
          transaction
        );

        expect(balance).toBeDefined();
        expect(balance.employeeId).toBe(testEmployee.id);
        expect(balance.leaveTypeId).toBe(testLeaveType.id);
        expect(balance.year).toBe(year);
        expect(parseFloat(balance.totalAccrued)).toBe(20);
        expect(parseFloat(balance.balance)).toBe(20);

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });

    test('should return existing leave balance', async () => {
      const transaction = await db.sequelize.transaction();
      try {
        const year = new Date().getFullYear();
        const balance1 = await leaveService.getOrCreateLeaveBalance(
          testEmployee.id,
          testLeaveType.id,
          year,
          transaction
        );

        const balance2 = await leaveService.getOrCreateLeaveBalance(
          testEmployee.id,
          testLeaveType.id,
          year,
          transaction
        );

        expect(balance1.id).toBe(balance2.id);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });

    test('should throw error for invalid leave type', async () => {
      const transaction = await db.sequelize.transaction();
      try {
        await expect(
          leaveService.getOrCreateLeaveBalance(
            testEmployee.id,
            '00000000-0000-0000-0000-000000000000',
            2024,
            transaction
          )
        ).rejects.toThrow(BadRequestError);
        await transaction.rollback();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  });

  describe('checkOverlappingLeave', () => {
    test('should detect overlapping leave requests', async () => {
      // Create a pending leave
      const leave1 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        totalDays: 5,
        reason: 'Vacation',
        status: 'Pending',
        isCancellation: false
      });

      // Check for overlap
      const overlap = await leaveService.checkOverlappingLeave(
        testEmployee.id,
        '2024-06-03',
        '2024-06-07',
        null
      );

      expect(overlap).toBeDefined();
      expect(overlap.id).toBe(leave1.id);

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: leave1.id }, force: true });
    });

    test('should not detect overlap with excluded ID', async () => {
      const leave1 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-07-01',
        endDate: '2024-07-05',
        totalDays: 5,
        reason: 'Vacation',
        status: 'Pending',
        isCancellation: false
      });

      const overlap = await leaveService.checkOverlappingLeave(
        testEmployee.id,
        '2024-07-03',
        '2024-07-07',
        leave1.id // Exclude this leave
      );

      expect(overlap).toBeNull();

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: leave1.id }, force: true });
    });
  });

  describe('validateLeaveType', () => {
    test('should validate active leave type', async () => {
      const leaveType = await leaveService.validateLeaveType(testLeaveType.id);
      expect(leaveType).toBeDefined();
      expect(leaveType.id).toBe(testLeaveType.id);
    });

    test('should throw error for invalid leave type', async () => {
      await expect(
        leaveService.validateLeaveType('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('createLeaveRequest', () => {
    test('should create a valid leave request with balance deduction', async () => {
      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-08-05', // Monday
        endDate: '2024-08-09',   // Friday (5 working days)
        reason: 'Vacation',
        isHalfDay: false
      };

      const result = await leaveService.createLeaveRequest(leaveData);

      expect(result.leaveRequest).toBeDefined();
      expect(result.leaveRequest.employeeId).toBe(testEmployee.id);
      expect(parseFloat(result.leaveRequest.totalDays)).toBe(5);
      expect(result.leaveRequest.status).toBe('Pending');

      expect(result.leaveBalance).toBeDefined();
      expect(parseFloat(result.leaveBalance.balance)).toBe(15); // 20 - 5

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: result.leaveRequest.id }, force: true });
    });

    test('should create half-day leave request', async () => {
      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-09-02', // Monday
        endDate: '2024-09-02',
        reason: 'Personal',
        isHalfDay: true,
        halfDayType: 'First Half'
      };

      const result = await leaveService.createLeaveRequest(leaveData);

      expect(parseFloat(result.leaveRequest.totalDays)).toBe(0.5);
      expect(result.leaveRequest.isHalfDay).toBe(true);
      expect(result.leaveRequest.halfDayType).toBe('First Half');

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: result.leaveRequest.id }, force: true });
    });

    test('should reject overlapping leave request', async () => {
      const leave1 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-10-01',
        endDate: '2024-10-05',
        totalDays: 5,
        reason: 'Vacation',
        status: 'Pending',
        isCancellation: false
      });

      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-10-03',
        endDate: '2024-10-07',
        reason: 'Overlap test',
        isHalfDay: false
      };

      await expect(
        leaveService.createLeaveRequest(leaveData)
      ).rejects.toThrow(ConflictError);

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: leave1.id }, force: true });
    });

    test('should reject leave request with insufficient balance', async () => {
      const leaveData = {
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-11-01',
        endDate: '2024-11-30', // 30 days (more than available balance)
        reason: 'Too many days',
        isHalfDay: false
      };

      await expect(
        leaveService.createLeaveRequest(leaveData)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('createCancellationRequest', () => {
    test('should create cancellation request for pending leave', async () => {
      // Create original leave
      const originalLeave = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2024-12-01',
        endDate: '2024-12-05',
        totalDays: 5,
        reason: 'Vacation',
        status: 'Pending',
        isCancellation: false
      });

      const cancellationData = {
        employeeId: testEmployee.id,
        originalLeaveRequestId: originalLeave.id,
        cancellationNote: 'Plans changed'
      };

      const cancellationRequest = await leaveService.createCancellationRequest(cancellationData);

      expect(cancellationRequest).toBeDefined();
      expect(cancellationRequest.isCancellation).toBe(true);
      expect(cancellationRequest.originalLeaveRequestId).toBe(originalLeave.id);
      expect(cancellationRequest.status).toBe('Pending');

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: [originalLeave.id, cancellationRequest.id] }, force: true });
    });

    test('should reject cancellation for non-existent leave', async () => {
      const cancellationData = {
        employeeId: testEmployee.id,
        originalLeaveRequestId: '00000000-0000-0000-0000-000000000000',
        cancellationNote: 'Invalid'
      };

      await expect(
        leaveService.createCancellationRequest(cancellationData)
      ).rejects.toThrow(NotFoundError);
    });

    test('should reject duplicate cancellation request', async () => {
      // Create original leave
      const originalLeave = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2025-01-01',
        endDate: '2025-01-05',
        totalDays: 5,
        reason: 'Vacation',
        status: 'Pending',
        isCancellation: false
      });

      // Create first cancellation
      const cancellation1 = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2025-01-01',
        endDate: '2025-01-05',
        totalDays: 5,
        reason: 'Cancellation',
        status: 'Pending',
        isCancellation: true,
        originalLeaveRequestId: originalLeave.id
      });

      const cancellationData = {
        employeeId: testEmployee.id,
        originalLeaveRequestId: originalLeave.id,
        cancellationNote: 'Duplicate'
      };

      await expect(
        leaveService.createCancellationRequest(cancellationData)
      ).rejects.toThrow(ConflictError);

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: [originalLeave.id, cancellation1.id] }, force: true });
    });
  });

  describe('getLeaveRequests', () => {
    test('should return leave requests for employee role', async () => {
      const result = await leaveService.getLeaveRequests(
        { page: 1, limit: 10 },
        testEmployee.id,
        'employee'
      );

      expect(result).toBeDefined();
      expect(result.rows).toBeInstanceOf(Array);
      // All results should belong to test employee
      result.rows.forEach(leave => {
        expect(leave.employeeId).toBe(testEmployee.id);
      });
    });

    test('should return team requests for manager role', async () => {
      const result = await leaveService.getLeaveRequests(
        { page: 1, limit: 10 },
        testManager.id,
        'manager'
      );

      expect(result).toBeDefined();
      expect(result.rows).toBeInstanceOf(Array);
    });

    test('should return all requests for admin role', async () => {
      const result = await leaveService.getLeaveRequests(
        { page: 1, limit: 10 },
        testManager.id,
        'admin'
      );

      expect(result).toBeDefined();
      expect(result.rows).toBeInstanceOf(Array);
    });
  });

  describe('getLeaveBalance', () => {
    test('should return leave balance for employee', async () => {
      const balances = await leaveService.getLeaveBalance(testEmployee.id);

      expect(balances).toBeInstanceOf(Array);
      if (balances.length > 0) {
        expect(balances[0]).toHaveProperty('balance');
        expect(balances[0]).toHaveProperty('totalAccrued');
      }
    });
  });

  describe('deleteLeaveRequest', () => {
    test('should delete pending leave request and restore balance', async () => {
      const leave = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        totalDays: 5,
        reason: 'To be deleted',
        status: 'Pending',
        isCancellation: false
      });

      await leaveService.deleteLeaveRequest(leave.id, testEmployee.id, 'employee');

      const deleted = await db.LeaveRequest.findByPk(leave.id);
      expect(deleted).toBeNull();
    });

    test('should prevent deletion of approved leave', async () => {
      const leave = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2025-03-01',
        endDate: '2025-03-05',
        totalDays: 5,
        reason: 'Approved',
        status: 'Approved',
        isCancellation: false
      });

      await expect(
        leaveService.deleteLeaveRequest(leave.id, testEmployee.id, 'employee')
      ).rejects.toThrow(BadRequestError);

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: leave.id }, force: true });
    });

    test('should prevent deletion of other employee leave', async () => {
      const leave = await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2025-04-01',
        endDate: '2025-04-05',
        totalDays: 5,
        reason: 'Not mine',
        status: 'Pending',
        isCancellation: false
      });

      await expect(
        leaveService.deleteLeaveRequest(leave.id, testManager.id, 'employee')
      ).rejects.toThrow(ForbiddenError);

      // Cleanup
      await db.LeaveRequest.destroy({ where: { id: leave.id }, force: true });
    });
  });

  describe('getActiveLeaveTypes', () => {
    test('should return active leave types', async () => {
      const leaveTypes = await leaveService.getActiveLeaveTypes();

      expect(leaveTypes).toBeInstanceOf(Array);
      expect(leaveTypes.length).toBeGreaterThan(0);
      leaveTypes.forEach(type => {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('maxDaysPerYear');
      });
    });
  });
});
