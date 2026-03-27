# SkyrakSys HRM — Business & Product Document

> **Document Owner**: Product Owner / Business Analyst  
> **Version**: 2.0 | **Last Updated**: 2026-03-27  
> **Audience**: Product stakeholders, business analysts, new team members

---

## 1. Product Vision

**SkyrakSys HRM** is a full-stack Human Resource Management system designed for small-to-medium Indian enterprises. It covers the complete employee lifecycle — from onboarding to payroll processing — with Indian statutory compliance built in (EPF, ESI, PT, TDS).

### Key Value Propositions

- **Single platform** for all HR operations (no separate payroll, leave, or attendance tools)
- **Indian compliance** out of the box (EPF, ESI, Professional Tax, TDS with old/new regime)
- **Role-based access** for 4 tiers: Admin, HR, Manager, Employee
- **Self-service** portal for employees (profile, leave, timesheets, payslips)
- **Manager empowerment** (team view, approvals, performance reviews)
- **Audit trail** for compliance and accountability

---

## 2. Business Modules

### 2.1 Employee Management

| Capability | Description |
|------------|-------------|
| Onboarding | 6-tab form: Personal, Employment, Salary, Contact/Emergency, Statutory/Banking, User Account |
| Employee Directory | Card and list views, search, filter by department/status/type |
| Profile Management | Admin/HR full edit; employees view own profile |
| Status Lifecycle | Active → On Leave / Inactive → Terminated (soft-delete) |
| Employee ID | Auto-generated `SKYT` prefix (e.g., SKYT0001) |
| Photo Management | Profile photo upload with server-side validation |
| Export | Excel export of employee data |

**User Stories:**
- As an **Admin/HR**, I can onboard a new employee with all personal, employment, salary, and statutory information in one form.
- As an **Employee**, I can view and update my own profile information.
- As a **Manager**, I can view my team members' profiles.

### 2.2 Leave Management

| Capability | Description |
|------------|-------------|
| 12 Leave Types | Earned Leave, Casual Leave, Sick Leave, Maternity/Paternity, Bereavement, Comp Off, LOP, etc. |
| Leave Request | Employee submits with type, dates, reason |
| Approval Workflow | Pending → Approved / Rejected (by manager/HR/admin) |
| Cancellation | Employee can cancel pending requests; admin can cancel approved |
| Balance Tracking | Per-employee, per-type, per-year balance with accrual |
| Leave Accrual | Monthly automated accrual based on leave type rules |
| Leave Calendar | Visual calendar of team/org leave |
| Admin CRUD | Create/edit/delete leave types; bulk-initialize balances |

**User Stories:**
- As an **Employee**, I can request leave and see my remaining balance per type.
- As a **Manager**, I can approve or reject leave requests from my team.
- As **HR/Admin**, I can configure leave types, accrual rules, and manage all employee balances.

### 2.3 Timesheet Management

| Capability | Description |
|------------|-------------|
| Weekly Entry | Mon–Sun hour grid per project/task row |
| Multi-Project | Multiple rows for different project/task combinations |
| Draft & Submit | Save as draft, then submit for approval |
| Approval Workflow | Draft → Submitted → Approved / Rejected |
| Week Navigation | Previous/next week navigation |
| History | Full timesheet history with filters |
| Bulk Approval | Manager/admin can approve/reject multiple timesheets at once |
| Auto-Calculation | Total hours per day, per row, and grand total |

**User Stories:**
- As an **Employee**, I can log my weekly hours across multiple projects/tasks.
- As a **Manager**, I can view, approve, or reject timesheets submitted by my team.
- As an **Admin**, I can view and bulk-approve timesheets across the organization.

### 2.4 Payroll & Compensation

| Capability | Description |
|------------|-------------|
| Salary Structures | Basic salary + 7 allowances + 5 deductions + 3 benefits |
| Indian Compliance | EPF (12%, ₹15k basic cap), ESI (0.75% employee / 3.25% employer, ≤₹21k gross), PT (Karnataka slabs), TDS (old/new regime) |
| Payslip Generation | Auto-generate for selected period/employees |
| Payslip Lifecycle | Draft → Finalized → Paid / Cancelled |
| PDF Download | Professionally formatted payslip PDF |
| Template Management | Customizable payslip templates (header, sections, footer) |
| CTC Breakdown | Annual CTC with component-wise breakdown |
| Tax Regime | Support for both old and new Indian tax regimes |

