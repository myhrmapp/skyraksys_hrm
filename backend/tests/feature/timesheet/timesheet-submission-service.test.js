const db = require('../../../models');
const TimesheetSubmissionService = require('../../../services/timesheet/TimesheetSubmissionService');

describe('TimesheetSubmissionService', () => {
  let service;
  let testEmployee;
  let testProject;
  let testTask;
  let testTask2;

  beforeAll(async () => {
    service = new TimesheetSubmissionService(db);

    // Create test employee with unique ID
    const timestamp = Date.now();
    testEmployee = await db.Employee.create({
      firstName: 'Test',
      lastName: 'Submitter',
      email: `test.submit.${timestamp}@example.com`,
      employeeId: `SKYTS${timestamp}`,
      hireDate: '2025-01-01',
      departmentId: null,
      positionId: null
    });

    // Create test project
    testProject = await db.Project.create({
      name: 'Submission Test Project',
      description: 'Test project for submission service',
      status: 'Active',
      startDate: '2025-01-01'
    });

    // Create test task
    testTask = await db.Task.create({
      name: 'Submission Test Task',
      projectId: testProject.id,
      status: 'In Progress'
    });

    // Create second test task for multi-row tests
    testTask2 = await db.Task.create({
      name: 'Submission Test Task 2',
      projectId: testProject.id,
      status: 'In Progress'
    });
  });

  afterEach(async () => {
    // Clean up timesheets after each test
    await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
    await db.AuditLog.destroy({ where: { userId: testEmployee.id }, force: true });
  });

  afterAll(async () => {
    // Cleanup
    await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
    await db.AuditLog.destroy({ where: { userId: testEmployee.id }, force: true });
    await db.Task.destroy({ where: { id: [testTask.id, testTask2.id] }, force: true });
    await db.Project.destroy({ where: { id: testProject.id }, force: true });
    await db.Employee.destroy({ where: { id: testEmployee.id }, force: true });
    
    // Close database connections
    await db.sequelize.close();
  });

  describe('Single Timesheet Submission', () => {
    test('should submit a single draft timesheet', async () => {
      // Create draft timesheet
      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 7.5,
        wednesdayHours: 8,
        totalHoursWorked: 23.5,
        status: 'Draft'
      });

      // Mock audit logging to avoid enum constraint
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      const result = await service.submitSingleTimesheet(timesheet.id, testEmployee.id);

      expect(result.status).toBe('Submitted');
      expect(result.submittedAt).toBeTruthy();

      // Restore
      db.AuditLog.create = originalCreate;
    });
  

    test('should reject submission of already submitted timesheet', async () => {
      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.submitSingleTimesheet(timesheet.id, testEmployee.id)
      ).rejects.toThrow('Cannot submit timesheet with status: Submitted');
    });

    test('should reject submission of timesheet with zero hours', async () => {
      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        totalHoursWorked: 0,
        status: 'Draft'
      });

      await expect(
        service.submitSingleTimesheet(timesheet.id, testEmployee.id)
      ).rejects.toThrow('Cannot submit timesheet with zero hours');
    });
  });

  describe('Weekly Submission (Primary Use Case)', () => {
    test('should submit all draft timesheets for a week', async () => {
      const weekStart = '2026-02-02';

      // Mock audit logging
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      // Create multiple draft timesheets for the week
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        tuesdayHours: 8,
        totalHoursWorked: 16,
        status: 'Draft'
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
        wednesdayHours: 8,
        thursdayHours: 8,
        totalHoursWorked: 16,
        status: 'Draft'
      });

      const result = await service.submitWeekTimesheets(testEmployee.id, weekStart, testEmployee.id);

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(2);
      expect(result.totalHours).toBe(32);
      expect(result.weekStartDate).toBe(weekStart);

      // Cleanup
      db.AuditLog.create = originalCreate;
      await db.Timesheet.destroy({ where: { taskId: testTask2.id }, force: true });
      await db.Task.destroy({ where: { id: testTask2.id }, force: true });
    });

    test('should reject week submission if total exceeds 168 hours', async () => {
      const weekStart = '2026-02-02';

      // Create two timesheets that together exceed 168 hours
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 24,
        tuesdayHours: 24,
        wednesdayHours: 24,
        thursdayHours: 24,
        fridayHours: 24,
        saturdayHours: 24,
        sundayHours: 24,
        totalHoursWorked: 168,
        status: 'Draft'
      });

      const testTask2 = await db.Task.create({
        name: 'Overflow Task',
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
        mondayHours: 1,
        totalHoursWorked: 1,
        status: 'Draft'
      });

      // Mock audit log
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      await expect(
        service.submitWeekTimesheets(testEmployee.id, weekStart, testEmployee.id)
      ).rejects.toThrow('exceeds maximum of 168 hours');

      // Restore and cleanup
      db.AuditLog.create = originalCreate;
      await db.Timesheet.destroy({ where: { taskId: testTask2.id }, force: true });
      await db.Task.destroy({ where: { id: testTask2.id }, force: true });
    });

    test('should reject week submission with zero total hours', async () => {
      const weekStart = '2026-02-02';

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        totalHoursWorked: 0,
        status: 'Draft'
      });

      await expect(
        service.submitWeekTimesheets(testEmployee.id, weekStart, testEmployee.id)
      ).rejects.toThrow('Cannot submit week with zero total hours');
    });

    test('should reject if no draft timesheets found', async () => {
      await expect(
        service.submitWeekTimesheets(testEmployee.id, '2026-02-02', testEmployee.id)
      ).rejects.toThrow('No draft timesheets found for this week');
    });

    test('should use transaction for atomic submission', async () => {
      const weekStart = '2026-02-02';

      // Mock audit logging
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      // Create two draft timesheets
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Draft'
      });

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        tuesdayHours: 8,
        totalHoursWorked: 8,
        status: 'Draft'
      });

      await service.submitWeekTimesheets(testEmployee.id, weekStart, testEmployee.id);

      // Verify both are submitted
      const submitted = await db.Timesheet.findAll({
        where: { employeeId: testEmployee.id, weekStartDate: weekStart, status: 'Submitted' }
      });

      expect(submitted.length).toBe(2);

      // Restore
      db.AuditLog.create = originalCreate;
    });
  });

  describe('Multiple Timesheets Submission', () => {
    test('should submit multiple specific timesheets by ID', async () => {
      // Mock audit logging
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Draft'
      });

      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7,
        year: 2026,
        tuesdayHours: 7,
        totalHoursWorked: 7,
        status: 'Draft'
      });

      const result = await service.submitMultipleTimesheets([ts1.id, ts2.id], testEmployee.id);

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(2);

      // Restore
      db.AuditLog.create = originalCreate;
    });

    test('should reject if any timesheet is not in Draft status', async () => {
      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      await expect(
        service.submitMultipleTimesheets([ts1.id], testEmployee.id)
      ).rejects.toThrow('are not in Draft status');
    });

    test('should reject if any timesheet has zero hours', async () => {
      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        totalHoursWorked: 0,
        status: 'Draft'
      });

      await expect(
        service.submitMultipleTimesheets([ts1.id], testEmployee.id)
      ).rejects.toThrow('have zero hours');
    });
  });

  describe('Weekly Validation', () => {
    test('should validate weekly submission successfully', async () => {
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
        tuesdayHours: 8,
        totalHoursWorked: 16,
        status: 'Draft'
      });

      const validation = await service.validateWeeklySubmission(testEmployee.id, weekStart);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.totalHours).toBe(16);
    });

    test('should detect validation errors', async () => {
      const weekStart = '2026-02-02';

      // Create two timesheets that together exceed 168 hours
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 24,
        tuesdayHours: 24,
        wednesdayHours: 24,
        thursdayHours: 24,
        fridayHours: 24,
        saturdayHours: 24,
        sundayHours: 24,
        totalHoursWorked: 168,
        status: 'Draft'
      });

      const testTask2 = await db.Task.create({
        name: 'Overflow Task',
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
        mondayHours: 1,
        totalHoursWorked: 1,
        status: 'Draft'
      });

      const validation = await service.validateWeeklySubmission(testEmployee.id, weekStart);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('exceeds weekly maximum');

      // Cleanup
      await db.Timesheet.destroy({ where: { taskId: testTask2.id }, force: true });
      await db.Task.destroy({ where: { id: testTask2.id }, force: true });
    });

    test('should warn for low hours (not blocking)', async () => {
      const weekStart = '2026-02-02';

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 4,
        totalHoursWorked: 4,
        status: 'Draft'
      });

      const validation = await service.validateWeeklySubmission(testEmployee.id, weekStart);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('below typical 40-hour week');
    });
  });

  describe('Status Updates', () => {
    test('should update timesheet status with valid transition', async () => {
      // Mock audit logging
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Draft'
      });

      const updated = await service.updateTimesheetStatus(
        timesheet.id,
        'Submitted',
        testEmployee.id,
        'Ready for review'
      );

      expect(updated.status).toBe('Submitted');
      expect(updated.approverComments).toBe('Ready for review');

      // Restore
      db.AuditLog.create = originalCreate;
    });

    test('should reject invalid status transitions', async () => {
      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Approved'
      });

      await expect(
        service.updateTimesheetStatus(timesheet.id, 'Draft', testEmployee.id)
      ).rejects.toThrow('Cannot transition from Approved to Draft');
    });

    test('should allow recalling submitted timesheet to draft', async () => {
      // Mock audit logging
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      const timesheet = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Submitted'
      });

      const updated = await service.updateTimesheetStatus(
        timesheet.id,
        'Draft',
        testEmployee.id,
        'Need to make changes'
      );

      expect(updated.status).toBe('Draft');

      // Restore
      db.AuditLog.create = originalCreate;
    });
  });

  describe('Bulk Status Updates', () => {
    test('should bulk update multiple timesheets', async () => {
      // Mock audit logging
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Draft'
      });

      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7,
        year: 2026,
        tuesdayHours: 7,
        totalHoursWorked: 7,
        status: 'Draft'
      });

      const result = await service.bulkUpdateStatus(
        [ts1.id, ts2.id],
        'Submitted',
        testEmployee.id,
        'Bulk submission'
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);

      // Restore
      db.AuditLog.create = originalCreate;
    });

    test('should handle partial failures in bulk update', async () => {
      // Mock audit logging
      const originalCreate = db.AuditLog.create;
      db.AuditLog.create = jest.fn().mockResolvedValue({});

      const ts1 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 8,
        totalHoursWorked: 8,
        status: 'Draft'
      });

      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7,
        year: 2026,
        tuesdayHours: 7,
        totalHoursWorked: 7,
        status: 'Approved' // Cannot transition from Approved
      });

      const result = await service.bulkUpdateStatus(
        [ts1.id, ts2.id],
        'Submitted',
        testEmployee.id
      );

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);

      // Restore
      db.AuditLog.create = originalCreate;
    });
  });

  describe('Audit Logging', () => {
    test('should call audit logging on status changes', async () => {
      // Mock audit logging
      const mockCreate = jest.fn().mockResolvedValue({ id: 'test-audit-id' });
      const originalCreate = db.AuditLog.create;
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
        totalHoursWorked: 8,
        status: 'Draft'
      });

      await service.updateTimesheetStatus(
        timesheet.id,
        'Submitted',
        testEmployee.id,
        'Test submission'
      );

      // Verify audit log was called
      expect(mockCreate).toHaveBeenCalled();
      const auditData = mockCreate.mock.calls[0][0];
      expect(auditData.userId).toBe(testEmployee.id);
      expect(auditData.entityId).toBe(timesheet.id);
      expect(auditData.action).toBe('TIMESHEET_STATUS_CHANGE');

      // Restore
      db.AuditLog.create = originalCreate;
    });
  });

  describe('Week Submission Summary', () => {
    test('should generate week submission summary', async () => {
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
        tuesdayHours: 7,
        wednesdayHours: 8,
        totalHoursWorked: 23,
        status: 'Draft'
      });

      const summary = await service.getWeekSubmissionSummary(testEmployee.id, weekStart);

      expect(summary.weekStartDate).toBe(weekStart);
      expect(summary.totalHours).toBe(23);
      expect(summary.timesheetCount).toBe(1);
      expect(summary.dailyTotals.monday).toBe(8);
      expect(summary.dailyTotals.tuesday).toBe(7);
      expect(summary.dailyTotals.wednesday).toBe(8);
      expect(summary.canSubmit).toBe(true);
    });

    test('should calculate daily totals across multiple rows', async () => {
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
        totalHoursWorked: 8,
        status: 'Draft'
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
        mondayHours: 4,
        totalHoursWorked: 4,
        status: 'Draft'
      });

      const summary = await service.getWeekSubmissionSummary(testEmployee.id, weekStart);

      expect(summary.dailyTotals.monday).toBe(12); // 8 + 4

      // Cleanup
      await db.Timesheet.destroy({ where: { taskId: testTask2.id }, force: true });
      await db.Task.destroy({ where: { id: testTask2.id }, force: true });
    });
  });

  describe('Can Submit Check', () => {
    test('should check if week can be submitted', async () => {
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
        totalHoursWorked: 8,
        status: 'Draft'
      });

      const result = await service.canSubmitWeek(testEmployee.id, weekStart);

      expect(result.canSubmit).toBe(true);
      expect(result.reason).toBeNull();
    });

    test('should indicate why week cannot be submitted', async () => {
      const result = await service.canSubmitWeek(testEmployee.id, '2026-02-02');

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBeTruthy();
      expect(result.reason).toContain('No draft timesheets');
    });
  });
});
