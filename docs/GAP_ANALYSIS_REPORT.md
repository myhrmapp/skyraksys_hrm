# SkyrakSys HRM — Gap Analysis Report

> **Date:** 2026-02-15  
> **Prepared by:** Product Owner & Business Analyst Review  
> **Overall Readiness Score:** 8.6 / 10 — Production-Ready with Minor Hardening  
> **Source:** Consolidated analysis of 6 audit reports, 99 business-workflow E2E tests, and full codebase review

---

## Executive Summary

SkyrakSys HRM is a 13-module HR Management System serving 4 user roles (Admin, HR, Manager, Employee) with 150+ API endpoints and 60+ frontend routes. After extensive remediation (21 functional bugs fixed, 11 DB migrations applied, 38 backend items closed, 60 frontend deep-dive items fixed), the application has **zero P0 blockers** and **zero correctness bugs remaining**.

**57 open items remain**, distributed as:

| Priority | Count | Category |
|----------|:-----:|----------|
| P0 — Blockers | 0 | None |
| P1 — Critical | 1 | Testing (1) — *SEC-26 FIXED* |
| P2 — High | 6 | Testing (5), DevOps (2) — *SEC-26 FIXED* |
| P3 — Medium | 5 | Database (1), Security (1), Testing (3) — *DB-13, FE-62 FIXED* |
| P4 — Low | 33 | *FE-64/65/67/68 FIXED, OPS-6 already done, FE-63 not actually dead* |

Additionally, **15 future module requests** have been identified for the roadmap.

---

## 1. Security Gaps

### 1.1 ~~HIGH — SQL Injection in database.service.js `[SEC-26]`~~ ✅ FIXED

> **Fixed 2026-03-21:** Added `orderBy` validation against schema columns, `orderDir` whitelist (ASC/DESC only), table name validation in `backupTable()`, and SELECT-only restriction in `explainQuery()`. Debug routes already gated to dev/test environments.

### 1.2 MEDIUM (Partial) — No CSRF Token `[SEC-5]`

| Attribute | Detail |
|-----------|--------|
| **Current Mitigation** | `sameSite: Strict` on cookies; httpOnly; JWT bearer tokens |
| **Gap** | No explicit CSRF token, relies solely on sameSite cookies |
| **Risk** | Low — sameSite mitigates in all modern browsers; legacy browser risk only |
| **Effort** | ~4 hours |
| **Recommendation** | Add CSRF token (csurf or custom double-submit cookie) for defense-in-depth. Can be deferred if legacy browser support is not required. |

### 1.3 LOW — AdminDebugPanel localStorage `[SEC-22]`

| Attribute | Detail |
|-----------|--------|
| **Issue** | `selectedEnvironment` stored in localStorage |
| **Risk** | Negligible — dev-only panel, never deployed to production |
| **Recommendation** | Remove AdminDebugPanel from production builds entirely (also covers FE-64/FE-65). |

---

## 2. Database Gaps

### 2.1 MEDIUM — Employee/User Data Duplication `[DB-5]`

| Attribute | Detail |
|-----------|--------|
| **Issue** | `firstName`, `lastName`, `email` exist in both `employees` and `users` tables |
| **Risk** | Data sync risk — updates to one table may not propagate to the other |
| **Design Rationale** | Intentional separation of concerns (auth vs. HR data) |
| **Effort** | ~8 hours (schema refactor + migration + service updates) |
| **Recommendation** | Short-term: Add database trigger or application hook to keep fields in sync. Long-term: Normalize to single source of truth with a view for the other context. |

### 2.2 ~~LOW — Timesheet.approvedBy Reference `[DB-13]`~~ ✅ FIXED

> **Fixed 2026-03-21:** Changed `references: { model: 'employees' }` to `references: { model: 'users' }` in timesheet.model.js.

---

## 3. Frontend Gaps

> All 14 medium-priority frontend items have been fixed. Remaining items are **low priority** — cosmetic, cleanup, or accessibility improvements.

### 3.1 Code Quality (6 items)

| # | ID | Gap | Impact |
|---|-----|-----|--------|
| 1 | FE-51 | Mixed error notification patterns (`enqueueSnackbar` / `useNotification` / local `Alert`) | Inconsistent UX across modules |
| 2 | FE-53 | Mixed loading state patterns (`useLoading` / `useState` / React Query `isLoading`) | Developer confusion |
| 3 | FE-54 | `embedded` prop handling inconsistency across admin components | Works functionally |
| 4 | FE-56 | Emoji characters in console.log messages (🔄 ✅ ❌ 📧) | Not user-facing |
| 5 | FE-63 | Dead state variables (`approvalDialog`/`approvalAction` overlapping `confirmAction`) | Memory waste |
| 6 | FE-68 | 50+ `console.log` statements in production source files (UserAccountManager has ~18) | Performance, information leak |

