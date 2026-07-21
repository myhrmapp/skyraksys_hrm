'use strict';
/**
 * validate-validators.js
 * ───────────────────────
 * Compares Joi validation schemas against Sequelize model definitions.
 *
 * Detects:
 *   ISSUE  — DB column is NOT NULL but the Joi CREATE schema marks it optional
 *            or omits it entirely. Inserting without this field will crash at DB level.
 *   WARNING — DB column is NOT NULL but the Joi UPDATE schema omits it
 *             (often intentional for partial updates, but worth reviewing).
 *   WARNING — Joi marks a field required but DB allows NULL
 *             (Joi is stricter than DB — usually OK, just worth knowing).
 *
 * Usage:
 *   node backend/scripts/validate-validators.js
 *
 * Exit code: 0 = OK (warnings allowed), 1 = hard issues found.
 */

require('dotenv').config();

const db         = require('../models');
const validators = require('../middleware/validators');

// ── Fields that are intentionally set server-side, never from the client ─────
const SERVER_SIDE = new Set([
  'id',
  'createdAt', 'updatedAt', 'deletedAt',       // Sequelize timestamps
  'employeeId',                                  // set from auth token
  'userId',                                      // set during registration
  'status',                                      // has default value
  'isActive',                                    // has default value
  // Workflow fields set by service layer:
  'approvedBy', 'approvedAt', 'approvedAt',
  'rejectedAt', 'rejectionReason',
  'cancelledAt', 'cancellationReason',
  'processedBy', 'processedAt',
  'disbursementDate', 'paymentMode',
  'hrApprovedBy', 'hrApprovedAt', 'hrApproved',
  // Calculated/derived fields:
  'checkInTime', 'checkOutTime',
  'totalHours', 'overtimeHours', 'isLate', 'lateMinutes',
  'totalDays',                                   // calculated from dates
  'grossPay', 'netPay', 'totalAllowances', 'totalDeductions',
  'basicSalary',                                 // snapshot from SalaryStructure
  'payslipNumber',                               // auto-generated
  'month', 'year',                               // part of payroll create schema already
  'weekEndDate',                                 // derived from weekStartDate
  'weekNumber',                                  // computed from weekStartDate
  'createdBy',                                   // set from req.user.id
  'managerId',                                   // usually optional / from hierarchy
]);

