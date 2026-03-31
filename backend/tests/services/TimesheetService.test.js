/**
 * TimesheetService Integration Tests (Weekly Schema)
 *
 * Tests the weekly timesheet service with real DB operations.
 * Rewritten Feb 2026 — Uses weekly schema (mondayHours–sundayHours)
 * instead of removed daily createTimeEntry/validateTimeEntry API.
 */
const TimesheetService = require('../../services/TimesheetService');
const db = require('../../models');
const { testDataHelpers } = require('../utils/testDataHelpers');

describe('TimesheetService', () => {
  let testEmployee, testProject, testTask;

  beforeEach(async () => {
    await testDataHelpers.clearTestData();

    testEmployee = await testDataHelpers.createTestEmployee({
      firstName: 'Test',
      lastName: 'Employee',
      email: 'test.employee@test.com'
    });

    testProject = await db.Project.create({
      name: 'Test Project',
      description: 'A test project',
      status: 'Active'
    });

    testTask = await db.Task.create({
      projectId: testProject.id,
      name: 'Test Task',
      description: 'A test task',
      status: 'In Progress'
    });
  });

  afterEach(async () => {
    await testDataHelpers.clearTestData();
  });

  // Helper: create a standard weekly timesheet via inherited create()
  async function createWeeklyTimesheet(overrides = {}) {
    return TimesheetService.create({
      employeeId: testEmployee.id,
      projectId: testProject.id,
      taskId: testTask.id,
      weekStartDate: '2026-02-02', // Monday
      weekEndDate: '2026-02-08',   // Sunday
      weekNumber: 6,
      year: 2026,
      mondayHours: 8,
      tuesdayHours: 8,
      wednesdayHours: 8,
      thursdayHours: 8,
      fridayHours: 8,
      saturdayHours: 0,
      sundayHours: 0,
      totalHoursWorked: 40,
      description: 'Standard work week',
      status: 'Draft',
      ...overrides
    });
  }

  // -------------------------------------------------------------------
  // create (inherited from BaseService)
  // -------------------------------------------------------------------
  describe('create (weekly timesheet)', () => {
    it('should create a valid weekly timesheet', async () => {
      const result = await createWeeklyTimesheet();

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.employeeId).toBe(testEmployee.id);
      expect(result.projectId).toBe(testProject.id);
      expect(result.taskId).toBe(testTask.id);
      expect(Number(result.totalHoursWorked)).toBe(40);
      expect(result.status).toBe('Draft');
    });

    it('should default status to Draft', async () => {
      const result = await TimesheetService.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7,
        year: 2026,
        mondayHours: 4,
        totalHoursWorked: 4
      });

      expect(result.status).toBe('Draft');
    });
  });

  // -------------------------------------------------------------------
  // submitTimesheet
  // -------------------------------------------------------------------
  describe('submitTimesheet', () => {
    it('should submit draft timesheets for a given week', async () => {
      await createWeeklyTimesheet();

      // Feb 2 2026 is a Monday — use ISO string to avoid UTC offset shifting the date
      const weekStart = new Date('2026-02-02');
      const result = await TimesheetService.submitTimesheet(testEmployee.id, weekStart);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach(entry => {
        expect(entry.status).toBe('Submitted');
        expect(entry.submittedAt).toBeDefined();
      });
    });

    it('should throw error when no entries found for the week', async () => {
      const futureMonday = new Date(2026, 5, 1); // June 1 — no data
      await expect(
        TimesheetService.submitTimesheet(testEmployee.id, futureMonday)
      ).rejects.toThrow('No time entries found for the specified week');
    });
  });

  // -------------------------------------------------------------------
  // approveTimesheet
  // -------------------------------------------------------------------
  describe('approveTimesheet', () => {
    let submittedTs, approver;

    beforeEach(async () => {
      const ts = await createWeeklyTimesheet();
      await ts.update({ status: 'Submitted', submittedAt: new Date() });
      submittedTs = ts;

      approver = await testDataHelpers.createTestEmployee({
        firstName: 'Approver',
        lastName: 'Manager',
        email: 'approver@test.com'
      });
    });

    it('should approve submitted timesheets', async () => {
      const result = await TimesheetService.approveTimesheet(
        [submittedTs.id],
        approver.id,
        'Looks good'
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Approved');
      expect(result[0].approvedBy).toBe(approver.id);
      expect(result[0].approverComments).toBe('Looks good');
    });

    it('should reject approval of non-submitted timesheet', async () => {
      const draft = await createWeeklyTimesheet({
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7
      });

      await expect(
        TimesheetService.approveTimesheet([draft.id], approver.id, 'Try')
      ).rejects.toThrow(/not in submitted status/);
    });
  });

  // -------------------------------------------------------------------
  // rejectTimesheet
  // -------------------------------------------------------------------
  describe('rejectTimesheet', () => {
    let submittedTs, approver;

    beforeEach(async () => {
      const ts = await createWeeklyTimesheet();
      await ts.update({ status: 'Submitted', submittedAt: new Date() });
      submittedTs = ts;

      approver = await testDataHelpers.createTestEmployee({
        firstName: 'Reviewer',
        lastName: 'Manager',
        email: 'reviewer@test.com'
      });
    });

    it('should reject submitted timesheets with comments', async () => {
      const result = await TimesheetService.rejectTimesheet(
        [submittedTs.id],
        approver.id,
        'Please correct Wednesday hours'
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Rejected');
      expect(result[0].approverComments).toBe('Please correct Wednesday hours');
    });
  });

  // -------------------------------------------------------------------
  // updateTimeEntry
  // -------------------------------------------------------------------
  describe('updateTimeEntry', () => {
    it('should update a Draft timesheet', async () => {
      const ts = await createWeeklyTimesheet();
      const updated = await TimesheetService.updateTimeEntry(ts.id, {
        mondayHours: 10,
        totalHoursWorked: 42
      });

      expect(Number(updated.mondayHours)).toBe(10);
      expect(Number(updated.totalHoursWorked)).toBe(42);
    });

    it('should throw error when updating an Approved timesheet', async () => {
      const ts = await createWeeklyTimesheet();
      await ts.update({ status: 'Approved' });

      await expect(
        TimesheetService.updateTimeEntry(ts.id, { mondayHours: 10 })
      ).rejects.toThrow('Cannot update approved time entry');
    });

    it('should block data changes on Submitted timesheets', async () => {
      const ts = await createWeeklyTimesheet();
      await ts.update({ status: 'Submitted', submittedAt: new Date() });

      await expect(
        TimesheetService.updateTimeEntry(ts.id, { mondayHours: 10 })
      ).rejects.toThrow(/Cannot update submitted time entry/);
    });
  });

  // -------------------------------------------------------------------
  // findByEmployee / findByProject
  // -------------------------------------------------------------------
  describe('findByEmployee', () => {
    it('should return all timesheets for an employee', async () => {
      await createWeeklyTimesheet();
      await createWeeklyTimesheet({
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7
      });

      const results = await TimesheetService.findByEmployee(testEmployee.id);
      expect(results.data).toBeDefined();
      expect(Array.isArray(results.data)).toBe(true);
      expect(results.data.length).toBe(2);
      results.data.forEach(ts => expect(ts.employeeId).toBe(testEmployee.id));
    });
  });

  describe('findByProject', () => {
    it('should return all timesheets for a project', async () => {
      await createWeeklyTimesheet();
      const results = await TimesheetService.findByProject(testProject.id);
      expect(results.data).toBeDefined();
      expect(Array.isArray(results.data)).toBe(true);
      expect(results.data.length).toBe(1);
      expect(results.data[0].projectId).toBe(testProject.id);
    });
  });

  // -------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------
  describe('delete', () => {
    it('should delete a timesheet', async () => {
      const ts = await createWeeklyTimesheet();
      await TimesheetService.delete(ts.id);
      const found = await db.Timesheet.findByPk(ts.id);
      expect(found).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // getTimesheetSummary
  // -------------------------------------------------------------------
  describe('getTimesheetSummary', () => {
    it('should return correct summary for date range', async () => {
      await createWeeklyTimesheet(); // week of 2026-02-02

      // Wide range that fully contains the week
      const summary = await TimesheetService.getTimesheetSummary(
        testEmployee.id,
        new Date(2026, 0, 1),  // Jan 1
        new Date(2026, 2, 31)  // Mar 31
      );

      expect(summary).toBeDefined();
      expect(summary.totalHours).toBe(40);
      expect(summary.totalDays).toBe(5); // Mon-Fri with 8h each
      expect(summary.status.draft).toBe(1);
      expect(summary.projects['Test Project']).toBeDefined();
      expect(summary.projects['Test Project'].hours).toBe(40);
    });
  });

  // -------------------------------------------------------------------
  // getProjectTimeReport
  // -------------------------------------------------------------------
  describe('getProjectTimeReport', () => {
    it('should aggregate hours across employees', async () => {
      await createWeeklyTimesheet(); // Employee 1: 40h

      const employee2 = await testDataHelpers.createTestEmployee({
        firstName: 'Second',
        lastName: 'Employee',
        email: 'second.employee@test.com'
      });

      await TimesheetService.create({
        employeeId: employee2.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: '2026-02-02',
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 6,
        tuesdayHours: 6,
        wednesdayHours: 6,
        thursdayHours: 6,
        fridayHours: 6,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 30,
        status: 'Draft'
      });

      // Wide date range
      const report = await TimesheetService.getProjectTimeReport(
        testProject.id,
        new Date(2026, 0, 1),
        new Date(2026, 2, 31)
      );

      expect(report).toBeDefined();
      expect(report.totalHours).toBe(70); // 40 + 30
      expect(Object.keys(report.employees)).toHaveLength(2);
      expect(report.employees['Test Employee'].hours).toBe(40);
      expect(report.employees['Second Employee'].hours).toBe(30);
      expect(report.tasks['Test Task'].hours).toBe(70);
    });
  });

  // -------------------------------------------------------------------
  // Utility (pure) methods
  // -------------------------------------------------------------------
  describe('utility methods', () => {
    it('getWeekStart should return Monday for any date', () => {
      const wednesday = new Date(2026, 1, 4); // Feb 4 = Wed
      const weekStart = TimesheetService.getWeekStart(wednesday);
      expect(weekStart.getDay()).toBe(1); // Monday
    });

    it('getWeekNumber should return a valid week number', () => {
      const date = new Date(2026, 1, 2); // Feb 2
      const weekNum = TimesheetService.getWeekNumber(date);
      expect(weekNum).toBeGreaterThanOrEqual(5);
      expect(weekNum).toBeLessThanOrEqual(7);
    });

    it('getDayColumnName should map day of week to column', () => {
      expect(TimesheetService.getDayColumnName(new Date(2026, 1, 2))).toBe('mondayHours');
      expect(TimesheetService.getDayColumnName(new Date(2026, 1, 6))).toBe('fridayHours');
      expect(TimesheetService.getDayColumnName(new Date(2026, 1, 8))).toBe('sundayHours');
    });
  });
});
