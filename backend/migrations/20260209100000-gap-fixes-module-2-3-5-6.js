'use strict';

/**
 * Gap Remediation Migration — Modules 2, 3, 5, 6
 *
 * 2.1  Add unique constraint on salary_structures.employee_id
 * 3.4  Change audit_logs.user_id FK from SET NULL → RESTRICT
 * 5.1  Change payroll_data PK from INTEGER → UUID  (only if table is empty)
 * 6.4  Add unique constraints on payslip_templates.name and projects.name
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ── 2.1  Unique constraint on salary_structures.employeeId ────────────
      await queryInterface.addConstraint('salary_structures', {
        fields: ['employeeId'],
        type: 'unique',
        name: 'uq_salary_structures_employee_id',
        transaction
      });

      // ── 3.4  AuditLog FK: SET NULL → RESTRICT ────────────────────────────
      // Check if FK constraint exists before dropping (PG transactions abort on error)
      const [fkRows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM information_schema.table_constraints 
         WHERE constraint_name IN ('audit_logs_user_id_fkey', 'audit_logs_userId_fkey') 
         AND table_name = 'audit_logs'`,
        { transaction }
      );
      if (fkRows.length > 0) {
        const fkName = fkRows[0]['?column?'] ? 'audit_logs_user_id_fkey' : 'audit_logs_user_id_fkey';
        // Find the actual constraint name
        const [actualFk] = await queryInterface.sequelize.query(
          `SELECT constraint_name FROM information_schema.table_constraints 
           WHERE constraint_name IN ('audit_logs_user_id_fkey', 'audit_logs_userId_fkey') 
           AND table_name = 'audit_logs' LIMIT 1`,
          { transaction }
        );
        await queryInterface.removeConstraint('audit_logs', actualFk[0].constraint_name, { transaction });
      }
      await queryInterface.addConstraint('audit_logs', {
        fields: ['userId'],
        type: 'foreign key',
        name: 'audit_logs_user_id_fkey',
        references: { table: 'users', field: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction
      });

      // ── 5.1  PayrollData PK → UUID (only if table is empty) ──────────────
      const [results] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS cnt FROM payroll_data',
        { transaction }
      );
      const rowCount = parseInt(results[0].cnt, 10);

      if (rowCount === 0) {
        // Safe to convert PK
        // 1. Drop dependent FK on payslips first (check existence)
        const [payslipFk] = await queryInterface.sequelize.query(
          `SELECT constraint_name FROM information_schema.table_constraints 
           WHERE constraint_name IN ('payslips_payroll_data_id_fkey', 'payslips_payrollDataId_fkey') 
           AND table_name = 'payslips' LIMIT 1`,
          { transaction }
        );
        if (payslipFk.length > 0) {
          await queryInterface.removeConstraint('payslips', payslipFk[0].constraint_name, { transaction });
        }

        // 2. Drop old PK column & re-create as UUID PK using raw SQL
        //    (queryInterface.addColumn with primaryKey doesn't always create the PK constraint)
        await queryInterface.sequelize.query(
          `ALTER TABLE payroll_data DROP COLUMN id CASCADE`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `ALTER TABLE payroll_data ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL`,
          { transaction }
        );

        // 3. Change payslips.payrollDataId to UUID and add FK
        // Drop the column and recreate it (PostgreSQL can't cast INTEGER to UUID)
        await queryInterface.removeColumn('payslips', 'payrollDataId', { transaction });
        await queryInterface.addColumn('payslips', 'payrollDataId', {
          type: Sequelize.UUID,
          allowNull: true
        }, { transaction });
        await queryInterface.addConstraint('payslips', {
          fields: ['payrollDataId'],
          type: 'foreign key',
          name: 'payslips_payrollDataId_fkey',
          references: { table: 'payroll_data', field: 'id' },
          onDelete: 'SET NULL',
          transaction
        });

        console.log('✅  payroll_data PK converted to UUID (table was empty)');
      } else {
        console.log(`⏭️  payroll_data has ${rowCount} rows — skipping PK conversion`);
      }

      // ── 6.4  Unique constraints on names ──────────────────────────────────
      await queryInterface.addConstraint('payslip_templates', {
        fields: ['name'],
        type: 'unique',
        name: 'uq_payslip_templates_name',
        transaction
      });

      await queryInterface.addConstraint('projects', {
        fields: ['name'],
        type: 'unique',
        name: 'uq_projects_name',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Reverse 6.4
      await queryInterface.removeConstraint('projects', 'uq_projects_name', { transaction });
      await queryInterface.removeConstraint('payslip_templates', 'uq_payslip_templates_name', { transaction });

      // Reverse 3.4 — back to SET NULL
      try {
        await queryInterface.removeConstraint('audit_logs', 'audit_logs_user_id_fkey', { transaction });
      } catch (_e) { /* ignore */ }
      await queryInterface.addConstraint('audit_logs', {
        fields: ['userId'],
        type: 'foreign key',
        name: 'audit_logs_user_id_fkey',
        references: { table: 'users', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        transaction
      });

      // Reverse 2.1
      await queryInterface.removeConstraint('salary_structures', 'uq_salary_structures_employee_id', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
