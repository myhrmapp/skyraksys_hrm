'use strict';

/**
 * Migration: Add CHECK constraints for data integrity
 * DB-10: Missing domain-level validation
 * 
 * 1. timesheets: daily hours 0-24 for each day column
 * 2. positions: maxSalary >= minSalary (when both non-null)
 * 3. salary_structures: basicSalary >= 0
 * 4. timesheets: totalHoursWorked >= 0
 * 5. payroll_data: grossSalary >= 0, netSalary >= 0, totalDeductions >= 0
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const checks = [
      {
        name: 'chk_timesheets_monday_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_monday_hours 
              CHECK ("mondayHours" >= 0 AND "mondayHours" <= 24)`
      },
      {
        name: 'chk_timesheets_tuesday_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_tuesday_hours 
              CHECK ("tuesdayHours" >= 0 AND "tuesdayHours" <= 24)`
      },
      {
        name: 'chk_timesheets_wednesday_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_wednesday_hours 
              CHECK ("wednesdayHours" >= 0 AND "wednesdayHours" <= 24)`
      },
      {
        name: 'chk_timesheets_thursday_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_thursday_hours 
              CHECK ("thursdayHours" >= 0 AND "thursdayHours" <= 24)`
      },
      {
        name: 'chk_timesheets_friday_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_friday_hours 
              CHECK ("fridayHours" >= 0 AND "fridayHours" <= 24)`
      },
      {
        name: 'chk_timesheets_saturday_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_saturday_hours 
              CHECK ("saturdayHours" >= 0 AND "saturdayHours" <= 24)`
      },
      {
        name: 'chk_timesheets_sunday_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_sunday_hours 
              CHECK ("sundayHours" >= 0 AND "sundayHours" <= 24)`
      },
      {
        name: 'chk_timesheets_total_hours',
        sql: `ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_total_hours 
              CHECK ("totalHoursWorked" >= 0)`
      },
      {
        name: 'chk_positions_salary_range',
        sql: `ALTER TABLE positions ADD CONSTRAINT chk_positions_salary_range 
              CHECK ("maxSalary" IS NULL OR "minSalary" IS NULL OR "maxSalary" >= "minSalary")`
      },
      {
        name: 'chk_positions_min_salary_positive',
        sql: `ALTER TABLE positions ADD CONSTRAINT chk_positions_min_salary_positive 
              CHECK ("minSalary" IS NULL OR "minSalary" >= 0)`
      },
      {
        name: 'chk_positions_max_salary_positive',
        sql: `ALTER TABLE positions ADD CONSTRAINT chk_positions_max_salary_positive 
              CHECK ("maxSalary" IS NULL OR "maxSalary" >= 0)`
      },
      {
        name: 'chk_salary_structures_basic_positive',
        sql: `ALTER TABLE salary_structures ADD CONSTRAINT chk_salary_structures_basic_positive 
              CHECK ("basicSalary" >= 0)`
      },
      {
        name: 'chk_salary_structures_hra_positive',
        sql: `ALTER TABLE salary_structures ADD CONSTRAINT chk_salary_structures_hra_positive 
              CHECK (hra IS NULL OR hra >= 0)`
      },
      {
        name: 'chk_payroll_data_gross_positive',
        sql: `ALTER TABLE payroll_data ADD CONSTRAINT chk_payroll_data_gross_positive 
              CHECK ("grossSalary" >= 0)`
      },
      {
        name: 'chk_payroll_data_net_positive',
        sql: `ALTER TABLE payroll_data ADD CONSTRAINT chk_payroll_data_net_positive 
              CHECK ("netSalary" >= 0)`
      },
      {
        name: 'chk_payroll_data_deductions_positive',
        sql: `ALTER TABLE payroll_data ADD CONSTRAINT chk_payroll_data_deductions_positive 
              CHECK ("totalDeductions" >= 0)`
      }
    ];

    for (const chk of checks) {
      try {
        // Check if constraint already exists
        const [existing] = await queryInterface.sequelize.query(
          `SELECT constraint_name FROM information_schema.table_constraints 
           WHERE constraint_name = '${chk.name}' AND table_schema = 'public'`
        );
        if (existing.length > 0) {
          console.log(`⏭️  ${chk.name} already exists — skipping`);
          continue;
        }
        await queryInterface.sequelize.query(chk.sql);
        console.log(`✅  Added ${chk.name}`);
      } catch (error) {
        console.error(`❌  Failed to add ${chk.name}: ${error.message}`);
        // Don't throw — continue with remaining constraints
      }
    }
  },

  async down(queryInterface) {
    const constraints = [
      { table: 'timesheets', name: 'chk_timesheets_monday_hours' },
      { table: 'timesheets', name: 'chk_timesheets_tuesday_hours' },
      { table: 'timesheets', name: 'chk_timesheets_wednesday_hours' },
      { table: 'timesheets', name: 'chk_timesheets_thursday_hours' },
      { table: 'timesheets', name: 'chk_timesheets_friday_hours' },
      { table: 'timesheets', name: 'chk_timesheets_saturday_hours' },
      { table: 'timesheets', name: 'chk_timesheets_sunday_hours' },
      { table: 'timesheets', name: 'chk_timesheets_total_hours' },
      { table: 'positions', name: 'chk_positions_salary_range' },
      { table: 'positions', name: 'chk_positions_min_salary_positive' },
      { table: 'positions', name: 'chk_positions_max_salary_positive' },
      { table: 'salary_structures', name: 'chk_salary_structures_basic_positive' },
      { table: 'salary_structures', name: 'chk_salary_structures_hra_positive' },
      { table: 'payroll_data', name: 'chk_payroll_data_gross_positive' },
      { table: 'payroll_data', name: 'chk_payroll_data_net_positive' },
      { table: 'payroll_data', name: 'chk_payroll_data_deductions_positive' }
    ];
    for (const c of constraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${c.table} DROP CONSTRAINT IF EXISTS ${c.name}`
      );
    }
  }
};
