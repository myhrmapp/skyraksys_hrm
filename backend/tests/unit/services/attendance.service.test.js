/**
 * Unit Tests: Attendance Service (GAP Item 12.1)
 * 
 * Tests: checkIn, checkOut, getTodayStatus, getEmployeeAttendance,
 *        getDailyAttendance, getMonthlyReport, markAttendance, getAttendanceSummary
 */

jest.mock('../../../models', () => {
  const mockTransaction = { LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' }, commit: jest.fn(), rollback: jest.fn() };
  const mockSequelize = {
    fn: jest.fn((fn, col) => `${fn}(${col})`),
    col: jest.fn(name => name),
    transaction: jest.fn(cb => cb(mockTransaction)),
  };
  return {
    Attendance: {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findAndCountAll: jest.fn(),
      findOrCreate: jest.fn(),
      create: jest.fn(),
    },
    Employee: {},
    Department: {},
    LeaveType: {},
    sequelize: mockSequelize,
    Sequelize: { Op: require('sequelize').Op }
  };
});

jest.mock('../../../services/holiday.service', () => ({
  getHolidayDateSet: jest.fn().mockResolvedValue(new Set()),
}));

const db = require('../../../models');
const holidayService = require('../../../services/holiday.service');
const attendanceService = require('../../../services/attendance.service');

const EMPLOYEE_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('AttendanceService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Date.now mocking between tests
    jest.restoreAllMocks();
    // Re-apply transaction mock (resetMocks: true in jest.config clears it)
    const mockTxn = { LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' }, commit: jest.fn(), rollback: jest.fn() };
    db.sequelize.transaction = jest.fn(cb => cb(mockTxn));
  });

  describe('checkIn', () => {
    test('should create attendance record on check-in', async () => {
      db.Attendance.findOne.mockResolvedValue(null);
      const mockCreated = {
        id: 'att-1', employeeId: EMPLOYEE_ID, date: expect.any(String),
        checkIn: expect.any(Date), status: 'present'
      };
      db.Attendance.create.mockResolvedValue(mockCreated);

      const result = await attendanceService.checkIn(EMPLOYEE_ID, { source: 'web', notes: 'test' });

      expect(db.Attendance.findOne).toHaveBeenCalled();
      expect(db.Attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: EMPLOYEE_ID,
          source: 'web',
          notes: 'test'
        }),
        expect.objectContaining({ transaction: expect.anything() })
      );
      expect(result).toBeDefined();
    });

    test('should throw if already checked in today', async () => {
      db.Attendance.findOne.mockResolvedValue({ checkIn: new Date() });

      await expect(attendanceService.checkIn(EMPLOYEE_ID))
        .rejects.toThrow('Already checked in today');
    });

    test('should update existing record if present without check-in', async () => {
      const mockExisting = {
        checkIn: null,
        update: jest.fn().mockResolvedValue(true)
      };
      db.Attendance.findOne.mockResolvedValue(mockExisting);

      await attendanceService.checkIn(EMPLOYEE_ID, {});

      expect(mockExisting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'web'
        }),
        expect.objectContaining({ transaction: expect.anything() })
      );
    });
  });

  describe('checkOut', () => {
    test('should throw if no check-in found', async () => {
      db.Attendance.findOne.mockResolvedValue(null);

      await expect(attendanceService.checkOut(EMPLOYEE_ID))
        .rejects.toThrow('No check-in found for today');
    });

    test('should throw if already checked out', async () => {
      db.Attendance.findOne.mockResolvedValue({ checkIn: new Date(), checkOut: new Date() });

      await expect(attendanceService.checkOut(EMPLOYEE_ID))
        .rejects.toThrow('Already checked out today');
    });

    test('should record check-out and calculate hours', async () => {
      const checkInTime = new Date();
      checkInTime.setHours(checkInTime.getHours() - 9); // 9 hours ago
      const mockAttendance = {
        checkIn: checkInTime,
        checkOut: null,
        status: 'present',
        breakDuration: 60,
        notes: null,
        ipAddress: null,
        update: jest.fn().mockResolvedValue(true)
      };
      db.Attendance.findOne.mockResolvedValue(mockAttendance);

      await attendanceService.checkOut(EMPLOYEE_ID, { notes: 'done' });

      expect(mockAttendance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          checkOut: expect.any(Date),
          hoursWorked: expect.any(Number),
          overtimeHours: expect.any(Number),
          earlyLeaveMinutes: expect.any(Number),
          notes: 'done'
        }),
        expect.objectContaining({ transaction: expect.anything() })
      );
    });
  });

  describe('getTodayStatus', () => {
    test('should return attendance for today', async () => {
      const mockRecord = { id: 'att-1', status: 'present' };
      db.Attendance.findOne.mockResolvedValue(mockRecord);

      const result = await attendanceService.getTodayStatus(EMPLOYEE_ID);

      expect(db.Attendance.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ employeeId: EMPLOYEE_ID })
        })
      );
      expect(result).toEqual(mockRecord);
    });

    test('should return null if no attendance today', async () => {
      db.Attendance.findOne.mockResolvedValue(null);

      const result = await attendanceService.getTodayStatus(EMPLOYEE_ID);

      expect(result).toBeNull();
    });
  });

  describe('getEmployeeAttendance', () => {
    test('should return records within date range', async () => {
      const mockRecords = [
        { id: 'att-1', date: '2026-01-01', status: 'present' },
        { id: 'att-2', date: '2026-01-02', status: 'late' }
      ];
      db.Attendance.findAll.mockResolvedValue(mockRecords);

      const result = await attendanceService.getEmployeeAttendance(EMPLOYEE_ID, '2026-01-01', '2026-01-31');

      expect(db.Attendance.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('getDailyAttendance', () => {
    test('should return paginated daily attendance', async () => {
      db.Attendance.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: [{ id: 'att-1' }, { id: 'att-2' }]
      });

      const result = await attendanceService.getDailyAttendance('2026-01-15', { page: 1, limit: 50 });

      expect(db.Attendance.findAndCountAll).toHaveBeenCalled();
      expect(result).toEqual({
        data: [{ id: 'att-1' }, { id: 'att-2' }],
        totalCount: 2,
        totalPages: 1,
        currentPage: 1
      });
    });
  });

  describe('getMonthlyReport', () => {
    test('should generate monthly report with summary', async () => {
      // Mock: 2 attendance records in January
      const mockRecords = [
        { date: '2026-01-02', status: 'present', hoursWorked: 8, overtimeHours: 0 },
        { date: '2026-01-03', status: 'late', hoursWorked: 7.5, overtimeHours: 0 }
      ];
      db.Attendance.findAll.mockResolvedValue(mockRecords);
      holidayService.getHolidayDateSet.mockResolvedValue(new Set(['2026-01-01']));

      const result = await attendanceService.getMonthlyReport(EMPLOYEE_ID, 2026, 1);

      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalDays', 31);
      expect(result.summary).toHaveProperty('holidays', 1); // Jan 1
      expect(result.summary.presentDays).toBeGreaterThanOrEqual(1);
      expect(result.summary.totalHoursWorked).toBeGreaterThan(0);
    });
  });

  describe('markAttendance', () => {
    test('should create new manual attendance record', async () => {
      const mockAttendance = {
        id: 'att-new',
        update: jest.fn().mockResolvedValue(true)
      };
      db.Attendance.findOrCreate.mockResolvedValue([mockAttendance, true]);

      const result = await attendanceService.markAttendance({
        employeeId: EMPLOYEE_ID,
        date: '2026-01-15',
        status: 'present',
        notes: 'Manual entry',
        approvedBy: 'admin-id',
        source: 'manual'
      });

      expect(db.Attendance.findOrCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should update existing record if already exists', async () => {
      const mockAttendance = {
        id: 'att-existing',
        update: jest.fn().mockResolvedValue(true)
      };
      db.Attendance.findOrCreate.mockResolvedValue([mockAttendance, false]);

      await attendanceService.markAttendance({
        employeeId: EMPLOYEE_ID,
        date: '2026-01-15',
        status: 'absent',
        approvedBy: 'admin-id'
      });

      expect(mockAttendance.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'absent' })
      );
    });

    test('should recalculate hours when checkIn and checkOut provided', async () => {
      const mockAttendance = {
        id: 'att-calc',
        update: jest.fn().mockResolvedValue(true)
      };
      db.Attendance.findOrCreate.mockResolvedValue([mockAttendance, true]);

      await attendanceService.markAttendance({
        employeeId: EMPLOYEE_ID,
        date: '2026-01-15',
        status: 'present',
        checkIn: '2026-01-15T09:00:00Z',
        checkOut: '2026-01-15T18:00:00Z',
        approvedBy: 'admin-id'
      });

      // hoursWorked recalculation triggers second update call
      expect(mockAttendance.update).toHaveBeenCalledTimes(1); // findOrCreate was 'created', so no first update
      // But recalculation calls update again
      expect(mockAttendance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          hoursWorked: expect.any(Number),
          overtimeHours: expect.any(Number)
        })
      );
    });
  });

  describe('getAttendanceSummary', () => {
    test('should return status counts for date range', async () => {
      db.Attendance.findAll.mockResolvedValue([
        { status: 'present', getDataValue: jest.fn().mockReturnValue('10') },
        { status: 'late', getDataValue: jest.fn().mockReturnValue('3') },
        { status: 'absent', getDataValue: jest.fn().mockReturnValue('2') }
      ]);

      const result = await attendanceService.getAttendanceSummary('2026-01-01', '2026-01-31');

      expect(result).toEqual({
        present: 10,
        late: 3,
        absent: 2
      });
    });

    test('should return empty object when no records', async () => {
      db.Attendance.findAll.mockResolvedValue([]);

      const result = await attendanceService.getAttendanceSummary('2026-01-01', '2026-01-31');

      expect(result).toEqual({});
    });
  });
});
