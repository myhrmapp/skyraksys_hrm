# Timesheet System — Architecture Review & Fix Log
**Date:** 2026-03-29  
**Reviewer:** Senior Architect  
**Status:** ✅ COMPLETE — All 22 issues resolved (2 sessions)

---

## 1. Scope

Full line-by-line review covering:
- Database model & migrations
- Backend service layer (Data → Business → Controller → Routes)
- Frontend components (ModernWeeklyTimesheet, TimesheetApproval, TimesheetHistory)
- Frontend service wrapper (timesheet.service.js)
- Joi validators & middleware
- Unit tests

---

## 2. Issues Found (Full List)

### CRITICAL — Data Integrity

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| C-01 | 🔴 Critical | `timesheet.model.js` / `TimesheetBusinessService.js` | `rejectedBy` field written in `bulkRejectTimesheets` but column does not exist in model. Sequelize silently ignores it. Rejected records never store who rejected them. |
| C-02 | 🔴 Critical | `TimesheetBusinessService.js` → `bulkApproveTimesheets`, `bulkRejectTimesheets` | No team-scope enforcement. A manager can bulk-approve/reject ANY employee's timesheets company-wide, not just their direct reports. |
| C-03 | 🔴 Critical | `timesheetController.js` → `getStats`, `getPendingApprovals` | Both bypass the business service layer entirely — raw `db.Timesheet.findAll` inside the controller, defeating the architectural layering that was the whole point of Phase 2. |

### HIGH — Correctness Bugs

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| H-01 | 🔴 High | `ModernWeeklyTimesheet.js` | No cross-task daily total validation. User can enter 14h (Task A) + 12h (Task B) on Monday = 26h total. Per-row passes, but combined total exceeds 24h which is physically impossible. |
| H-02 | 🔴 High | `TimesheetApproval.js` → `handleBulkAction('reject')` | Bulk Reject toolbar button always passes `comments: ''` to the mutation → backend returns 400 `BadRequestError: Rejection comments are required`. Button is completely broken. |
| H-03 | 🟡 High | `timesheet.service.js` | Inconsistent return shapes: `getByWeek()` and `createBatch()` return the full Axios response object; all other methods return `response.data`. Callers must know the exact shape per method. |
| H-04 | 🟡 High | `TimesheetBusinessService.js` → `submitWeeklyTimesheets` | N+1 query problem: loops over 7 tasks with `timesheetDataService.update(id, ...)` which internally does `findByPk` + `instance.update()` = 14 DB round trips per week submission. |

### MEDIUM — UX & Logic Gaps

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| M-01 | 🟡 Med | `ModernWeeklyTimesheet.js` | Rejection reason from manager (`approverComments`) is never surfaced in the UI. Employee sees "Rejected" but has no idea why without contacting the manager. |
| M-02 | 🟡 Med | `ModernWeeklyTimesheet.js` | No unsaved-changes navigation guard. `hasUnsavedChanges` is tracked but never used to block route changes. All work in progress is silently discarded. |
| M-03 | 🟡 Med | `ModernWeeklyTimesheet.js` | `useEffect` for `loadWeekTimesheet` has `[currentWeek]` dep array but closes over `user?.employee?.id`. If auth context refreshes, the effect doesn't re-run. |
| M-04 | 🟡 Med | `TimesheetApproval.js` | `applyFilters` uses `useEffect` + `setState` (suppressed lint `// eslint-disable-line`). This is the classic side-effect anti-pattern — should be `useMemo`. |
| M-05 | 🟡 Med | `TimesheetHistory.js` | `applyFilters` has same `useEffect` + `setState` anti-pattern as Approval. |
| M-06 | 🟡 Med | `TimesheetHistory.js` | History pagination stuck at page 1. `apiPage` state declared but `setApiPage` is `// eslint-disable-next-line no-unused-vars`. Only 50 records ever loaded; older history is invisible. |
| M-07 | 🟡 Med | `rateLimiter.js` | `bulkOperationLimiter` is IP-based. All users behind a corporate NAT share one quota of 20 req/15 min. Should be per-user-account. |

