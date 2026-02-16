'use strict';

/**
 * Migration: Gap Fixes — Modules 9, 10, 11
 * 
 * 11.1  — Add 15 missing DB indexes (model-defined but not in migrations)
 * 11.6  — CHECK constraints for date ranges (leave_requests, timesheets)
 * 11.7  — CHECK constraints for review ratings (1.0–5.0)
 * 11.20 — Drop unused updatedAt column from audit_logs
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // =========================================================================
      // 11.1 — Missing DB Indexes
      // =========================================================================

      // payslips indexes
      await queryInterface.addIndex('payslips', ['month', 'year'], {
        name: 'idx_payslips_month_year',
        transaction
      }).catch(() => {}); // Ignore if already exists

      await queryInterface.addIndex('payslips', ['templateId'], {
        name: 'idx_payslips_template_id',
        transaction
      }).catch(() => {});

      await queryInterface.addIndex('payslips', ['payrollDataId'], {
        name: 'idx_payslips_payroll_data_id',
        transaction
      }).catch(() => {});

      await queryInterface.addIndex('payslips', ['generatedBy'], {
        name: 'idx_payslips_generated_by',
        transaction
      }).catch(() => {});

      await queryInterface.addIndex('payslips', ['isLocked'], {
        name: 'idx_payslips_is_locked',
        transaction
      }).catch(() => {});

      // payroll_data indexes
      await queryInterface.addIndex('payroll_data', ['employeeId'], {
        name: 'idx_payroll_data_employee_id',
        transaction
      }).catch(() => {});

      await queryInterface.addIndex('payroll_data', ['payPeriod'], {
        name: 'idx_payroll_data_pay_period',
        transaction
      }).catch(() => {});

      // payslip_templates indexes
      await queryInterface.addIndex('payslip_templates', ['name'], {
        name: 'idx_payslip_templates_name',
        transaction
      }).catch(() => {});

      // system_configs indexes
      await queryInterface.addIndex('system_configs', ['category', 'key', 'version'], {
        name: 'idx_system_configs_cat_key_ver',
        transaction
      }).catch(() => {});

      await queryInterface.addIndex('system_configs', ['changedBy'], {
        name: 'idx_system_configs_changed_by',
        transaction
      }).catch(() => {});

      // employee_reviews indexes
      await queryInterface.addIndex('employee_reviews', ['reviewPeriod'], {
        name: 'idx_employee_reviews_review_period',
        transaction
      }).catch(() => {});

      // audit_logs indexes
      await queryInterface.addIndex('audit_logs', ['userId', 'action', 'createdAt'], {
        name: 'idx_audit_logs_user_action_created',
        transaction
      }).catch(() => {});

      await queryInterface.addIndex('audit_logs', ['entityType', 'entityId', 'createdAt'], {
        name: 'idx_audit_logs_entity_type_id_created',
        transaction
      }).catch(() => {});

      // payslip_audit_logs indexes
      await queryInterface.addIndex('payslip_audit_logs', ['action'], {
        name: 'idx_payslip_audit_logs_action',
        transaction
      }).catch(() => {});

      await queryInterface.addIndex('payslip_audit_logs', ['createdAt'], {
        name: 'idx_payslip_audit_logs_created_at',
        transaction
      }).catch(() => {});

      // =========================================================================
      // 11.6 — CHECK constraints for date ranges
      // =========================================================================

      // leave_requests: endDate >= startDate
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'chk_leave_requests_date_range'
          ) THEN
            ALTER TABLE leave_requests
              ADD CONSTRAINT chk_leave_requests_date_range
              CHECK ("endDate" >= "startDate");
          END IF;
        END $$;
      `, { transaction });

      // timesheets: weekEndDate >= weekStartDate
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_week_date_range'
          ) THEN
            ALTER TABLE timesheets
              ADD CONSTRAINT chk_timesheets_week_date_range
              CHECK ("weekEndDate" >= "weekStartDate");
          END IF;
        END $$;
      `, { transaction });

      // =========================================================================
      // 11.7 — CHECK constraints for review ratings (1.0–5.0)
      // =========================================================================

      const ratingColumns = [
        'overallRating',
        'technicalSkills',
        'communication',
        'teamwork',
        'leadership',
        'punctuality'
      ];

      for (const col of ratingColumns) {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_reviews_${col.toLowerCase()}'
            ) THEN
              ALTER TABLE employee_reviews
                ADD CONSTRAINT chk_employee_reviews_${col.toLowerCase()}
                CHECK ("${col}" IS NULL OR ("${col}" >= 1.0 AND "${col}" <= 5.0));
            END IF;
          END $$;
        `, { transaction });
      }

      // =========================================================================
      // 11.20 — Drop unused updatedAt from audit_logs (model sets updatedAt: false)
      // =========================================================================

      const [auditCols] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'updatedAt'
      `, { transaction });

      if (auditCols.length > 0) {
        await queryInterface.removeColumn('audit_logs', 'updatedAt', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Re-add updatedAt to audit_logs
      await queryInterface.addColumn('audit_logs', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction }).catch(() => {});

      // Remove CHECK constraints
      const ratingColumns = [
        'overallRating', 'technicalSkills', 'communication',
        'teamwork', 'leadership', 'punctuality'
      ];
      for (const col of ratingColumns) {
        await queryInterface.sequelize.query(
          `ALTER TABLE employee_reviews DROP CONSTRAINT IF EXISTS chk_employee_reviews_${col.toLowerCase()}`,
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS chk_timesheets_week_date_range`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS chk_leave_requests_date_range`,
        { transaction }
      );

      // Remove indexes
      const indexes = [
        { table: 'payslips', name: 'idx_payslips_month_year' },
        { table: 'payslips', name: 'idx_payslips_template_id' },
        { table: 'payslips', name: 'idx_payslips_payroll_data_id' },
        { table: 'payslips', name: 'idx_payslips_generated_by' },
        { table: 'payslips', name: 'idx_payslips_is_locked' },
        { table: 'payroll_data', name: 'idx_payroll_data_employee_id' },
        { table: 'payroll_data', name: 'idx_payroll_data_pay_period' },
        { table: 'payslip_templates', name: 'idx_payslip_templates_name' },
        { table: 'system_configs', name: 'idx_system_configs_cat_key_ver' },
        { table: 'system_configs', name: 'idx_system_configs_changed_by' },
        { table: 'employee_reviews', name: 'idx_employee_reviews_review_period' },
        { table: 'audit_logs', name: 'idx_audit_logs_user_action_created' },
        { table: 'audit_logs', name: 'idx_audit_logs_entity_type_id_created' },
        { table: 'payslip_audit_logs', name: 'idx_payslip_audit_logs_action' },
        { table: 'payslip_audit_logs', name: 'idx_payslip_audit_logs_created_at' }
      ];

      for (const idx of indexes) {
        await queryInterface.removeIndex(idx.table, idx.name, { transaction }).catch(() => {});
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
