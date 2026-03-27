/**
 * Leave Accrual Service (GAP Item 12.2)
 * 
 * Automates monthly leave accrual based on LeaveType.maxDaysPerYear.
 * Handles carry-forward at year-end. Designed to run via cron scheduler.
 * 
 * Accrual Logic:
 *   monthlyAccrual = maxDaysPerYear / 12
 *   Runs on 1st of each month, accruing for the CURRENT month
 * 
 * Year-End Logic:
 *   Run carry-forward on Jan 1st before January accrual:
 *   - If leaveType.carryForward=true, carry min(remaining, maxCarryForwardDays)
 *   - Otherwise reset balance to 0
 */

const { Op } = require('sequelize');
const logger = require('../utils/logger');
const db = require('../models');

class LeaveAccrualService {
  /**
   * Run monthly accrual for all active employees and active leave types
   * Should be called on the 1st of each month
   */
  async runMonthlyAccrual(year, month) {
    logger.info(`Starting monthly leave accrual for ${year}-${String(month).padStart(2, '0')}`);

    const activeLeaveTypes = await db.LeaveType.findAll({ where: { isActive: true } });
    const activeEmployees = await db.Employee.findAll({
      where: { status: 'Active' },
      attributes: ['id']
    });

    if (activeLeaveTypes.length === 0 || activeEmployees.length === 0) {
      logger.info('No active leave types or employees found — skipping accrual');
      return { processed: 0, skipped: 0 };
    }

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const employee of activeEmployees) {
      for (const leaveType of activeLeaveTypes) {
        try {
          const result = await this.accrueForEmployee(employee.id, leaveType, year, month);
          if (result) processed++;
          else skipped++;
        } catch (err) {
          errors++;
          logger.error(`Accrual error for employee=${employee.id}, leaveType=${leaveType.id}`, {
            error: err.message
          });
        }
      }
    }

