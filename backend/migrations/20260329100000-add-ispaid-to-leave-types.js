'use strict';

/**
 * Add isPaid column to leave_types table.
 * 
 * Most leave types are paid (sick, casual, earned, etc.).
 * Only LOP / sabbatical / unpaid leave will be marked isPaid=false.
 * Payroll uses this flag to determine salary deductions.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leave_types', 'isPaid', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this leave type is paid (true) or results in LOP deduction (false)'
    });

    // Mark common unpaid leave types as isPaid=false
    await queryInterface.sequelize.query(`
      UPDATE leave_types 
      SET "isPaid" = false 
      WHERE LOWER(name) IN ('loss of pay', 'lop', 'unpaid leave', 'sabbatical', 'leave without pay')
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('leave_types', 'isPaid');
  }
};
