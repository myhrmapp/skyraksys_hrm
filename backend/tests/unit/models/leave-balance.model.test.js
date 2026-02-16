const db = require('../../../models');

describe('LeaveBalance Model', () => {
  let testEmployee, testUser, testDepartment, testPosition, testLeaveType;

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

    testLeaveType = await db.LeaveType.create({
      name: `Test Leave Type ${uniqueId}`,
      maxDays: 20,
      isActive: true
    });
  });

  afterEach(async () => {
    await db.LeaveBalance.destroy({ where: {}, force: true });
    await db.LeaveType.destroy({ where: {}, force: true });
    await db.Employee.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
    await db.Position.destroy({ where: {}, force: true });
    await db.Department.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create leave balance with required year', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(leaveBalance.id).toBeDefined();
      expect(leaveBalance.employeeId).toBe(testEmployee.id);
      expect(leaveBalance.leaveTypeId).toBe(testLeaveType.id);
      expect(leaveBalance.year).toBe(2026);
    });

    it('should fail without year', async () => {
      await expect(db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id
      })).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    it('should enforce unique employeeId + leaveTypeId + year combination', async () => {
      await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 15
      });

      await expect(db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 20
      })).rejects.toThrow();
    });

    it('should allow same employee + leaveType for different years', async () => {
      const balance2025 = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2025,
        totalAccrued: 15
      });

      const balance2026 = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 20
      });

      expect(balance2025.year).toBe(2025);
      expect(balance2026.year).toBe(2026);
    });

    it('should allow different leave types for same employee + year', async () => {
      const uniqueId2 = Math.floor(Math.random() * 100000);
      testLeaveType2 = await db.LeaveType.create({
        name: `Sick Leave ${uniqueId2}`,
        maxDays: 10,
        isActive: true
      });

      const casualBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 15
      });

      const sickBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType2.id,
        year: 2026,
        totalAccrued: 10
      });

      expect(casualBalance.leaveTypeId).not.toBe(sickBalance.leaveTypeId);
      expect(casualBalance.year).toBe(sickBalance.year);
    });
  });

  describe('Default Values', () => {
    it('should apply default totalAccrued as 0', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(parseFloat(leaveBalance.totalAccrued)).toBe(0);
    });

    it('should apply default totalTaken as 0', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(parseFloat(leaveBalance.totalTaken)).toBe(0);
    });

    it('should apply default totalPending as 0', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(parseFloat(leaveBalance.totalPending)).toBe(0);
    });

    it('should apply default balance as 0', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(parseFloat(leaveBalance.balance)).toBe(0);
    });

    it('should apply default carryForward as 0', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(parseFloat(leaveBalance.carryForward)).toBe(0);
    });
  });

  describe('Decimal Values', () => {
    it('should store decimal values with 2 decimal places', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 20.50,
        totalTaken: 5.25,
        totalPending: 2.75,
        balance: 12.50,
        carryForward: 3.00
      });

      expect(parseFloat(leaveBalance.totalAccrued)).toBe(20.50);
      expect(parseFloat(leaveBalance.totalTaken)).toBe(5.25);
      expect(parseFloat(leaveBalance.totalPending)).toBe(2.75);
      expect(parseFloat(leaveBalance.balance)).toBe(12.50);
      expect(parseFloat(leaveBalance.carryForward)).toBe(3.00);
    });

    it('should handle half-day leaves (0.5)', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 20,
        totalTaken: 0.5,
        balance: 19.5
      });

      expect(parseFloat(leaveBalance.totalTaken)).toBe(0.5);
      expect(parseFloat(leaveBalance.balance)).toBe(19.5);
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should have employeeId foreign key', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(leaveBalance.employeeId).toBe(testEmployee.id);
    });

    it('should have leaveTypeId foreign key', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      expect(leaveBalance.leaveTypeId).toBe(testLeaveType.id);
    });
  });

  describe('Leave Balance Calculations', () => {
    it('should maintain accurate balance tracking', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026,
        totalAccrued: 20,
        totalTaken: 5,
        totalPending: 2,
        carryForward: 3
      });

      // Balance = totalAccrued + carryForward - totalTaken - totalPending
      const expectedBalance = 20 + 3 - 5 - 2; // = 16
      await leaveBalance.update({ balance: expectedBalance });

      const updated = await db.LeaveBalance.findByPk(leaveBalance.id);
      expect(parseFloat(updated.balance)).toBe(16);
    });
  });

  describe('Soft Delete (Paranoid)', () => {
    it('should soft delete leave balance', async () => {
      const leaveBalance = await db.LeaveBalance.create({
        employeeId: testEmployee.id,
        leaveTypeId: testLeaveType.id,
        year: 2026
      });

      await leaveBalance.destroy();

      const foundBalance = await db.LeaveBalance.findByPk(leaveBalance.id);
      expect(foundBalance).toBeNull();

      const deletedBalance = await db.LeaveBalance.findByPk(leaveBalance.id, { paranoid: false });
      expect(deletedBalance).not.toBeNull();
      expect(deletedBalance.deletedAt).not.toBeNull();
    });
  });
});