**Recommendation:** Bundle into a single "Frontend Code Quality Sprint" (~8 hours). Standardize on `useNotification` + React Query `isLoading`. Remove all console.log via ESLint no-console rule.

### 3.2 ~~Accessibility (1 item)~~ — Remains Open

| # | ID | Gap | Impact |
|---|-----|-----|--------|
| 7 | FE-57 | Color-only status differentiation — color is primary indicator, label text present | WCAG 1.4.1 non-compliance |

### 3.3 ~~Production Hygiene (3 items)~~ ✅ FIXED

> **Fixed 2026-03-21 (FE-64/FE-65):** AdminDebugPanel and SimpleValidationDiagnostic lazy imports now gated behind `process.env.NODE_ENV !== 'production'` — chunks are not created in production builds.

### 3.4 ~~DRY Violations (1 item)~~ ✅ FIXED

> **Fixed 2026-03-21 (FE-67):** Inline TabPanel in EnhancedPayslipTemplateConfiguration replaced with shared `TabPanel` imported from `TabbedPage.js`. Shared TabPanel enhanced with `contentSx` prop and `hasBeenActive` defaulting to active-tab behavior when not provided.

---

## 4. Frontend Deep-Dive — Deferred Items (18 items)

> These are **component decomposition** and **feature enhancement** items identified during the 78-item frontend deep-dive audit. 60 of 78 items were fixed; these 18 were intentionally deferred as non-blocking.

### 4.1 Component Decomposition (6 items)

Large single-file components that should be split for maintainability:

| # | Component | Current Size | Target Size | Module |
|---|-----------|:------------:|:-----------:|--------|
| 1 | ModernWeeklyTimesheet | 1,427 lines | < 400 | Timesheet |
| 2 | ModernPayrollManagement | 1,471 lines | < 500 | Payroll |
| 3 | EnhancedPayslipTemplateConfiguration | 1,655 lines | < 500 | Payroll |
| 4 | UserManagementEnhanced | 1,240 lines | < 500 | Admin |
| 5 | TimesheetApproval | 1,382 lines | < 500 | Timesheet |
| 6 | ProjectTaskConfiguration | 1,042 lines | < 500 | Admin |

**Estimated Effort:** ~3 days (4-6 hours per component)  
**Recommendation:** Address during a "Refactor Sprint." Extract sub-components (forms, tables, dialogs, tabs) into dedicated files. No new functionality.

### 4.2 Feature Enhancements (9 items)

| # | Feature | Module | Business Value |
|---|---------|--------|----------------|
| 1 | Employee lifecycle dates (joining, confirmation, resignation, lastWorking) | Employee | High — compliance requirement |
| 2 | Department hierarchy (parent department selector) | Admin | Medium — org structure visualization |
| 3 | Department/position code fields in UI | Admin | Low — administrative convenience |
| 4 | Attendance notes on check-in/check-out | Attendance | Medium — context for late/early entries |
| 5 | Attendance department filter | Attendance | Medium — manager convenience |
| 6 | Timesheet delete for drafts | Timesheet | Low — cleanup convenience |
| 7 | Leave attachment upload support | Leave | Medium — medical certificate submission |
| 8 | Email config version history UI | Admin | Low — audit trail |
| 9 | Copy previous week for timesheets | Timesheet | High — major UX improvement |

**Recommendation:** Prioritize items 1 (lifecycle dates), 9 (copy previous week), and 7 (leave attachments) for the next product increment.

### 4.3 Code Quality Deferred (3 items)

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 1 | Consolidate 2 payroll services into 1 | Medium | Currently complementary, not duplicates — keep as-is |
| 2 | Standardize all data fetching to React Query | Large | Many components still use `useEffect` + `useState` pattern |
| 3 | Use currency field from model instead of hardcoded ₹ | Done | Already fixed via centralized `formatCurrency.js` |

---

## 5. Testing Gaps (19 items)

> The most significant gap category. While 227+ Playwright E2E tests and 161 backend test files exist, several modules lack adequate test coverage.

### 5.1 Critical — Zero Coverage (3 items)

| # | ID | Gap | Risk |
|---|-----|-----|------|
| 1 | TST-1 | **Performance Review module — zero tests of any kind** | High — regression risk for a core module |
| 2 | TST-2 | Attendance module — only mocked unit tests, no real DB integration tests | Medium — mock drift risk |
| 3 | TST-3 | No concurrent access tests (double-approval, parallel payslip generation) | High — race condition risk in production |

### 5.2 High — Missing Test Categories (5 items)

