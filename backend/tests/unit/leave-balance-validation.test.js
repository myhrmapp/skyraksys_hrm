/**
 * Unit Tests: Leave Balance Validation Service
 * 
 * Purpose: Test all validation rules for leave balance operations
 * - Negative balance prevention
 * - Balance calculation accuracy
 * - Accrual limit enforcement
 * - Carry forward validation
 * 
 * Created: February 5, 2026
 * Phase: Phase 1, Week 2, Day 1-2
 */

const leaveBalanceValidation = require('../../services/leave-balance-validation.service');

describe('Leave Balance Validation Service', () => {
  
  describe('validateLeaveBalance', () => {
    
    test('should validate correct leave balance data', () => {
      const data = {
        totalAccrued: 20,
        totalTaken: 5,
        totalPending: 3,
        carryForward: 2,
        balance: 14
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.calculatedBalance).toBe(14); // 20 + 2 - 5 - 3 = 14
    });

    test('should reject negative totalAccrued', () => {
      const data = {
        totalAccrued: -10,
        totalTaken: 0,
        totalPending: 0,
        carryForward: 0
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total accrued days cannot be negative');
    });

    test('should reject negative totalTaken', () => {
      const data = {
        totalAccrued: 20,
        totalTaken: -5,
        totalPending: 0,
        carryForward: 0
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total taken days cannot be negative');
    });

    test('should reject negative totalPending', () => {
      const data = {
        totalAccrued: 20,
        totalTaken: 0,
        totalPending: -3,
        carryForward: 0
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total pending days cannot be negative');
    });

    test('should reject negative carryForward', () => {
      const data = {
        totalAccrued: 20,
        totalTaken: 0,
        totalPending: 0,
        carryForward: -2
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Carry forward days cannot be negative');
    });

    test('should reject when totalTaken + totalPending exceeds totalAccrued + carryForward', () => {
      const data = {
        totalAccrued: 10,
        totalTaken: 8,
        totalPending: 5, // 8 + 5 = 13 > 10 + 0 = 10
        carryForward: 0
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds available days');
    });

    test('should reject negative calculated balance', () => {
      const data = {
        totalAccrued: 10,
        totalTaken: 12,
        totalPending: 0,
        carryForward: 0
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot be negative'))).toBe(true);
    });

    test('should reject when provided balance does not match calculated balance', () => {
      const data = {
        totalAccrued: 20,
        totalTaken: 5,
        totalPending: 3,
        carryForward: 0,
        balance: 50 // Should be 12
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match calculated balance'))).toBe(true);
    });

    test('should handle string inputs by converting to numbers', () => {
      const data = {
        totalAccrued: '20',
        totalTaken: '5',
        totalPending: '3',
        carryForward: '2'
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(true);
      expect(result.calculatedBalance).toBe(14);
    });

    test('should allow small floating point differences in balance', () => {
      const data = {
        totalAccrued: 20.5,
        totalTaken: 5.3,
        totalPending: 3.2,
        carryForward: 0,
        balance: 12.0 // Calculated: 20.5 - 5.3 - 3.2 = 12.0
      };

      const result = leaveBalanceValidation.validateLeaveBalance(data);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateBalanceAdjustment', () => {
    
    test('should validate valid balance adjustment', () => {
      const currentBalance = {
        totalAccrued: 20,
        totalTaken: 5,
        totalPending: 2,
        carryForward: 0,
        balance: 13
      };

      const adjustment = {
        totalTaken: 8 // Increase taken to 8
      };

      const result = leaveBalanceValidation.validateBalanceAdjustment(currentBalance, adjustment);

      expect(result.valid).toBe(true);
      expect(result.newBalance).toBe(10); // 20 - 8 - 2 = 10
    });

    test('should reject adjustment that would create negative balance', () => {
      const currentBalance = {
        totalAccrued: 10,
        totalTaken: 5,
        totalPending: 2,
        carryForward: 0,
        balance: 3
      };

      const adjustment = {
        totalTaken: 15 // Would make balance negative
      };

      const result = leaveBalanceValidation.validateBalanceAdjustment(currentBalance, adjustment);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject reducing totalAccrued below already used days', () => {
      const currentBalance = {
        totalAccrued: 20,
        totalTaken: 10,
        totalPending: 5,
        carryForward: 0,
        balance: 5
      };

      const adjustment = {
        totalAccrued: 12 // Employee already used 15 days (10 + 5)
      };

      const result = leaveBalanceValidation.validateBalanceAdjustment(currentBalance, adjustment);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('already used/pending'))).toBe(true);
    });

    test('should allow reducing totalAccrued if still above used days', () => {
      const currentBalance = {
        totalAccrued: 30,
        totalTaken: 10,
        totalPending: 5,
        carryForward: 0,
        balance: 15
      };

      const adjustment = {
        totalAccrued: 20 // Still above used 15 days
      };

      const result = leaveBalanceValidation.validateBalanceAdjustment(currentBalance, adjustment);

      expect(result.valid).toBe(true);
      expect(result.newBalance).toBe(5); // 20 - 10 - 5 = 5
    });
  });

  describe('validateLeaveApplication', () => {
    
    test('should validate valid leave application', () => {
      const leaveBalance = {
        balance: 10
      };

      const requestedDays = 5;

      const result = leaveBalanceValidation.validateLeaveApplication(leaveBalance, requestedDays);

      expect(result.valid).toBe(true);
      expect(result.remainingBalance).toBe(5);
    });

    test('should reject leave application exceeding balance', () => {
      const leaveBalance = {
        balance: 5
      };

      const requestedDays = 10;

      const result = leaveBalanceValidation.validateLeaveApplication(leaveBalance, requestedDays);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds available balance'))).toBe(true);
    });

    test('should reject zero or negative requested days', () => {
      const leaveBalance = {
        balance: 10
      };

      const requestedDays = 0;

      const result = leaveBalanceValidation.validateLeaveApplication(leaveBalance, requestedDays);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be greater than zero'))).toBe(true);
    });
  });

  describe('validateCarryForward', () => {
    
    test('should validate carry forward within limits', () => {
      const leaveType = {
        name: 'Annual Leave',
        carryForward: true,
        maxCarryForwardDays: 10
      };

      const currentBalance = 15;
      const proposedCarryForward = 8;

      const result = leaveBalanceValidation.validateCarryForward(leaveType, currentBalance, proposedCarryForward);

      expect(result.valid).toBe(true);
      expect(result.allowedCarryForward).toBe(8);
    });

    test('should reject carry forward when not allowed for leave type', () => {
      const leaveType = {
        name: 'Sick Leave',
        carryForward: false,
        maxCarryForwardDays: 0
      };

      const currentBalance = 10;
      const proposedCarryForward = 5;

      const result = leaveBalanceValidation.validateCarryForward(leaveType, currentBalance, proposedCarryForward);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
      expect(result.allowedCarryForward).toBe(0);
    });

    test('should reject carry forward exceeding maximum', () => {
      const leaveType = {
        name: 'Annual Leave',
        carryForward: true,
        maxCarryForwardDays: 10
      };

      const currentBalance = 20;
      const proposedCarryForward = 15; // Exceeds max of 10

      const result = leaveBalanceValidation.validateCarryForward(leaveType, currentBalance, proposedCarryForward);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    test('should reject carry forward exceeding current balance', () => {
      const leaveType = {
        name: 'Annual Leave',
        carryForward: true,
        maxCarryForwardDays: 10
      };

      const currentBalance = 5;
      const proposedCarryForward = 8; // Exceeds balance of 5

      const result = leaveBalanceValidation.validateCarryForward(leaveType, currentBalance, proposedCarryForward);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('current balance'))).toBe(true);
    });

    test('should cap carry forward at minimum of max, balance', () => {
      const leaveType = {
        name: 'Annual Leave',
        carryForward: true,
        maxCarryForwardDays: 10
      };

      const currentBalance = 7;
      const proposedCarryForward = 10; // Will be capped at balance (7)

      const result = leaveBalanceValidation.validateCarryForward(leaveType, currentBalance, proposedCarryForward);

      expect(result.valid).toBe(false); // Invalid because proposed > balance
      expect(result.allowedCarryForward).toBe(7); // Capped at balance
    });
  });

  describe('validateYearRollover', () => {
    
    test('should validate year rollover with carry forward', () => {
      const year = 2025;
      const currentYearBalance = {
        balance: 8
      };
      const leaveType = {
        name: 'Annual Leave',
        maxDaysPerYear: 20,
        carryForward: true,
        maxCarryForwardDays: 10
      };

      // Mock current year
      jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);

      const result = leaveBalanceValidation.validateYearRollover(year, currentYearBalance, leaveType);

      expect(result.valid).toBe(true);
      expect(result.nextYearData).toMatchObject({
        year: 2026,
        totalAccrued: 20,
        totalTaken: 0,
        totalPending: 0,
        carryForward: 8,
        balance: 28 // 20 + 8
      });

      jest.restoreAllMocks();
    });

    test('should reject rollover of current or future year', () => {
      const year = 2026;
      const currentYearBalance = {
        balance: 10
      };
      const leaveType = {
        name: 'Annual Leave',
        maxDaysPerYear: 20,
        carryForward: true,
        maxCarryForwardDays: 10
      };

      jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);

      const result = leaveBalanceValidation.validateYearRollover(year, currentYearBalance, leaveType);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Cannot rollover current or future year'))).toBe(true);

      jest.restoreAllMocks();
    });

    test('should handle zero carry forward when not allowed', () => {
      const year = 2025;
      const currentYearBalance = {
        balance: 10
      };
      const leaveType = {
        name: 'Sick Leave',
        maxDaysPerYear: 15,
        carryForward: false,
        maxCarryForwardDays: 0
      };

      jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);

      const result = leaveBalanceValidation.validateYearRollover(year, currentYearBalance, leaveType);

      // Should have errors because trying to carry forward when not allowed
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
      expect(result.nextYearData.carryForward).toBe(0);
      expect(result.nextYearData.balance).toBe(15); // Only new accrual, no carry

      jest.restoreAllMocks();
    });
  });
});
