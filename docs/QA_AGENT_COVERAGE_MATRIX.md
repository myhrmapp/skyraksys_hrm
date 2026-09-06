# HRM Parallel Agent QA Coverage Matrix

## Purpose

This document defines the operational model for agent-based validation across the SkyrakSys HRM application. It is intended to be the working checklist for product, BA, HR, backend, frontend, and QA agents when validating the live system across all major business modules.

The goal is to move from ad hoc validation to a structured, parallel, module-based QA flow with shared evidence, clear ownership, and consistent release gates.

## Current evidence snapshot

As of 2026-09-06, the verified green flows are authentication/security, employee service, leave validation, and payroll integrity/UI validation. The remaining evidence-gated modules are attendance, invoice, and project/task validation. These modules remain open until fresh, clean pass evidence is captured and documented.

## Agent team model

### 1. Product / BA / HR domain team
Responsible for business intent and acceptance criteria.

Responsibilities:
- define the end-to-end workflow per module
- specify actors, roles, permissions, and business rules
- approve the scenario matrix before execution
- confirm policy rules for leave, attendance, payroll, and invoice flows

Required outputs:
- module-by-module workflow catalog
- expected success and failure conditions
- role and permission list
- approval and escalation rules

### 2. Architecture and integration agent
Responsible for route, contract, and cross-layer integrity.

Responsibilities:
- confirm backend routes and frontend pages match
- review auth and RBAC boundaries
- check API contracts and data consistency
- identify integration risk and breakpoints

Required outputs:
- route-to-page alignment matrix
- role access map
- API contract checks
- cross-module dependency review

### 3. Backend safety and data integrity agent
Responsible for the true source-of-truth behavior.

Responsibilities:
- validate transactions and state changes
- inspect database updates after workflows
- verify authorization logic and validation rules
- confirm business calculations in leave, payroll, and attendance

Required outputs:
- DB proof for each workflow
- transaction and rollback checks
- business-rule validation evidence
- audit trail or data integrity review

### 4. Frontend UX and workflow agent
Responsible for user-facing execution.

Responsibilities:
- validate form behavior and route access
- confirm correct page rendering and visible states
- verify user actions map to the intended business workflow
- capture UI evidence for pass/fail cases

Required outputs:
- UI journey checklist
- selector stability notes
- route and role validation results
- screenshot and page-state evidence

### 5. QA / orchestration agent
Responsible for final release evidence and sign-off.

Responsibilities:
- merge domain coverage results
- enforce the evidence standard
- run smoke/regression gates
- produce the final HTML report

Required outputs:
- consolidated QA matrix
- pass/fail summary
- module tabs and workflow evidence
- final sign-off recommendation

## Parallel execution model

Use parallel domain squads instead of a one-size-fits-all team.

### Squad A — Identity and access
Modules:
- authentication
- authorization
- employee profile access
- admin restrictions
- session/token lifecycle

Primary actors:
- employee
- manager
- HR
- admin

### Squad B — Workforce operations
Modules:
- leave
- attendance
- timesheet

Primary actors:
- employee
- manager
- HR

### Squad C — Finance and compliance
Modules:
- payroll
- payslips
- invoice approval
- deduction and payout review

Primary actors:
- employee
- HR
- admin

### Squad D — Employee and org administration
Modules:
- employee onboarding
- departments
- positions
- organization structure
- report and admin dashboards

Primary actors:
- HR
- admin
- manager

### Squad E — Release gate and evidence
Modules:
- cross-module smoke tests
- final regression pass
- HTML report generation
- sign-off summary

Primary actors:
- QA orchestrator
- architecture lead
- product stakeholder

## Evidence standard for every scenario

Every workflow must be validated with all three layers of evidence:

1. UI evidence
   - page loads correctly
   - field values appear as expected
   - correct role-based page is shown
   - button states and messages are correct

2. API evidence
   - expected HTTP status
   - success or error payload is correct
   - RBAC conditions are enforced

3. Database evidence
   - related rows are created, updated, or deleted as expected
   - balances, statuses, and linked IDs are correct
   - calculations match business rules and policy

A scenario is not complete unless it has all three evidence types.

## Module coverage matrix

