const db = require('../../../models');

describe('LeaveType Model', () => {
  afterEach(async () => {
    await db.LeaveType.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create leave type with required name', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Vacation Leave'
      });

      expect(leaveType.id).toBeDefined();
      expect(leaveType.name).toBe('Vacation Leave');
    });

    it('should fail without name', async () => {
      await expect(db.LeaveType.create({
        maxDaysPerYear: 20
      })).rejects.toThrow();
    });

    it('should enforce unique name', async () => {
      await db.LeaveType.create({
        name: 'Sick Leave'
      });

      await expect(db.LeaveType.create({
        name: 'Sick Leave'
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default maxDaysPerYear as 20', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Casual Leave'
      });

      expect(leaveType.maxDaysPerYear).toBe(20);
    });

    it('should apply default carryForward as false', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Personal Leave'
      });

      expect(leaveType.carryForward).toBe(false);
    });

    it('should apply default maxCarryForwardDays as 0', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Compensatory Off'
      });

      expect(leaveType.maxCarryForwardDays).toBe(0);
    });

    it('should apply default isActive as true', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Maternity Leave'
      });

      expect(leaveType.isActive).toBe(true);
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Bereavement Leave',
        description: 'Leave for family emergencies'
      });

      expect(leaveType.description).toBe('Leave for family emergencies');
    });

    it('should allow custom maxDaysPerYear', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Study Leave',
        maxDaysPerYear: 10
      });

      expect(leaveType.maxDaysPerYear).toBe(10);
    });

    it('should allow carryForward configuration', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Privilege Leave',
        carryForward: true,
        maxCarryForwardDays: 15
      });

      expect(leaveType.carryForward).toBe(true);
      expect(leaveType.maxCarryForwardDays).toBe(15);
    });
  });

  describe('Soft Delete (Paranoid)', () => {
    it('should soft delete leave type', async () => {
      const leaveType = await db.LeaveType.create({
        name: 'Temporary Leave'
      });

      await leaveType.destroy();

      const foundType = await db.LeaveType.findByPk(leaveType.id);
      expect(foundType).toBeNull();

      const deletedType = await db.LeaveType.findByPk(leaveType.id, { paranoid: false });
      expect(deletedType).not.toBeNull();
      expect(deletedType.deletedAt).not.toBeNull();
    });
  });
});