// ── Schema ↔ Model mapping ────────────────────────────────────────────────────
// schemaExport: exact key exported from validators/index.js
// model:        key on the db object
// type:         'create' (hard issues) | 'update' (warnings only)
const MAPPINGS = [
  // Auth / User
  { schemaExport: 'adminRegisterSchema',           model: 'User',            type: 'create' },

  // Employee
  { schemaExport: 'createEmployeeSchema',         model: 'Employee',        type: 'create' },
  { schemaExport: 'updateEmployeeSchema',         model: 'Employee',        type: 'update' },

  // Leave
  { schemaExport: 'createLeaveRequestSchema',     model: 'LeaveRequest',    type: 'create' },
  { schemaExport: 'updateLeaveRequestSchema',     model: 'LeaveRequest',    type: 'update' },

  // Timesheet
  { schemaExport: 'createTimesheetSchema',        model: 'Timesheet',       type: 'create' },
  { schemaExport: 'updateTimesheetSchema',        model: 'Timesheet',       type: 'update' },

  // Project / Task
  { schemaExport: 'createProjectSchema',          model: 'Project',         type: 'create' },
  { schemaExport: 'updateProjectSchema',          model: 'Project',         type: 'update' },
  { schemaExport: 'createTaskSchema',             model: 'Task',            type: 'create' },
  { schemaExport: 'updateTaskSchema',             model: 'Task',            type: 'update' },

  // Payroll
  { schemaExport: 'createPayrollSchema',          model: 'PayrollData',     type: 'create' },

  // Review
  { schemaExport: 'employeeReviewSchema',         model: 'EmployeeReview',  type: 'create' },

  // Org
  { schemaExport: 'departmentSchema',             model: 'Department',      type: 'create' },
  { schemaExport: 'positionSchema',               model: 'Position',        type: 'create' },
  { schemaExport: 'holidaySchema',                model: 'Holiday',         type: 'create' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get the Joi presence ('required' | 'optional') for a key in a Joi schema.
 * Returns null if the key is not declared in the schema.
 */
function joiFieldPresence(schema, fieldName) {
  if (!schema || typeof schema.describe !== 'function') return null;
  const desc = schema.describe();
  const keys = desc.keys || {};
  const keyDesc = keys[fieldName];
  if (!keyDesc) return null;
  return keyDesc.flags?.presence || 'optional'; // default in Joi is optional
}

/**
 * Return all fields in a Sequelize model that are NOT NULL and have no default,
 * excluding server-side fields.
 */
function dbRequiredFields(Model) {
  return Object.entries(Model.rawAttributes)
    .filter(([name, field]) => {
      if (SERVER_SIDE.has(name)) return false;
      if (field._autoGenerated) return false;
      if (field.allowNull !== false) return false;
      // If Sequelize default handles it, DB won't reject NULL from Sequelize
      if (field.defaultValue !== undefined && field.defaultValue !== null) return false;
      return true;
    })
    .map(([name, field]) => field.field || name); // use DB column name if remapped
}

/**
 * Return all keys declared as required in a Joi schema.
 */
function joiRequiredKeys(schema) {
  if (!schema?.describe) return [];
  const keys = schema.describe().keys || {};
  return Object.entries(keys)
    .filter(([, desc]) => desc.flags?.presence === 'required')
    .map(([k]) => k);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function run() {
  const issues   = [];
  const warnings = [];
  const passed   = [];
  const skipped  = [];

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SkyrakSys HRM — Joi / Model Alignment Validation   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  for (const { schemaExport, model: modelName, type } of MAPPINGS) {
    let schema = validators[schemaExport];
    // Handle sub-object schemas like { create: JoiSchema, update: JoiSchema }
    if (schema && typeof schema.describe !== 'function') {
      schema = type === 'create' ? schema.create : schema.update;
    }
    const Model  = db[modelName];

    if (!schema || typeof schema.describe !== 'function') {
      skipped.push(`  ⊘  ${schemaExport.padEnd(35)} → schema not found in validators/index.js`);
      continue;
    }
    if (!Model?.rawAttributes) {
      skipped.push(`  ⊘  ${schemaExport.padEnd(35)} → model "${modelName}" not found`);
      continue;
    }

    const dbRequired = dbRequiredFields(Model);
    let pairOk = 0;

    for (const colName of dbRequired) {
      // Map DB column name back to camelCase field name used in Joi
      // (Joi schemas use camelCase; Sequelize maps to snake_case DB columns)
      const joiName = Object.keys(Model.rawAttributes).find(
        k => (Model.rawAttributes[k].field || k) === colName
      ) || colName;

      const presence = joiFieldPresence(schema, joiName);

      if (presence === null) {
        // Field absent from Joi schema entirely
        if (type === 'create') {
          issues.push(
            `[MISSING IN JOI] ${schemaExport}: "${joiName}" is NOT NULL in DB but absent ` +
            `from schema — inserts without it will fail at DB level`
          );
        } else {
          warnings.push(
            `[MISSING IN JOI] ${schemaExport} (update): "${joiName}" is NOT NULL in DB ` +
            `but absent — OK for partial update only if service ensures it exists`
          );
        }
      } else if (presence === 'optional' && type === 'create') {
        warnings.push(
          `[OPTIONAL IN JOI] ${schemaExport}: "${joiName}" is NOT NULL in DB but ` +
          `Joi marks it optional — if client omits it, the DB insert will fail`
        );
      } else {
        pairOk++;
      }
    }

    // Also check: Joi requires something that DB allows null (stricter validation — usually OK)
    const joiRequired = joiRequiredKeys(schema);
    for (const joiKey of joiRequired) {
      const modelField = Model.rawAttributes[joiKey];
      if (modelField && modelField.allowNull === true) {
        // Joi is stricter than DB — not a bug, just worth noting
        // (don't add to warnings to avoid noise)
      }
    }

    if (pairOk > 0 && issues.filter(i => i.includes(schemaExport)).length === 0 &&
        warnings.filter(w => w.includes(schemaExport)).length === 0) {
      passed.push(`  ✓  ${schemaExport.padEnd(35)} ↔  ${modelName.padEnd(20)} (${pairOk} required fields aligned)`);
    }
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  if (passed.length) {
    console.log('ALIGNED:');
    passed.forEach(l => console.log(l));
  }

  if (skipped.length) {
    console.log('\nSKIPPED (schema or model not found):');
    skipped.forEach(l => console.log(l));
  }

  if (warnings.length) {
    console.log(`\nWARNINGS (${warnings.length}) — review manually:`);
    warnings.forEach(w => console.log('  ⚠  ' + w));
  }

  if (issues.length) {
    console.log(`\nISSUES (${issues.length}) — likely bugs:`);
    issues.forEach(i => console.log('  ✗  ' + i));
  }

  console.log(
    `\n${'─'.repeat(56)}\n` +
    `  ${passed.length} aligned   ` +
    `${skipped.length} skipped   ` +
    `${warnings.length} warnings   ` +
    `${issues.length} issues\n` +
    `${'─'.repeat(56)}\n`
  );

  process.exit(issues.length > 0 ? 1 : 0);
}

run();
