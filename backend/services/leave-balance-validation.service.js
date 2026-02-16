/**
 * Leave Balance Validation Service
 * 
 * Purpose: Enforce business rules for leave balance operations
 * - Prevent negative balances
 * - Validate balance calculations
 * - Ensure totalTaken + totalPending ≤ totalAccrued + carryForward
 * 
 * Created: February 5, 2026
 * Phase: Phase 1, Week 2, Day 1-2
 */

class LeaveBalanceValidationService {
  /**
   * Validate leave balance data before creation or update
   * @param {Object} data - Leave balance data to validate
   * @param {number} data.totalAccrued - Total days accrued
   * @param {number} data.totalTaken - Total days taken
   * @param {number} data.totalPending - Total days pending approval
   * @param {number} data.carryForward - Days carried forward from previous year
   * @param {number} data.balance - Calculated balance
   * @returns {Object} { valid: boolean, errors: string[], calculatedBalance: number }
   */
  validateLeaveBalance(data) {
    const errors = [];
    const {
      totalAccrued = 0,
      totalTaken = 0,
      totalPending = 0,
      carryForward = 0,
      balance
    } = data;

    // Convert to numbers (handle string inputs from forms)
    const accrued = parseFloat(totalAccrued);
    const taken = parseFloat(totalTaken);
    const pending = parseFloat(totalPending);
    const carry = parseFloat(carryForward);

    // Rule 1: No negative values allowed
    if (accrued < 0) {
      errors.push('Total accrued days cannot be negative');
    }
    if (taken < 0) {
      errors.push('Total taken days cannot be negative');
    }
    if (pending < 0) {
      errors.push('Total pending days cannot be negative');
    }
    if (carry < 0) {
      errors.push('Carry forward days cannot be negative');
    }

    // Rule 2: Available days must not be exceeded
    const totalAvailable = accrued + carry;
    const totalUsed = taken + pending;

    if (totalUsed > totalAvailable) {
      errors.push(
        `Total taken (${taken}) + pending (${pending}) = ${totalUsed} exceeds ` +
        `available days (accrued ${accrued} + carry forward ${carry}) = ${totalAvailable}`
      );
    }

    // Rule 3: Calculate correct balance
    const calculatedBalance = totalAvailable - totalUsed;

    // Rule 4: Balance cannot be negative
    if (calculatedBalance < 0) {
      errors.push(`Calculated balance (${calculatedBalance.toFixed(2)}) cannot be negative`);
    }

    // Rule 5: If balance is provided, verify it matches calculation
    if (balance !== undefined && balance !== null) {
      const providedBalance = parseFloat(balance);
      const diff = Math.abs(providedBalance - calculatedBalance);
      
      // Allow small floating point differences (< 0.01)
      if (diff > 0.01) {
        errors.push(
          `Provided balance (${providedBalance.toFixed(2)}) does not match ` +
          `calculated balance (${calculatedBalance.toFixed(2)})`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      calculatedBalance: parseFloat(calculatedBalance.toFixed(2))
    };
  }

  /**
   * Validate balance adjustment operation
   * @param {Object} currentBalance - Current leave balance record
   * @param {Object} adjustment - Proposed adjustment
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateBalanceAdjustment(currentBalance, adjustment) {
    const errors = [];

    // Create new balance data by applying adjustment
    const newData = {
      totalAccrued: adjustment.totalAccrued ?? currentBalance.totalAccrued,
      totalTaken: adjustment.totalTaken ?? currentBalance.totalTaken,
      totalPending: adjustment.totalPending ?? currentBalance.totalPending,
      carryForward: adjustment.carryForward ?? currentBalance.carryForward
    };

    // Calculate what the new balance would be
    const validation = this.validateLeaveBalance(newData);

    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    // Additional rule: If reducing totalAccrued, ensure it doesn't go below already used days
    if (adjustment.totalAccrued !== undefined) {
      const newAccrued = parseFloat(adjustment.totalAccrued);
      const alreadyUsed = parseFloat(currentBalance.totalTaken) + parseFloat(currentBalance.totalPending);
      const availableWithCarry = newAccrued + parseFloat(currentBalance.carryForward);

      if (availableWithCarry < alreadyUsed) {
        errors.push(
          `Cannot reduce accrued days to ${newAccrued}. Employee has already used/pending ${alreadyUsed} days ` +
          `(available with carry forward would be ${availableWithCarry})`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      newBalance: validation.calculatedBalance
    };
  }

  /**
   * Validate leave application against balance
   * @param {Object} leaveBalance - Current leave balance
   * @param {number} requestedDays - Number of days being requested
   * @returns {Object} { valid: boolean, errors: string[], remainingBalance: number }
   */
  validateLeaveApplication(leaveBalance, requestedDays) {
    const errors = [];
    const days = parseFloat(requestedDays);

    if (days <= 0) {
      errors.push('Requested days must be greater than zero');
    }

    const currentBalance = parseFloat(leaveBalance.balance);

    if (days > currentBalance) {
      errors.push(
        `Requested ${days} days exceeds available balance of ${currentBalance} days`
      );
    }

    const remainingBalance = currentBalance - days;

    return {
      valid: errors.length === 0,
      errors,
      remainingBalance: parseFloat(remainingBalance.toFixed(2))
    };
  }

  /**
   * Validate carry forward amount
   * @param {Object} leaveType - Leave type configuration
   * @param {number} currentBalance - Current year balance
   * @param {number} proposedCarryForward - Proposed carry forward amount
   * @returns {Object} { valid: boolean, errors: string[], allowedCarryForward: number }
   */
  validateCarryForward(leaveType, currentBalance, proposedCarryForward) {
    const errors = [];
    const carry = parseFloat(proposedCarryForward);

    // Check if carry forward is allowed for this leave type
    if (!leaveType.carryForward) {
      if (carry > 0) {
        errors.push(`Carry forward is not allowed for leave type: ${leaveType.name}`);
      }
      return {
        valid: errors.length === 0,
        errors,
        allowedCarryForward: 0
      };
    }

    // Check maximum carry forward limit
    const maxCarry = parseFloat(leaveType.maxCarryForwardDays || 0);
    const balance = parseFloat(currentBalance);

    if (carry > maxCarry) {
      errors.push(
        `Carry forward ${carry} days exceeds maximum allowed ${maxCarry} days for ${leaveType.name}`
      );
    }

    if (carry > balance) {
      errors.push(
        `Cannot carry forward ${carry} days when current balance is only ${balance} days`
      );
    }

    if (carry < 0) {
      errors.push('Carry forward days cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
      allowedCarryForward: Math.min(carry, maxCarry, balance)
    };
  }

  /**
   * Validate year rollover operation
   * @param {number} year - Year being rolled over
   * @param {Object} currentYearBalance - Current year balance
   * @param {Object} leaveType - Leave type configuration
   * @returns {Object} { valid: boolean, errors: string[], nextYearData: Object }
   */
  validateYearRollover(year, currentYearBalance, leaveType) {
    const errors = [];
    const currentYear = new Date().getFullYear();

    // Validate year
    if (year >= currentYear) {
      errors.push(`Cannot rollover current or future year: ${year}`);
    }

    // Calculate carry forward
    const carryValidation = this.validateCarryForward(
      leaveType,
      currentYearBalance.balance,
      currentYearBalance.balance
    );

    if (!carryValidation.valid) {
      errors.push(...carryValidation.errors);
    }

    // Prepare next year data
    const nextYearData = {
      year: year + 1,
      totalAccrued: parseFloat(leaveType.maxDaysPerYear || 0),
      totalTaken: 0,
      totalPending: 0,
      carryForward: carryValidation.allowedCarryForward,
      balance: parseFloat(leaveType.maxDaysPerYear || 0) + carryValidation.allowedCarryForward
    };

    return {
      valid: errors.length === 0,
      errors,
      nextYearData
    };
  }
}

module.exports = new LeaveBalanceValidationService();
