-- ==========================================================================
-- SkyRakSys HRM — Consolidated Migration Script
-- Applies all changes from migrations 2-16 to a fresh database
-- (Migration 1: 20260209000000-fresh-consolidated-schema.js already applied)
-- ==========================================================================

-- ---- Migration 2: gap-fixes-module-2-3-5-6 ----

-- 2.1 Unique constraint on salary_structures.employeeId
ALTER TABLE salary_structures ADD CONSTRAINT uq_salary_structures_employee_id UNIQUE ("employeeId");

-- 3.4 Change audit_logs FK: SET NULL → RESTRICT
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS "audit_logs_userId_fkey";
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5.1 Convert payroll_data.id from INTEGER to UUID (table is empty on fresh deploy)
ALTER TABLE payslips DROP CONSTRAINT IF EXISTS "payslips_payrollDataId_fkey";
ALTER TABLE payroll_data DROP COLUMN id CASCADE;
ALTER TABLE payroll_data ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE payslips ALTER COLUMN "payrollDataId" TYPE UUID USING NULL;
ALTER TABLE payslips ADD CONSTRAINT "payslips_payrollDataId_fkey"
  FOREIGN KEY ("payrollDataId") REFERENCES payroll_data(id) ON DELETE SET NULL;

-- 6.4 Unique constraints on names
ALTER TABLE payslip_templates ADD CONSTRAINT uq_payslip_templates_name UNIQUE (name);
ALTER TABLE projects ADD CONSTRAINT uq_projects_name UNIQUE (name);

-- ---- Migration 3: gap-fixes-module-9-10-11 ----

