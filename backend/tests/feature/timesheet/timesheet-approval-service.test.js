const db = require('../../../models');
const TimesheetApprovalService = require('../../../services/timesheet/TimesheetApprovalService');

describe('TimesheetApprovalService', () => {
  let service;
  let testEmployee;
  let testManager;
  let testAdmin;
  let testProject;
  let testTask;

  beforeAll(async () => {
    service = new TimesheetApprovalService(db);

    const timestamp = Date.now();

    // Create test manager
    testManager = await db.Employee.create({
      firstName: 'Manager',
      lastName: 'User',
      email: `test.manager.${timestamp}@example.com`,
      employeeId: `SKYTM${timestamp}`,
      hireDate: '2025-01-01'
    });

    // Create manager's user account
    const managerUser = await db.User.create({
      username: `manager${timestamp}`,
      email: `test.manager.${timestamp}@example.com`,
      password: 'hashedpassword',
      role: 'manager',
      employeeId: testManager.id,
      firstName: 'Manager',
      lastName: 'User'
    });

    // Link employee to user
    await testManager.update({ userId: managerUser.id });

    // Create test admin
    testAdmin = await db.Employee.create({
      firstName: 'Admin',
      lastName: 'User',
      email: `test.admin.${timestamp}@example.com`,
      employeeId: `SKYTA${timestamp}`,
      hireDate: '2025-01-01'
    });

    const adminUser = await db.User.create({
      username: `admin${timestamp}`,
      email: `test.admin.${timestamp}@example.com`,
      password: 'hashedpassword',
      role: 'admin',
      employeeId: testAdmin.id,
      firstName: 'Admin',
      lastName: 'User'
    });

    // Link employee to user
    await testAdmin.update({ userId: adminUser.id });

    // Create test employee (reports to manager)
    testEmployee = await db.Employee.create({
      firstName: 'Test',
      lastName: 'Employee',
      email: `test.approval.${timestamp}@example.com`,
      employeeId: `SKYTE${timestamp}`,
      hireDate: '2025-01-01',
      managerId: testManager.id
    });

    const employeeUser = await db.User.create({
      username: `employee${timestamp}`,
      email: `test.approval.${timestamp}@example.com`,
      password: 'hashedpassword',
      role: 'employee',
      employeeId: testEmployee.id,
      firstName: 'Test',
      lastName: 'Employee'
    });

    // Link employee to user
    await testEmployee.update({ userId: employeeUser.id });

    testProject = await db.Project.create({
      name: 'Approval Test Project',
      description: 'Test project for approval service',
      status: 'Active',
      startDate: '2025-01-01'
    });

    testTask = await db.Task.create({
      name: 'Approval Test Task',
      projectId: testProject.id,
      status: 'In Progress'
    });
  });

  afterEach(async () => {
    await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
  });

  afterAll(async () => {
    // Clean up in correct order to respect FK constraints
    try {
      await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
      await db.Task.destroy({ where: { id: testTask.id }, force: true });
      await db.Project.destroy({ where: { id: testProject.id }, force: true });
      
      // Delete employees (CASCADE will handle user deletion)
      await db.Employee.destroy({ where: { id: [testEmployee.id, testManager.id, testAdmin.id] }, force: true });
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
    await db.sequelize.close();
  });

  describe('Single Approval', () => {
    test('should approve a single submitted timesheet', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const result = await service.approveSingleTimesheet(timesheet.id, testManager.id, 'Looks good');

      expect(result.status).toBe('Approved');
      expect(result.approvedBy).toBe(testManager.id);
      expect(result.approverComments).toBe('Looks good');
      expect(result.approvedAt).toBeTruthy();
    });

    test('should reject non-submitted timesheet approval', async () => {
      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Draft'
      });

      await expect(
        service.approveSingleTimesheet(timesheet.id, testManager.id)
      ).rejects.toThrow('Cannot approve timesheet with status: Draft');
    });
  });

  describe('Single Rejection', () => {
    test('should reject a submitted timesheet with reason', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const result = await service.rejectSingleTimesheet(timesheet.id, testManager.id, 'Incorrect hours');

      expect(result.status).toBe('Rejected');
      expect(result.approvedBy).toBe(testManager.id);
      expect(result.approverComments).toBe('Incorrect hours');
    });

    test('should require rejection reason', async () => {
      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.rejectSingleTimesheet(timesheet.id, testManager.id, '')
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('Weekly Approval (Primary Use Case)', () => {
    test('should approve all submitted timesheets for a week', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const weekStart = '2026-02-02';

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const testTask2 = await db.Task.create({
        name: 'Second Task',
        projectId: testProject.id,
        status: 'In Progress'
      });

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const result = await service.approveWeekTimesheets(testEmployee.id, weekStart, testManager.id, 'Week approved');

      expect(result.success).toBe(true);
      expect(result.approvedCount).toBe(2);

      await db.Timesheet.destroy({ where: { taskId: testTask2.id }, force: true });
      await db.Task.destroy({ where: { id: testTask2.id }, force: true });
    });

    test('should reject if no submitted timesheets found', async () => {
      await expect(
        service.approveWeekTimesheets(testEmployee.id, '2026-02-02', testManager.id)
      ).rejects.toThrow('No submitted timesheets found for this week');
    });
  });

  describe('Weekly Rejection', () => {
    test('should reject all submitted timesheets for a week', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const weekStart = '2026-02-02';

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const result = await service.rejectWeekTimesheets(testEmployee.id, weekStart, testManager.id, 'Need revisions');

      expect(result.success).toBe(true);
      expect(result.rejectedCount).toBe(1);
    });

    test('should require rejection reason for week', async () => {
      const weekStart = '2026-02-02';

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.rejectWeekTimesheets(testEmployee.id, weekStart, testManager.id, '')
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('Bulk Approval', () => {
    test('should bulk approve multiple timesheets', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7,
        year: 2026,
        mondayHours: 7,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 7,
        status: 'Submitted'
      });

      const result = await service.bulkApproveTimesheets([ts1.id, ts2.id], testManager.id, 'Bulk approval');

      expect(result.success).toBe(true);
      expect(result.approvedCount).toBe(2);
    });

    test('should handle partial failures in bulk approval', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7,
        year: 2026,
        mondayHours: 7,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 7,
        status: 'Draft' // Cannot approve Draft
      });

      const result = await service.bulkApproveTimesheets([ts1.id, ts2.id], testManager.id);

      expect(result.approvedCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  describe('Bulk Rejection', () => {
    test('should bulk reject multiple timesheets', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const result = await service.bulkRejectTimesheets([ts1.id], testManager.id, 'Bulk rejection');

      expect(result.success).toBe(true);
      expect(result.rejectedCount).toBe(1);
    });

    test('should require rejection reason for bulk', async () => {
      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.bulkRejectTimesheets([ts1.id], testManager.id, '')
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('Permission Checks', () => {
    test('should allow manager to approve their team member timesheets', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.approveSingleTimesheet(timesheet.id, testManager.id)
      ).resolves.toBeTruthy();
    });

    test('should allow admin to approve any timesheet', async () => {
      const mockCreate = jest.fn().mockResolvedValue({});
      db.AuditLog.create = mockCreate;

      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.approveSingleTimesheet(timesheet.id, testAdmin.id)
      ).resolves.toBeTruthy();
    });

    test('should prevent employee from approving their own timesheet', async () => {
      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.approveSingleTimesheet(timesheet.id, testEmployee.id)
      ).rejects.toThrow('Cannot approve your own timesheet');
    });
  });

  describe('Manager Queries', () => {
    test('should get pending timesheets for manager', async () => {
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const pending = await service.getPendingTimesheetsForManager(testManager.id);

      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].status).toBe('Submitted');
      expect(pending[0].employeeId).toBe(testEmployee.id);
    });

    test('should get pending timesheets grouped by week', async () => {
      const weekStart = '2026-02-02';

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const grouped = await service.getPendingTimesheetsGroupedByWeek(testManager.id);

      expect(grouped.length).toBeGreaterThan(0);
      expect(grouped[0].timesheets.length).toBeGreaterThan(0);
    });
  });

  describe('Approval Statistics', () => {
    test('should get approval statistics for manager', async () => {
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const stats = await service.getApprovalStatistics(testManager.id);

      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.total).toBeGreaterThanOrEqual(1);
    });

    test('should filter statistics by date range', async () => {
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const stats = await service.getApprovalStatistics(testManager.id, '2026-02-01', '2026-02-28');

      expect(stats).toBeTruthy();
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });
});
