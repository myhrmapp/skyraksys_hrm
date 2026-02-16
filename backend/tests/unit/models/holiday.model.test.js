const db = require('../../../models');

describe('Holiday Model', () => {
  let testUser;

  beforeEach(async () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    
    testUser = await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: `admin${uniqueId}@example.com`,
      password: 'hashedpassword',
      role: 'admin'
    });
  });

  afterEach(async () => {
    await db.Holiday.destroy({ where: {}, force: true });
    await db.User.destroy({ where: {}, force: true });
  });

  describe('Required Fields', () => {
    it('should create holiday with required fields', async () => {
      const holiday = await db.Holiday.create({
        name: 'New Year',
        date: '2026-01-01',
        year: 2026
      });

      expect(holiday.id).toBeDefined();
      expect(holiday.name).toBe('New Year');
      expect(holiday.date).toBe('2026-01-01');
      expect(holiday.year).toBe(2026);
    });

    it('should fail without name', async () => {
      await expect(db.Holiday.create({
        date: '2026-01-01',
        year: 2026
      })).rejects.toThrow();
    });

    it('should fail without date', async () => {
      await expect(db.Holiday.create({
        name: 'Independence Day',
        year: 2026
      })).rejects.toThrow();
    });

    it('should fail without year', async () => {
      await expect(db.Holiday.create({
        name: 'Christmas',
        date: '2026-12-25'
      })).rejects.toThrow();
    });
  });

  describe('Unique Constraint', () => {
    it('should enforce unique date + name combination', async () => {
      await db.Holiday.create({
        name: 'Republic Day',
        date: '2026-01-26',
        year: 2026
      });

      await expect(db.Holiday.create({
        name: 'Republic Day',
        date: '2026-01-26',
        year: 2026
      })).rejects.toThrow();
    });

    it('should allow same name on different dates', async () => {
      const holiday1 = await db.Holiday.create({
        name: 'Festival',
        date: '2026-03-15',
        year: 2026
      });

      const holiday2 = await db.Holiday.create({
        name: 'Festival',
        date: '2026-10-20',
        year: 2026
      });

      expect(holiday1.name).toBe(holiday2.name);
      expect(holiday1.date).not.toBe(holiday2.date);
    });
  });

  describe('Type Enum Validation', () => {
    it('should accept valid type: public', async () => {
      const holiday = await db.Holiday.create({
        name: 'Gandhi Jayanti',
        date: '2026-10-02',
        year: 2026,
        type: 'public'
      });

      expect(holiday.type).toBe('public');
    });

    it('should accept valid type: restricted', async () => {
      const holiday = await db.Holiday.create({
        name: 'Optional Holiday',
        date: '2026-08-15',
        year: 2026,
        type: 'restricted'
      });

      expect(holiday.type).toBe('restricted');
    });

    it('should accept valid type: company', async () => {
      const holiday = await db.Holiday.create({
        name: 'Company Anniversary',
        date: '2026-06-10',
        year: 2026,
        type: 'company'
      });

      expect(holiday.type).toBe('company');
    });

    it('should reject invalid type', async () => {
      await expect(db.Holiday.create({
        name: 'Invalid Type Holiday',
        date: '2026-07-04',
        year: 2026,
        type: 'invalid_type'
      })).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should apply default type as public', async () => {
      const holiday = await db.Holiday.create({
        name: 'Diwali',
        date: '2026-11-09',
        year: 2026
      });

      expect(holiday.type).toBe('public');
    });

    it('should apply default isRecurring as false', async () => {
      const holiday = await db.Holiday.create({
        name: 'Special Event',
        date: '2026-05-01',
        year: 2026
      });

      expect(holiday.isRecurring).toBe(false);
    });

    it('should apply default isActive as true', async () => {
      const holiday = await db.Holiday.create({
        name: 'Eid',
        date: '2026-04-15',
        year: 2026
      });

      expect(holiday.isActive).toBe(true);
    });
  });

  describe('Optional Fields', () => {
    it('should store description', async () => {
      const holiday = await db.Holiday.create({
        name: 'Holi',
        date: '2026-03-05',
        year: 2026,
        description: 'Festival of colors celebrated nationwide'
      });

      expect(holiday.description).toBe('Festival of colors celebrated nationwide');
    });

    it('should allow isRecurring flag', async () => {
      const holiday = await db.Holiday.create({
        name: 'Christmas',
        date: '2026-12-25',
        year: 2026,
        isRecurring: true
      });

      expect(holiday.isRecurring).toBe(true);
    });

    it('should store createdBy', async () => {
      const holiday = await db.Holiday.create({
        name: 'Mahashivratri',
        date: '2026-02-17',
        year: 2026,
        createdBy: testUser.id
      });

      expect(holiday.createdBy).toBe(testUser.id);
    });
  });
});