**User Stories:**
- As **HR/Admin**, I can set up salary structures for employees with Indian-compliant deductions.
- As **HR/Admin**, I can generate payslips in bulk for a pay period and finalize them.
- As an **Employee**, I can view and download my payslips.

### 2.5 Attendance Tracking

| Capability | Description |
|------------|-------------|
| Check-In/Out | Employee self-service check-in and check-out |
| Status Tracking | Present, Absent, Late, Half Day, On Leave, Holiday, Weekend |
| Monthly View | Calendar view of attendance per month/year |
| Admin Marking | HR/Admin can manually mark attendance for employees |
| Daily Reports | Daily attendance summary for the organization |
| Late Tracking | Minutes late calculation from expected check-in time |

**User Stories:**
- As an **Employee**, I can check in/out and view my monthly attendance calendar.
- As **HR/Admin**, I can view daily/monthly attendance reports and manually mark attendance.

### 2.6 Projects & Tasks

| Capability | Description |
|------------|-------------|
| Project CRUD | Create projects with name, description, dates, status |
| Task CRUD | Create tasks linked to projects with priority, status, due date |
| Task Assignment | Assign tasks to specific employees or make available to all |
| My Tasks | Employee view of assigned/available tasks |
| Status Tracking | Not Started → In Progress → Completed / Blocked / On Hold |
| Timesheet Integration | Projects/tasks appear in timesheet dropdowns |

**User Stories:**
- As an **Admin/Manager**, I can create projects and assign tasks to team members.
- As an **Employee**, I can view my assigned tasks and update their status.

### 2.7 Performance Reviews

| Capability | Description |
|------------|-------------|
| Review Types | Annual, Mid-Year, Quarterly, Probation |
| Review Workflow | Draft → Submitted → Acknowledged |
| Rating System | 1–5 scale |
| Review Form | Goals, strengths, areas for improvement, overall comments |
| Review History | Full history of reviews per employee |
| CRUD | Admin/HR can create, edit, and delete reviews |

**User Stories:**
- As **HR/Admin**, I can create performance reviews for employees with ratings and comments.
- As an **Employee**, I can view my performance review history.

### 2.8 Organization Settings

| Capability | Description |
|------------|-------------|
| Departments | CRUD with code, description, active status |
| Positions | CRUD linked to departments with level |
| Holiday Calendar | Manage organizational holidays by year |
| System Config | Email settings, company info, security settings (admin-only with password re-auth) |
| User Management | Create user accounts, assign roles, lock/unlock |
| Restore Management | View and restore soft-deleted records |

---

## 3. User Roles & Permissions

### Role Matrix

| Feature | Admin | HR | Manager | Employee |
|---------|-------|-----|---------|----------|
| **Employee CRUD** | Full | Full | View team | View self |
| **Salary view** | All | All | None | Own only |
| **Leave management** | All requests | All requests | Team requests | Own requests |
| **Leave types/balances** | Configure | Configure | View | View own |
| **Timesheets** | All + bulk | View all | Team approval | Own entry |
| **Payroll** | Full | Full | None | View own payslips |
| **Attendance** | Mark all | Mark all | View team | Check-in/out |
| **Projects/Tasks** | Full CRUD | View | Assign tasks | View/update own |
| **Reviews** | Full CRUD | Full CRUD | View team | View own |
| **Settings** | Full | Partial | None | None |
| **User accounts** | Full | Create only | None | None |
| **Departments/Positions** | Full CRUD | View | View | None |
| **Holidays** | Full CRUD | View | View | View |

### Dashboard Per Role

| Role | Dashboard | Key Widgets |
|------|-----------|-------------|
| Admin | Admin Dashboard | Employee stats, leave stats, timesheet stats, payroll stats, quick actions |
| HR | Admin Dashboard (shared) | Same as admin |
| Manager | Manager Dashboard | Team members, pending approvals (leave + timesheet), team metrics |
| Employee | Employee Dashboard | Leave balance, pending requests, recent activity, upcoming leaves, hours worked |

---

## 4. Key Business Workflows

### 4.1 Employee Onboarding Flow

```
Admin/HR creates employee (6-tab form)
  ├── Personal: name, ID, DOB, gender, nationality
  ├── Employment: hire date, department, position, manager, type
  ├── Salary: basic, allowances, deductions, benefits, tax regime
  ├── Contact: emergency contact name, phone, relation
  ├── Statutory: Aadhaar, PAN, UAN, PF, ESI, bank details
  └── User Account: enable login, role, password
          ↓
Employee ID auto-generated (SKYT format)
          ↓
Salary structure created
          ↓
Leave balances initialized (all 12 types)
          ↓
User account created (if enabled)
          ↓
Employee active in system
```

