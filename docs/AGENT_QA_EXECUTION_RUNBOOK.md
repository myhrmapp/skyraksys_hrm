# Agent QA Execution Runbook

## Objective

This runbook turns the repo-level agent model into a working execution plan for full module validation across the SkyrakSys HRM application. It is designed for parallel testing by business domain and follows the evidence standard required for release sign-off.

## Operating model

### Team 1 — Product / BA / HR domain owners
Responsible for:
- business requirements
- expected outcomes per workflow
- policy definition and approval rules
- final acceptance criteria for each module

Deliverables:
- business scenario catalog
- acceptance matrix for each module
- role and permission matrix
- sign-off checklist

### Team 2 — Architecture and integration
Responsible for:
- route and page alignment
- RBAC and access rules
- API contract integrity
- cross-module dependency checks

Deliverables:
- route inventory
- role access map
- dependency risk review

### Team 3 — Backend safety and data integrity
Responsible for:
- business rules and validation logic
- balance and status transitions
- DB truth checks for leave, payroll, and attendance
- transaction validation

Deliverables:
- DB evidence for each scenario
- failed and edge-case verification
- audit/trail review

### Team 4 — Frontend UX and workflow
Responsible for:
- page renders and visible UI states
- form behaviour and validation messages
- correct route and role behaviors in the browser
- user-visible evidence collection

Deliverables:
- UI evidence pack
- screenshot and selector notes
- role gating validation

### Team 5 — QA orchestrator
Responsible for:
- combined scenario tracking
- final smoke/regression gating
- HTML report assembly
- final sign-off recommendation

Deliverables:
- unified summary report
- module tab report
- final pass/fail recommendation

## Parallel execution by module

### 1. Authentication and access
Owner: Team 1 + Team 2 + Team 3 + Team 4

Must validate:
- valid login
- invalid credentials
- expired token
- refresh-token flow
- unauthorized access by role
- session timeout behavior

Evidence required:
- UI login success/failure state
- API 200/401/403 response
- DB user/session state and audit trail

### 2. Employee management
Owner: Team 1 + Team 4 + Team 3

Must validate:
- employee creation and update
- manager assignment
- department assignment
- active/inactive state
- access restrictions by employee vs manager vs HR/admin

Evidence required:
- page and form validation
- API response details
- employee row values in DB

### 3. Leave management
Owner: Team 1 + Team 3 + Team 4

Must validate:
- create leave request
- reject insufficient-balance request
- reject overlapping dates
- view leave history
- approve and reject in workflow
- cancellation and balance restoration
- manager vs employee permissions

Evidence required:
- UI leave request and approval screens
- API status and payloads
- LeaveRequest and LeaveBalance table updates

### 4. Attendance and time tracking
Owner: Team 1 + Team 3 + Team 4

Must validate:
- check-in/check-out flows
- duplicate punch prevention
- recognition of late or inactive states
- manager view of team attendance
- admin or HR reporting access

Evidence required:
- visible status updates in UI
- attendance API responses
- Attendance record state in DB

### 5. Timesheet workflow
Owner: Team 1 + Team 3 + Team 4

Must validate:
- create timesheet entry
- submit and approve/reject flows
- employee editing restrictions after submission
- manager review and RBAC boundaries

Evidence required:
- timesheet list and approval UI
- API payload and status transitions
- Timesheet DB row updates

### 6. Payroll and payslips
Owner: Team 1 + Team 3 + Team 4

Must validate:
- payroll generation
- payslip visibility by employee role
- incorrect access blocking
- payroll edit and approval flows
- export or report generation

Evidence required:
- visible payslip and payroll pages
- API payloads and file generation
- Payroll and Payslip DB records

### 7. Invoice workflow
Owner: Team 1 + Team 3 + Team 4

Must validate:
- invoice creation
- approval/reject workflows
- admin and HR access
- employee restriction to invoice data

Evidence required:
- invoice page behavior
- API response and status changes
- Invoice DB row status and audit values

### 8. Admin and reporting
Owner: Team 2 + Team 3 + Team 5

Must validate:
- admin dashboard loads
- aggregate reports match DB values
- dashboard data correctness
- system settings updates
- export/report generation

Evidence required:
- admin page render
- API report responses
- summary numbers and stored config values

## Scenario completion standard

For every scenario, the team must record:
- scenario ID
- actor
- module
- user story / acceptance criterion
- expected result
- UI evidence
- API evidence
- DB evidence
- status: pass / fail / blocked
- notes / next action

## Mandatory sign-off gate

A module is only considered complete when all of the following are true:

1. Happy path passes.
2. Negative path passes.
3. Authorization path passes.
4. UI evidence is captured.
5. API evidence is captured.
6. DB evidence is captured.
7. Product / BA / HR sign-off is documented.

## Final release gate

QA orchestrator approval requires:
- all modules have executed at least once
- all planned scenarios are tracked in the report
- no unresolved P1 or P2 issues remain
- HTML report includes one tab per module
- sign-off is recorded by stakeholder team

## Execution output

The final output should be an HTML report with tabs for:
- Authentication
- Employee
- Leave
- Attendance
- Timesheets
- Payroll
- Invoice
- Admin

This should be stored in the active docs workflow, not in historical archive material.
