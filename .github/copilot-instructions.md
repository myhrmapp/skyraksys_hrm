# Copilot Instructions for SkyrakSys HRM

## Project Overview
- **Monorepo** for a full-stack HRM system: Node.js/Express backend, React frontend, Playwright E2E tests, and a standalone admin debug panel.
- **Backend** (`backend/`): REST API, PostgreSQL (Sequelize), JWT auth, role-based access, robust error handling, and security best practices.
- **Frontend** (`frontend/`): React app, connects to backend API, standard React conventions.
- **E2E Tests** (`frontend/e2e/`): Playwright, Page Object Model, test categories via tags, CI/CD via GitHub Actions.
- **Admin Debug Panel** (`admin-debug-panel/`): Standalone, no-auth, for local DB inspection and manipulation. Never deploy to production.
- **Active documentation set**: [README.md](../README.md), [docs/README.md](../docs/README.md), [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md), [docs/SECURITY.md](../docs/SECURITY.md), and [docs/HELP_AND_SUPPORT.md](../docs/HELP_AND_SUPPORT.md).
- **Archive boundary**: historical notes, legacy deployment guidance, generated reports, and old debug artifacts are retained under [archive/](../archive) and [logs/](../logs) for reference only and must not be treated as active support material.
- **Operating contract**: repo-wide working rules are defined in [AGENTS.md](../AGENTS.md), with the cleanup and audit plan in [docs/WORKSPACE_AUDIT_AND_CLEANUP_PLAN.md](../docs/WORKSPACE_AUDIT_AND_CLEANUP_PLAN.md) and agent roles in [docs/AGENT_TEAM_AND_BEST_PRACTICES.md](../docs/AGENT_TEAM_AND_BEST_PRACTICES.md).

## Key Workflows
- **Install**: `npm install` in both `backend/` and `frontend/`.
- **Env Setup**: Copy `.env.production.template` to `.env.production` and configure DB/JWT/API keys.
- **DB Setup**: Use `setup-database.bat` (Windows) or manual SQL + `npm run dev` for schema sync. Seed with `npx sequelize-cli db:seed:all`.
- **Run**: From root, use `npm run start:backend` and `npm run start:frontend` (or VS Code tasks: `start-backend`, `start-frontend`).
- **Test**: Backend: `npm test`. E2E: `npm test` in `frontend/e2e/` (see README for advanced options).
- **Debug Panel**: Start backend, then run `python -m http.server 8080` in `admin-debug-panel/` and open `http://localhost:8080`.

## Architecture & Patterns
- **Backend**: Modular Express (controllers, middleware, models, routes). Sequelize for DB. Joi for validation. Consistent error JSON. Role-based access enforced in routes.
- **Frontend**: Standard React structure. API endpoints match backend REST routes.
- **E2E**: Page Object Model (`pages/`), fixtures, utilities. Use tags like `@smoke`, `@regression` for test selection.
- **Debug Panel**: All logic in `admin-debug.js`. API base URL is hardcoded; update as needed for local backend port.

## Conventions & Tips
- **Error Format**: All API errors return `{ success: false, message, errors: [ { field, message } ] }`.
- **Default Users**: After seeding, use demo accounts (see backend README) for all roles.
- **Security**: Never expose admin debug panel or use in production. Enable CORS and disable rate limiting for local dev as needed.
- **Data Flow**: Frontend and debug panel both talk to backend API (default port 5000). Backend talks to PostgreSQL.
- **Testing**: E2E tests expect frontend on 3000, backend on 5000. Use `.env` files to configure.
- **CI/CD**: See `frontend/e2e/README.md` for GitHub Actions setup.
- **Documentation policy**: When a change affects product behavior, deployment flow, security, or user help, update the matching active file in the docs set and keep archive material in [archive/](../archive) only as historical reference.
- **Agent policy**: Use the repo operating model in [AGENTS.md](../AGENTS.md). Do not treat old archived notes as the active support path.

## References
- See [README.md](../README.md), [docs/README.md](../docs/README.md), backend docs, frontend/e2e docs, and [docs/HELP_AND_SUPPORT.md](../docs/HELP_AND_SUPPORT.md) for the live operational set.
- For deployment, see [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) and [docs/deployment/](../docs/deployment).
- For API structure, see backend `README.md` and the active docs set.
- For workspace hygiene and project governance, see [AGENTS.md](../AGENTS.md) and [docs/WORKSPACE_AUDIT_AND_CLEANUP_PLAN.md](../docs/WORKSPACE_AUDIT_AND_CLEANUP_PLAN.md).

---

**When in doubt, check the relevant README in each major directory.**
