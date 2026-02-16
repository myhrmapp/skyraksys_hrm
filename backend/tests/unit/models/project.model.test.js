const db = require('../../../models');

describe('Project Model', () => {
  let testEmployee, testUser, testDepartment, testPosition;

  beforeEach(async () => {
    // Create dependencies
    const uniqueId = Math.floor(Math.random() * 100000);
    testDepartment = await db.Department.create({
      name: `Test Department ${uniqueId}`,
      code: `TD${uniqueId}`
    });

    testPosition = await db.Position.create({
      title: `Test Position ${uniqueId}`,
      code: `TP${uniqueId}`,
      departmentId: testDepartment.id
    });

    testUser = await db.User.create({
      firstName: 'Test',
      lastName: 'Manager',
      email: `manager${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'manager'
    });

    testEmployee = await db.Employee.create({
      userId: testUser.id,
      employeeId: `MGR${uniqueId}`,
      firstName: 'Test',
      lastName: 'Manager',
      email: `mgr${uniqueId}@company.com`,
      hireDate: '2024-01-01',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      status: 'Active'
    });
  });

  afterEach(async () => {
    await db.Project.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create project with required name', async () => {
      const project = await db.Project.create({
        name: 'Test Project',
        managerId: testEmployee.id
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.managerId).toBe(testEmployee.id);
    });

    it('should fail without name', async () => {
      await expect(db.Project.create({
        managerId: testEmployee.id
      })).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    const validStatuses = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

    validStatuses.forEach(status => {
      it(`should accept valid status: ${status}`, async () => {
        const project = await db.Project.create({
          name: `Project ${status}`,
          status,
          managerId: testEmployee.id
        });
        expect(project.status).toBe(status);
      });
    });

    it('should reject invalid status', async () => {
      await expect(db.Project.create({
        name: 'Invalid Status Project',
        status: 'InvalidStatus',
        managerId: testEmployee.id
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default status as Planning', async () => {
      const project = await db.Project.create({
        name: 'New Project',
        managerId: testEmployee.id
      });

      expect(project.status).toBe('Planning');
    });

    it('should apply default isActive as true', async () => {
      const project = await db.Project.create({
        name: 'Active Project',
        managerId: testEmployee.id
      });

      expect(project.isActive).toBe(true);
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const project = await db.Project.create({
        name: 'Documented Project',
        description: 'This is a detailed project description',
        managerId: testEmployee.id
      });

      expect(project.description).toBe('This is a detailed project description');
    });

    it('should store start and end dates', async () => {
      const project = await db.Project.create({
        name: 'Scheduled Project',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        managerId: testEmployee.id
      });

      expect(project.startDate).toBe('2026-01-01');
      expect(project.endDate).toBe('2026-12-31');
    });

    it('should store clientName', async () => {
      const project = await db.Project.create({
        name: 'Client Project',
        clientName: 'Acme Corporation',
        managerId: testEmployee.id
      });

      expect(project.clientName).toBe('Acme Corporation');
    });
  });

  describe('Date Validation', () => {
    it('should allow endDate after startDate', async () => {
      const project = await db.Project.create({
        name: 'Valid Date Project',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        managerId: testEmployee.id
      });

      expect(new Date(project.endDate)).toBeInstanceOf(Date);
      expect(new Date(project.endDate) > new Date(project.startDate)).toBe(true);
    });
  });

  describe('Soft Delete (Paranoid)', () => {
    it('should soft delete project', async () => {
      const project = await db.Project.create({
        name: 'Deletable Project',
        managerId: testEmployee.id
      });

      await project.destroy();

      const foundProject = await db.Project.findByPk(project.id);
      expect(foundProject).toBeNull();

      const deletedProject = await db.Project.findByPk(project.id, { paranoid: false });
      expect(deletedProject).not.toBeNull();
      expect(deletedProject.deletedAt).not.toBeNull();
    });
  });

  describe('Manager Relationship', () => {
    it('should have managerId foreign key', async () => {
      const project = await db.Project.create({
        name: 'Managed Project',
        managerId: testEmployee.id
      });

      expect(project.managerId).toBe(testEmployee.id);
    });
  });
});
