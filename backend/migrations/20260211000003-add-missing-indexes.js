'use strict';

/**
 * Migration: Add missing indexes
 * DB-15: leave_requests.approvedBy index
 * DB-16: payslips (employeeId, status) composite index
 * DB-17: employees (departmentId, status) composite index
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const indexes = [
      {
        table: 'leave_requests',
        fields: ['approvedBy'],
        name: 'idx_leave_requests_approved_by',
        id: 'DB-15'
      },
      {
        table: 'payslips',
        fields: ['employeeId', 'status'],
        name: 'idx_payslips_employee_status',
        id: 'DB-16'
      },
      {
        table: 'employees',
        fields: ['departmentId', 'status'],
        name: 'idx_employees_department_status',
        id: 'DB-17'
      }
    ];

    for (const idx of indexes) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes 
         WHERE tablename = '${idx.table}' AND indexname = '${idx.name}'`
      );
      if (existing.length > 0) {
        console.log(`⏭️  ${idx.name} already exists — skipping (${idx.id})`);
        continue;
      }

      await queryInterface.addIndex(idx.table, idx.fields, { name: idx.name });
      console.log(`✅  Added index ${idx.name} on ${idx.table}(${idx.fields.join(', ')}) — ${idx.id}`);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leave_requests', 'idx_leave_requests_approved_by');
    await queryInterface.removeIndex('payslips', 'idx_payslips_employee_status');
    await queryInterface.removeIndex('employees', 'idx_employees_department_status');
  }
};
