# SkyrakSys HRM — System Overview

> **Document Owner**: Solution Architect / Product Owner  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: New developers, architects, stakeholders, operations

---

## 1. Executive Summary

**SkyrakSys HRM** is a cloud-ready, full-stack Human Resource Management System designed for small-to-mid enterprises (50–500 employees). It automates core HR workflows — employee lifecycle, leave & attendance, timesheets, payroll & payslips, project tracking, and performance reviews — through a modern web application backed by a secure RESTful API.

| Dimension | Detail |
|-----------|--------|
| **Backend** | Node.js 22 · Express 4.18 · Sequelize 6.37 ORM |
| **Frontend** | React 18.3 · Material-UI 5.15 · TanStack Query 5 |
| **Database** | PostgreSQL 15+ (UUID PKs, soft-delete, audit log) |
| **Auth** | JWT (httpOnly cookies), RBAC, account lockout |
| **Hosting** | Docker / PM2 cluster on Ubuntu 24.04, Nginx reverse-proxy |
| **E2E Tests** | Playwright 1.58 — 79-test integration suite |
| **API Surface** | ~238 REST endpoints across 27 route files |
| **Data Model** | 22 tables, 13+ custom indexes |

---

## 2. Business Modules at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                    SkyrakSys HRM Platform                        │
├────────────┬──────────┬──────────┬──────────┬───────────────────┤
│ Employee   │ Leave    │ Time &   │ Payroll  │ Projects &        │
│ Management │ Mgmt     │ Attend.  │ & Payslip│ Tasks             │
├────────────┴──────────┴──────────┴──────────┴───────────────────┤
│ Organization (Departments · Positions · Holidays · Config)       │
├──────────────────────────────────────────────────────────────────┤
│ Security · Dashboard · Audit Log · Performance Reviews           │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Employee Management
- Full lifecycle: hire → probation → confirmation → resignation → exit
- 4-tab wizard: Personal → Employment → Salary → Statutory/Bank
- Bulk import (CSV/Excel), photo upload, employee ID auto-generation (`SKYT` prefix)
- Manager hierarchy with self-service & delegation

### 2.2 Leave Management
- 12 leave types: Casual, Sick, Earned, Maternity, Paternity, Bereavement, Compensatory, Marriage, Study, LOP, Restricted Holiday, Work From Home
- Multi-level approval chain: Employee → Manager → HR/Admin
- Leave balance tracking with annual accrual engine
- Overlap detection, blackout periods, cancellation workflows

### 2.3 Time & Attendance
- **Timesheets**: Weekly entry with project/task linkage, draft → submit → approve flow, overtime (OT) calculation
- **Attendance**: Daily check-in / check-out with GPS-ready fields, monthly summary, admin bulk marking

### 2.4 Payroll & Payslips
- Monthly payroll generation with automatic salary-component calculation
- Indian compliance: PF, ESI, TDS, Professional Tax
- PDF payslip generation with customizable templates
- Payroll run approval workflow and audit log

### 2.5 Projects & Tasks
- Project creation and lifecycle management (Active / Completed / On Hold)
- Task assignment with status tracking (To Do → In Progress → Done)
- Timesheet linkage for effort tracking

### 2.6 Organization Setup
- Department hierarchy (parent-child)
- Position catalog with salary bands
- Holiday calendar (company-wide, recurring)
- System configuration (admin panel)

### 2.7 Dashboard & Reporting
- Role-specific dashboards (Admin, HR, Manager, Employee)
- KPIs: headcount, leave balance, pending approvals, attendance rate
- Performance reviews with rating & feedback

---

## 3. User Roles & Access Model

| Role | Access Level | Key Capabilities |
|------|-------------|------------------|
| **Admin** | Full system access | All CRUD, system config, payroll approval, user management, data restore |
| **HR** | HR operations | Employee management, leave/timesheet review, payroll generation, reports |
| **Manager** | Team scope | Approve team leave & timesheets, view team data, limited employee edit |
| **Employee** | Self-service | View own profile, submit leave & timesheets, check-in/out, view payslips |

Field-level access control restricts what each role can read/write on employee records (e.g., only Admin/HR can view salary, bank details).

---

## 4. Technology Stack

### 4.1 Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 22.x LTS | Server runtime |
| Framework | Express.js | 4.18 | HTTP framework |
| ORM | Sequelize | 6.37 | Database abstraction |
| Database | PostgreSQL | 15+ | Primary datastore |
| Auth | jsonwebtoken | 9.x | JWT token generation |
| Validation | Joi | 17.x | Request schema validation |
| Security | Helmet, hpp, xss-clean, bcryptjs | Latest | Security hardening |
| Logging | Winston + Morgan | Latest | Structured logging |
| Email | Nodemailer | 6.x | Transactional email |
| Process Mgr | PM2 | 5.x | Cluster mode, zero-downtime |

### 4.2 Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Library | React | 18.3 | UI framework |
| UI Kit | Material-UI (MUI) | 5.15 | Component library |
| Data Grid | MUI X Data Grid | 6.18 | Tabular data |
| Routing | React Router | 6.25 | SPA navigation |
| HTTP | Axios | 1.11 | API communication |
| State | TanStack Query | 5.90 | Server-state caching |
| Forms | React Hook Form | 7.48 | Form state management |
| Validation | Yup | 1.7 | Schema-based validation |
| Notifications | Notistack | 3.0 | Snackbar notifications |
| Charts | Recharts | 2.8 | Dashboard charts |
| Excel | SheetJS (xlsx) | 0.18 | Import/export spreadsheets |
| Dates | date-fns, dayjs | Latest | Date manipulation |

