# SkyrakSys HRM

Enterprise-grade Human Resource Management System built for modern organizations.

**Production URL:** http://46.225.73.94  
**Repository:** https://github.com/Otyvino/skyraksys-hrm  
**Current Release Branch:** `prod-release-3`

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6, Material-UI (MUI), Context API |
| Backend | Node.js, Express.js, Sequelize ORM |
| Database | PostgreSQL 17 |
| Real-time | Socket.io |
| Deployment | Docker Compose + Nginx / PM2 Cluster Mode |

---

## Core Modules

| Module | Description |
|--------|-------------|
| **Employee Management** | Profiles, org chart, SK-format employee IDs, photo uploads |
| **Leave Management** | Apply, approve/reject, cancellation workflows, balance tracking |
| **Attendance** | Daily punch-ins, admin approvals, attendance reporting |
| **Timesheet** | Weekly timesheets, project/task linking, manager approvals |
| **Payroll** | Salary structures, server-managed encrypted financials, payslip PDF generation |
| **Invoicing** | Client management, invoice templates, PDF generation with encryption |
| **Notifications** | Real-time Socket.io push, role/department-based targeting, broadcast popups |
| **Performance** | OKR-style goals and Key Results, employee review cycles |
| **System Settings** | Email (SMTP), ID Card branding (DB-backed), broadcasts |
| **Security** | JWT + Refresh tokens with JTI blacklist, RBAC, data-level row access control |

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/Otyvino/skyraksys-hrm.git
cd skyraksys-hrm

# 2. Set up environment
cp .env.production.template .env.production
# Edit .env.production with your DB passwords, JWT secrets, SMTP config

# 3. Start all services
docker compose up -d

# 4. Run database migrations
bash scripts/deploy/run-migrations.sh

# 5. First time only — go-live setup (rotates JWT secrets, creates admin)
bash scripts/deploy/go-live.sh
```

---

## First-Time Go-Live

For the very first production deployment, run the go-live script which:
1. Rotates JWT secrets and writes them into `.env.production`
2. Wipes UAT/test data from the database
3. Creates a fresh admin user with a temporary password
4. Restarts all Docker containers

```bash
bash scripts/deploy/go-live.sh
```

> ⚠️ **This is destructive.** Only run it once before the very first live launch.

---

## Applying Updates (Subsequent Deployments)

```bash
# Pull latest code
git pull origin prod-release-3

# Apply any new DB schema changes safely (non-destructive)
bash scripts/deploy/run-migrations.sh

# Rebuild and restart frontend
docker compose build frontend
docker compose up -d
```

---

## Environment Variables

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for a full list of required environment variables.

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Nginx (port 80/443)         │
│         Reverse proxy + TLS termination  │
└────────────┬────────────────────────────┘
             │
   ┌─────────┴──────────┐
   │                    │
   ▼                    ▼
Frontend             Backend API
(React Build)       (Node.js :5000)
                         │
                         ▼
                   PostgreSQL 17
                  (internal network)
```

---

## Security Highlights

- **Server-Managed Vault**: AES-256-GCM encryption for sensitive payroll fields
- **RBAC**: Role-based access at route level (`admin`, `hr`, `manager`, `employee`)
- **Row-Level Access**: `canAccessEmployee` middleware limits data to authorized scope
- **JTI Blacklist**: Instantly invalidates tokens on logout
- **Helmet + HPP + XSS**: Defense-in-depth against common web attacks