### 1. Authentication and authorization
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| Employee | login with valid credentials | successful access | dashboard loads | 200 with access token | user session created |
| Employee | login with invalid password | rejected | error message visible | 401 or 400 | failed login recorded |
| Manager | access employee-only page | blocked if not entitled | unauthorized message or redirect | 403 | no data mutation |
| HR | access admin reports | allowed | dashboard/report loads | 200 | audit records created |
| Admin | refresh token flow | valid session persists | page remains authenticated | 200/401 validation path | token state valid |
| All | expired token | session ends with correct error | redirect/login screen | 401 | no privileged action persist |

### 2. Employee management
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| HR/Admin | create employee | record saved | employee appears in list | 201 | employee row created |
| HR/Admin | edit employee profile | updated values persist | new values shown | 200 | row updated |
| Manager | view subordinate employee details | allowed | employee card loads | 200 | no unauthorized write |
| Employee | view another employee record | denied | access blocked | 403 | no data leak |
| HR/Admin | deactivate employee | status changed | inactive badge shows | 200 | status changed in DB |
| HR/Admin | assign manager/dept | updated structure | assignment visible | 200 | managerId / departmentId updated |

### 3. Leave management
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| Employee | submit leave request | request created | confirmation shown | 201 | LeaveRequest row created |
| Employee | submit leave without sufficient balance | rejected | validation error shown | 400/409 | no pending deduction |
| Employee | request overlapping leave dates | rejected | overlap warning | 409 | no duplicate pending rows |
| Employee | view own leave history | list visible | table/list loads | 200 | matching records returned |
| Manager | approve pending leave | status moves to approved | approval success | 200 | status updated, pending reduced, taken increased |
| Manager | reject pending leave | status moves to rejected | rejection message | 200 | pending balance restored |
| Employee | cancel own pending leave | request cancelled | cancel success | 200 | balance restored |
| HR/Admin | approve or reject any pending leave | allowed | approval controls visible | 200 | audit fields updated |
| Employee | approve own leave | denied | forbidden message | 403 | no status mutation |

### 4. Attendance and time tracking
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| Employee | check-in | punch created | status updated | 200/201 | Attendance row created |
| Employee | check-out | punch closed | status updated | 200 | end time recorded |
| Employee | duplicate check-in | rejected | warning shown | 409/400 | no duplicate active punch |
| Manager | view team attendance | allowed | team data visible | 200 | team records returned |
| HR/Admin | view attendance history | allowed | report loads | 200 | data matches filters |
| Employee | view other employees attendance | denied | no access | 403 | no cross-role exposure |

### 5. Timesheet management
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| Employee | create timesheet entry | saved | row appears | 201 | Timesheet row created |
| Employee | submit timesheet | status changes | submit confirmation | 200 | status updated |
| Manager | approve timesheet | approval recorded | status visible | 200 | approvedBy / approvedAt saved |
| Manager | reject timesheet | rejected status | rejection reason visible | 200 | returned state matches |
| HR/Admin | review all timesheets | accessible | table loads | 200 | records filtered properly |
| Employee | edit after submission when disallowed | blocked | validation error | 400/403 | no unauthorized mutation |

### 6. Payroll and payslips
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| HR/Admin | generate payroll | payroll created | generated row visible | 201/200 | Payroll records created |
| Employee | view own payslip | available | payslip visible | 200 | employee-specific record returned |
| Employee | view another employee payslip | denied | access blocked | 403 | no cross-employee exposure |
| HR/Admin | adjust payroll values | updated values persist | revised net pay shown | 200 | Payroll values updated |
| HR/Admin | export/payroll download | file generated | success state visible | 200 | export artifact created |
| Admin | invalid payroll period | blocked | validation message | 400 | no bad pay record |

### 7. Invoice and approvals
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| HR/Admin | create invoice | saved | list added | 201 | invoice row created |
| Employee | access invoice page | denied by role | forbidden or redirect | 403 | no unauthorized exposure |
| Manager | approve invoice | status changes | approved state visible | 200 | status updated |
| HR/Admin | reject invoice | rejected state stored | rejection notice visible | 200 | status and reason saved |
| Admin | review invoice history | all data available | report loads | 200 | filters and related tables correct |

