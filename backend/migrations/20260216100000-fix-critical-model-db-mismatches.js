'use strict';

/**
 * Migration: Fix Critical Model-DB Mismatches
 * 
 * ISSUE 1 (HIGH): salary_structures has conflicting unique constraints
 * - uq_salary_structures_employee_id (single column) blocks salary history
 * - uq_salary_structures_employee_effective (composite) is the correct one
 * - Solution: Drop the single-column unique constraint
 * 
 * ISSUE 2 (MEDIUM): payslips.payrollDataId mismatches
 * - Model: allowNull: false, onDelete: RESTRICT
 * - DB (fresh): allowNull: true, onDelete: SET NULL
 * - Solution: Set NOT NULL + change FK to ON DELETE RESTRICT
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('\n=== Fixing Critical Model-DB Mismatches ===\n');

      // ============================================================
      // FIX 1: Remove single-column unique on salary_structures.employeeId
      // ============================================================
      console.log('1. Checking salary_structures unique constraints...');
      
      // Check if the problematic constraint exists
      const [salaryConstraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'salary_structures'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'uq_salary_structures_employee_id';
      `, { transaction });

      if (salaryConstraints.length > 0) {
        console.log('   → Dropping uq_salary_structures_employee_id (blocks salary history)...');
        await queryInterface.removeConstraint(
          'salary_structures',
          'uq_salary_structures_employee_id',
          { transaction }
        );
        console.log('   ✓ Constraint dropped');
      } else {
        console.log('   ℹ Constraint already removed or never existed');
      }

      // ============================================================
      // FIX 2: Align payslips.payrollDataId with model
      // ============================================================
      console.log('\n2. Fixing payslips.payrollDataId...');

      // Check current state
      const [payrollDataIdInfo] = await queryInterface.sequelize.query(`
        SELECT 
          c.is_nullable,
          tc.constraint_name,
          rc.delete_rule
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu
          ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
        LEFT JOIN information_schema.table_constraints tc
          ON kcu.constraint_name = tc.constraint_name
        LEFT JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE c.table_name = 'payslips'
          AND c.column_name = 'payrollDataId'
          AND tc.constraint_type = 'FOREIGN KEY';
      `, { transaction });

      const isNullable = payrollDataIdInfo[0]?.is_nullable === 'YES';
      const currentFkName = payrollDataIdInfo[0]?.constraint_name;
      const currentDeleteRule = payrollDataIdInfo[0]?.delete_rule;

      console.log(`   Current state: allowNull=${isNullable}, FK onDelete=${currentDeleteRule || 'N/A'}`);

      // Step 2a: Set NOT NULL if currently nullable
      if (isNullable) {
        // Check for NULL values first
        const [nullCount] = await queryInterface.sequelize.query(`
          SELECT COUNT(*) as count FROM payslips WHERE "payrollDataId" IS NULL;
        `, { transaction });

        if (parseInt(nullCount[0].count) > 0) {
          console.warn(`   ⚠ WARNING: ${nullCount[0].count} payslips have NULL payrollDataId`);
          console.warn('   → Skipping NOT NULL constraint (would fail). Fix data first.');
        } else {
          console.log('   → Setting payrollDataId to NOT NULL...');
          await queryInterface.changeColumn('payslips', 'payrollDataId', {
            type: Sequelize.UUID,
            allowNull: false
          }, { transaction });
          console.log('   ✓ Column set to NOT NULL');
        }
      } else {
        console.log('   ℹ Column already NOT NULL');
      }

      // Step 2b: Change FK onDelete to RESTRICT if it's SET NULL
      if (currentFkName && currentDeleteRule !== 'RESTRICT') {
        console.log(`   → Changing FK from onDelete: ${currentDeleteRule} to RESTRICT...`);
        
        // Drop existing FK
        await queryInterface.removeConstraint(
          'payslips',
          currentFkName,
          { transaction }
        );
        console.log(`   ✓ Dropped FK: ${currentFkName}`);

        // Recreate FK with RESTRICT
        await queryInterface.addConstraint('payslips', {
          fields: ['payrollDataId'],
          type: 'foreign key',
          name: currentFkName, // Use the same name
          references: {
            table: 'payroll_data',
            field: 'id'
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
          transaction
        });
        console.log(`   ✓ Recreated FK with onDelete: RESTRICT`);
      } else if (currentDeleteRule === 'RESTRICT') {
        console.log('   ℹ FK already uses onDelete: RESTRICT');
      } else {
        console.log('   ⚠ No FK found - may need manual inspection');
      }

      // ============================================================
      // Verification
      // ============================================================
      console.log('\n3. Verifying fixes...');
      
      const [finalCheck] = await queryInterface.sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM information_schema.table_constraints 
           WHERE table_name = 'salary_structures' 
           AND constraint_name = 'uq_salary_structures_employee_id') as bad_unique_exists,
          (SELECT COUNT(*) FROM information_schema.table_constraints 
           WHERE table_name = 'salary_structures' 
           AND constraint_name = 'uq_salary_structures_employee_effective') as good_unique_exists,
          (SELECT is_nullable FROM information_schema.columns 
           WHERE table_name = 'payslips' AND column_name = 'payrollDataId') as payroll_nullable,
          (SELECT delete_rule FROM information_schema.referential_constraints rc
           JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
           WHERE tc.table_name = 'payslips' AND tc.constraint_type = 'FOREIGN KEY'
           AND EXISTS (
             SELECT 1 FROM information_schema.key_column_usage 
             WHERE constraint_name = tc.constraint_name AND column_name = 'payrollDataId'
           )) as payroll_delete_rule;
      `, { transaction });

      const checks = finalCheck[0];
      console.log('\n   Final State:');
      console.log(`   - salary_structures single-column unique: ${checks.bad_unique_exists === '0' ? '✓ REMOVED' : '✗ STILL EXISTS'}`);
      console.log(`   - salary_structures composite unique: ${checks.good_unique_exists === '1' ? '✓ EXISTS' : '✗ MISSING'}`);
      console.log(`   - payslips.payrollDataId nullable: ${checks.payroll_nullable === 'NO' ? '✓ NOT NULL' : '⚠ NULLABLE'}`);
      console.log(`   - payslips.payrollDataId FK onDelete: ${checks.payroll_delete_rule === 'RESTRICT' ? '✓ RESTRICT' : `⚠ ${checks.payroll_delete_rule || 'UNKNOWN'}`}`);

      await transaction.commit();
      console.log('\n✓ Migration completed successfully\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n✗ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('\n=== Reverting Model-DB Mismatch Fixes ===\n');

      // Revert FIX 2: Change payslips.payrollDataId back to nullable + SET NULL
      console.log('1. Reverting payslips.payrollDataId...');
      
      const [fkInfo] = await queryInterface.sequelize.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'payslips' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'payrollDataId';
      `, { transaction });

      if (fkInfo.length > 0) {
        const fkName = fkInfo[0].constraint_name;
        console.log(`   → Dropping FK: ${fkName}...`);
        await queryInterface.removeConstraint('payslips', fkName, { transaction });

        console.log('   → Recreating FK with onDelete: SET NULL...');
        await queryInterface.addConstraint('payslips', {
          fields: ['payrollDataId'],
          type: 'foreign key',
          name: fkName,
          references: {
            table: 'payroll_data',
            field: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          transaction
        });
        console.log('   ✓ FK reverted to SET NULL');
      }

      console.log('   → Setting payrollDataId to nullable...');
      await queryInterface.changeColumn('payslips', 'payrollDataId', {
        type: Sequelize.UUID,
        allowNull: true
      }, { transaction });
      console.log('   ✓ Column set to nullable');

      // Revert FIX 1: Restore single-column unique (if you really want to...)
      console.log('\n2. Restoring salary_structures.employeeId unique constraint...');
      console.log('   ⚠ This will BLOCK salary history (multiple records per employee)');
      
      try {
        await queryInterface.addConstraint('salary_structures', {
          fields: ['employeeId'],
          type: 'unique',
          name: 'uq_salary_structures_employee_id',
          transaction
        });
        console.log('   ✓ Single-column unique constraint restored');
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log('   ℹ Cannot restore: employees already have multiple salary records');
        } else {
          throw error;
        }
      }

      await transaction.commit();
      console.log('\n✓ Rollback completed\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n✗ Rollback failed:', error.message);
      throw error;
    }
  }
};
