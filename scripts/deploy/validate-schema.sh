#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Schema Validation
# Verifies the production database schema matches what the migrations produce.
#
# Run from: /home/Rakesh/skyraksys_hrm on the server
# Called automatically by redeploy.sh after db:migrate
# Can also be run standalone: bash scripts/deploy/validate-schema.sh
# ==============================================================================
set -e

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$APP_DIR"

# --- Load DB credentials from .env ---
DB_USER=$(grep -E '^DB_USER=' .env | cut -d= -f2 | tr -d '[:space:]')
DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d= -f2 | tr -d '[:space:]')
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2 | tr -d '[:space:]')

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ] || [ -z "$DB_PASSWORD" ]; then
  echo "❌ Cannot read DB credentials from .env — aborting validation"
  exit 1
fi

# Helper: run a psql query inside the postgres container, return trimmed result
psql_query() {
  docker compose exec -T \
    -e PGPASSWORD="$DB_PASSWORD" \
    postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null \
    | tr -d ' \r\n'
}

ERRORS=0

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│   SkyRakSys HRM — Schema Validation     │"
echo "└─────────────────────────────────────────┘"

# ─── 1. Migration Count ───────────────────────────────────────────────────────
echo ""
echo "[1/4] Checking migration count..."
EXPECTED_MIGRATIONS=25
ACTUAL_MIGRATIONS=$(psql_query 'SELECT COUNT(*) FROM "SequelizeMeta";')

if [ "$ACTUAL_MIGRATIONS" -eq "$EXPECTED_MIGRATIONS" ]; then
  echo "  ✅ Migrations applied: $ACTUAL_MIGRATIONS / $EXPECTED_MIGRATIONS"
else
  echo "  ❌ Migration count mismatch: expected $EXPECTED_MIGRATIONS, got $ACTUAL_MIGRATIONS"
  ERRORS=$((ERRORS + 1))
  # List which are missing
  echo "  Applied migrations:"
  docker compose exec -T \
    -e PGPASSWORD="$DB_PASSWORD" \
    postgres psql -U "$DB_USER" -d "$DB_NAME" \
    -c 'SELECT name FROM "SequelizeMeta" ORDER BY name;' 2>/dev/null
fi

# ─── 2. All Tables Present ────────────────────────────────────────────────────
echo ""
echo "[2/4] Checking all tables exist..."

EXPECTED_TABLES=(
  "SequelizeMeta"
  "users"
  "departments"
  "positions"
  "employees"
  "refresh_tokens"
  "leave_types"
  "leave_balances"
  "leave_requests"
  "projects"
  "tasks"
  "timesheets"
  "salary_structures"
  "payslip_templates"
  "payroll_data"
  "payslips"
  "payslip_audit_logs"
  "attendances"
  "holidays"
  "employee_reviews"
  "audit_logs"
  "system_configs"
  "password_reset_tokens"
)

MISSING_TABLES=0
for TABLE in "${EXPECTED_TABLES[@]}"; do
  EXISTS=$(psql_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$TABLE';")
  if [ "$EXISTS" -ne 1 ]; then
    echo "  ❌ Missing table: $TABLE"
    MISSING_TABLES=$((MISSING_TABLES + 1))
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$MISSING_TABLES" -eq 0 ]; then
  echo "  ✅ All ${#EXPECTED_TABLES[@]} tables present"
fi

# ─── 3. Key Columns ───────────────────────────────────────────────────────────
# These are columns added by incremental migrations — most likely to be missed.
echo ""
echo "[3/4] Checking key columns..."

check_column() {
  local TABLE=$1
  local COLUMN=$2
  local LABEL="$TABLE.$COLUMN"
  local EXISTS
  EXISTS=$(psql_query "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='$TABLE' AND column_name='$COLUMN';")
  if [ "$EXISTS" -eq 1 ]; then
    echo "  ✅ $LABEL"
  else
    echo "  ❌ Missing column: $LABEL"
    ERRORS=$((ERRORS + 1))
  fi
}

# migration 20260329100000
check_column "leave_types"  "isPaid"
# migration 20260329000001
check_column "timesheets"   "rejectedBy"
# migration 20260217000000
check_column "tasks"        "dueDate"
# migration 20260217100000
check_column "employees"    "country"
check_column "employees"    "esiNumber"
# migration 20260211000004 (soft deletes)
check_column "employees"    "deletedAt"
check_column "leave_types"  "deletedAt"
check_column "projects"     "deletedAt"
# migration 20260210000003
check_column "password_reset_tokens" "token"
check_column "password_reset_tokens" "expiresAt"
# migration 20260210000005
check_column "attendances"  "employeeId"
check_column "attendances"  "checkOutTime"

# ─── 4. Key Indexes ───────────────────────────────────────────────────────────
# Performance indexes from migrations 20260327000002/3 and 20260329000001
echo ""
echo "[4/4] Checking key indexes..."

check_index() {
  local INDEX=$1
  local EXISTS
  EXISTS=$(psql_query "SELECT COUNT(*) FROM pg_indexes WHERE indexname='$INDEX';")
  if [ "$EXISTS" -eq 1 ]; then
    echo "  ✅ $INDEX"
  else
    echo "  ❌ Missing index: $INDEX"
    ERRORS=$((ERRORS + 1))
  fi
}

check_index "idx_timesheets_employee_status"
check_index "idx_employees_status"
check_index "idx_employees_department_status"
check_index "idx_audit_logs_user_action_created"
check_index "idx_audit_logs_entity_type_action_created"
check_index "idx_leave_balances_employee_id"
check_index "idx_leave_requests_employee_id"
check_index "idx_timesheets_employee_id"
check_index "idx_attendance_emp_date_status"

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────"
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ Schema validation PASSED — all checks good"
  echo "──────────────────────────────────────────"
  echo ""
  exit 0
else
  echo "❌ Schema validation FAILED — $ERRORS issue(s) found"
  echo ""
  echo "  Next steps:"
  echo "    1. Run:  docker compose exec backend npx sequelize-cli db:migrate --debug"
  echo "    2. Check: cat ~/skyraksys_hrm/.env (DB credentials correct?)"
  echo "    3. Fallback: apply database/init/schema_dump.sql manually"
  echo "──────────────────────────────────────────"
  echo ""
  exit 1
fi
