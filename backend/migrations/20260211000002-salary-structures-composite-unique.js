'use strict';

/**
 * Migration: Add composite unique index on salary_structures (employeeId, effectiveFrom)
 * DB-14: Model defines this unique index but DB doesn't have it
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if index already exists
    const [existing] = await queryInterface.sequelize.query(
      `SELECT indexname FROM pg_indexes 
       WHERE tablename = 'salary_structures' AND indexname = 'uq_salary_structures_employee_effective'`
    );
    if (existing.length > 0) {
      console.log('⏭️  uq_salary_structures_employee_effective already exists — skipping');
      return;
    }

    await queryInterface.addIndex('salary_structures', ['employeeId', 'effectiveFrom'], {
      unique: true,
      name: 'uq_salary_structures_employee_effective'
    });
    console.log('✅  Added composite unique index on salary_structures(employeeId, effectiveFrom)');
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('salary_structures', 'uq_salary_structures_employee_effective');
  }
};