### 4.3 Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Container | Docker + Docker Compose | Containerized deployment |
| Reverse Proxy | Nginx | SSL termination, static files, API proxy |
| Process Manager | PM2 | Cluster mode, auto-restart |
| Host OS | Ubuntu 24.04 LTS | Production server |
| CI/CD | GitHub Actions | Automated testing |
| E2E Testing | Playwright | Browser automation |
| Unit Testing | Jest | Backend unit tests |

---

## 5. Repository Structure

```
skyraksys_hrm_app/
├── backend/                  # Node.js/Express API server
│   ├── config/               # DB, auth, logger, email, swagger config
│   ├── controllers/          # 6 HTTP controllers
│   ├── middleware/            # 13 middleware files (auth, validation, rate-limit, upload)
│   ├── migrations/           # 20+ Sequelize migrations
│   ├── models/               # 22 Sequelize model definitions
│   ├── routes/               # 27 route files (~238 endpoints)
│   ├── seeders/              # Demo data seeder
│   ├── services/             # Business logic (root + 6 subdirectories)
│   ├── templates/            # Email templates
│   ├── tests/                # Jest unit & integration tests
│   ├── uploads/              # Employee photos
│   ├── utils/                # Helpers, error classes, PDF generator
│   └── server.js             # Express application entry point
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # Feature & shared components
│   │   ├── config/           # API endpoints, query client, payslip templates
│   │   ├── contexts/         # Auth, Loading, Notification providers
│   │   ├── hooks/            # 10 custom hooks + React Query queries
│   │   ├── pages/            # Project & Task pages
│   │   ├── routes/           # 8 route group definitions
│   │   ├── services/         # 19 API service files
│   │   ├── theme/            # MUI custom theme
│   │   └── utils/            # 13 utility modules
│   ├── e2e-integration/      # Playwright integration tests
│   ├── e2e-excel/            # Excel import/export E2E tests
│   └── public/               # Static assets
│
├── database/                 # DB setup scripts & init SQL
├── docs/                     # Documentation (this folder)
│   ├── v2/                   # ← Current documentation set
│   └── deployment/           # Deployment guides
├── docker-compose.yml        # Docker orchestration
├── ecosystem.config.js       # PM2 configuration
├── nginx/                    # Nginx configuration
├── scripts/                  # Deployment & utility scripts
└── tests/e2e/                # Additional E2E test suites
```

---

## 6. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUID primary keys** | Globally unique, merge-safe, no sequential ID leakage |
| **Soft deletes (paranoid)** | Data recovery, audit compliance, referential integrity |
| **httpOnly JWT cookies** | Prevents XSS token theft vs localStorage |
| **Sequelize ORM** | Migrations, model validation, eager loading, PostgreSQL dialect |
| **Service-layer architecture** | Separation of HTTP handling from business logic |
| **Field-level RBAC** | Granular data access per role (salary, bank visible to HR/Admin only) |
| **Employee ID auto-gen** | `SKYT` prefix + numeric sequence with gap-proof numeric ordering |
| **TanStack Query** | Automatic caching, deduplication, background refresh for API data |
| **PM2 cluster mode** | Multi-core utilization, zero-downtime restarts |

---

## 7. Deployment Topology

```
                         Internet
                            │
                     ┌──────┴──────┐
                     │   Nginx     │  :443 (SSL) / :80 (redirect)
                     │  (reverse   │
                     │   proxy)    │
                     └──────┬──────┘
                    ┌───────┴───────┐
                    │               │
             /api/* │        /* (static)
                    │               │
              ┌─────┴─────┐  ┌─────┴─────┐
              │  Backend  │  │ Frontend  │
              │ (PM2 x2)  │  │ (build/)  │
              │ :5000      │  │ served by │
              └─────┬─────┘  │  Nginx    │
                    │        └───────────┘
              ┌─────┴─────┐
              │PostgreSQL │
              │  :5432    │
              └───────────┘
```

- **Single-server**: Nginx → PM2 (2 instances) → PostgreSQL local
- **Docker**: `docker-compose up -d` → 3 containers (postgres, backend, frontend)
- **Scaling**: Horizontal via PM2 cluster or container replicas

---

## 8. Quick Start (Development)

```bash
# 1. Clone & install
git clone <repo-url>
cd skyraksys_hrm_app
npm install           # root scripts
cd backend && npm install
cd ../frontend && npm install

# 2. Database setup
# Create PostgreSQL database 'skyraksys_hrm'
# Copy backend/.env.example → backend/.env, configure DB credentials

# 3. Run migrations & seed
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# 4. Start servers
npm run start:backend    # from root — Express on :5000
npm run start:frontend   # from root — React on :3000

# 5. Login
# Admin:    admin@skyraksys.com / Admin@123
# HR:       hr@skyraksys.com / Admin@123
# Manager:  manager@skyraksys.com / Admin@123
# Employee: employee@skyraksys.com / Admin@123
```

---

## 9. Document Map

This document is part of a comprehensive documentation suite. See the [Documentation Index](./00-INDEX.md) for the complete list.

| # | Document | Owner |
|---|----------|-------|
| 01 | **System Overview** (this doc) | Solution Architect |
| 02 | Architecture & Design | Solution Architect |
| 03 | Database Design | DBA |
| 04 | API Reference | Senior Backend Developer |
| 05 | Backend Developer Guide | Senior Backend Developer |
| 06 | Frontend Developer Guide | Senior Developer |
| 07 | Security Architecture | Security Architect |
| 08 | UX Design System | UX Designer |
| 09 | Business Rules & Logic | Business Analyst |
| 10 | Data Flow & Integration | Middleware Architect |
| 11 | Deployment & Operations | DevOps / Middleware Architect |
| 12 | Testing & E2E Guide | QA Lead / Senior Developer |
| 13 | Business & Product Document | Product Owner / Business Analyst |

---

*End of Document*
