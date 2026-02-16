/**
 * TimesheetCalculationService Tests
 * 
 * Tests for timesheet calculation, validation, and business logic.
 * Covers: week calculations, hour validations, aggregations, leave integration, status logic, duplicates.
 */

const { timesheet } = require('../../../services');
const { TimesheetCalculationService } = timesheet;
const db = require('../../../models');
const moment = require('moment');

describe('TimesheetCalculationService', () => {
  let service;
  let testEmployee;
  let testProject;
  let testTask;
  let testTask2;
  let testTask3;
  let testLeaveType;

  beforeAll(async () => {
    // Initialize service
    service = new TimesheetCalculationService(db);

    // Create test employee
    const timestamp = Date.now();
    testEmployee = await db.Employee.create({
      firstName: 'Test',
      lastName: 'User',
      email: `test.timesheet.${timestamp}@example.com`,
      employeeId: `SKYT${timestamp}`,
      hireDate: '2025-01-01',
      departmentId: null,
      positionId: null
    });

    // Create test project and task
    testProject = await db.Project.create({
      name: 'Test Project',
      code: 'TST001',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'Active'
    });

    testTask = await db.Task.create({
      name: 'Test Task',
      projectId: testProject.id,
      status: 'In Progress'
    });

    testTask2 = await db.Task.create({
      name: 'Test Task 2',
      projectId: testProject.id,
      status: 'In Progress'
    });

    testTask3 = await db.Task.create({
      name: 'Test Task 3',
      projectId: testProject.id,
      status: 'In Progress'
    });

    // Create leave type
    testLeaveType = await db.LeaveType.create({
      name: `Timesheet Test Leave ${Date.now()}`,
      code: 'AL',
      defaultDays: 15
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
    await db.LeaveRequest.destroy({ where: { employeeId: testEmployee.id }, force: true });
    await db.Task.destroy({ where: { id: [testTask.id, testTask2.id, testTask3.id] }, force: true });
    await db.Project.destroy({ where: { id: testProject.id }, force: true });
    await db.LeaveType.destroy({ where: { id: testLeaveType.id }, force: true });
    await db.Employee.destroy({ where: { id: testEmployee.id }, force: true });
  });

  afterEach(async () => {
    // Clean up timesheets and leaves after each test
    await db.Timesheet.destroy({ where: { employeeId: testEmployee.id }, force: true });
    await db.LeaveRequest.destroy({ where: { employeeId: testEmployee.id }, force: true });
  });

  /**
   * ========================================
   * WEEK DATE CALCULATIONS (5 tests)
   * ========================================
   */
  describe('Week Date Calculations', () => {
    test('should calculate week start date (Monday)', () => {
      // Wednesday, Feb 5, 2026 → Monday, Feb 2, 2026
      const date = new Date('2026-02-05');
      const weekStart = service.calculateWeekStartDate(date);
      
      expect(moment(weekStart).format('YYYY-MM-DD')).toBe('2026-02-02');
      expect(moment(weekStart).format('dddd')).toBe('Monday');
    });

    test('should calculate week end date (Sunday)', () => {
      // Monday, Feb 2, 2026 → Sunday, Feb 8, 2026
      const weekStart = new Date('2026-02-02');
      const weekEnd = service.calculateWeekEndDate(weekStart);
      
      expect(moment(weekEnd).format('YYYY-MM-DD')).toBe('2026-02-08');
      expect(moment(weekEnd).format('dddd')).toBe('Sunday');
    });

    test('should calculate ISO week number', () => {
      const date = new Date('2026-02-05'); // Week 6 of 2026
      const weekNumber = service.calculateWeekNumber(date);
      
      expect(weekNumber).toBe(6);
    });

    test('should generate array of 7 week dates (Mon-Sun)', () => {
      const weekStart = new Date('2026-02-02'); // Monday
      const weekDates = service.getWeekDates(weekStart);
      
      expect(weekDates).toHaveLength(7);
      expect(moment(weekDates[0]).format('dddd')).toBe('Monday');
      expect(moment(weekDates[6]).format('dddd')).toBe('Sunday');
      expect(moment(weekDates[0]).format('YYYY-MM-DD')).toBe('2026-02-02');
      expect(moment(weekDates[6]).format('YYYY-MM-DD')).toBe('2026-02-08');
    });

    test('should handle year boundary (Dec 29, 2025 is Monday of week 1 in 2026)', () => {
      const date = new Date('2026-01-01'); // Thursday, Jan 1, 2026
      const weekStart = service.calculateWeekStartDate(date);
      
      // ISO week 1 of 2026 starts on Monday, Dec 29, 2025
      expect(moment(weekStart).format('YYYY-MM-DD')).toBe('2025-12-29');
    });
  });

  /**
   * ========================================
   * HOUR VALIDATIONS (7 tests)
   * ========================================
   */
  describe('Hour Validations', () => {
    test('should reject negative daily hours', () => {
      expect(() => service.validateDailyHours(-1, 'Monday')).toThrow('Monday hours cannot be negative');
    });

    test('should reject daily hours over 24', () => {
      expect(() => service.validateDailyHours(25, 'Tuesday')).toThrow('Tuesday hours cannot exceed 24 hours');
    });

    test('should reject hours with more than 2 decimal places', () => {
      expect(() => service.validateDailyHours(8.125, 'Wednesday')).toThrow('maximum 2 decimal places');
    });

    test('should accept valid daily hours (0-24, max 2 decimals)', () => {
      expect(() => service.validateDailyHours(0, 'Monday')).not.toThrow();
      expect(() => service.validateDailyHours(8.5, 'Tuesday')).not.toThrow();
      expect(() => service.validateDailyHours(24, 'Friday')).not.toThrow();
    });

    test('should calculate row total correctly', () => {
      const dailyHours = {
        mondayHours: 8,
        tuesdayHours: 7.5,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 6.5,
        saturdayHours: 0,
        sundayHours: 0
      };
      
      const total = service.calculateRowTotal(dailyHours);
      expect(total).toBe(38);
    });

    test('should validate total hours match daily sum', () => {
      const dailyHours = {
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0
      };
      
      expect(() => service.validateTotalHoursMatch(dailyHours, 40)).not.toThrow();
      expect(() => service.validateTotalHoursMatch(dailyHours, 35)).toThrow('Total hours mismatch');
    });

    test('should validate complete timesheet hours', () => {
      const validTimesheet = {
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 40
      };
      
      expect(() => service.validateTimesheetHours(validTimesheet)).not.toThrow();
    });
  });

  /**
   * ========================================
   * WEEKLY AGGREGATIONS (4 tests)
   * ========================================
   */
  describe('Weekly Aggregations', () => {
    test('should calculate weekly total across multiple rows', async () => {
      const weekStart = '2026-02-02';
      
      // Create 3 timesheet rows for same week
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
        totalHoursWorked: 8
      });
      
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 6,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 6
      });
      
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask3.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 10,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 10
      });
      
      const total = await service.calculateWeeklyTotalForEmployee(testEmployee.id, weekStart);
      expect(total).toBe(24);
    });

    test('should group weekly summary by project', async () => {
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
        totalHoursWorked: 8
      });
      
      const summary = await service.getWeeklySummaryByProject(testEmployee.id, weekStart);
      
      expect(summary).toHaveLength(1);
      expect(summary[0].projectId).toBe(testProject.id);
      expect(summary[0].totalHours).toBe(8);
      expect(summary[0].taskCount).toBe(1);
    });

    test('should validate weekly hours limit (≤ 168)', async () => {
      const weekStart = '2026-02-02';
      
      // Create timesheet with 180 hours (exceeds limit)
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
        totalHoursWorked: 168
      });
      
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask2.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 12,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 12
      });
      
      await expect(
        service.validateWeeklyHoursLimit(testEmployee.id, weekStart)
      ).rejects.toThrow('exceeds maximum allowed');
    });

    test('should allow weekly total up to 168 hours', async () => {
      const weekStart = '2026-02-02';
      
      await db.Timesheet.create({
        employeeId: testEmployee.id,
        projectId: testProject.id,
        taskId: testTask.id,
        weekStartDate: weekStart,
        weekEndDate: '2026-02-08',
        weekNumber: 6,
        year: 2026,
        mondayHours: 24,
        tuesdayHours: 0,
        wednesdayHours: 0,
        thursdayHours: 0,
        fridayHours: 0,
        saturdayHours: 0,
        sundayHours: 0,
        totalHoursWorked: 24
      });
      
      await expect(
        service.validateWeeklyHoursLimit(testEmployee.id, weekStart)
      ).resolves.not.toThrow();
    });
  });

  /**
   * ========================================
   * STATUS LOGIC (2 tests)
   * ========================================
   */
  describe('Status Logic', () => {
    test('should validate status transitions', () => {
      expect(service.canTransitionStatus('Draft', 'Submitted')).toBe(true);
      expect(service.canTransitionStatus('Submitted', 'Approved')).toBe(true);
      expect(service.canTransitionStatus('Submitted', 'Rejected')).toBe(true);
      expect(service.canTransitionStatus('Rejected', 'Submitted')).toBe(true);
      expect(service.canTransitionStatus('Approved', 'Draft')).toBe(false);
      expect(service.canTransitionStatus('Draft', 'Approved')).toBe(false);
    });

    test('should check if timesheet is submittable', () => {
      const draftWithHours = {
        status: 'Draft',
        totalHoursWorked: 40,
        projectId: testProject.id,
        taskId: testTask.id
      };
      expect(service.isSubmittable(draftWithHours)).toBe(true);

      const draftNoHours = { ...draftWithHours, totalHoursWorked: 0 };
      expect(service.isSubmittable(draftNoHours)).toBe(false);

      const approvedTimesheet = { ...draftWithHours, status: 'Approved' };
      expect(service.isSubmittable(approvedTimesheet)).toBe(false);
    });
  });

  /**
   * ========================================
   * DUPLICATE DETECTION (2 tests)
   * ========================================
   */
  describe('Duplicate Detection', () => {
    test('should detect duplicate project/task/week combination', async () => {
      const weekStart = '2026-02-02';
      
      // Create first timesheet
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
        totalHoursWorked: 8
      });
      
      // Check for duplicate
      const duplicate = await service.checkDuplicateTimesheetRow(
        testEmployee.id,
        weekStart,
        testProject.id,
        testTask.id
      );
      
      expect(duplicate).not.toBeNull();
      expect(duplicate.projectId).toBe(testProject.id);
      expect(duplicate.taskId).toBe(testTask.id);
    });

    test('should allow different project/task for same week', async () => {
      const weekStart = '2026-02-02';
      
      // Create first timesheet with task A
      const timesheet1 = await db.Timesheet.create({
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
        totalHoursWorked: 8
      });
      
      // Create second task
      const testTask2 = await db.Task.create({
        name: 'Test Task 2',
        projectId: testProject.id,
        status: 'In Progress'
      });
      
      // Check for duplicate with different task (should be null)
      const duplicate = await service.checkDuplicateTimesheetRow(
        testEmployee.id,
        weekStart,
        testProject.id,
        testTask2.id
      );
      
      expect(duplicate).toBeNull();
      
      // Cleanup
      await db.Task.destroy({ where: { id: testTask2.id }, force: true });
    });
  });

  /**
   * ========================================
   * LEAVE INTEGRATION (3 tests)
   * ========================================
   */
  describe('Leave Integration', () => {
    test('should get approved leave days for a week', async () => {
      const weekStart = '2026-02-02'; // Monday
      
      // Create approved leave for Wed-Fri (3 days)
      await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2026-02-04', // Wednesday
        endDate: '2026-02-06',   // Friday
        totalDays: 3,
        reason: 'Vacation',
        status: 'Approved',
        approvedAt: new Date()
      });
      
      const leaveDays = await service.getApprovedLeaveDaysForWeek(testEmployee.id, weekStart);
      
      expect(leaveDays).toHaveLength(3);
      expect(moment(leaveDays[0]).format('YYYY-MM-DD')).toBe('2026-02-04');
      expect(moment(leaveDays[2]).format('YYYY-MM-DD')).toBe('2026-02-06');
    });

    test('should calculate expected working hours excluding leaves', async () => {
      const weekStart = '2026-02-02';
      
      // Create approved leave for 2 days
      await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2026-02-05', // Thursday
        endDate: '2026-02-06',   // Friday
        totalDays: 2,
        reason: 'Personal',
        status: 'Approved',
        approvedAt: new Date()
      });
      
      const expected = await service.calculateExpectedWorkingHours(testEmployee.id, weekStart, 8);
      
      expect(expected.leaveDays).toBe(2);
      expect(expected.workingDays).toBe(5); // 7 - 2 leave days
      expect(expected.expectedHours).toBe(40); // 5 days × 8 hours
      expect(expected.leaveDates).toHaveLength(2);
    });

    test('should check if specific date is approved leave', async () => {
      // Create approved leave for Feb 10
      await db.LeaveRequest.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        startDate: '2026-02-10',
        endDate: '2026-02-10',
        totalDays: 1,
        reason: 'Sick',
        status: 'Approved',
        approvedAt: new Date()
      });
      
      const isLeave = await service.isApprovedLeaveDay(testEmployee.id, '2026-02-10');
      const notLeave = await service.isApprovedLeaveDay(testEmployee.id, '2026-02-11');
      
      expect(isLeave).toBe(true);
      expect(notLeave).toBe(false);
    });
  });
});
