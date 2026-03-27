# SkyrakSys HRM — Documentation Index

> **Version**: 2.0 | **Last Updated**: 2026-03-27  
> **Total Documents**: 13  
> **Purpose**: Complete technical & business documentation for full application handover

---

## Document Catalog

| # | Document | Audience | Description |
|---|----------|----------|-------------|
| 01 | [System Overview](./01-SYSTEM_OVERVIEW.md) | Everyone | Executive summary, tech stack, repo structure, quick start, design decisions |
| 02 | [Architecture & Design](./02-ARCHITECTURE_AND_DESIGN.md) | Architects, Senior Devs | Layered architecture, middleware pipeline, auth flow, RBAC matrix, design patterns |
| 03 | [Database Design](./03-DATABASE_DESIGN.md) | DBAs, Backend Devs | All 22 tables, column definitions, indexes, ERD, migrations, backup procedures |
| 04 | [API Reference](./04-API_REFERENCE.md) | Backend & Frontend Devs | ~170+ endpoints across 28 route files, request/response formats, auth requirements |
| 05 | [Backend Developer Guide](./05-BACKEND_DEVELOPER_GUIDE.md) | Backend Devs | Server init, config, middleware, services, error handling, adding new features |
| 06 | [Frontend Developer Guide](./06-FRONTEND_DEVELOPER_GUIDE.md) | Frontend Devs | React/MUI architecture, auth, routing, data fetching, forms, role-based UI |
| 07 | [Security Architecture](./07-SECURITY_ARCHITECTURE.md) | Security, DevOps | JWT design, RBAC tiers, input validation, rate limiting, encryption, audit trail |
| 08 | [UX Design System](./08-UX_DESIGN_SYSTEM.md) | Frontend Devs, Designers | Color system, typography, component specs, layout, responsive design, notifications |
| 09 | [Business Rules & Logic](./09-BUSINESS_RULES.md) | Business Analysts, All Devs | Employee lifecycle, leave rules, payroll calculations, Indian compliance formulas |
| 10 | [Data Flow & Integration](./10-DATA_FLOW_AND_INTEGRATION.md) | Integration, Senior Devs | Request lifecycle, salary transformation, caching, error propagation, cron jobs |
| 11 | [Deployment & Operations](./11-DEPLOYMENT_AND_OPERATIONS.md) | DevOps, SRE | Docker, PM2, Nginx, SSL, env config, DB ops, monitoring, scaling, troubleshooting |
| 12 | [Testing & E2E Guide](./12-TESTING_AND_E2E.md) | QA, All Devs | Playwright E2E, Jest unit tests, test data, helpers, CI/CD integration |
| 13 | [Business & Product](./13-BUSINESS_AND_PRODUCT.md) | Product, Business | Module descriptions, user stories, role matrix, workflows, compliance, roadmap |

---

## Reading Guide

### New Team Member
Start with **01 → 13 → 02** to understand the system, business context, and architecture.

### Backend Developer
**05 → 04 → 03 → 09 → 07** — Backend guide, API reference, database, business rules, security.

### Frontend Developer
**06 → 08 → 04 → 10** — Frontend guide, design system, API reference, data flows.

### QA / Test Engineer
**12 → 04 → 09** — Testing guide, API reference (for test design), business rules (for test cases).

### DevOps / SRE
**11 → 07 → 02** — Deployment guide, security architecture, system architecture.

### Business Analyst / Product Owner
**13 → 09 → 01** — Business document, business rules, system overview.

### DBA
**03 → 10 → 11** — Database design, data flows, backup/restore operations.

---

## Tech Stack Quick Reference

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend | Node.js + Express | 22 / 4.18 |
| Frontend | React + Material-UI | 18.3 / 5.15 |
| Database | PostgreSQL + Sequelize | 15+ / 6.37 |
| Auth | JWT (httpOnly cookies) | — |
| E2E Tests | Playwright | 1.58 |
| Unit Tests | Jest + RTL | 29 / 14 |
| Process Manager | PM2 | 5.x |
| Container | Docker Compose | — |
| Reverse Proxy | Nginx | — |

---

## Quick Commands

```bash
# Install
cd backend && npm install
cd frontend && npm install

# Development
cd backend && npm run dev          # Backend with nodemon
cd frontend && npm start           # Frontend dev server (port 3000)

# Database
cd backend && npx sequelize-cli db:migrate
cd backend && npx sequelize-cli db:seed:all

# Test
cd backend && npm test             # Backend Jest tests
cd frontend && npm test            # Frontend Jest tests
cd frontend && npx playwright test # E2E integration tests

# Production
docker-compose up -d --build       # Docker deployment
pm2 start ecosystem.config.js      # PM2 deployment
```

---

*This index was generated as part of a comprehensive documentation initiative for full application handover.*