### 4.2 Monthly Payroll Processing Flow

```
HR/Admin opens Payroll Management
          ↓
Select pay period (month/year) + employees
          ↓
System calculates for each employee:
  ├── Gross = Basic + HRA + Allowances + Benefits
  ├── EPF = 12% of Basic (cap ₹15,000)
  ├── ESI = 0.75% of Gross (if Gross ≤ ₹21,000)
  ├── PT = Karnataka slab-based
  ├── TDS = Based on tax regime (old/new)
  ├── Total Deductions = EPF + ESI + PT + TDS + Other
  └── Net Pay = Gross − Total Deductions
          ↓
Payslips generated as "Draft"
          ↓
HR reviews and "Finalizes"
          ↓
Employees can view + download PDF
          ↓
HR marks as "Paid" after bank transfer
```

### 4.3 Leave Request Flow

```
Employee submits leave request
  ├── Selects type, dates, reason
  └── System validates balance
          ↓
Request status: "Pending"
          ↓
Manager/HR/Admin reviews
  ├── Approve → balance deducted → status "Approved"
  └── Reject → balance unchanged → status "Rejected"
          ↓
Employee can cancel "Pending" requests
Admin can cancel "Approved" requests (balance restored)
```

---

## 5. Indian Compliance Summary

### Statutory Deductions

| Component | Rate | Applicability | Cap |
|-----------|------|---------------|-----|
| **EPF** (Employee) | 12% of Basic | All employees | Basic capped at ₹15,000 |
| **EPF** (Employer) | 12% of Basic | All employees | Basic capped at ₹15,000 |
| **ESI** (Employee) | 0.75% of Gross | Gross ≤ ₹21,000/month | — |
| **ESI** (Employer) | 3.25% of Gross | Gross ≤ ₹21,000/month | — |
| **Professional Tax** | Slab-based | Karnataka rates | Max ₹2,500/year |
| **TDS** (Income Tax) | Slab-based | Old or New regime | Per IT slabs |

### Karnataka Professional Tax Slabs

| Monthly Salary | Tax |
|---------------|-----|
| ≤ ₹15,000 | ₹0 |
| ₹15,001 – ₹25,000 | ₹200 |
| > ₹25,000 | ₹200 (Feb: ₹300) |

---

## 6. Data Model Summary (Business View)

```
Department ──< Position
     │              │
     └──< Employee >┘
              │
              ├──< SalaryStructure
              ├──< Payslip
              ├──< LeaveRequest ──> LeaveType
              ├──< LeaveBalance ──> LeaveType
              ├──< Timesheet ──> Project ──< Task
              ├──< Attendance
              ├──< EmployeeReview
              └──> User (login account)
```

**22 tables** in total — see [03-DATABASE_DESIGN.md](./03-DATABASE_DESIGN.md) for full schema.

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Response time** | < 500ms for API calls, < 2s for page loads |
| **Concurrent users** | 50+ (PM2 cluster mode, 2 instances) |
| **Data retention** | Soft-delete on Employee, Review, LeaveBalance, User |
| **Audit** | All models have `createdAt`, `updatedAt`, `deletedAt` |
| **Security** | JWT httpOnly, RBAC, field-level ACL, rate limiting, input validation |
| **Availability** | PM2 auto-restart on crash, cluster mode for zero-downtime |
| **Backup** | Daily automated PostgreSQL dumps |
| **Browser support** | Chrome (latest), Edge, Firefox |

---

## 8. Future Roadmap (Potential Enhancements)

| Feature | Priority | Description |
|---------|----------|-------------|
| Biometric attendance | High | Integration with biometric devices via API |
| Mobile app | High | React Native or PWA for employee self-service |
| Shift management | Medium | Define shifts, assign employees, track overtime |
| Claims & reimbursements | Medium | Travel, medical, expense claim workflow |
| Training management | Medium | Course catalog, enrollment, completion tracking |
| Document management | Medium | Employee document upload, verification, expiry alerts |
| Advanced analytics | Low | Attrition prediction, headcount trends, cost analysis |
| Multi-company support | Low | Manage multiple legal entities from one installation |
| Payroll bank integration | Low | Direct NEFT/IMPS payout from system |
| SSO/LDAP integration | Low | Enterprise identity provider support |

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
