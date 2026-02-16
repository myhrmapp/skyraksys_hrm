/**
 * Unit Tests: Holiday Service (GAP Item 12.5)
 * 
 * Tests: getHolidaysByYear, getHolidaysBetween, countHolidaysBetween,
 *        isHoliday, getUpcomingHolidays, generateRecurringHolidays, getHolidayDateSet
 */

jest.mock('../../../models', () => ({
  Holiday: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    bulkCreate: jest.fn(),
  },
  sequelize: {},
  Sequelize: {}
}));

const db = require('../../../models');
const holidayService = require('../../../services/holiday.service');

describe('HolidayService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHolidaysByYear', () => {
    test('should fetch holidays for a given year', async () => {
      const mockHolidays = [
        { id: '1', name: 'New Year', date: '2026-01-01', type: 'public', year: 2026 },
        { id: '2', name: 'Independence Day', date: '2026-07-04', type: 'public', year: 2026 }
      ];
      db.Holiday.findAll.mockResolvedValue(mockHolidays);

      const result = await holidayService.getHolidaysByYear(2026);

      expect(db.Holiday.findAll).toHaveBeenCalledWith({
        where: { year: 2026, isActive: true },
        order: [['date', 'ASC']]
      });
      expect(result).toEqual(mockHolidays);
    });

    test('should filter by type when provided', async () => {
      db.Holiday.findAll.mockResolvedValue([]);

      await holidayService.getHolidaysByYear(2026, { type: 'company' });

      expect(db.Holiday.findAll).toHaveBeenCalledWith({
        where: { year: 2026, isActive: true, type: 'company' },
        order: [['date', 'ASC']]
      });
    });

    test('should include inactive holidays when requested', async () => {
      db.Holiday.findAll.mockResolvedValue([]);

      await holidayService.getHolidaysByYear(2026, { includeInactive: true });

      expect(db.Holiday.findAll).toHaveBeenCalledWith({
        where: { year: 2026 },
        order: [['date', 'ASC']]
      });
    });
  });

  describe('getHolidaysBetween', () => {
    test('should fetch holidays between two dates', async () => {
      const mockHolidays = [{ id: '1', name: 'Labour Day', date: '2026-05-01', type: 'public' }];
      db.Holiday.findAll.mockResolvedValue(mockHolidays);

      const result = await holidayService.getHolidaysBetween('2026-04-01', '2026-06-30');

      expect(db.Holiday.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockHolidays);
    });

    test('should accept custom types filter', async () => {
      db.Holiday.findAll.mockResolvedValue([]);

      await holidayService.getHolidaysBetween('2026-01-01', '2026-12-31', ['restricted']);

      const call = db.Holiday.findAll.mock.calls[0][0];
      expect(call.where.type).toEqual({ [Symbol.for('in')]: ['restricted'] });
    });
  });

  describe('countHolidaysBetween', () => {
    test('should return count of holidays in date range', async () => {
      db.Holiday.count.mockResolvedValue(3);

      const result = await holidayService.countHolidaysBetween('2026-01-01', '2026-06-30');

      expect(db.Holiday.count).toHaveBeenCalled();
      expect(result).toBe(3);
    });
  });

  describe('isHoliday', () => {
    test('should return holiday record if date is a holiday', async () => {
      const holiday = { id: '1', name: 'Christmas', date: '2026-12-25' };
      db.Holiday.findOne.mockResolvedValue(holiday);

      const result = await holidayService.isHoliday('2026-12-25');

      expect(db.Holiday.findOne).toHaveBeenCalledWith({
        where: { date: '2026-12-25', isActive: true }
      });
      expect(result).toEqual(holiday);
    });

    test('should return null if date is not a holiday', async () => {
      db.Holiday.findOne.mockResolvedValue(null);

      const result = await holidayService.isHoliday('2026-03-15');

      expect(result).toBeNull();
    });
  });

  describe('getUpcomingHolidays', () => {
    test('should return upcoming holidays with default count', async () => {
      const mockHolidays = [{ id: '1', name: 'Next Holiday', date: '2026-06-01' }];
      db.Holiday.findAll.mockResolvedValue(mockHolidays);

      const result = await holidayService.getUpcomingHolidays();

      expect(db.Holiday.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
      expect(result).toEqual(mockHolidays);
    });

    test('should accept custom count', async () => {
      db.Holiday.findAll.mockResolvedValue([]);

      await holidayService.getUpcomingHolidays(10);

      expect(db.Holiday.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      );
    });
  });

  describe('generateRecurringHolidays', () => {
    test('should copy recurring holidays from previous year', async () => {
      const previousYearHolidays = [
        { name: 'New Year', date: '2025-01-01', type: 'public', description: 'Happy New Year', isRecurring: true, getMonth: () => 0, getDate: () => 1 },
        { name: 'Christmas', date: '2025-12-25', type: 'public', description: 'Merry Christmas', isRecurring: true, getMonth: () => 11, getDate: () => 25 }
      ];
      db.Holiday.findAll.mockResolvedValue(previousYearHolidays);
      db.Holiday.bulkCreate.mockResolvedValue([{}, {}]);

      const result = await holidayService.generateRecurringHolidays(2026, 'admin-id');

      expect(db.Holiday.findAll).toHaveBeenCalledWith({
        where: { year: 2025, isRecurring: true, isActive: true }
      });
      expect(db.Holiday.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'New Year', year: 2026, isRecurring: true, createdBy: 'admin-id' })
        ]),
        { ignoreDuplicates: true }
      );
      expect(result).toHaveLength(2);
    });

    test('should return empty array if no recurring holidays found', async () => {
      db.Holiday.findAll.mockResolvedValue([]);

      const result = await holidayService.generateRecurringHolidays(2026, 'admin-id');

      expect(db.Holiday.bulkCreate).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getHolidayDateSet', () => {
    test('should return a Set of date strings', async () => {
      const mockHolidays = [
        { date: '2026-01-01' },
        { date: '2026-05-01' },
        { date: '2026-12-25' }
      ];
      db.Holiday.findAll.mockResolvedValue(mockHolidays);

      const result = await holidayService.getHolidayDateSet('2026-01-01', '2026-12-31');

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has('2026-01-01')).toBe(true);
      expect(result.has('2026-05-01')).toBe(true);
      expect(result.has('2026-12-25')).toBe(true);
      expect(result.has('2026-06-15')).toBe(false);
    });
  });
});
