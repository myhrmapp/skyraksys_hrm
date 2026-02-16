const db = require('../../../models');

describe('Attendance Model', () => {
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
      lastName: 'User',
      email: `test${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'employee'
    });

    testEmployee = await db.Employee.create({
      userId: testUser.id,
      employeeId: `EMP${uniqueId}`,
      firstName: 'Test',
      lastName: 'Employee',
      email: `emp${uniqueId}@company.com`,
      hireDate: '2024-01-01',
      departmentId: testDepartment.id,
      positionId: testPosition.id,
      status: 'Active'
    });
  });

  afterEach(async () => {
    await db.Attendance.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create attendance with required fields', async () => {
      const attendance = await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'present'
      });

      expect(attendance.id).toBeDefined();
      expect(attendance.employeeId).toBe(testEmployee.id);
      expect(attendance.date).toBe('2026-02-15');
      expect(attendance.status).toBe('present');
    });

    it('should fail without employeeId', async () => {
      await expect(db.Attendance.create({
        date: '2026-02-15',
        status: 'present'
      })).rejects.toThrow();
    });

    it('should fail without date', async () => {
      await expect(db.Attendance.create({
        employeeId: testEmployee.id,
        status: 'present'
      })).rejects.toThrow();
    });
  });

  describe('Status Enum Validation', () => {
    const validStatuses = ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'weekend', 'late'];

    validStatuses.forEach(status => {
      it(`should accept valid status: ${status}`, async () => {
        const attendance = await db.Attendance.create({
          employeeId: testEmployee.id,
          date: `2026-02-${10 + validStatuses.indexOf(status)}`,
          status
        });
        expect(attendance.status).toBe(status);
      });
    });

    it('should reject invalid status', async () => {
      await expect(db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'invalid_status'
      })).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    it('should enforce unique employeeId + date combination', async () => {
      await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'present'
      });

      await expect(db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'late'
      })).rejects.toThrow();
    });

    it('should allow same date for different employees', async () => {
      const testUser2 = await db.User.create({
        firstName: 'Test2',
        lastName: 'User2',
        email: `test2${Date.now()}@example.com`,
        password: 'hashedpassword',
        role: 'employee'
      });

      const testEmployee2 = await db.Employee.create({
        userId: testUser2.id,
        employeeId: `EMP2${Date.now()}`,
        firstName: 'Test2',
        lastName: 'Employee2',
        email: `emp2${Date.now()}@company.com`,
        hireDate: '2024-01-01',
        departmentId: testDepartment.id,
        positionId: testPosition.id,
        status: 'Active'
      });

      const att1 = await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-16',
        status: 'present'
      });

      const att2 = await db.Attendance.create({
        employeeId: testEmployee2.id,
        date: '2026-02-16',
        status: 'present'
      });

      expect(att1.date).toBe(att2.date);
      expect(att1.employeeId).not.toBe(att2.employeeId);
    });
  });

  describe('Default Values', () => {
    it('should apply default status as present', async () => {
      const attendance = await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15'
      });

      expect(attendance.status).toBe('present');
    });

    it('should apply default hoursWorked as 0', async () => {
      const attendance = await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'present'
      });

      expect(parseFloat(attendance.hoursWorked)).toBe(0);
    });
  });

  describe('Optional Fields', () => {
    it('should store checkIn and checkOut times', async () => {
      const checkInTime = new Date('2026-02-15T09:00:00');
      const checkOutTime = new Date('2026-02-15T18:00:00');

      const attendance = await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'present',
        checkIn: checkInTime,
        checkOut: checkOutTime,
        hoursWorked: 9.0
      });

      expect(attendance.checkIn).toBeDefined();
      expect(attendance.checkOut).toBeDefined();
      expect(parseFloat(attendance.hoursWorked)).toBe(9.0);
    });

    it('should store notes', async () => {
      const attendance = await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'late',
        notes: 'Traffic delay'
      });

      expect(attendance.notes).toBe('Traffic delay');
    });

    it('should store lateMinutes and overtimeHours', async () => {
      const attendance = await db.Attendance.create({
        employeeId: testEmployee.id,
        date: '2026-02-15',
        status: 'present',
        lateMinutes: 30,
        overtimeHours: 2.5
      });

      expect(attendance.lateMinutes).toBe(30);
      expect(parseFloat(attendance.overtimeHours)).toBe(2.5);
    });
  });
});