| # | ID | Gap | Impact |
|---|-----|-----|--------|
| 4 | TST-4 | No payroll calculation accuracy tests (known inputs → expected outputs) | High — financial accuracy |
| 5 | TST-5 | Holiday module — only mocked unit tests | Medium — mock drift |
| 6 | TST-6 | No browser-based E2E backend tests (Playwright configured but no backend E2E test files) | Medium — integration gaps |
| 7 | TST-7 | Email/Notification module — no tests | Medium — silent failures |
| 8 | TST-8 | Holiday + Leave interaction test (holidays should reduce leave day count) | High — calculation accuracy |

### 5.3 Medium — Coverage Expansion (8 items)

| # | ID | Gap |
|---|-----|-----|
| 9 | TST-9 | File Upload/Download — minimal tests |
| 10 | TST-10 | Frontend Routing — no tests |
| 11 | TST-11 | Salary Structure — no dedicated tests |
| 12 | TST-12 | Reports/Analytics — no tests |
| 13 | TST-13 | Bulk operation partial-failure scenarios — no tests |
| 14 | TST-14 | Frontend component tests (React Testing Library) — minimal coverage |
| 15 | TST-15 | API response schema validation tests — none |
| 16 | TST-16 | No accessibility testing (axe-core) |

### 5.4 Low — Non-Functional Testing (3 items)

| # | ID | Gap |
|---|-----|-----|
| 17 | TST-17 | No load/stress tests (k6 / Artillery) |
| 18 | TST-18 | No visual regression tests |
| 19 | TST-19 | No data migration validation tests |

**Recommendation:**

| Phase | Items | Effort | Priority |
|-------|-------|--------|----------|
| Phase 1 | TST-1, TST-3, TST-4, TST-8 | ~3 days | Immediate — write Performance Review tests + concurrent access tests + payroll accuracy tests |
| Phase 2 | TST-2, TST-5, TST-6, TST-7 | ~3 days | Next sprint — real DB integration tests + email tests |
| Phase 3 | TST-9 through TST-16 | ~5 days | Backlog — coverage expansion |
| Phase 4 | TST-17 through TST-19 | ~3 days | Future — non-functional testing |

---

## 6. DevOps / Infrastructure Gaps (4 items)

### 6.1 HIGH — Cluster-Mode Incompatibility (2 items)

| # | ID | Gap | Impact |
|---|-----|-----|--------|
| 1 | OPS-1 | In-memory rate limiting + token blacklist incompatible with PM2 cluster mode (×2 instances) | Rate limits not shared across workers; blacklisted tokens still valid on other workers |
| 2 | OPS-2 | In-memory CacheService — stale reads across PM2 cluster instances | Different workers serve different cached data |

**Root Cause:** All three (rate limiter, token blacklist, cache) use in-memory stores. PM2 cluster mode forks separate Node.js processes with independent memory.

**Impact:** Acceptable for single-instance deployment. **Blocks horizontal scaling.**

### 6.2 MEDIUM — Redis Infrastructure `[OPS-3]`

| Attribute | Detail |
|-----------|--------|
| **Issue** | No Redis server configured |
| **Dependencies** | OPS-1, OPS-2 depend on this |
| **Effort** | ~4 hours (Redis setup + ioredis integration + migrate rate limiter, cache, token blacklist) |
| **Recommendation** | Deploy Redis alongside PostgreSQL. Use `ioredis` package. Migrate rate limiter to `rate-limiter-flexible` with Redis store. |

### 6.3 LOW — Password Reset Tokens `[OPS-6]`

| Attribute | Detail |
|-----------|--------|
| **Issue** | Password reset tokens stored in-memory — lost on server restart |
| **Impact** | Users must re-request password reset after any deployment or process restart |
| **Effort** | ~2 hours |
| **Recommendation** | Store reset tokens in a database table (`password_reset_tokens`) with expiry. Clean up expired tokens via cron job. |

---

## 7. Future Module Requests (15 items)

> New modules and capabilities identified during the product review. None are bugs — all are feature requests for the product roadmap.

### 7.1 Medium Priority — Next Phase

| # | ID | Module | Business Value |
|---|-----|--------|----------------|
| 1 | 12.3 | Email Notifications (leave/timesheet/payslip status changes) | High — user expects notifications (backend wiring exists, needs templates + triggers) |
| 2 | 12.4 | Document Management (contracts, offer letters, policies) | High — compliance requirement |
| 3 | 12.6 | Multi-Level Approval Workflow (configurable approval chains) | Medium — needed for larger organizations |
| 4 | 12.7 | Report Builder (ad-hoc custom reports) | Medium — reduces ad-hoc request load |
| 5 | 12.8 | Mobile App / PWA | High — field workforce needs |
| 6 | 12.9 | Two-Factor Authentication (2FA / MFA) | High — security standard |
| 7 | 12.10 | GDPR Data Export / Purge | Medium — regulatory compliance |

