# SkyrakSys HRM

Indian HR Management System — Employee lifecycle, payroll (EPF/ESI/TDS), leave, timesheets, attendance, and reviews.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3, MUI 5.15, React Query 5.90, React Router 6.25, Axios 1.7 |
| Backend | Express 4.18, Sequelize 6.35, PostgreSQL 15, JWT httpOnly cookies |
| Testing | Jest 29, React Testing Library 16, Playwright 1.58, Supertest 6 |
| Infra | PM2 (cluster ×2), Docker (PostgreSQL + pgAdmin) |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- npm

### Install & Run

```bash
# Database (via Docker)
docker-compose up -d

# Backend
cd backend
npm install
npx sequelize-cli db:migrate
npm run dev                    # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm start                      # http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env` in `backend/`. Key variables:

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_NAME=skyraksys_hrm
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=http://localhost:3000
```

See [docs/07-CONFIGURATION.md](docs/07-CONFIGURATION.md) for all 50+ environment variables.

### Production

```bash
cd frontend && npm run build
pm2 start ecosystem.config.js --env production
```

## Project Structure

```
skyraksys_hrm_app/
├── backend/
│   ├── config/          # Database, auth, app configuration
│   ├── controllers/     # Route controllers (~15 files)
│   ├── middleware/       # Auth, RBAC, rate limiting, validation
│   ├── models/          # Sequelize models (22 tables)
│   ├── routes/          # API routes (~238 endpoints, 27 files)
│   ├── migrations/      # Database migrations (9 files)
│   ├── scripts/         # Utility scripts
│   └── server.js        # Entry point (19-step middleware chain)
│
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (common + feature modules)
│   │   ├── contexts/    # AuthContext, LoadingContext, NotificationContext
│   │   ├── hooks/       # 18 custom hooks + React Query hooks
│   │   ├── services/    # 20 API service files
│   │   ├── theme/       # MUI theme (modernTheme.js)
│   │   ├── utils/       # 12 utility files (validation, RBAC, formatting)
│   │   └── App.js       # 55+ routes
│   ├── __tests__/       # Unit tests
│   └── e2e/             # Playwright E2E tests
│
├── docs/                # Developer documentation (8 guides)
├── database/            # Database scripts
├── docker-compose.yml   # PostgreSQL + pgAdmin
└── ecosystem.config.js  # PM2 configuration
```

## Documentation

### Developer Guides — [`docs/`](docs/README.md)

| Guide | Description |
|-------|-------------|
| [Frontend Architecture](docs/01-FRONTEND_ARCHITECTURE.md) | Components, routing, state management, services, hooks |
| [API Reference](docs/02-API_REFERENCE.md) | All ~238 endpoints with middleware and descriptions |
| [Database Design](docs/03-DATABASE_DESIGN.md) | 22 models, associations, migrations |
| [Business Rules](docs/04-BUSINESS_RULES.md) | Payroll calculations, leave rules, workflows |
| [Security Architecture](docs/05-SECURITY_ARCHITECTURE.md) | Auth flow, RBAC matrix, rate limiting |
| [UX & Design System](docs/06-UX_DESIGN_SYSTEM.md) | MUI theme, component patterns, conventions |
| [Configuration](docs/07-CONFIGURATION.md) | All env vars, PM2, Docker, runtime config |
| [Operations Runbook](docs/08-OPERATIONS_RUNBOOK.md) | Health checks, logging, cron, troubleshooting |

### Other Documentation

| Document | Description |
|----------|-------------|
| [Architecture & Design](ARCHITECTURE_AND_DESIGN_DOCUMENT.md) | System architecture overview (1,400 lines) |
| [Deployment Guide](DEPLOYMENT_GUIDE.md) | Production deployment instructions |
| [Test Strategy](TEST_STRATEGY_AND_PLAN.md) | Testing plan with field matrices |
| [Backend README](backend/README.md) | Backend-specific documentation |

## Key Features

- **Employee Management** — Full lifecycle (SKYT#### IDs, status transitions, photo upload)
- **Payroll** — Indian statutory compliance (EPF, ESI, Professional Tax, TDS old/new regime)
- **Leave Management** — 5 leave types, half-day support, cancellation workflow, automated accrual
- **Timesheets** — Weekly project-task entries, bulk operations, approval workflow
- **Attendance** — Check-in/out, multi-source, monthly reports
- **Employee Reviews** — Quarterly/annual cycles, 5-dimension ratings, HR approval
- **Security** — JWT httpOnly cookies, RBAC (4 roles), field-level permissions, audit logging
- **Projects & Tasks** — Assignment, workload tracking, time logging

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@skyraksys.com` | Set during setup |

## License

Proprietary — SkyrakSys