-- 11.1 Missing indexes
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON payslips ("month", "year");
CREATE INDEX IF NOT EXISTS idx_payslips_template_id ON payslips ("templateId");
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_data_id ON payslips ("payrollDataId");
CREATE INDEX IF NOT EXISTS idx_payslips_generated_by ON payslips ("generatedBy");
CREATE INDEX IF NOT EXISTS idx_payslips_is_locked ON payslips ("isLocked");
CREATE INDEX IF NOT EXISTS idx_payroll_data_employee_id ON payroll_data ("employeeId");
CREATE INDEX IF NOT EXISTS idx_payroll_data_pay_period ON payroll_data ("payPeriod");
CREATE INDEX IF NOT EXISTS idx_payslip_templates_name ON payslip_templates (name);
CREATE INDEX IF NOT EXISTS idx_system_configs_cat_key_ver ON system_configs (category, key, version);
CREATE INDEX IF NOT EXISTS idx_system_configs_changed_by ON system_configs ("changedBy");
CREATE INDEX IF NOT EXISTS idx_employee_reviews_review_period ON employee_reviews ("reviewPeriod");
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_created ON audit_logs ("userId", action, "createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id_created ON audit_logs ("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_payslip_audit_logs_action ON payslip_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_payslip_audit_logs_created_at ON payslip_audit_logs ("createdAt");

-- 11.6 CHECK constraints for date ranges
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_leave_requests_date_range') THEN
    ALTER TABLE leave_requests ADD CONSTRAINT chk_leave_requests_date_range CHECK ("endDate" >= "startDate");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_week_date_range') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_week_date_range CHECK ("weekEndDate" >= "weekStartDate");
  END IF;
END $$;

-- 11.7 CHECK constraints for review ratings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_reviews_overallrating') THEN
    ALTER TABLE employee_reviews ADD CONSTRAINT chk_employee_reviews_overallrating
      CHECK ("overallRating" IS NULL OR ("overallRating" >= 1.0 AND "overallRating" <= 5.0));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_reviews_technicalskills') THEN
    ALTER TABLE employee_reviews ADD CONSTRAINT chk_employee_reviews_technicalskills
      CHECK ("technicalSkills" IS NULL OR ("technicalSkills" >= 1.0 AND "technicalSkills" <= 5.0));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_reviews_communication') THEN
    ALTER TABLE employee_reviews ADD CONSTRAINT chk_employee_reviews_communication
      CHECK (communication IS NULL OR (communication >= 1.0 AND communication <= 5.0));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_reviews_teamwork') THEN
    ALTER TABLE employee_reviews ADD CONSTRAINT chk_employee_reviews_teamwork
      CHECK (teamwork IS NULL OR (teamwork >= 1.0 AND teamwork <= 5.0));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_reviews_leadership') THEN
    ALTER TABLE employee_reviews ADD CONSTRAINT chk_employee_reviews_leadership
      CHECK (leadership IS NULL OR (leadership >= 1.0 AND leadership <= 5.0));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_reviews_punctuality') THEN
    ALTER TABLE employee_reviews ADD CONSTRAINT chk_employee_reviews_punctuality
      CHECK (punctuality IS NULL OR (punctuality >= 1.0 AND punctuality <= 5.0));
  END IF;
END $$;

-- 11.20 Drop updatedAt from audit_logs
ALTER TABLE audit_logs DROP COLUMN IF EXISTS "updatedAt";

-- ---- Migration 4: normalize-audit-log-actions ----
UPDATE audit_logs SET action = UPPER(action) WHERE action != UPPER(action);

-- ---- Migration 5: fix-approvedby-fk-consistency ----
-- leave_requests.approvedBy FK
DO $$ 
DECLARE fk RECORD;
BEGIN
  FOR fk IN SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'leave_requests' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%approvedBy%' OR constraint_name LIKE '%approved_by%'
  LOOP
    EXECUTE 'ALTER TABLE leave_requests DROP CONSTRAINT ' || quote_ident(fk.constraint_name);
  END LOOP;
END $$;
ALTER TABLE leave_requests ADD CONSTRAINT "leave_requests_approvedBy_users_fk"
  FOREIGN KEY ("approvedBy") REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- timesheets.approvedBy FK
DO $$ 
DECLARE fk RECORD;
BEGIN
  FOR fk IN SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'timesheets' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%approvedBy%' OR constraint_name LIKE '%approved_by%'
  LOOP
    EXECUTE 'ALTER TABLE timesheets DROP CONSTRAINT ' || quote_ident(fk.constraint_name);
  END LOOP;
END $$;
ALTER TABLE timesheets ADD CONSTRAINT "timesheets_approvedBy_users_fk"
  FOREIGN KEY ("approvedBy") REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- ---- Migration 6: create-password-reset-tokens ----
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tokenId" VARCHAR(64) NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  "usedAt" TIMESTAMP WITH TIME ZONE,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS prt_token_id_unique ON password_reset_tokens ("tokenId");
CREATE INDEX IF NOT EXISTS prt_email_created_at ON password_reset_tokens (email, "createdAt");
CREATE INDEX IF NOT EXISTS prt_expires_at ON password_reset_tokens ("expiresAt");

-- ---- Migration 7: create-holidays ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_holidays_type') THEN
    CREATE TYPE enum_holidays_type AS ENUM ('public', 'restricted', 'company');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  type enum_holidays_type NOT NULL DEFAULT 'public',
  year INTEGER NOT NULL,
  "isRecurring" BOOLEAN DEFAULT false,
  description VARCHAR(500),
  "isActive" BOOLEAN DEFAULT true,
  "createdBy" UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS holidays_year ON holidays (year);
CREATE INDEX IF NOT EXISTS holidays_date ON holidays (date);
CREATE UNIQUE INDEX IF NOT EXISTS holidays_date_name_unique ON holidays (date, name);

-- ---- Migration 8: create-attendances ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_attendances_status') THEN
    CREATE TYPE enum_attendances_status AS ENUM ('present', 'absent', 'half-day', 'on-leave', 'holiday', 'weekend', 'late');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_attendances_source') THEN
    CREATE TYPE enum_attendances_source AS ENUM ('manual', 'biometric', 'web', 'mobile');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" UUID NOT NULL REFERENCES employees(id) ON UPDATE CASCADE ON DELETE CASCADE,
  date DATE NOT NULL,
  "checkIn" TIMESTAMP WITH TIME ZONE,
  "checkOut" TIMESTAMP WITH TIME ZONE,
  status enum_attendances_status NOT NULL DEFAULT 'present',
  "hoursWorked" DECIMAL(5,2) DEFAULT 0,
  "overtimeHours" DECIMAL(5,2) DEFAULT 0,
  "lateMinutes" INTEGER DEFAULT 0,
  "earlyLeaveMinutes" INTEGER DEFAULT 0,
  "breakDuration" INTEGER DEFAULT 0,
  source enum_attendances_source DEFAULT 'web',
  notes VARCHAR(500),
  "ipAddress" VARCHAR(45),
  "approvedBy" UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendances ("employeeId", date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendances (date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendances (status);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date_status ON attendances ("employeeId", date, status);

-- ---- Migration 9: fix-pk-type-mismatches ----
-- payslip_audit_logs.id: INTEGER → UUID (table should be empty)
DO $$ 
DECLARE col_type TEXT;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns 
    WHERE table_name = 'payslip_audit_logs' AND column_name = 'id';
  IF col_type = 'integer' THEN
    ALTER TABLE payslip_audit_logs DROP CONSTRAINT IF EXISTS payslip_audit_logs_pkey;
    ALTER TABLE payslip_audit_logs DROP COLUMN id;
    ALTER TABLE payslip_audit_logs ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    RAISE NOTICE 'payslip_audit_logs.id converted to UUID';
  END IF;
END $$;

-- ---- Migration 10: payroll-data-id-to-uuid ----
-- Already handled in Migration 2 above (payroll_data.id is now UUID)

-- ---- Migration 11: salary-structures-composite-unique ----
CREATE UNIQUE INDEX IF NOT EXISTS uq_salary_structures_employee_effective 
  ON salary_structures ("employeeId", "effectiveFrom");

-- ---- Migration 12: add-missing-indexes ----
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON leave_requests ("approvedBy");
CREATE INDEX IF NOT EXISTS idx_payslips_employee_status ON payslips ("employeeId", status);
CREATE INDEX IF NOT EXISTS idx_employees_department_status ON employees ("departmentId", status);

-- ---- Migration 13: add-soft-deletes ----
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_leave_types_deleted_at ON leave_types ("deletedAt");
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects ("deletedAt");
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks ("deletedAt");
CREATE INDEX IF NOT EXISTS idx_salary_structures_deleted_at ON salary_structures ("deletedAt");

-- ---- Migration 14: add-check-constraints ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_monday_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_monday_hours CHECK ("mondayHours" >= 0 AND "mondayHours" <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_tuesday_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_tuesday_hours CHECK ("tuesdayHours" >= 0 AND "tuesdayHours" <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_wednesday_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_wednesday_hours CHECK ("wednesdayHours" >= 0 AND "wednesdayHours" <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_thursday_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_thursday_hours CHECK ("thursdayHours" >= 0 AND "thursdayHours" <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_friday_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_friday_hours CHECK ("fridayHours" >= 0 AND "fridayHours" <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_saturday_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_saturday_hours CHECK ("saturdayHours" >= 0 AND "saturdayHours" <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_sunday_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_sunday_hours CHECK ("sundayHours" >= 0 AND "sundayHours" <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_timesheets_total_hours') THEN
    ALTER TABLE timesheets ADD CONSTRAINT chk_timesheets_total_hours CHECK ("totalHoursWorked" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_positions_salary_range') THEN
    ALTER TABLE positions ADD CONSTRAINT chk_positions_salary_range 
      CHECK ("maxSalary" IS NULL OR "minSalary" IS NULL OR "maxSalary" >= "minSalary");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_positions_min_salary_positive') THEN
    ALTER TABLE positions ADD CONSTRAINT chk_positions_min_salary_positive CHECK ("minSalary" IS NULL OR "minSalary" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_positions_max_salary_positive') THEN
    ALTER TABLE positions ADD CONSTRAINT chk_positions_max_salary_positive CHECK ("maxSalary" IS NULL OR "maxSalary" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_salary_structures_basic_positive') THEN
    ALTER TABLE salary_structures ADD CONSTRAINT chk_salary_structures_basic_positive CHECK ("basicSalary" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payroll_data_gross_positive') THEN
    ALTER TABLE payroll_data ADD CONSTRAINT chk_payroll_data_gross_positive CHECK ("grossSalary" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payroll_data_net_positive') THEN
    ALTER TABLE payroll_data ADD CONSTRAINT chk_payroll_data_net_positive CHECK ("netSalary" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payroll_data_deductions_positive') THEN
    ALTER TABLE payroll_data ADD CONSTRAINT chk_payroll_data_deductions_positive CHECK ("totalDeductions" >= 0);
  END IF;
END $$;

-- ---- Migration 15: add-unique-constraints ----
CREATE UNIQUE INDEX IF NOT EXISTS uq_timesheets_employee_week_project_task 
  ON timesheets ("employeeId", "weekStartDate", "projectId", "taskId");
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_reviews_employee_period 
  ON employee_reviews ("employeeId", "reviewPeriod");
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_configs_category_key_version 
  ON system_configs (category, key, version);

-- ---- Migration 16: standardize-fk-ondelete ----
-- departments.parentId FK → SET NULL
ALTER TABLE departments DROP CONSTRAINT IF EXISTS "departments_parentId_fkey";
ALTER TABLE departments ADD CONSTRAINT "departments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- employee_reviews.hrApprovedBy FK → SET NULL
ALTER TABLE employee_reviews DROP CONSTRAINT IF EXISTS "employee_reviews_hrApprovedBy_fkey";
ALTER TABLE employee_reviews ADD CONSTRAINT "employee_reviews_hrApprovedBy_fkey"
  FOREIGN KEY ("hrApprovedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- payroll_data.employeeId FK → RESTRICT
ALTER TABLE payroll_data DROP CONSTRAINT IF EXISTS "payroll_data_employeeId_fkey";
ALTER TABLE payroll_data ADD CONSTRAINT "payroll_data_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- payroll_data.createdBy FK → RESTRICT
ALTER TABLE payroll_data DROP CONSTRAINT IF EXISTS "payroll_data_createdBy_fkey";
ALTER TABLE payroll_data ADD CONSTRAINT "payroll_data_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- payroll_data.updatedBy FK → SET NULL
ALTER TABLE payroll_data DROP CONSTRAINT IF EXISTS "payroll_data_updatedBy_fkey";
ALTER TABLE payroll_data ADD CONSTRAINT "payroll_data_updatedBy_fkey"
  FOREIGN KEY ("updatedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- payroll_data.approvedBy FK → SET NULL
ALTER TABLE payroll_data DROP CONSTRAINT IF EXISTS "payroll_data_approvedBy_fkey";
ALTER TABLE payroll_data ADD CONSTRAINT "payroll_data_approvedBy_fkey"
  FOREIGN KEY ("approvedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- timesheets.projectId FK → RESTRICT
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS "timesheets_projectId_fkey";
ALTER TABLE timesheets ADD CONSTRAINT "timesheets_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- timesheets.taskId FK → RESTRICT
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS "timesheets_taskId_fkey";
ALTER TABLE timesheets ADD CONSTRAINT "timesheets_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---- Mark all migrations as complete in SequelizeMeta ----
INSERT INTO "SequelizeMeta" (name) VALUES
  ('20260209100000-gap-fixes-module-2-3-5-6.js'),
  ('20260210000000-gap-fixes-module-9-10-11.js'),
  ('20260210000001-normalize-audit-log-actions.js'),
  ('20260210000002-fix-approvedby-fk-consistency.js'),
  ('20260210000003-create-password-reset-tokens.js'),
  ('20260210000004-create-holidays.js'),
  ('20260210000005-create-attendances.js'),
  ('20260210100000-fix-pk-type-mismatches.js'),
  ('20260211000001-payroll-data-id-to-uuid.js'),
  ('20260211000002-salary-structures-composite-unique.js'),
  ('20260211000003-add-missing-indexes.js'),
  ('20260211000004-add-soft-deletes.js'),
  ('20260211000005-add-check-constraints.js'),
  ('20260211000006-add-unique-constraints.js'),
  ('20260211000007-standardize-fk-ondelete.js')
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Tables: ' || count(*) FROM pg_tables WHERE schemaname = 'public';
SELECT 'Indexes: ' || count(*) FROM pg_indexes WHERE schemaname = 'public';
SELECT 'Constraints: ' || count(*) FROM pg_constraint WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
SELECT 'Migrations: ' || count(*) FROM "SequelizeMeta";
