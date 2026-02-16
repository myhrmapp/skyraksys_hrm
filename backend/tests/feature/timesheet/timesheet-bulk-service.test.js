const db = require('../../../models');
const TimesheetBulkService = require('../../../services/timesheet/TimesheetBulkService');

describe('TimesheetBulkService', () => {
  let service;
  let testEmployee;
  let testProject;
  let testTask;
  let testTask2;

  beforeAll(async () => {
    service = new TimesheetBulkService(db);

    const timestamp = Date.now();

    testEmployee = await db.Employee.create({
      firstName: 'Test',
      lastName: 'BulkUser',
      email: `test.bulk.${timestamp}@example.com`,
      employeeId: `SKYTB${timestamp}`,
      hireDate: '2025-01-01'
    });

    testProject = await db.Project.create({
      name: 'Bulk Test Project',
      description: 'Test project for bulk service',
      status: 'Active',
      startDate: '2025-01-01'
    });

    testTask = await db.Task.create({
      name: 'Bulk Test Task 1',
      projectId: testProject.id,
      status: 'In Progress'
    });

    testTask2 = await db.Task.create({
      name: 'Bulk Test Task 2',
      projectId: testProject.id,
      status: 'In Progress'
    });
  });

  afterEach(async () => {
    await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
  });

  afterAll(async () => {
    await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
    await db.Task.destroy({ where: { id: [testTask.id, testTask2.id] }, force: true });
    await db.Project.destroy({ where: { id: testProject.id }, force: true });
    await db.Employee.destroy({ where: { id: testEmployee.id }, force: true });
    await db.sequelize.close();
  });

  describe('Bulk Create Week Timesheets', () => {
    test('should create multiple timesheet rows for a week', async () => {
      const weekStart = '2026-02-02';
      const timesheetData = [
        {
          projectId: testProject.id,
          taskId: testTask.id,
          mondayHours: 8,
          tuesdayHours: 8,
          wednesdayHours: 8
        },
        {
          projectId: testProject.id,
          taskId: testTask2.id,
          thursdayHours: 8,
          fridayHours: 8
        }
      ];

      const result = await service.bulkCreateWeekTimesheets(testEmployee.id, weekStart, timesheetData);

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(2);
      expect(result.totalHours).toBe(40);
    });

    test('should validate weekly total not exceeding 168 hours', async () => {
      const weekStart = '2026-02-02';
      const timesheetData = [
        {
          projectId: testProject.id,
          taskId: testTask.id,
          mondayHours: 24,
          tuesdayHours: 24,
          wednesdayHours: 24,
          thursdayHours: 24,
          fridayHours: 24,
          saturdayHours: 24,
          sundayHours: 24
        },
        {
          projectId: testProject.id,
          taskId: testTask2.id,
          mondayHours: 1
        }
      ];

      await expect(
        service.bulkCreateWeekTimesheets(testEmployee.id, weekStart, timesheetData)
      ).rejects.toThrow('exceeds maximum of 168 hours');
    });

    test('should detect duplicate project/task combinations in input', async () => {
      const weekStart = '2026-02-02';
      const timesheetData = [
        {
          projectId: testProject.id,
          taskId: testTask.id,
          mondayHours: 8
        },
        {
          projectId: testProject.id,
          taskId: testTask.id, // Duplicate
          tuesdayHours: 8
        }
      ];

      await expect(
        service.bulkCreateWeekTimesheets(testEmployee.id, weekStart, timesheetData)
      ).rejects.toThrow('Duplicate project/task combinations found');
    });

    test('should detect conflicts with existing timesheets', async () => {
      const weekStart = '2026-02-02';

      // Create existing timesheet
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
        status: 'Draft'
      });

      const timesheetData = [
        {
          projectId: testProject.id,
          taskId: testTask.id, // Conflicts with existing
          mondayHours: 8
        }
      ];

      await expect(
        service.bulkCreateWeekTimesheets(testEmployee.id, weekStart, timesheetData)
      ).rejects.toThrow('Timesheets already exist for');
    });

    test('should validate projects and tasks exist', async () => {
      const weekStart = '2026-02-02';
      const timesheetData = [
        {
          projectId: '00000000-0000-0000-0000-000000000000', // Non-existent
          taskId: testTask.id,
          mondayHours: 8
        }
      ];

      await expect(
        service.bulkCreateWeekTimesheets(testEmployee.id, weekStart, timesheetData)
      ).rejects.toThrow('One or more projects not found');
    });
  });

  describe('Bulk Update Week Timesheets', () => {
    test('should update multiple timesheet rows atomically', async () => {
      const weekStart = '2026-02-02';

      // Create timesheets
      const ts1 = await db.Timesheet.create({
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
        status: 'Draft'
      });

      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 7,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 7,
        status: 'Draft'
      });

      const updateData = [
        {
          id: ts1.id,
          mondayHours: 10,
          tuesdayHours: 5
        },
        {
          id: ts2.id,
          wednesdayHours: 8
        }
      ];

      const result = await service.bulkUpdateWeekTimesheets(testEmployee.id, weekStart, updateData);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });

    test('should only allow updating Draft or Rejected timesheets', async () => {
      const weekStart = '2026-02-02';

      const ts1 = await db.Timesheet.create({
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
        status: 'Approved' // Cannot update approved
      });

      const updateData = [{
        id: ts1.id,
        mondayHours: 10
      }];

      await expect(
        service.bulkUpdateWeekTimesheets(testEmployee.id, weekStart, updateData)
      ).rejects.toThrow('Cannot update');
    });

    test('should validate weekly total after updates', async () => {
      const weekStart = '2026-02-02';

      // Create first timesheet with 24 hours per day = 168 total (at limit)
      const ts1 = await db.Timesheet.create({
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

      // Create second timesheet with 0 hours
      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 0,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 0,
        status: 'Draft'
      });

      // Try to add 1 hour to second timesheet (would make 169 total)
      const updateData = [{
        id: ts2.id,
        mondayHours: 1
      }];

      await expect(
        service.bulkUpdateWeekTimesheets(testEmployee.id, weekStart, updateData)
      ).rejects.toThrow('exceeds maximum of 168 hours');
    });
  });

  describe('Bulk Delete Timesheets', () => {
    test('should delete multiple draft timesheets', async () => {
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
        status: 'Draft'
      });

      const ts2 = await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 7,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 7,
        status: 'Draft'
      });

      const result = await service.bulkDeleteTimesheets([ts1.id, ts2.id], testEmployee.id);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);

      const remaining = await db.Timesheet.findAll({
        where: { id: [ts1.id, ts2.id] }
      });
      expect(remaining.length).toBe(0);
    });

    test('should only allow deleting Draft timesheets', async () => {
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
        service.bulkDeleteTimesheets([ts1.id], testEmployee.id)
      ).rejects.toThrow('Cannot delete');
    });
  });

  describe('Copy Week Template', () => {
    test('should copy previous week timesheets as template', async () => {
      const sourceWeek = '2026-02-02';
      const targetWeek = '2026-02-09';

      // Create source timesheets
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: sourceWeek,
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
        status: 'Approved'
      });

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: sourceWeek,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 7,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 7,
        status: 'Approved'
      });

      const result = await service.copyWeekTimesheets(testEmployee.id, sourceWeek, targetWeek);

      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(2);

      // Verify hours are reset to zero
      const copied = await db.Timesheet.findAll({
        where: { employeeId: testEmployee.id, weekStartDate: targetWeek }
      });
      expect(copied.length).toBe(2);
      expect(parseFloat(copied[0].totalHoursWorked)).toBe(0);
    });

    test('should reject if target week already has timesheets', async () => {
      const sourceWeek = '2026-02-02';
      const targetWeek = '2026-02-09';

      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: sourceWeek,
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

      // Create conflicting timesheet in target week
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: targetWeek,
        weekEndDate: '2026-02-15',
        weekNumber: 7,
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
        service.copyWeekTimesheets(testEmployee.id, sourceWeek, targetWeek)
      ).rejects.toThrow('Target week already has timesheets');
    });
  });

  describe('Week Summary', () => {
    test('should get week summary for UI', async () => {
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

      const summary = await service.getWeekSummary(testEmployee.id, weekStart);

      expect(summary.weekStartDate).toBe(weekStart);
      expect(summary.timesheetCount).toBe(2);
      expect(summary.totalHours).toBe(15);
      expect(summary.statusBreakdown.Draft).toBe(1);
      expect(summary.statusBreakdown.Submitted).toBe(1);
    });
  });

  describe('Helper Methods', () => {
    test('should calculate row total correctly', () => {
      const data = {
        mondayHours: 8,
        tuesdayHours: 7.5,
        wednesdayHours: 8,
        thursdayHours: 6,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0
      };

      const total = service.calculateRowTotal(data);
      expect(total).toBe(37.5);
    });

    test('should calculate weekly total across multiple rows', () => {
      const timesheetData = [
        {
          mondayHours: 8,
          tuesdayHours: 8,
          wednesdayHours: 8,
          thursdayHours: 8,
          fridayHours: 8
        },
        {
          mondayHours: 4,
          tuesdayHours: 4,
          wednesdayHours: 4
        }
      ];

      const total = service.calculateWeeklyTotal(timesheetData);
      expect(total).toBe(52);
    });

    test('should find duplicates in array', () => {
      const timesheetData = [
        { projectId: 'proj1', taskId: 'task1' },
        { projectId: 'proj1', taskId: 'task2' },
        { projectId: 'proj1', taskId: 'task1' } // Duplicate
      ];

      const duplicates = service.findDuplicatesInArray(timesheetData);
      expect(duplicates.length).toBeGreaterThan(0);
    });
  });
});