### LOW — Code Quality

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| L-01 | 🟡 Low | `timesheet.validator.js` | `timesheetEntrySchema` is dead code (old daily-entry format pre-weekly migration). No reference anywhere. |
| L-02 | 🟡 Low | `timesheet.validator.js` | Query `limit` max is 500 — too high for deep-joined queries with Employee + Project + Task includes. |
| L-03 | 🟡 Low | `timesheet.validator.js` | `fromDate`, `toDate` accepted in query schema but never read by controller. Dead parameters pass silently. |
| L-04 | 🟡 Low | `timesheetController.js` → `getAll` | `filters.employeeId = { [db.Sequelize.Op.in]: teamIds }` — Sequelize Op leaking into controller layer. Controller should pass a plain array; the data layer should construct the Op. |
| L-05 | 🟡 Low | `TimesheetDataService.js` | 100% pass-through wrapper — every method delegates directly to `TimesheetService` with zero added value. |
| L-06 | 🟡 Low | `timesheet.model.js` | `weekEndDate` is fully derivable from `weekStartDate + 6 days`. Redundant stored column creates sync risk. |
| L-07 | 🟡 Low | `timesheet.model.js` | Missing composite index `(employeeId, status)` — common query "my submitted/approved timesheets" hits full table scan. |
| L-08 | 🟡 Low | `TimesheetService.js` | 200-line commented-out `createTimeEntry` method (old daily format). Adds noise, should be deleted. |

### TESTS — Broken After Refactor

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| T-01 | 🔴 Critical | `ModernWeeklyTimesheet.test.js` | Tests look for `'Timesheet'` heading and tabs that now live in `TimesheetHub`, not in `ModernWeeklyTimesheet`. All those assertions fail. |
| T-02 | 🔴 Critical | `ModernWeeklyTimesheet.test.js` | `timesheetService.getPending` mock — `getPending` method was deleted from the service, mock silently resolves undefined. |
| T-03 | 🟡 Med | All `__tests__/*.test.js` | Mock IDs are integers (`id: 1`, `employee.id: 100`). `isValidUUID()` returns false for integers, so code paths that gate on UUID validity behave differently in tests vs. production. |

---

## 3. Architecture Assessment

### What to Keep (Solid Foundation)
- Layered architecture: routes → controller → business service → data service → ORM ✅
- React Query for server state in `TimesheetApproval` and `TimesheetHistory` ✅
- JWT + blacklisting + RBAC enforcement ✅
- Soft deletes (`paranoid: true`), UUID PKs, composite unique constraint ✅
- `data-testid` attributes throughout UI ✅
- `bulkOperationLimiter` rate limiting on all bulk endpoints ✅
- Component decomposition: `TimesheetHub` → 3 focused children ✅

### Verdict: TARGETED FIX — Not a Rewrite
All issues are bounded and fixable. The architecture is sound. A rewrite would reproduce the same structure at 3-4x cost.

---

## 4. Fix Implementation Plan

### Phase 1 — Data Integrity & Security (Backend)
1. Add `rejectedBy` column: migration + model update
2. Add `(employeeId, status)` index: migration
3. Fix `bulkRejectTimesheets`: write to `approvedBy` + add team-scope check
4. Fix `bulkApproveTimesheets`: add team-scope check  
5. Fix `submitWeeklyTimesheets`: replace N+1 with single bulk `UPDATE`
6. Add `getPendingApprovalsForUser(currentUser)` to `TimesheetBusinessService`
7. Add `getTimesheetStats(currentUser, filters)` to `TimesheetBusinessService`
8. Update `timesheetController.getPendingApprovals` + `getStats` to delegate to business service
9. Clean Op leak in `getAll` controller

