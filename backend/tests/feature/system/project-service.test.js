const db = require('../../../models');
const ProjectService = require('../../../services/project/ProjectService');
const { Project, Employee, User, Department, Position, Task, Timesheet } = db;

describe('ProjectService', () => {
  let testManager;
  let testDepartment;
  let testPosition;

  afterAll(async () => {
    try {
      await Timesheet.destroy({ where: {}, force: true });
      await Task.destroy({ where: {}, force: true });
      await Project.destroy({ where: {}, force: true });
      await Employee.destroy({ where: {}, force: true, paranoid: false });
      await User.destroy({ where: {}, force: true });
      await Department.destroy({ where: {}, force: true });
      await Position.destroy({ where: {}, force: true });
    } catch (error) {
      /* error intentionally ignored for test cleanup */
    }
    await db.sequelize.close();
  });

  beforeEach(async () => {
    try {
      await Timesheet.destroy({ where: {}, force: true });
      await Task.destroy({ where: {}, force: true });
      await Project.destroy({ where: {}, force: true });
      await Employee.destroy({ where: {}, force: true, paranoid: false });
      await User.destroy({ where: {}, force: true });
      await Department.destroy({ where: {}, force: true });
      await Position.destroy({ where: {}, force: true });
    } catch (error) {
      /* error intentionally ignored for test cleanup */
    }

    // Create test department and position
    testDepartment = await Department.create({
      name: 'Engineering',
      description: 'Tech team',
      isActive: true
    });

    testPosition = await Position.create({
      title: 'Manager',
      description: 'Project Manager',
      level: 'Senior',
      departmentId: testDepartment.id,
      isActive: true
    });

    // Create test manager
    const user = await User.create({
      email: 'manager@test.com',
      password: 'hashedpassword',
      role: 'manager',
      firstName: 'Test',
      lastName: 'Manager',
      isActive: true
    });

    testManager = await Employee.create({
      userId: user.id,
      employeeId: 'SKYT0001',
      firstName: 'Test',
      lastName: 'Manager',
      email: 'manager@test.com',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      hireDate: new Date(),
      status: 'Active'
    });
  });

  describe('Date Validation', () => {
    test('should validate correct dates', () => {
      const startDate = '2026-01-01';
      const endDate = '2026-12-31';
      expect(() => ProjectService.validateDates(startDate, endDate)).not.toThrow();
    });

    test('should reject missing start date', () => {
      expect(() => ProjectService.validateDates(null, '2026-12-31')).toThrow('Start date is required');
    });

    test('should reject end date before start date', () => {
      const startDate = '2026-12-31';
      const endDate = '2026-01-01';
      expect(() => ProjectService.validateDates(startDate, endDate)).toThrow('End date must be after start date');
    });

    test('should allow project without end date', () => {
      const startDate = '2026-01-01';
      expect(() => ProjectService.validateDates(startDate, null)).not.toThrow();
    });
  });

  describe('Status Transition Validation', () => {
    test('should allow Planning → Active transition', async () => {
      const project = await Project.create({
        name: 'Test Project',
        status: 'Planning',
        startDate: new Date(),
        managerId: testManager.id
      });

      await expect(ProjectService.validateStatusTransition(project.id, 'Active')).resolves.toBe(true);
    });

    test('should allow Active → Completed transition', async () => {
      const project = await Project.create({
        name: 'Test Project 2',
        status: 'Active',
        startDate: new Date(),
        managerId: testManager.id
      });

      await expect(ProjectService.validateStatusTransition(project.id, 'Completed')).resolves.toBe(true);
    });

    test('should reject invalid status transition', async () => {
      const project = await Project.create({
        name: 'Test Project 3',
        status: 'Completed',
        startDate: new Date(),
        managerId: testManager.id
      });

      await expect(ProjectService.validateStatusTransition(project.id, 'Active'))
        .rejects.toThrow('Cannot transition from Completed to Active');
    });
  });

  describe('Manager Validation', () => {
    test('should accept valid active manager', async () => {
      await expect(ProjectService.validateManager(testManager.id)).resolves.toBe(true);
    });

    test('should accept null manager (optional)', async () => {
      await expect(ProjectService.validateManager(null)).resolves.toBe(true);
    });

    test('should reject non-existent manager', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(ProjectService.validateManager(fakeId)).rejects.toThrow('Manager not found');
    });

    test('should reject inactive manager', async () => {
      await testManager.update({ status: 'Terminated' });
      await expect(ProjectService.validateManager(testManager.id)).rejects.toThrow('Manager must be active');
    });
  });

  describe('Project Creation', () => {
    test('should create project with valid data', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Test description',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'Planning',
        managerId: testManager.id
      };

      const project = await ProjectService.createProject(projectData);
      expect(project.name).toBe('New Project');
      expect(project.status).toBe('Planning');
    });

    test('should reject duplicate project name', async () => {
      const projectData = {
        name: 'Duplicate Project',
        startDate: '2026-01-01',
        status: 'Planning',
        managerId: testManager.id
      };

      await ProjectService.createProject(projectData);
      await expect(ProjectService.createProject(projectData))
        .rejects.toThrow('Project with this name already exists');
    });

    test('should allow creating project after previous one is deleted', async () => {
      const projectData = {
        name: 'Reusable Name',
        startDate: '2026-01-01',
        status: 'Planning',
        managerId: testManager.id
      };

      const project1 = await ProjectService.createProject(projectData);
      await project1.update({ isActive: false });

      const project2 = await ProjectService.createProject(projectData);
      expect(project2.name).toBe('Reusable Name');
    });
  });

  describe('Project Statistics', () => {
    test('should calculate statistics correctly', async () => {
      await Project.create({ name: 'P1', status: 'Planning', startDate: new Date(), managerId: testManager.id });
      await Project.create({ name: 'P2', status: 'Active', startDate: new Date(), managerId: testManager.id });
      await Project.create({ name: 'P3', status: 'Active', startDate: new Date(), managerId: testManager.id });
      await Project.create({ name: 'P4', status: 'Completed', startDate: new Date(), managerId: testManager.id });

      const stats = await ProjectService.getProjectStatistics();
      expect(stats.total).toBe(4);
      expect(stats.byStatus.active).toBe(2);
      expect(stats.byStatus.planning).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
    });
  });

  describe('Bulk Operations', () => {
    test('should bulk update multiple projects', async () => {
      const p1 = await Project.create({ name: 'Bulk1', status: 'Planning', startDate: new Date(), managerId: testManager.id });
      const p2 = await Project.create({ name: 'Bulk2', status: 'Planning', startDate: new Date(), managerId: testManager.id });

      const projectIds = [p1.id, p2.id];
      const updates = { status: 'Active' };

      const result = await ProjectService.bulkUpdateProjects(projectIds, updates);
      expect(result.success.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    test('should handle partial failures in bulk update', async () => {
      const p1 = await Project.create({ name: 'BulkProject3', status: 'Planning', startDate: new Date(), managerId: testManager.id });
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const projectIds = [p1.id, fakeId];
      const updates = { status: 'Active' };

      const result = await ProjectService.bulkUpdateProjects(projectIds, updates);
      expect(result.success.length).toBe(1);
      expect(result.failed.length).toBe(1);
    });
  });

  describe('Project Deletion', () => {
    test('should prevent deletion of project with active tasks', async () => {
      const project = await Project.create({
        name: 'Project with Tasks',
        status: 'Active',
        startDate: new Date(),
        managerId: testManager.id
      });

      await Task.create({
        projectId: project.id,
        name: 'Active Task',
        status: 'In Progress',
        availableToAll: true
      });

      const result = await ProjectService.canDelete(project.id);
      expect(result.canDelete).toBe(false);
      expect(result.reason).toContain('active tasks');
    });

    test('should allow deletion of project without tasks', async () => {
      const project = await Project.create({
        name: 'Empty Project',
        status: 'Planning',
        startDate: new Date(),
        managerId: testManager.id
      });

      const result = await ProjectService.canDelete(project.id);
      expect(result.canDelete).toBe(true);
      expect(result.reason).toBeNull();
    });
  });
});
