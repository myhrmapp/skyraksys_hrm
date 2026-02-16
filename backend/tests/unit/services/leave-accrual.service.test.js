/**
 * Unit Tests: Leave Accrual Service (GAP Item 12.2)
 * 
 * Tests: runMonthlyAccrual, accrueForEmployee, runYearEndCarryForward,
 *        getAccrualStatus, previewAccrual
 */

jest.mock('../../../models', () => ({
  LeaveType: {
    findAll: jest.fn(),
  },
  Employee: {
    findAll: jest.fn(),
  },
  LeaveBalance: {
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  sequelize: {},
  Sequelize: {}
}));

const db = require('../../../models');
const leaveAccrualService = require('../../../services/leave-accrual.service');

describe('LeaveAccrualService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runMonthlyAccrual', () => {
    test('should skip when no active leave types', async () => {
      db.LeaveType.findAll.mockResolvedValue([]);
      db.Employee.findAll.mockResolvedValue([{ id: 'emp-1' }]);

      const result = await leaveAccrualService.runMonthlyAccrual(2026, 1);

      expect(result).toEqual({ processed: 0, skipped: 0 });
    });

    test('should skip when no active employees', async () => {
      db.LeaveType.findAll.mockResolvedValue([{ id: 'lt-1', maxDaysPerYear: 21, isActive: true }]);
      db.Employee.findAll.mockResolvedValue([]);

      const result = await leaveAccrualService.runMonthlyAccrual(2026, 1);

      expect(result).toEqual({ processed: 0, skipped: 0 });
    });

    test('should process accrual for each employee-leaveType combination', async () => {
      const leaveType = { id: 'lt-1', name: 'Annual', maxDaysPerYear: 24, isActive: true };
      const employee = { id: 'emp-1' };
      db.LeaveType.findAll.mockResolvedValue([leaveType]);
      db.Employee.findAll.mockResolvedValue([employee]);

      // Mock accrueForEmployee — findOrCreate returns new balance
      const mockBalance = {
        totalAccrued: 0, balance: 0,
        update: jest.fn().mockResolvedValue(true)
      };
      db.LeaveBalance.findOrCreate.mockResolvedValue([mockBalance, true]);

      const result = await leaveAccrualService.runMonthlyAccrual(2026, 1);

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAccrued: 2, // 24/12 = 2
          balance: 2
        })
      );
    });

    test('should query employees with Active status (capitalized)', async () => {
      db.LeaveType.findAll.mockResolvedValue([]);
      db.Employee.findAll.mockResolvedValue([]);

      await leaveAccrualService.runMonthlyAccrual(2026, 1);

      expect(db.Employee.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'Active' }
        })
      );
    });
  });

  describe('accrueForEmployee', () => {
    const leaveType = { id: 'lt-1', name: 'Annual', maxDaysPerYear: 24 };

    test('should create balance record and accrue monthly amount', async () => {
      const mockBalance = {
        totalAccrued: 0, balance: 0,
        update: jest.fn().mockResolvedValue(true)
      };
      db.LeaveBalance.findOrCreate.mockResolvedValue([mockBalance, true]);

      const result = await leaveAccrualService.accrueForEmployee('emp-1', leaveType, 2026, 1);

      expect(result).toBe(true);
      expect(mockBalance.update).toHaveBeenCalledWith({
        totalAccrued: 2, // 24/12
        balance: 2
      });
    });

    test('should skip if already at yearly max', async () => {
      const mockBalance = {
        totalAccrued: 24, balance: 20, // At max
        update: jest.fn()
      };
      db.LeaveBalance.findOrCreate.mockResolvedValue([mockBalance, false]);

      const result = await leaveAccrualService.accrueForEmployee('emp-1', leaveType, 2026, 12);

      expect(result).toBe(false);
      expect(mockBalance.update).not.toHaveBeenCalled();
    });

    test('should cap accrual to not exceed annual max', async () => {
      const mockBalance = {
        totalAccrued: 23, balance: 15, // 1 away from max
        update: jest.fn().mockResolvedValue(true)
      };
      db.LeaveBalance.findOrCreate.mockResolvedValue([mockBalance, false]);

      const result = await leaveAccrualService.accrueForEmployee('emp-1', leaveType, 2026, 12);

      expect(result).toBe(true);
      // Should accrue only 1 (cap at 24), not 2
      expect(mockBalance.update).toHaveBeenCalledWith({
        totalAccrued: 24,
        balance: 16
      });
    });
  });

  describe('runYearEndCarryForward', () => {
    test('should carry forward allowed balance', async () => {
      const leaveType = {
        id: 'lt-1', name: 'Annual', maxDaysPerYear: 24,
        carryForward: true, maxCarryForwardDays: 5
      };
      db.LeaveType.findAll.mockResolvedValue([leaveType]);

      const prevBalance = {
        employeeId: 'emp-1', leaveTypeId: 'lt-1',
        balance: 8, // 8 days remaining
        leaveType
      };
      db.LeaveBalance.findAll.mockResolvedValue([prevBalance]);

      const newBalance = {
        carryForward: 0, balance: 0,
        update: jest.fn().mockResolvedValue(true)
      };
      db.LeaveBalance.findOrCreate.mockResolvedValue([newBalance, true]);

      const result = await leaveAccrualService.runYearEndCarryForward(2026);

      expect(result.carried).toBe(1);
      // Should carry min(8, 5) = 5
      expect(db.LeaveBalance.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            carryForward: 5,
            balance: 5
          })
        })
      );
    });

    test('should reset balance when carryForward is false', async () => {
      const leaveType = {
        id: 'lt-1', name: 'Sick', maxDaysPerYear: 10,
        carryForward: false, maxCarryForwardDays: 0
      };
      db.LeaveType.findAll.mockResolvedValue([leaveType]);

      const prevBalance = {
        employeeId: 'emp-1', leaveTypeId: 'lt-1',
        balance: 5,
        leaveType
      };
      db.LeaveBalance.findAll.mockResolvedValue([prevBalance]);

      const newBalance = {
        carryForward: 0, balance: 0,
        update: jest.fn()
      };
      db.LeaveBalance.findOrCreate.mockResolvedValue([newBalance, true]);

      const result = await leaveAccrualService.runYearEndCarryForward(2026);

      expect(result.reset).toBe(1);
      expect(result.carried).toBe(0);
      expect(db.LeaveBalance.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          defaults: expect.objectContaining({
            carryForward: 0,
            balance: 0
          })
        })
      );
    });

    test('should handle empty previous year balances', async () => {
      db.LeaveType.findAll.mockResolvedValue([]);
      db.LeaveBalance.findAll.mockResolvedValue([]);

      const result = await leaveAccrualService.runYearEndCarryForward(2026);

      expect(result).toEqual({ carried: 0, reset: 0 });
    });
  });

  describe('getAccrualStatus', () => {
    test('should return balances with employee and leaveType includes', async () => {
      const mockBalances = [
        { id: 'bal-1', employeeId: 'emp-1', totalAccrued: 10, balance: 8 }
      ];
      db.LeaveBalance.findAll.mockResolvedValue(mockBalances);

      const result = await leaveAccrualService.getAccrualStatus(2026);

      expect(db.LeaveBalance.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { year: 2026 },
          include: expect.arrayContaining([
            expect.objectContaining({ as: 'employee' }),
            expect.objectContaining({ as: 'leaveType' })
          ])
        })
      );
      expect(result).toEqual(mockBalances);
    });
  });

  describe('previewAccrual', () => {
    test('should return preview of what next accrual would do', async () => {
      const leaveType = { id: 'lt-1', name: 'Annual', maxDaysPerYear: 24 };
      const employee = { id: 'emp-1', employeeId: 'EMP001', firstName: 'John', lastName: 'Doe' };

      db.LeaveType.findAll.mockResolvedValue([leaveType]);
      db.Employee.findAll.mockResolvedValue([employee]);
      db.LeaveBalance.findOne.mockResolvedValue({ totalAccrued: 10 });

      const result = await leaveAccrualService.previewAccrual(2026, 6);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        employee: expect.objectContaining({ id: 'emp-1', name: 'John Doe' }),
        leaveType: expect.objectContaining({ id: 'lt-1', name: 'Annual' }),
        currentAccrued: 10,
        wouldAccrue: 2, // 24/12
        newTotal: 12,
        atMax: false
      }));
    });

    test('should show atMax when employee already at yearly cap', async () => {
      const leaveType = { id: 'lt-1', name: 'Annual', maxDaysPerYear: 24 };
      const employee = { id: 'emp-1', employeeId: 'EMP001', firstName: 'John', lastName: 'Doe' };

      db.LeaveType.findAll.mockResolvedValue([leaveType]);
      db.Employee.findAll.mockResolvedValue([employee]);
      db.LeaveBalance.findOne.mockResolvedValue({ totalAccrued: 24 });

      const result = await leaveAccrualService.previewAccrual(2026, 12);

      expect(result[0].atMax).toBe(true);
      expect(result[0].wouldAccrue).toBe(0);
    });

    test('should query employees with Active status', async () => {
      db.LeaveType.findAll.mockResolvedValue([]);
      db.Employee.findAll.mockResolvedValue([]);

      await leaveAccrualService.previewAccrual(2026, 1);

      expect(db.Employee.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'Active' }
        })
      );
    });
  });
});