### 8. Admin and reporting
| Actor | Workflow | Expected Result | UI Assertion | API Assertion | DB Assertion |
|---|---|---|---|---|---|
| Admin | open admin dashboard | system summary loads | panels visible | 200 | DB summary matches UI |
| HR | open reporting page | relevant data visible | charts/table render | 200 | aggregate counts correct |
| Admin | adjust setting or system config | config saved | updated value visible | 200 | config row persisted |
| Admin | produce archive/export report | file generated | download or display appears | 200 | exported content matches DB |
| All | invalid filter or missing params | validation response | error shown | 400 | no partial state change |

## Workstream execution checklist

### Required before sign-off
- [ ] the Product/BA/HR team approved the scenario catalog
- [ ] architecture and RBAC review completed
- [ ] backend DB checks completed for all business-state changes
- [ ] frontend path and role coverage completed
- [ ] cross-module smoke/regression completed
- [ ] final HTML report generated and reviewed

## Business scenario gaps for BA / SME / HR review

These are the additional scenarios that should be added before final business sign-off because they are common HR operational edge cases and frequently missed in release review.

| Priority | Module | Missing business scenario | Why it matters |
|---|---|---|---|
| High | Authentication | Password reset expiry, reuse, and invalid token handling | Prevents unauthorized account takeover and reduces support incidents |
| High | Authentication | First-login password change enforcement | Enforces secure onboarding and policy compliance |
| High | Authentication | Account lockout after repeated failed login attempts | Standard enterprise security control |
| High | Authentication | Session timeout warning and forced logout after inactivity | Supports compliance and user trust |
| High | User management | Admin resets another user password and confirms login works | Critical operational support workflow |
| High | User management | Last-admin protection and role downgrade restrictions | Prevents lockout and privilege misuse |
| High | Leave | Carry-forward, encashment, and prorated balance logic | Common policy-driven HR business rule |
| High | Leave | Partial-day leave, half-day requests, and approval exceptions | Realistic workforce scheduling requirement |
| High | Leave | Cancel approved leave and trigger balance recalculation | Ensures correct leave ledger integrity |
| High | Attendance | Late arrival, early departure, and overtime rules | Typical workforce compliance cases |
| High | Attendance | Auto-close missing check-out after shift end | Reduces payroll drift and missing attendance records |
| High | Attendance | Holiday / weekend / roster exceptions | Prevents incorrect markups and missed policy handling |
| High | Timesheet | Lock-after-approval logic and edit restrictions | Protects approved payroll inputs |
| High | Timesheet | Rejection/resubmission flow with mandatory comments | Keeps audit trail and accountability |
| High | Payroll | Finalize payroll and prevent further edits when locked | Critical financial control |
| High | Payroll | Recalculation after attendance/timesheet correction | Prevents payout errors |
| High | Payroll | Former employee payslip access control and archive handling | Necessary compliance and privacy check |
| Medium | Invoice | Draft → submitted → approved → paid → voided lifecycle | Full lifecycle money movement validation |
| Medium | Invoice | Duplicate invoice number and tax rounding checks | Prevents duplicate billing and finance errors |
| Medium | Project & tasks | Delete protection when tasks are still active | Avoids data-loss and operational damage |
| Medium | Project & tasks | Dependency validation and overdue-task escalation | Real project governance requirement |
| Medium | Reports | Role-specific export and report permission checks | Prevents cross-role data exposure |
| Medium | Admin | Audit trail review for high-risk admin actions | Required for operational trust and governance |

### Suggested walkthrough for BA / SME / HR review

1. Review the happy path and negative path for each module.
2. Confirm the role model and permission boundaries for each workflow.
3. Confirm the policy rules for leave, attendance, overtime, payroll, invoice, and project actions.
4. Verify each scenario is mapped to UI, API, and database evidence before sign-off.
5. Prioritize the high-risk business cases above as release blockers if they are not fully proven.

## Release gate

The final release gate is pass only when:

1. each module has scenario coverage for happy path, negative path, and authorization path;
2. each scenario has UI, API, and DB proof;
3. the final QA report includes one tab per module; and
4. the product/BA/HR sign-off confirms the business intent is satisfied.

This model ensures the repo can be evaluated and validated by parallel domain agents without losing traceability or evidence quality.
