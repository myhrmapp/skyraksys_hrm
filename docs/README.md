# SkyrakSys HRM — Developer Documentation

> **Last updated:** 2026-03-22

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [Frontend Architecture Guide](01-FRONTEND_ARCHITECTURE.md) | Component tree, routing, state management, service layer, form patterns, utilities |
| 2 | [API Reference](02-API_REFERENCE.md) | All ~238 endpoints grouped by module with methods, paths, auth, and parameters |
| 3 | [Database Design Guide](03-DATABASE_DESIGN.md) | All 22 models, fields, associations, indexes, 19 migrations |
| 4 | [Business Rules Reference](04-BUSINESS_RULES.md) | Payroll calculation, leave management, timesheet workflow, attendance, employee lifecycle |
| 5 | [Security Architecture](05-SECURITY_ARCHITECTURE.md) | Auth flow, middleware chain, RBAC matrix, token lifecycle, rate limiting |
| 6 | [UX & Design System](06-UX_DESIGN_SYSTEM.md) | MUI theme, component patterns, form patterns, navigation, accessibility |
| 7 | [Configuration Guide](07-CONFIGURATION.md) | All environment variables, SystemConfig keys, PM2 config, Docker |
| 8 | [Operations Runbook](08-OPERATIONS_RUNBOOK.md) | Health checks, logging, scheduled tasks, monitoring, troubleshooting |

## Technical Reference

| Document | Description |
|----------|-------------|
| [Comprehensive Technical Docs](COMPREHENSIVE_TECHNICAL_DOCUMENTATION.md) | Complete API reference — all 238 endpoints, models, middleware |
| [E2E Coverage Audit](E2E_COVERAGE_AUDIT_REPORT.md) | Per-module E2E gap analysis and Playwright coverage breakdown |
| [Gap Analysis Report](GAP_ANALYSIS_REPORT.md) | 45 open items by priority (P0–P4) with effort estimates |

## Deployment Documentation

See [`deployment/`](deployment/README.md) for all production deployment guides.

| Document | Description |
|----------|-------------|
| [Production Checklist](deployment/PROD_DEPLOYMENT_CHECKLIST.md) | **Start here** — complete first-time setup on `skyait.skyraksys.com` |
| [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md) | Detailed manual reference (PM2 + Nginx, 8 steps) |
| [Quick Start](deployment/DEPLOY_QUICK_START.md) | One-page: upload → secrets → deploy → Nginx → SSL |

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React (CRA) | 18.3 |
| UI Library | Material UI (MUI) | 5.15 |
| State | React Query (TanStack) | 5.90 |
| Routing | React Router | 6.25 |
| HTTP Client | Axios | 1.7 |
| Backend | Express.js | 4.18 |
| ORM | Sequelize | 6.35 |
| Database | PostgreSQL | 15 |
| Auth | JWT (httpOnly cookies) | — |
| Testing | Jest + RTL + Playwright | 29 / 16 / 1.58 |
| Process Manager | PM2 | cluster × 2 |
| Server | Nginx | 1.x |