    logger.info(`Monthly accrual complete: processed=${processed}, skipped=${skipped}, errors=${errors}`);
    return { processed, skipped, errors };
  }

  /**
   * Accrue leave for a single employee + leave type for a given month
   */
  async accrueForEmployee(employeeId, leaveType, year, month) {
    const monthlyAccrual = parseFloat((leaveType.maxDaysPerYear / 12).toFixed(2));

    // Find or create the leave balance record for this year
    const [balance, created] = await db.LeaveBalance.findOrCreate({
      where: {
        employeeId,
        leaveTypeId: leaveType.id,
        year
      },
      defaults: {
        employeeId,
        leaveTypeId: leaveType.id,
        year,
        totalAccrued: 0,
        totalTaken: 0,
        totalPending: 0,
        balance: 0,
        carryForward: 0
      }
    });

    // Check if this month's accrual would exceed the annual max
    const currentAccrued = parseFloat(balance.totalAccrued || 0);
    const maxForYear = parseFloat(leaveType.maxDaysPerYear);

    if (currentAccrued >= maxForYear) {
      // Already at max — skip
      return false;
    }

    // Calculate the accrual amount (cap at annual max)
    const accrualAmount = Math.min(monthlyAccrual, maxForYear - currentAccrued);
    const newTotalAccrued = parseFloat((currentAccrued + accrualAmount).toFixed(2));
    const newBalance = parseFloat((parseFloat(balance.balance || 0) + accrualAmount).toFixed(2));

    await balance.update({
      totalAccrued: newTotalAccrued,
      balance: newBalance
    });

    logger.debug(`Accrued ${accrualAmount} days for employee=${employeeId}, type=${leaveType.name}, total=${newTotalAccrued}`);
    return true;
  }

  /**
   * Run year-end carry-forward logic
   * Should be called on Jan 1st BEFORE the January accrual
   */
  async runYearEndCarryForward(newYear) {
    const previousYear = newYear - 1;
    logger.info(`Running year-end carry-forward from ${previousYear} to ${newYear}`);

    const activeLeaveTypes = await db.LeaveType.findAll({ where: { isActive: true } });
    const previousBalances = await db.LeaveBalance.findAll({
      where: { year: previousYear },
      include: [{ model: db.LeaveType, as: 'leaveType' }]
    });

    let carried = 0;
    let reset = 0;

    for (const prevBalance of previousBalances) {
      const leaveType = prevBalance.leaveType || activeLeaveTypes.find(lt => lt.id === prevBalance.leaveTypeId);
      if (!leaveType) continue;

      const remaining = parseFloat(prevBalance.balance || 0);
      let carryAmount = 0;

      if (leaveType.carryForward && remaining > 0) {
        const maxCarry = parseFloat(leaveType.maxCarryForwardDays || 0);
        carryAmount = maxCarry > 0 ? Math.min(remaining, maxCarry) : 0;
      }

      // Create or update the new year's balance record
      const [newBalance] = await db.LeaveBalance.findOrCreate({
        where: {
          employeeId: prevBalance.employeeId,
          leaveTypeId: prevBalance.leaveTypeId,
          year: newYear
        },
        defaults: {
          employeeId: prevBalance.employeeId,
          leaveTypeId: prevBalance.leaveTypeId,
          year: newYear,
          totalAccrued: 0,
          totalTaken: 0,
          totalPending: 0,
          balance: carryAmount,
          carryForward: carryAmount
        }
      });

      // If record already existed, update carry-forward
      if (newBalance.carryForward !== carryAmount) {
        await newBalance.update({
          carryForward: carryAmount,
          balance: parseFloat((parseFloat(newBalance.balance || 0) + carryAmount).toFixed(2))
        });
      }

      if (carryAmount > 0) {
        carried++;
        logger.debug(`Carried forward ${carryAmount} days for employee=${prevBalance.employeeId}, type=${leaveType.name}`);
      } else {
        reset++;
      }
    }

    logger.info(`Year-end carry-forward complete: carried=${carried}, reset=${reset}`);
    return { carried, reset };
  }

  /**
   * Get accrual status/preview for all employees (admin view)
   */
  async getAccrualStatus(year) {
    const balances = await db.LeaveBalance.findAll({
      where: { year },
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'firstName', 'lastName'],
          where: { deletedAt: null },  // exclude soft-deleted employees
          required: true               // INNER JOIN — skip balances with no active employee
        },
        { model: db.LeaveType, as: 'leaveType', attributes: ['id', 'name', 'maxDaysPerYear'] }
      ],
      order: [['employeeId', 'ASC']]
    });

    return balances;
  }

  /**
   * Preview what the next accrual would do (dry-run)
   */
  async previewAccrual(year, month) {
    const activeLeaveTypes = await db.LeaveType.findAll({ where: { isActive: true } });
    const activeEmployees = await db.Employee.findAll({
      where: { status: 'Active' },
      attributes: ['id', 'employeeId', 'firstName', 'lastName']
    });

    const preview = [];

    for (const employee of activeEmployees) {
      for (const leaveType of activeLeaveTypes) {
        const monthlyAccrual = parseFloat((leaveType.maxDaysPerYear / 12).toFixed(2));
        const balance = await db.LeaveBalance.findOne({
          where: { employeeId: employee.id, leaveTypeId: leaveType.id, year }
        });

        const currentAccrued = parseFloat(balance?.totalAccrued || 0);
        const maxForYear = parseFloat(leaveType.maxDaysPerYear);
        const wouldAccrue = currentAccrued >= maxForYear ? 0 : Math.min(monthlyAccrual, maxForYear - currentAccrued);

        preview.push({
          employee: { id: employee.id, employeeId: employee.employeeId, name: `${employee.firstName} ${employee.lastName}` },
          leaveType: { id: leaveType.id, name: leaveType.name },
          currentAccrued,
          wouldAccrue,
          newTotal: parseFloat((currentAccrued + wouldAccrue).toFixed(2)),
          atMax: currentAccrued >= maxForYear
        });
      }
    }

    return preview;
  }
}

module.exports = new LeaveAccrualService();
