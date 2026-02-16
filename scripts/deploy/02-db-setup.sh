#!/bin/bash
# ==============================================================================
# SkyRakSys HRM — Step 2: PostgreSQL Database Setup
# Run as: root
# ==============================================================================
set -e

echo "=========================================="
echo "  SkyRakSys HRM — Database Setup"
echo "=========================================="

DB_NAME="skyraksys_hrm_prod"
DB_USER="hrm_app"
DB_PASS="HrM_Pr0d_S3cur3_2026!"

# --- Create database user and database ---
echo "[1/3] Creating PostgreSQL user and database..."
sudo -u postgres psql <<EOF
-- Create app user (if not exists)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Create production database
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the database and grant schema permissions
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${DB_USER};
EOF

# --- Configure pg_hba.conf for local + password auth ---
echo "[2/3] Configuring PostgreSQL authentication..."
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW hba_file;")
echo "pg_hba.conf location: $PG_HBA"

# Ensure md5 auth for the app user (local socket + localhost TCP)
if ! grep -q "${DB_USER}" "$PG_HBA"; then
  # Insert before the first "local" line
  sed -i "/^# TYPE/a\\
local   ${DB_NAME}   ${DB_USER}                              md5\\
host    ${DB_NAME}   ${DB_USER}   127.0.0.1/32               md5\\
host    ${DB_NAME}   ${DB_USER}   ::1/128                    md5" "$PG_HBA"
  
  systemctl reload postgresql
  echo "pg_hba.conf updated and PostgreSQL reloaded."
else
  echo "pg_hba.conf already configured for ${DB_USER}."
fi

# --- Verify connection ---
echo "[3/3] Verifying database connection..."
PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT current_database(), current_user, version();"

echo ""
echo "=========================================="
echo "  Database setup complete!"
echo "  DB: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Next: Upload app files, then run 03-deploy-app.sh"
echo "=========================================="
