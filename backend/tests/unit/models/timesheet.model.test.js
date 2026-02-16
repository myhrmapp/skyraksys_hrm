/**
 * Timesheet Model Tests (Weekly Schema)
 *
 * Tests the weekly timesheet model with per-day hour columns,
 * status lifecycle (Draft→Submitted→Approved/Rejected),
 * validations, and associations.
 *
 * Updated: February 2026 — Rewritten for weekly timesheet schema
 */

const { Timesheet, Employee, Department, Position, Project, Task, User, sequelize } = require('../../../models');

describe('Timesheet Model (Weekly)', () => {
  let testUser, testEmployee, testDepartment, testPosition, testProject, testTask;

  beforeAll(async () => {
    // Clean up existing test data from prior runs
    await Timesheet.destroy({ where: {}, force: true, paranoid: false }).catch(() => {});

    // Use findOrCreate for data that global setup may have already seeded
    [testDepartment] = await Department.findOrCreate({
      where: { code: 'ENG' },
      defaults: { name: 'Engineering', code: 'ENG', description: 'Engineering' }
    });

    [testPosition] = await Position.findOrCreate({
      where: { code: 'DEV-TS' },
      defaults: { title: 'Developer', code: 'DEV-TS', departmentId: testDepartment.id }
    });

    [testUser] = await User.findOrCreate({
      where: { email: 'timesheet-model@test.com' },
      defaults: {
        firstName: 'Time', lastName: 'Sheet',
        email: 'timesheet-model@test.com',
        password: 'TestPass123!', role: 'employee'
      }
    });

    [testEmployee] = await Employee.findOrCreate({
      where: { employeeId: 'TS-MODEL-001' },
      defaults: {
        employeeId: 'TS-MODEL-001',
        firstName: 'Time', lastName: 'Sheet',
        email: 'timesheet-model@test.com',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        hireDate: new Date(),
        status: 'Active',
        userId: testUser.id
      }
    });

    [testProject] = await Project.findOrCreate({
      where: { name: 'TS Model Test Project' },
      defaults: { name: 'TS Model Test Project', status: 'Active', startDate: new Date() }
    });

    [testTask] = await Task.findOrCreate({
      where: { name: 'TS Model Dev Task', projectId: testProject.id },
      defaults: { name: 'TS Model Dev Task', projectId: testProject.id, status: 'In Progress' }
    });
  });

  afterEach(async () => {
    await Timesheet.destroy({ where: {}, force: true, paranoid: false });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // Helper to create a valid timesheet
  function validTimesheetData(overrides = {}) {
    return {
      employeeId: testEmployee.id,
      projectId: testProject.id,
      taskId: testTask.id,
      weekStartDate: '2026-02-02', // Monday
      weekEndDate: '2026-02-08',   // Sunday
      weekNumber: 6,
      year: 2026,
      totalHoursWorked: 40,
      mondayHours: 8,
      tuesdayHours: 8,
      wednesdayHours: 8,
      thursdayHours: 8,
      fridayHours: 8,
      saturdayHours: 0,
      sundayHours: 0,
      description: 'Weekly development work',
      status: 'Draft',
      ...overrides
    };
  }

  describe('Creation', () => {
    it('should create a valid weekly timesheet', async () => {
      const timesheet = await Timesheet.create(validTimesheetData());

      expect(timesheet.id).toBeDefined();
      expect(timesheet.employeeId).toBe(testEmployee.id);
      expect(timesheet.projectId).toBe(testProject.id);
      expect(timesheet.taskId).toBe(testTask.id);
      expect(timesheet.weekStartDate).toBe('2026-02-02');
      expect(timesheet.weekEndDate).toBe('2026-02-08');
      expect(timesheet.weekNumber).toBe(6);
      expect(timesheet.year).toBe(2026);
      expect(timesheet.totalHoursWorked).toBe(40);
      expect(timesheet.status).toBe('Draft');
    });

    it('should default status to Draft', async () => {
      const data = validTimesheetData();
      delete data.status;
      const timesheet = await Timesheet.create(data);
      expect(timesheet.status).toBe('Draft');
    });

    it('should default daily hours to 0', async () => {
      const data = validTimesheetData();
      delete data.saturdayHours;
      delete data.sundayHours;
      const timesheet = await Timesheet.create(data);
      expect(timesheet.saturdayHours).toBe(0);
      expect(timesheet.sundayHours).toBe(0);
    });

    it('should default totalHoursWorked to 0', async () => {
      const data = validTimesheetData({ totalHoursWorked: undefined });
      const timesheet = await Timesheet.create(data);
      expect(timesheet.totalHoursWorked).toBe(0);
    });
  });

  describe('Required Fields', () => {
    it('should require employeeId', async () => {
      const data = validTimesheetData({ employeeId: null });
      await expect(Timesheet.create(data)).rejects.toThrow();
    });

    it('should require projectId', async () => {
      const data = validTimesheetData({ projectId: null });
      await expect(Timesheet.create(data)).rejects.toThrow();
    });

    it('should require taskId', async () => {
      const data = validTimesheetData({ taskId: null });
      await expect(Timesheet.create(data)).rejects.toThrow();
    });

    it('should require weekStartDate', async () => {
      const data = validTimesheetData({ weekStartDate: null });
      await expect(Timesheet.create(data)).rejects.toThrow();
    });

    it('should require weekEndDate', async () => {
      const data = validTimesheetData({ weekEndDate: null });
      await expect(Timesheet.create(data)).rejects.toThrow();
    });

    it('should require weekNumber', async () => {
      const data = validTimesheetData({ weekNumber: null });
      await expect(Timesheet.create(data)).rejects.toThrow();
    });

    it('should require year', async () => {
      const data = validTimesheetData({ year: null });
      await expect(Timesheet.create(data)).rejects.toThrow();
    });
  });

  describe('Status ENUM', () => {
    it('should accept Draft status', async () => {
      const ts = await Timesheet.create(validTimesheetData({ status: 'Draft' }));
      expect(ts.status).toBe('Draft');
    });

    it('should accept Submitted status', async () => {
      const ts = await Timesheet.create(validTimesheetData({ status: 'Submitted' }));
      expect(ts.status).toBe('Submitted');
    });

    it('should accept Approved status', async () => {
      const ts = await Timesheet.create(validTimesheetData({ status: 'Approved' }));
      expect(ts.status).toBe('Approved');
    });

    it('should accept Rejected status', async () => {
      const ts = await Timesheet.create(validTimesheetData({ status: 'Rejected' }));
      expect(ts.status).toBe('Rejected');
    });

    it('should reject invalid status values', async () => {
      await expect(
        Timesheet.create(validTimesheetData({ status: 'Pending' }))
      ).rejects.toThrow();
    });
  });

  describe('Per-Day Hours', () => {
    it('should store per-day hours as numeric values', async () => {
      const ts = await Timesheet.create(validTimesheetData({
        mondayHours: 7.5,
        tuesdayHours: 8.25,
        wednesdayHours: 6,
        thursdayHours: 9,
        fridayHours: 4.5,
        saturdayHours: 2,
        sundayHours: 0
      }));

      expect(ts.mondayHours).toBe(7.5);
      expect(ts.tuesdayHours).toBe(8.25);
      expect(ts.wednesdayHours).toBe(6);
      expect(ts.thursdayHours).toBe(9);
      expect(ts.fridayHours).toBe(4.5);
      expect(ts.saturdayHours).toBe(2);
      expect(ts.sundayHours).toBe(0);
    });

    it('should store total hours worked', async () => {
      const ts = await Timesheet.create(validTimesheetData({
        totalHoursWorked: 37.25
      }));
      expect(ts.totalHoursWorked).toBe(37.25);
    });
  });

  describe('Approval Workflow', () => {
    it('should store submission timestamp', async () => {
      const submittedAt = new Date();
      const ts = await Timesheet.create(validTimesheetData({
        status: 'Submitted',
        submittedAt
      }));
      expect(ts.submittedAt).toBeDefined();
    });

    it('should store approval details', async () => {
      const ts = await Timesheet.create(validTimesheetData({
        status: 'Approved',
        approvedAt: new Date(),
        approvedBy: testEmployee.id,
        approverComments: 'Looks good.'
      }));
      expect(ts.approvedBy).toBe(testEmployee.id);
      expect(ts.approverComments).toBe('Looks good.');
      expect(ts.approvedAt).toBeDefined();
    });

    it('should store rejection details', async () => {
      const ts = await Timesheet.create(validTimesheetData({
        status: 'Rejected',
        rejectedAt: new Date(),
        approverComments: 'Hours exceed project allocation.'
      }));
      expect(ts.approverComments).toBe('Hours exceed project allocation.');
      expect(ts.rejectedAt).toBeDefined();
    });
  });

  describe('Associations', () => {
    it('should belong to Employee', async () => {
      const ts = await Timesheet.create(validTimesheetData());
      const fetched = await Timesheet.findByPk(ts.id, {
        include: [{ model: Employee, as: 'employee' }]
      });
      expect(fetched.employee).toBeDefined();
      expect(fetched.employee.id).toBe(testEmployee.id);
    });

    it('should belong to Project', async () => {
      const ts = await Timesheet.create(validTimesheetData());
      const fetched = await Timesheet.findByPk(ts.id, {
        include: [{ model: Project, as: 'project' }]
      });
      expect(fetched.project).toBeDefined();
      expect(fetched.project.id).toBe(testProject.id);
    });

    it('should belong to Task', async () => {
      const ts = await Timesheet.create(validTimesheetData());
      const fetched = await Timesheet.findByPk(ts.id, {
        include: [{ model: Task, as: 'task' }]
      });
      expect(fetched.task).toBeDefined();
      expect(fetched.task.id).toBe(testTask.id);
    });
  });

  describe('Paranoid (Soft Delete)', () => {
    it('should soft-delete timesheet', async () => {
      const ts = await Timesheet.create(validTimesheetData());
      await ts.destroy();

      const found = await Timesheet.findByPk(ts.id);
      expect(found).toBeNull();

      const foundWithDeleted = await Timesheet.findByPk(ts.id, { paranoid: false });
      expect(foundWithDeleted).toBeDefined();
      expect(foundWithDeleted.deletedAt).toBeDefined();
    });
  });

  describe('Querying', () => {
    it('should find timesheets by employee and week', async () => {
      await Timesheet.create(validTimesheetData());
      await Timesheet.create(validTimesheetData({
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7
      }));

      const results = await Timesheet.findAll({
        where: { employeeId: testEmployee.id }
      });
      expect(results.length).toBe(2);
    });

    it('should find timesheets by status', async () => {
      await Timesheet.create(validTimesheetData({ status: 'Draft' }));
      await Timesheet.create(validTimesheetData({
        status: 'Submitted',
        weekStartDate: '2026-02-09',
        weekEndDate: '2026-02-15',
        weekNumber: 7
      }));

      const drafts = await Timesheet.findAll({ where: { status: 'Draft' } });
      expect(drafts.length).toBe(1);

      const submitted = await Timesheet.findAll({ where: { status: 'Submitted' } });
      expect(submitted.length).toBe(1);
    });

    it('should filter by year and week number', async () => {
      await Timesheet.create(validTimesheetData());

      const results = await Timesheet.findAll({
        where: { year: 2026, weekNumber: 6 }
      });
      expect(results.length).toBe(1);
      expect(results[0].weekStartDate).toBe('2026-02-02');
    });
  });

  describe('Update', () => {
    it('should update daily hours', async () => {
      const ts = await Timesheet.create(validTimesheetData());

      await ts.update({
        mondayHours: 10,
        totalHoursWorked: 42
      });

      await ts.reload();
      expect(ts.mondayHours).toBe(10);
      expect(ts.totalHoursWorked).toBe(42);
    });

    it('should update status from Draft to Submitted', async () => {
      const ts = await Timesheet.create(validTimesheetData({ status: 'Draft' }));

      await ts.update({
        status: 'Submitted',
        submittedAt: new Date()
      });

      await ts.reload();
      expect(ts.status).toBe('Submitted');
      expect(ts.submittedAt).toBeDefined();
    });

    it('should update approver comments on rejection', async () => {
      const ts = await Timesheet.create(validTimesheetData({ status: 'Submitted' }));

      await ts.update({
        status: 'Rejected',
        rejectedAt: new Date(),
        approverComments: 'Please correct Friday hours.'
      });

      await ts.reload();
      expect(ts.status).toBe('Rejected');
      expect(ts.approverComments).toBe('Please correct Friday hours.');
    });
  });
});