### 7.2 Low Priority — Future Roadmap

| # | ID | Module | Business Value |
|---|-----|--------|----------------|
| 8 | 12.11 | Announcement / Notice Board | Low |
| 9 | 12.12 | Shift Management | Medium (industry-specific) |
| 10 | 12.13 | Expense Management | Medium |
| 11 | 12.14 | Training / Certification Tracking | Low |
| 12 | 12.15 | Multi-Company / Branch Support | High (for SaaS) |
| 13 | 12.16 | SSO / OAuth Integration (Azure AD, Google Workspace) | High (enterprise) |
| 14 | 12.17 | API Versioning | Low (internal API) |
| 15 | 12.18 | WebSocket / Real-Time Notifications | Medium |

---

## 8. Risk Assessment Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SQL injection via database.service.js (SEC-26) | Medium | Critical | Immediate fix — parameterize queries, whitelist tables |
| Payroll calculation errors (no accuracy tests) | Low | Critical | Write known-input/expected-output test suite |
| Race conditions (no concurrency tests) | Medium | High | Add transaction + row locking tests |
| Cluster-mode data inconsistency (OPS-1/2) | High (if clustered) | High | Deploy Redis before scaling |
| Employee/User data desync (DB-5) | Low | Medium | Add sync hooks or normalize schema |
| Debug panel in production builds (FE-64/65) | Low | Medium | Remove from production webpack config |

---

## 9. Recommended Sprint Plan

### Sprint 1 — Security Hardening (1-2 days)

- [ ] Fix SEC-26: Parameterize SQL in database.service.js (~2 hours)
- [ ] Remove AdminDebugPanel from production builds (FE-64, FE-65, SEC-22) (~1 hour)
- [ ] Strip 50+ console.log statements (FE-68) — add ESLint no-console rule (~2 hours)

### Sprint 2 — Critical Test Coverage (3-4 days)

- [ ] TST-1: Write Performance Review module tests (unit + integration)
- [ ] TST-3: Add concurrent access tests (double-approval, parallel payslip)
- [ ] TST-4: Payroll calculation accuracy tests with known inputs
- [ ] TST-8: Holiday + Leave day count interaction tests

### Sprint 3 — Infrastructure (2-3 days)

- [ ] OPS-3: Deploy Redis, integrate ioredis
- [ ] OPS-1/OPS-2: Migrate rate limiter + cache + token blacklist to Redis
- [ ] OPS-6: Move password reset tokens to database table
- [ ] DB-5: Add Employee/User data sync hook

### Sprint 4 — Frontend Polish (2-3 days)

- [ ] FE-51: Standardize error notifications to useNotification
- [ ] FE-53: Standardize loading patterns (React Query isLoading everywhere)
- [ ] FE-57: Add icons/patterns alongside status colors (accessibility)
- [ ] FE-67: Consolidate 3 TabPanel implementations
- [ ] Clean up dead state variables (FE-63), emoji logs (FE-56), embedded prop (FE-54)

### Sprint 5 — Component Decomposition (3-4 days)

- [ ] Split 6 large components (1,000-1,600 lines each → <500 lines)

### Backlog — Feature Enhancements & Future Modules

- Employee lifecycle dates, copy previous week timesheet, leave attachment upload
- Email notifications, document management, 2FA, mobile/PWA
- Test coverage expansion (TST-9 through TST-19)

---

## 10. Summary

| Metric | Value |
|--------|-------|
| Total open items | 45 (was 57) |
| Blockers (P0) | 0 |
| Critical (P1) | 1 (was 2) |
| High (P2) | 6 |
| Medium (P3) | 6 |
| Low (P4) | 33 (was 43) |
| Future module requests | 15 |
| Estimated effort for P1+P2 items | ~5 days |
| Estimated effort for all items | ~4-5 weeks |
| Production readiness | **Yes** — with SEC-26 fix as pre-condition |

**Bottom line:** The application is production-ready for single-instance deployment. The HIGH-severity SQL injection (SEC-26) has been fixed. All remaining gaps are testing, scalability, and future features that can be addressed incrementally post-launch.

---

*This report consolidates findings from: CONSOLIDATED_OPEN_ITEMS.md, COMPREHENSIVE_AUDIT_REPORT.md, EXPERT_CODE_REVIEW_REPORT.md, FRONTEND_DEEP_DIVE_AUDIT.md, BACKEND_DEEP_DIVE_AUDIT_REPORT.md, TEST_AUDIT_REPORT.md, and the Product Owner End-to-End Review (2026-02-15).*
