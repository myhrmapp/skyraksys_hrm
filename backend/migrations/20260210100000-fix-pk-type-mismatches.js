'use strict';

/**
 * Production-Readiness Migration: Fix PK Type Mismatches
 *
 * 1. payslip_audit_logs.id: Migration created INTEGER, model expects UUID → convert to UUID
 * 2. payroll_data.id / payslips.payrollDataId: Ensure both are INTEGER (model definition)
 *    and guard against the conditional UUID migration that may have run on an empty DB.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // =========================================================================
      // 1. Fix payslip_audit_logs.id: INTEGER → UUID
      // =========================================================================
      const [auditColInfo] = await queryInterface.sequelize.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'payslip_audit_logs' AND column_name = 'id'`,
        { transaction }
      );
      const auditIdType = auditColInfo?.[0]?.data_type;

      if (auditIdType && auditIdType !== 'uuid') {
        console.log(`payslip_audit_logs.id is "${auditIdType}" — converting to UUID...`);

        // Check if table has data
        const [[{ cnt }]] = await queryInterface.sequelize.query(
          'SELECT COUNT(*) AS cnt FROM payslip_audit_logs',
          { transaction }
        );

        if (parseInt(cnt, 10) === 0) {
          // Empty table — drop and recreate the id column as UUID
          // First drop the PK constraint
          await queryInterface.sequelize.query(
            'ALTER TABLE payslip_audit_logs DROP CONSTRAINT IF EXISTS payslip_audit_logs_pkey',
            { transaction }
          );
          await queryInterface.removeColumn('payslip_audit_logs', 'id', { transaction });
          await queryInterface.addColumn('payslip_audit_logs', 'id', {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()')
          }, { transaction });
        } else {
          // Has data — alter the column type in-place
          await queryInterface.sequelize.query(`
            ALTER TABLE payslip_audit_logs
              ALTER COLUMN id DROP DEFAULT,
              ALTER COLUMN id SET DATA TYPE UUID USING gen_random_uuid(),
              ALTER COLUMN id SET DEFAULT gen_random_uuid();
          `, { transaction });
        }
        console.log('✅  payslip_audit_logs.id converted to UUID');
      } else {
        console.log('⏭️  payslip_audit_logs.id is already UUID — skipping');
      }

      // =========================================================================
      // 2. Ensure payroll_data.id and payslips.payrollDataId are consistent
      //    Both models define INTEGER — verify DB matches
      // =========================================================================
      const [payrollColInfo] = await queryInterface.sequelize.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'payroll_data' AND column_name = 'id'`,
        { transaction }
      );
      const payrollIdType = payrollColInfo?.[0]?.data_type;

      if (payrollIdType === 'uuid') {
        // The conditional migration ran and converted to UUID — update models to match
        // Since we can't change data type back without data loss, log warning
        console.log('⚠️  payroll_data.id is UUID (conditional migration ran). Models need to be updated to UUID.');
        console.log('    Run: update PayrollData model id to DataTypes.UUID and Payslip model payrollDataId to DataTypes.UUID');
      } else {
        console.log(`✅  payroll_data.id is "${payrollIdType}" — matches model (INTEGER)`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverting UUID back to INTEGER is destructive — not recommended
    console.log('⚠️  Down migration for PK type fixes is a no-op. Manual intervention required.');
  }
};
