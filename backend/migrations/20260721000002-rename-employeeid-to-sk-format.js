'use strict';

/**
 * Migration: Rename all existing employee IDs from SKYT#### to SK### format.
 * 
 * Strategy:
 * 1. Temporarily drop the unique constraint on employees.employeeId
 * 2. Sort all employees by their current numeric portion (ascending)
 * 3. Reassign SK001, SK002, SK003... in that order
 * 4. Re-create the unique constraint
 * 
 * Also updates users.employeeId references if the users table stores employee IDs.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ── Step 1: Get all existing employees ordered by their current numeric portion ──
      const [employees] = await queryInterface.sequelize.query(
        `SELECT id, "employeeId" FROM employees 
         WHERE "deletedAt" IS NULL OR "deletedAt" IS NOT NULL
         ORDER BY 
           CASE 
             WHEN "employeeId" ~ '^SKYT\\d+$' THEN CAST(SUBSTRING("employeeId" FROM 5) AS INTEGER)
             WHEN "employeeId" ~ '^SK\\d+$'   THEN CAST(SUBSTRING("employeeId" FROM 3) AS INTEGER)
             ELSE 99999
           END ASC`,
        { transaction }
      );

      if (employees.length === 0) {
        console.log('No employees found — skipping employee ID migration.');
        await transaction.commit();
        return;
      }

      console.log(`Renaming ${employees.length} employee IDs to SK### format...`);

      // ── Step 2: Use a temp prefix to avoid unique constraint collisions during update ──
      // First rename everyone to SKTMP### to avoid conflicts
      for (let i = 0; i < employees.length; i++) {
        const tempId = `SKTMP${String(i + 1).padStart(4, '0')}`;
        await queryInterface.sequelize.query(
          `UPDATE employees SET "employeeId" = :tempId WHERE id = :id`,
          { replacements: { tempId, id: employees[i].id }, transaction }
        );
      }

      // ── Step 3: Rename from SKTMP### → SK### ──
      for (let i = 0; i < employees.length; i++) {
        const newId = `SK${String(i + 1).padStart(3, '0')}`;
        const tempId = `SKTMP${String(i + 1).padStart(4, '0')}`;
        await queryInterface.sequelize.query(
          `UPDATE employees SET "employeeId" = :newId WHERE "employeeId" = :tempId`,
          { replacements: { newId, tempId }, transaction }
        );
        console.log(`  ${employees[i].employeeId} → ${newId}`);
      }

      await transaction.commit();
      console.log('✅ Employee ID migration complete.');

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Employee ID migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverse: rename SK### back to SKYT#### format
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [employees] = await queryInterface.sequelize.query(
        `SELECT id, "employeeId" FROM employees 
         ORDER BY CAST(SUBSTRING("employeeId" FROM 3) AS INTEGER) ASC`,
        { transaction }
      );

      // Temp rename first
      for (let i = 0; i < employees.length; i++) {
        const tempId = `SKTMP${String(i + 1).padStart(4, '0')}`;
        await queryInterface.sequelize.query(
          `UPDATE employees SET "employeeId" = :tempId WHERE id = :id`,
          { replacements: { tempId, id: employees[i].id }, transaction }
        );
      }

      // Rename to SKYT#### format
      for (let i = 0; i < employees.length; i++) {
        const oldId = `SKYT${String(i + 1).padStart(4, '0')}`;
        const tempId = `SKTMP${String(i + 1).padStart(4, '0')}`;
        await queryInterface.sequelize.query(
          `UPDATE employees SET "employeeId" = :oldId WHERE "employeeId" = :tempId`,
          { replacements: { oldId, tempId }, transaction }
        );
      }

      await transaction.commit();
      console.log('✅ Employee ID rollback complete (restored SKYT#### format).');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
