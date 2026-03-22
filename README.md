# SkyrakSys HRM

Indian HR Management System — Employee lifecycle, payroll (EPF/ESI/TDS), leave, timesheets, attendance, and reviews.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3, MUI 5.15, React Query 5.90, React Router 6.25, Axios 1.7 |
| Backend | Express 4.18, Sequelize 6.35, PostgreSQL 15, JWT httpOnly cookies |
| Testing | Jest 29, React Testing Library 16, Playwright 1.58, Supertest 6 |
| Infra | PM2 (cluster ×2), Nginx, Docker (optional) |

## Quick Start (Local Development)

### Prerequisites
- Node.js 22 LTS
- PostgreSQL 15+
- npm

### Install & Run

```bash
# Backend
cd backend
cp .env.example .env        # fill in DB_* and JWT secrets
npm install
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev                  # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm start                    # http://localhost:3000
```

### Environment Variables

Copy `backend/.env.example` to `backend/.env`. Key variables:

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_NAME=skyraksys_hrm
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
ENCRYPTION_KEY=64-hex-char-key-here
FRONTEND_URL=http://localhost:3000
```

See [docs/07-CONFIGURATION.md](docs/07-CONFIGURATION.md) for all environment variables.

### Quick Production Deploy

See [docs/deployment/PROD_DEPLOYMENT_CHECKLIST.md](docs/deployment/PROD_DEPLOYMENT_CHECKLIST.md) for the complete first-time setup guide.

```bash
# On server — after uploading code and configuring .env:
bash scripts/deploy/03-deploy-app.sh
```

## Project Structure

```
skyraksys_hrm_app/
├── backend/
│   ├── config/          # Database, auth, logger, Swagger configuration
│   ├── controllers/     # Express route handlers (15 controllers)
│   ├── middleware/      # Auth, RBAC, rate limiting, validation, upload
│   ├── models/          # Sequelize ORM models (22 tables)
│   ├── routes/          # API routes (~238 endpoints, 27 route files)
│   ├── migrations/      # Database migrations (19 sequential files)
│   ├── seeders/         # Demo data seeder (1 comprehensive file)
│   ├── services/        # Business logic layer
│   ├── templates/       # Email HTML templates
│   ├── tests/           # Unit, integration, feature, and service tests
│   ├── utils/           # Shared utilities (encryption, logger, sanitizer)
│   └── server.js        # Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (feature modules + common)
│   │   ├── contexts/    # AuthContext, LoadingContext, NotificationContext
│   │   ├── hooks/       # Custom React hooks + React Query hooks
│   │   ├── services/    # API service layer (20 files)
│   │   ├── theme/       # MUI theme (modernTheme.js)
│   │   ├── utils/       # Validation, RBAC, formatting helpers
│   │   └── App.js       # Router — 55+ routes
│   ├── e2e-excel/       # Playwright Excel-driven E2E suite (23 specs)
│   └── e2e-integration/ # Playwright integration tests (17 specs)
│
├── docs/
│   ├── deployment/      # All production deployment guides & checklists
│   ├── 01-FRONTEND_ARCHITECTURE.md
│   ├── 02-API_REFERENCE.md
│   ├── 03-DATABASE_DESIGN.md
│   ├── 04-BUSINESS_RULES.md
│   ├── 05-SECURITY_ARCHITECTURE.md
│   ├── 06-UX_DESIGN_SYSTEM.md
│   ├── 07-CONFIGURATION.md
│   └── 08-OPERATIONS_RUNBOOK.md
│
├── scripts/deploy/      # Deployment shell scripts (01–05) + PowerShell helpers
├── database/            # SQL init scripts and migration helpers
├── nginx/               # Nginx configuration
├── docker-compose.yml   # Docker Compose (PostgreSQL + pgAdmin)
├── ecosystem.config.js  # PM2 process configuration
└── archive/             # Historical/superseded files (not active code)
```

## Documentation

### Developer Reference — [`docs/`](docs/README.md)

| Guide | Description |
|-------|-------------|
| [Frontend Architecture](docs/01-FRONTEND_ARCHITECTURE.md) | Components, routing, state management, hooks |
| [API Reference](docs/02-API_REFERENCE.md) | All ~238 endpoints with auth and middleware notes |
| [Database Design](docs/03-DATABASE_DESIGN.md) | 22 models, associations, 19 migrations |
| [Business Rules](docs/04-BUSINESS_RULES.md) | Payroll (EPF/ESI/TDS), leave rules, approval workflows |
| [Security Architecture](docs/05-SECURITY_ARCHITECTURE.md) | Auth flow, RBAC matrix, rate limiting, audit logging |
| [UX & Design System](docs/06-UX_DESIGN_SYSTEM.md) | MUI theme, component patterns, conventions |
| [Configuration](docs/07-CONFIGURATION.md) | All env vars, PM2, Nginx, runtime config |
| [Operations Runbook](docs/08-OPERATIONS_RUNBOOK.md) | Health checks, logging, backup, troubleshooting |

### Technical Reference

| Document | Description |
|----------|-------------|
| [Comprehensive Technical Docs](docs/COMPREHENSIVE_TECHNICAL_DOCUMENTATION.md) | Full API reference — all 238 endpoints, models, middleware |
| [E2E Coverage Audit](docs/E2E_COVERAGE_AUDIT_REPORT.md) | Per-module E2E gap analysis and coverage breakdown |
| [Gap Analysis Report](docs/GAP_ANALYSIS_REPORT.md) | Open items (45 items, P0–P4) with production readiness verdict |
| [Backend README](backend/README.md) | Backend API and setup reference |

### Deployment — [`docs/deployment/`](docs/deployment/)

| Document | Description |
|----------|-------------|
| [Production Checklist](docs/deployment/PROD_DEPLOYMENT_CHECKLIST.md) | **Start here** — complete first-time setup guide |
| [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md) | Detailed manual reference (PM2 + Nginx) |
| [Quick Start](docs/deployment/DEPLOY_QUICK_START.md) | One-page: upload → secrets → deploy → Nginx → SSL |

## Key Features

- **Employee Management** — Full lifecycle (SKYT#### IDs, status transitions, photo upload)
- **Payroll** — Indian statutory compliance (EPF, ESI, Professional Tax, TDS old/new regime)
- **Leave Management** — 5 leave types, half-day support, cancellation workflow, automated accrual
- **Timesheets** — Weekly project-task entries, bulk operations, approval workflow
- **Attendance** — Check-in/out, multi-source, monthly reports
- **Employee Reviews** — Quarterly/annual cycles, 5-dimension ratings, HR approval
- **Security** — JWT httpOnly cookies, RBAC (4 roles), field-level permissions, audit logging
- **Projects & Tasks** — Assignment, workload tracking, time logging

## Default Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| System Admin | `admin@skyraksys.com` | `admin123` |
| HR Manager | `hr@skyraksys.com` | `admin123` |
| Team Lead | `lead@skyraksys.com` | `admin123` |
| Employee | `employee1@skyraksys.com` | `admin123` |
| Employee | `employee2@skyraksys.com` | `admin123` |

> **Change all default passwords immediately after first login in production.**

## License

Proprietary — SkyrakSys
