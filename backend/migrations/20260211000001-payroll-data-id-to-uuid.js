'use strict';

/**
 * Migration: Convert payroll_data.id from INTEGER to UUID
 * Also converts payslips.payrollDataId from INTEGER to UUID to maintain FK
 * 
 * DB-3: PayrollData PK type mismatch — model says UUID, DB has INTEGER
 * 
 * Current state: payroll_data has 1 row, payslips has 1 row referencing it
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Check current type — only run if still INTEGER
      const [colInfo] = await queryInterface.sequelize.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'payroll_data' AND column_name = 'id'`,
        { transaction }
      );
      
      if (!colInfo[0] || colInfo[0].data_type === 'uuid') {
        console.log('⏭️  payroll_data.id is already UUID — skipping');
        await transaction.commit();
        return;
      }

      console.log('Converting payroll_data.id from INTEGER to UUID...');

      // 1. Add temporary UUID column to payroll_data
      await queryInterface.sequelize.query(
        `ALTER TABLE payroll_data ADD COLUMN id_new UUID DEFAULT gen_random_uuid()`,
        { transaction }
      );

      // 2. Generate UUIDs for existing rows
      await queryInterface.sequelize.query(
        `UPDATE payroll_data SET id_new = gen_random_uuid() WHERE id_new IS NULL`,
        { transaction }
      );

      // 3. Add temporary UUID column to payslips for the FK
      await queryInterface.sequelize.query(
        `ALTER TABLE payslips ADD COLUMN "payrollDataId_new" UUID`,
        { transaction }
      );

      // 4. Map existing INTEGER references to new UUIDs
      await queryInterface.sequelize.query(
        `UPDATE payslips SET "payrollDataId_new" = pd.id_new 
         FROM payroll_data pd WHERE payslips."payrollDataId" = pd.id`,
        { transaction }
      );

      // 5. Drop the FK constraint from payslips → payroll_data
      await queryInterface.sequelize.query(
        `ALTER TABLE payslips DROP CONSTRAINT IF EXISTS "payslips_payrollDataId_fkey"`,
        { transaction }
      );

      // 6. Drop old INTEGER columns
      await queryInterface.sequelize.query(
        `ALTER TABLE payslips DROP COLUMN "payrollDataId"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE payslips RENAME COLUMN "payrollDataId_new" TO "payrollDataId"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE payslips ALTER COLUMN "payrollDataId" SET NOT NULL`,
        { transaction }
      );

      // 7. Drop old PK, sequence, and swap id
      await queryInterface.sequelize.query(
        `ALTER TABLE payroll_data DROP CONSTRAINT payroll_data_pkey`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE payroll_data DROP COLUMN id`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE payroll_data RENAME COLUMN id_new TO id`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE payroll_data ADD PRIMARY KEY (id)`,
        { transaction }
      );

      // 8. Drop the old sequence
      await queryInterface.sequelize.query(
        `DROP SEQUENCE IF EXISTS payroll_data_id_seq`,
        { transaction }
      );

      // 9. Re-add FK from payslips → payroll_data
      await queryInterface.sequelize.query(
        `ALTER TABLE payslips ADD CONSTRAINT "payslips_payrollDataId_fkey" 
         FOREIGN KEY ("payrollDataId") REFERENCES payroll_data(id) 
         ON DELETE CASCADE ON UPDATE CASCADE`,
        { transaction }
      );

      // 10. Re-add index on payslips.payrollDataId
      await queryInterface.addIndex('payslips', ['payrollDataId'], {
        name: 'idx_payslips_payroll_data',
        transaction
      });

      console.log('✅  payroll_data.id converted to UUID');
      console.log('✅  payslips.payrollDataId converted to UUID');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌  Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️  Reverting UUID to INTEGER is destructive — manual intervention required.');
  }
};