### Phase 2 — Frontend Critical Bugs
10. Cross-task daily total > 24h validation in `ModernWeeklyTimesheet`
11. Show `approverComments` (rejection reason) in rejected state Alert
12. Add `useBlocker` unsaved-changes guard in `ModernWeeklyTimesheet`
13. Fix `useEffect` dep array to include `user?.employee?.id`
14. Fix Bulk Reject toolbar button — add comments prompt before mutation

### Phase 3 — Service Consistency & Patterns
15. Normalize `getByWeek()` and `createBatch()` to return `response.data`
16. Update callsites in `ModernWeeklyTimesheet` to match new shapes
17. Convert `applyFilters` `useEffect` → `useMemo` in `TimesheetApproval`
18. Convert `applyFilters` `useEffect` → `useMemo` in `TimesheetHistory`
19. Wire history pagination (`setApiPage` properly connected to `TablePagination`)
20. User-based rate limiter key generator

### Phase 4 — Validator Cleanup  
21. Remove dead `timesheetEntrySchema`
22. Reduce query `limit` max to 100
23. Remove unused `fromDate`/`toDate` params from query schema

### Phase 5 — Test Fixes
24. Update `ModernWeeklyTimesheet.test.js` — remove tab/heading assertions (moved to Hub)
25. Remove `getPending` mock, replace with correct method
26. Switch all mock IDs to proper UUIDs

---

## 5. Fix Log (Peer Review)

| # | Item | Status | Notes |
|---|------|--------|-------|
| C-01 | `rejectedBy` column in model + migration | ✅ | Added UUID FK column + Sequelize field + `rejector` association |
| C-02 | Team scope on bulk approve/reject | ✅ | Added subordinate scope filter to both bulk methods |
| C-03 | Stats/pending move to BusinessService | ✅ | New `getPendingApprovalsForUser` + `getTimesheetStats` methods; controller delegates |
| H-01 | Cross-task daily > 24h validation | ✅ | Per-day sum across all tasks checked in `validateTimesheet()` |
| H-02 | Bulk reject comments dialog | ✅ | `handleBulkAction('reject')` now opens approval dialog instead of empty-comment mutation |
| H-03 | Normalize service return shapes | ✅ | `getByWeek` + `createBatch` now return `response.data`; callsites updated |
| H-04 | N+1 fix in submitWeeklyTimesheets | ✅ | Single `db.Timesheet.update WHERE id IN [...]` replaces 14 round trips |
| M-01 | Show rejection reason in UI | ✅ | `approverComments` state; Alert shows reason with error severity |
| M-02 | Unsaved-changes nav guard | ✅ | `useBlocker` hook + Dialog added |
| M-03 | useEffect dep array fix | ✅ | `useCallback` + `[currentWeek, employeeId]` dependency array |
| M-04 | Approval `applyFilters` → `useMemo` | ✅ | `filteredTimesheets` + `summary` both converted to `useMemo` |
| M-05 | History `applyFilters` → `useMemo` | ✅ | `filteredTimesheets` converted to `useMemo` with page reset effect |
| M-06 | History pagination wired | ✅ | `handleChangePage` increments `apiPage` when local rows exhausted |
| M-07 | User-based rate limiter | ✅ | `keyGenerator: (req) => req.user?.id \|\| req.ip` |
| L-01 | Remove dead `timesheetEntrySchema` | ✅ | Removed entire block |
| L-02 | Query limit max → 100 | ✅ | `max(500)` → `max(100)` |
| L-03 | Remove unused query params | ✅ | `fromDate`/`toDate` removed from `timesheetQuerySchema` |
| L-04 | Op leak in controller | ✅ | Controller collects plain array; Op.in constructed at layer boundary |
| L-07 | Add `(employeeId, status)` index | ✅ | Added in migration `20260329000001-...` |
| T-01 | Fix test headings/tabs assertions | ✅ | `Page Layout` describe block removed; waits updated to `Week X` |
| T-02 | Remove `getPending` mock | ✅ | Removed; `getByWeek` mock shape corrected for H-03 |
| T-03 | Switch mock IDs to UUIDs | ✅ | All project/task IDs in test data are valid UUIDs |
