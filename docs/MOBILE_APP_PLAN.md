# SkyrakSys HRM — Mobile App Plan
### Employee & Manager Self-Service Portal

> **Date:** March 2026  
> **Perspectives:** UX Designer • Business Analyst • Solution Architect

---

## 1. Executive Summary

A lightweight **React Native** mobile app for **Employees** and **Managers** — focused on the 6 daily actions people actually do on their phones: **check in/out, check leave balance, submit leave, log hours, view payslips, and approve requests**. No admin or HR features — those stay on the web.

The existing backend API already supports 100% of these use cases. **Zero new API endpoints needed for v1.**

---

## 2. Business Analyst — Scope & Prioritisation

### 2.1 Why Mobile?

| Pain Point (Web) | Mobile Solves It |
|---|---|
| Employee opens laptop to check in at 9 AM | One-tap check-in from phone |
| Manager waits until desktop to approve leave | Push notification → swipe to approve |
| Employee forgets to log timesheet on Friday | Friday 4 PM reminder notification |
| Checking leave balance requires login + navigation | Glanceable on home screen widget |
| Payslip download needs desktop browser | View & share PDF from phone |

### 2.2 Persona Matrix

| Persona | Daily Actions | Weekly Actions | Monthly Actions |
|---|---|---|---|
| **Employee** | Check in/out, view attendance | Submit timesheet, check tasks | View payslip, submit leave |
| **Manager** | Approve/reject leaves & timesheets | Review team attendance | Create performance reviews |

### 2.3 Feature Scope — MoSCoW

#### MUST HAVE (v1.0)

| # | Feature | Employee | Manager | API Ready |
|---|---|---|---|---|
| 1 | **Login / Biometric unlock** | ✓ | ✓ | `POST /api/auth/login`, `/refresh-token` |
| 2 | **Dashboard** — personalised stats | ✓ | ✓ | `GET /api/dashboard/employee-stats`, `/stats` |
| 3 | **Attendance check-in / check-out** | ✓ | ✓ | `POST /api/attendance/check-in`, `/check-out` |
| 4 | **My Attendance calendar** | ✓ | ✓ | `GET /api/attendance/my` |
| 5 | **Submit leave request** | ✓ | ✓ | `POST /api/leaves`, `GET /api/leaves/meta/balance` |
| 6 | **My leave history & balances** | ✓ | ✓ | `GET /api/leaves/me`, `/balance` |
| 7 | **Weekly timesheet** — log hours | ✓ | ✓ | `GET/POST/PUT /api/timesheets/week/:weekStart` |
| 8 | **My payslips** — list + view detail | ✓ | ✓ | `GET /api/payslips/my`, `/:id`, `/:id/pdf` |
| 9 | **My tasks** — view & update status | ✓ | ✓ | `GET /api/tasks`, `PUT /api/tasks/:id` |
| 10 | **My profile** — view & edit | ✓ | ✓ | `GET/PUT /api/employees/me` |
| 11 | **Leave approval** (approve/reject) | — | ✓ | `PUT /api/leaves/:id/approve`, `/reject` |
| 12 | **Timesheet approval** | — | ✓ | `POST /api/timesheets/:id/approve`, `/reject` |
| 13 | **Team members list** | — | ✓ | `GET /api/employees/team-members` |
| 14 | **Push notifications** | ✓ | ✓ | New: lightweight push-token endpoint |

#### SHOULD HAVE (v1.1)

| # | Feature | Notes |
|---|---|---|
| 15 | Performance reviews — view & self-assess | `GET /api/employee-reviews`, `PATCH /:id/self-assessment` |
| 16 | Manager: create review for report | `POST /api/employee-reviews` |
| 17 | Projects & tasks overview | `GET /api/projects`, `GET /api/tasks` |
| 18 | Leave calendar — team view (Manager) | `GET /api/leaves` filtered by team |
| 19 | Offline check-in (sync when online) | Local queue + background sync |
| 20 | Home screen widget (attendance status + leave balance) | Native widget |

#### COULD HAVE (v2.0)

| # | Feature |
|---|---|
| 21 | Geofenced check-in (office location) |
| 22 | Biometric attendance (face recognition) |
| 23 | In-app payslip viewer with share sheet |
| 24 | Team attendance heatmap (Manager) |
| 25 | Dark mode |

#### WON'T HAVE (mobile — stays on web)

- Employee CRUD (add/edit/terminate)
- Payroll processing & generation
- Salary structure management
- Leave type / accrual configuration
- Department / Position management
- User management & role assignment
- Reports module
- System settings & email config
- Payslip template design
- Restore deleted records

### 2.4 User Stories (v1.0 — Top 14)

```
US-01  As an Employee, I want to check in with one tap so I don't need to open my laptop.
US-02  As an Employee, I want to see my attendance calendar so I know my monthly pattern.
US-03  As an Employee, I want to submit a leave request from my phone so I can do it immediately.
US-04  As an Employee, I want to see my leave balances at a glance on the dashboard.
US-05  As an Employee, I want to log my weekly timesheet from mobile so I never miss Friday submission.
US-06  As an Employee, I want to view and download my payslip so I can share it instantly.
US-07  As an Employee, I want to see my assigned tasks and update their status.
US-08  As an Employee, I want to view and edit my profile details.
US-09  As a Manager, I want to approve/reject leave requests via push notification.
US-10  As a Manager, I want to approve/reject timesheets without opening a laptop.
US-11  As a Manager, I want to see my team members and their current status.
US-12  As a Manager, I want team dashboard stats — who's absent, pending approvals.
US-13  As a User, I want biometric unlock (fingerprint/face) so I don't type my password every time.
US-14  As a User, I want push notifications for pending actions, approvals, and reminders.
```

---

## 3. UX Designer — Interface & Experience

### 3.1 Design Principles

| Principle | What It Means |
|---|---|
| **One-hand, one-thumb** | All primary actions reachable with thumb in bottom 60% of screen |
| **3-tap max** | Any action completes in ≤ 3 taps from home |
| **Glanceable** | Key numbers (balance, hours, status) visible without scrolling |
| **No admin clutter** | Only show what employees & managers need — nothing else |
| **Web parity, not web copy** | Rethink for mobile context, don't shrink the web UI |

### 3.2 Navigation — Bottom Tab Bar (5 tabs)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    [Screen Content]                  │
│                                                     │
├──────┬──────┬──────┬──────┬──────┤
│  🏠  │  📅  │  ⏱  │  💰  │  👤  │
│ Home │Attend│ Time │  Pay │  Me  │
└──────┴──────┴──────┴──────┴──────┘
```

**Employee sees:** Home • Attendance • Timesheet • Payslips • Me  
**Manager sees:** Home • Attendance • Timesheet • Payslips • Me  
(Manager gets extra cards on Home for approvals + team)

### 3.3 Screen Map

```
Login
  ├── Biometric Unlock
  └── Email + Password

Home (Dashboard)
  ├── [Employee] ─── Stats Card (attendance %, leave balance, pending tasks)
  │                   Quick Actions: Check In • Submit Leave • Log Hours
  │                   Recent Activity feed
  │
  └── [Manager] ──── Team Card (present today, on leave, pending approvals)
                      Approval Queue (leaves + timesheets — swipeable)
                      Quick Actions: Check In • Submit Leave • View Team

Attendance Tab
  ├── Today Card ──── Check In / Check Out button (large, prominent)
  │                   Current status + time
  └── Calendar ────── Month grid with colour dots (present/absent/leave/holiday)
                      Tap day → detail sheet

Timesheet Tab
  ├── This Week ───── Mon-Sun grid, project/task rows
  │                   Quick-fill, save draft, submit
  ├── History ─────── Past weeks list
  └── [Manager] ──── Approval sub-tab (pending timesheets, swipe approve/reject)

Payslips Tab
  ├── List ─────────── Monthly cards (e.g., "March 2026 — ₹45,200")
  └── Detail ────────── Earnings / Deductions / Net Pay
                         Share • Download PDF

Me Tab
  ├── Profile Card ─── Photo, name, role, department
  ├── Leave ─────────── Balance summary    →    Full Leave Screen
  │                                               ├── Balances by type
  │                                               ├── Submit new request
  │                                               └── Request history
  ├── Tasks ─────────── Count badge        →    Full Tasks Screen
  ├── Reviews ────────── (v1.1)
  ├── Notifications ─── Settings
  └── Logout
```

### 3.4 Key Screen Wireframes

#### Dashboard — Employee
```
╔══════════════════════════════════╗
║  Good morning, Alice     🔔 (3) ║
╠══════════════════════════════════╣
║  ┌────────────────────────────┐  ║
║  │  ✅ Checked in at 9:02 AM │  ║
║  │  [  Check Out  ]          │  ║
║  └────────────────────────────┘  ║
║                                  ║
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  │  12  │ │  8.5 │ │  3   │     ║
║  │Leave │ │Hours │ │Tasks │     ║
║  │ Days │ │Today │ │Open  │     ║
║  └──────┘ └──────┘ └──────┘     ║
║                                  ║
║  ── Quick Actions ────────────   ║
║  [Submit Leave]  [Log Hours]     ║
║                                  ║
║  ── Recent ───────────────────   ║
║  📋 Timesheet approved (Mon)     ║
║  ✅ Leave approved (Mar 28-29)   ║
║  📄 Payslip ready (Feb 2026)     ║
╠══════════════════════════════════╣
║ 🏠   📅    ⏱    💰    👤       ║
╚══════════════════════════════════╝
```

#### Dashboard — Manager
```
╔══════════════════════════════════╗
║  Good morning, David     🔔 (5) ║
╠══════════════════════════════════╣
║  ┌────────────────────────────┐  ║
║  │  ✅ Checked in at 8:45 AM │  ║
║  │  [  Check Out  ]          │  ║
║  └────────────────────────────┘  ║
║                                  ║
║  ── My Team (8 members) ──────   ║
║  ┌──────┐ ┌──────┐ ┌──────┐     ║
║  │  6   │ │  1   │ │  1   │     ║
║  │Presnt│ │Leave │ │Absnt │     ║
║  └──────┘ └──────┘ └──────┘     ║
║                                  ║
║  ── Pending Approvals (4) ─────  ║
║  ┌────────────────────────────┐  ║
║  │ 🏖 Alice Brown — Annual    │  ║
║  │   Apr 1-3 (3 days)        │  ║
║  │   [Reject]     [Approve]  │  ║
║  └────────────────────────────┘  ║
║  ┌────────────────────────────┐  ║
║  │ ⏱ Bob Smith — Timesheet   │  ║
║  │   Week of Mar 23 (40h)    │  ║
║  │   [Reject]     [Approve]  │  ║
║  └────────────────────────────┘  ║
╠══════════════════════════════════╣
║ 🏠   📅    ⏱    💰    👤       ║
╚══════════════════════════════════╝
```

#### Attendance Screen
```
╔══════════════════════════════════╗
║  My Attendance                   ║
╠══════════════════════════════════╣
║  ┌──────────────────────────┐   ║
║  │     TODAY — Mar 30       │   ║
║  │                          │   ║
║  │    ╭──────────────╮      │   ║
║  │    │  CHECK OUT   │      │   ║
║  │    │   ⏱ 4h 32m   │      │   ║
║  │    ╰──────────────╯      │   ║
║  │                          │   ║
║  │  In: 9:02 AM  Out: —    │   ║
║  └──────────────────────────┘   ║
║                                  ║
║       March 2026                 ║
║  Mo Tu We Th Fr Sa Su            ║
║                       1          ║
║  🟢 🟢 🟢 🟢 🟢 ⚪ ⚪          ║
║  🟢 🟢 🟡 🟢 🟢 ⚪ ⚪          ║
║  🟢 🟢 🟢 🟢 🔵 ⚪ ⚪          ║
║  🟢 🟢 🟢 🟢 🔘 ⚪ ⚪          ║
║  🟢 ⬜ ⬜ ⬜ ⬜ ⬜ ⬜           ║
║                                  ║
║  🟢 Present  🟡 Late  🔴 Absent ║
║  🔵 Leave  ⚪ Weekend  📅 Holiday║
╠══════════════════════════════════╣
║ 🏠   📅    ⏱    💰    👤       ║
╚══════════════════════════════════╝
```

#### Leave Request (Bottom Sheet)
```
╔══════════════════════════════════╗
║  New Leave Request          ✕   ║
╠══════════════════════════════════╣
║                                  ║
║  Leave Type                      ║
║  ┌──────────────────────── ▾ ┐  ║
║  │  Annual Leave (12 left)   │  ║
║  └───────────────────────────┘  ║
║                                  ║
║  Start Date         End Date     ║
║  ┌───────────┐  ┌───────────┐   ║
║  │  Apr 01   │  │  Apr 03   │   ║
║  └───────────┘  └───────────┘   ║
║                                  ║
║  Total: 3 days    □ Half day     ║
║                                  ║
║  Reason                          ║
║  ┌───────────────────────────┐  ║
║  │  Family vacation          │  ║
║  └───────────────────────────┘  ║
║                                  ║
║  ╭──────────────────────────╮   ║
║  │      SUBMIT REQUEST      │   ║
║  ╰──────────────────────────╯   ║
╚══════════════════════════════════╝
```

#### Weekly Timesheet
```
╔══════════════════════════════════╗
║  Timesheet — Mar 24-30    [▸]   ║
╠══════════════════════════════════╣
║                                  ║
║  HRM System / API Development    ║
║  M   T   W   T   F   S   S      ║
║  [8] [8] [7] [8] [6] [ ] [ ]    ║
║                          = 37h   ║
║  ─────────────────────────────   ║
║  HRM System / UI Components     ║
║  M   T   W   T   F   S   S      ║
║  [ ] [ ] [1] [ ] [2] [ ] [ ]    ║
║                          =  3h   ║
║  ─────────────────────────────   ║
║  [+ Add Project / Task Row]      ║
║                                  ║
║  ─────────────── Total: 40h ──   ║
║                                  ║
║  ╭───────────╮ ╭───────────╮    ║
║  │ Save Draft│ │  Submit   │    ║
║  ╰───────────╯ ╰───────────╯    ║
╠══════════════════════════════════╣
║ 🏠   📅    ⏱    💰    👤       ║
╚══════════════════════════════════╝
```

#### Payslip Detail
```
╔══════════════════════════════════╗
║  ← Payslip — February 2026      ║
╠══════════════════════════════════╣
║                                  ║
║  ┌────────────────────────────┐  ║
║  │     SkyrakSys Pvt Ltd     │  ║
║  │     Alice Brown           │  ║
║  │     Software Developer    │  ║
║  │     EMP-001               │  ║
║  └────────────────────────────┘  ║
║                                  ║
║  ── Earnings ─────────────────   ║
║  Basic Salary          ₹25,000   ║
║  HRA                   ₹10,000   ║
║  Special Allowance      ₹8,000   ║
║  Overtime                ₹2,200   ║
║                        ─────── ║
║  Gross                 ₹45,200   ║
║                                  ║
║  ── Deductions ───────────────   ║
║  PF Contribution        ₹3,000   ║
║  Professional Tax          ₹200   ║
║  TDS                    ₹1,500   ║
║                        ─────── ║
║  Total Deductions       ₹4,700   ║
║                                  ║
║  ┌────────────────────────────┐  ║
║  │   NET PAY    ₹40,500     │  ║
║  └────────────────────────────┘  ║
║                                  ║
║  [📤 Share]         [📥 Download] ║
╠══════════════════════════════════╣
║ 🏠   📅    ⏱    💰    👤       ║
╚══════════════════════════════════╝
```

### 3.5 Colour & Typography

| Element | Value |
|---|---|
| Primary | `#1976D2` (same as web Material theme) |
| Success/Check-in | `#4CAF50` |
| Warning/Pending | `#FF9800` |
| Error/Reject | `#F44336` |
| Background | `#F5F5F5` (light) / `#121212` (dark v2) |
| Font | System default (SF Pro / Roboto) — 16px base |
| Spacing | 8px grid |
| Border radius | 12px cards, 24px buttons |
| Bottom nav | 56px height, icons 24px |

### 3.6 Interaction Patterns

| Pattern | Usage |
|---|---|
| **Pull-to-refresh** | All list screens (attendance, leave, payslips) |
| **Swipe-to-action** | Manager approval cards (swipe right → approve, left → reject) |
| **Bottom sheet** | Leave request form, filters, timesheet day edit |
| **Haptic feedback** | Check-in/out tap, approval action |
| **Skeleton loading** | All data screens while API loads |
| **Toast notifications** | Success/error feedback after actions |
| **Biometric prompt** | App launch, payslip view (sensitive data) |

---

## 4. Solution Architect — Technical Design

### 4.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | **React Native + Expo (SDK 52+)** | Shared JS/TS codebase, Expo EAS for builds, same React skills as web team |
| **Navigation** | React Navigation 7 (bottom tabs + native stack) | Industry standard, gesture-based |
| **State** | Zustand + React Query (TanStack) | Lightweight, server-state caching, offline-aware |
| **Forms** | React Hook Form + Zod | Same validation patterns as web |
| **HTTP** | Axios (shared instance with interceptors) | Token refresh, error handling |
| **Auth storage** | expo-secure-store | Encrypted keychain/keystore for JWT |
|  Biometrics | expo-local-authentication | FaceID / fingerprint |
| **Push** | expo-notifications + Firebase Cloud Messaging | Cross-platform push |
| **PDF viewer** | react-native-pdf | Payslip rendering |
| **Calendar** | react-native-calendars | Attendance calendar |
| **Testing** | Jest + React Native Testing Library + Detox (E2E) | Match web testing patterns |

### 4.2 Project Structure

```
mobile/
├── app.json                     # Expo config
├── package.json
├── tsconfig.json
├── babel.config.js
├── eas.json                     # EAS Build config
├── src/
│   ├── api/                     # API client & endpoint modules
│   │   ├── client.ts            # Axios instance, interceptors, refresh logic
│   │   ├── auth.ts
│   │   ├── attendance.ts
│   │   ├── leaves.ts
│   │   ├── timesheets.ts
│   │   ├── payslips.ts
│   │   ├── tasks.ts
│   │   ├── reviews.ts
│   │   ├── employees.ts
│   │   └── dashboard.ts
│   ├── components/              # Reusable UI components
│   │   ├── cards/
│   │   │   ├── StatCard.tsx
│   │   │   ├── ApprovalCard.tsx
│   │   │   └── PayslipCard.tsx
│   │   ├── calendar/
│   │   │   └── AttendanceCalendar.tsx
│   │   ├── forms/
│   │   │   ├── LeaveRequestForm.tsx
│   │   │   └── TimesheetGrid.tsx
│   │   └── ui/
│   │       ├── BottomSheet.tsx
│   │       ├── SwipeAction.tsx
│   │       ├── SkeletonLoader.tsx
│   │       └── Badge.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx    # Auth vs App stack
│   │   ├── TabNavigator.tsx     # Bottom tabs
│   │   └── linking.ts           # Deep link config
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── BiometricScreen.tsx
│   │   ├── home/
│   │   │   ├── EmployeeDashboard.tsx
│   │   │   └── ManagerDashboard.tsx
│   │   ├── attendance/
│   │   │   ├── AttendanceScreen.tsx
│   │   │   └── AttendanceDayDetail.tsx
│   │   ├── leave/
│   │   │   ├── LeaveScreen.tsx
│   │   │   ├── LeaveRequestSheet.tsx
│   │   │   └── LeaveApprovalScreen.tsx
│   │   ├── timesheet/
│   │   │   ├── TimesheetScreen.tsx
│   │   │   ├── WeeklyTimesheetEditor.tsx
│   │   │   └── TimesheetApprovalScreen.tsx
│   │   ├── payslips/
│   │   │   ├── PayslipListScreen.tsx
│   │   │   └── PayslipDetailScreen.tsx
│   │   ├── tasks/
│   │   │   └── TasksScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── EditProfileScreen.tsx
│   │   └── team/
│   │       └── TeamMembersScreen.tsx
│   ├── store/
│   │   ├── authStore.ts         # JWT, user, biometric pref
│   │   └── notificationStore.ts
│   ├── hooks/
│   │   ├── useAttendance.ts     # React Query hooks
│   │   ├── useLeaves.ts
│   │   ├── useTimesheets.ts
│   │   ├── usePayslips.ts
│   │   └── useDashboard.ts
│   ├── utils/
│   │   ├── formatters.ts        # Date, currency (₹)
│   │   ├── constants.ts
│   │   └── permissions.ts       # Role-based UI gating
│   └── theme/
│       ├── colors.ts
│       ├── spacing.ts
│       └── typography.ts
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
└── __tests__/
```

### 4.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        MOBILE APP                           │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────────┐ │
│  │  Screens  │→ │  Hooks    │→ │  API Client (Axios)     │ │
│  │  (React   │  │  (React   │  │  ┌─────────────────────┐│ │
│  │  Native)  │  │  Query)   │  │  │ Token Interceptor   ││ │
│  └──────────┘  └───────────┘  │  │ • Auto-refresh       ││ │
│       │                        │  │ • 401 → re-login     ││ │
│       ▼                        │  └─────────────────────┘│ │
│  ┌──────────┐                  └────────────┬─────────────┘ │
│  │  Zustand  │  ┌──────────────┐            │               │
│  │  Store    │  │ Secure Store │            │               │
│  │  (auth,   │  │ (JWT tokens) │            │               │
│  │  prefs)   │  └──────────────┘            │               │
│  └──────────┘                               │               │
│  ┌──────────────────┐                       │               │
│  │ expo-notifications│                       │               │
│  │ (FCM / APNs)     │                       │               │
│  └──────────────────┘                       │               │
└─────────────────────────────────────────────┼───────────────┘
                                              │ HTTPS
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXISTING BACKEND (Node.js)                  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Auth API │  │ Employee │  │ Leave    │  │ Timesheet  │ │
│  │ /api/auth│  │ /api/empl│  │ /api/leav│  │ /api/times │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │Attendance│  │ Payslips │  │  Tasks   │  │  Reviews   │ │
│  │ /api/att │  │ /api/pays│  │ /api/task│  │ /api/emp-r │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
│                      │                                      │
│                      ▼                                      │
│               ┌──────────────┐                              │
│               │  PostgreSQL  │                              │
│               └──────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Auth Flow (Mobile)

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Launch   │────►│ Has token │─YES─►│ Biometric    │
│  App      │     │ in Secure │     │ prompt       │
└──────────┘     │ Store?    │     │ (if enabled) │
                  └─────┬────┘     └──────┬───────┘
                   NO   │           PASS  │  FAIL
                        ▼                 ▼    ▼
                  ┌──────────┐     ┌──────────┐
                  │  Login   │     │  Home    │
                  │  Screen  │────►│  Screen  │
                  └──────────┘     └──────────┘
                        │
                        ▼
                  POST /api/auth/login
                  Store access + refresh tokens
                  in expo-secure-store
```

**Token refresh:**  
Axios interceptor catches 401 → calls `POST /api/auth/refresh-token` → retries original request. If refresh fails → clear store → back to login.

### 4.5 Backend Changes Required

| Change | Effort | Description |
|---|---|---|
| **Push token endpoint** | Small | `POST /api/auth/push-token` — store FCM/APNs device token per user |
| **Push notification service** | Medium | New service to send push on: leave approved/rejected, timesheet approved, payslip generated, review assigned |
| **Attendance source: mobile** | None | Already supported — `source` field accepts `'mobile'` |
| **CORS for mobile** | None | Mobile apps don't use CORS (native HTTP) |
| **API versioning** | Optional | Consider `/api/v1/` prefix for future-proofing |

### 4.6 Offline Strategy

| Feature | Strategy |
|---|---|
| **Check-in/out** | Queue in AsyncStorage → sync on reconnect (with local timestamp) |
| **Dashboard stats** | Cache last-fetched via React Query `staleTime: 5min` |
| **Payslips** | Cache viewed PDFs locally |
| **Leave/Timesheet submit** | Queue locally, submit when online, show "pending sync" badge |
| **Network detection** | `@react-native-community/netinfo` — show offline banner |

### 4.7 Security

| Concern | Solution |
|---|---|
| Token storage | `expo-secure-store` (iOS Keychain / Android Keystore) — NOT AsyncStorage |
| Certificate pinning | v2.0 — optional via `react-native-ssl-pinning` |
| Biometric gate | `expo-local-authentication` before showing payslips or profile |
| Jailbreak/root detection | v2.0 — via `jail-monkey` |
| Screenshot prevention | v2.0 — `FLAG_SECURE` on Android for payslip screens |
| API | Existing JWT + refresh + rate-limiting already in place |

---

## 5. Delivery Plan

### 5.1 Phased Rollout

```
Phase 1 — Foundation (Weeks 1-3)
├── Project setup (Expo, navigation, theme, API client)
├── Auth flow (login, token storage, biometric unlock)
├── Dashboard screen (Employee + Manager variants)
└── Push notification infrastructure

Phase 2 — Core Employee (Weeks 4-6)
├── Attendance (check-in/out + calendar)
├── Leave (submit request + history + balances)
├── Timesheet (weekly grid + submit)
└── Profile (view + edit)

Phase 3 — Core Manager (Weeks 7-8)
├── Leave approval (swipe cards)
├── Timesheet approval
├── Team members view
└── Manager dashboard enhancements

Phase 4 — Payslips & Tasks (Weeks 9-10)
├── Payslip list + detail + PDF download
├── Tasks list + status update
└── Notification preferences

Phase 5 — Polish & Release (Weeks 11-12)
├── Error handling & edge cases
├── Performance optimization (list virtualization, image caching)
├── E2E testing with Detox
├── App Store / Play Store submission
└── Beta testing with real users
```

### 5.2 Effort Estimates

| Component | Screens | Estimated Effort |
|---|---|---|
| Auth (login, biometric, token) | 2 | 1 week |
| Dashboard (Employee + Manager) | 2 | 1 week |
| Attendance (check-in, calendar) | 2 | 1 week |
| Leave (submit, history, approval) | 3-4 | 1.5 weeks |
| Timesheet (editor, history, approval) | 3 | 1.5 weeks |
| Payslips (list, detail, PDF) | 2 | 1 week |
| Tasks | 1 | 0.5 week |
| Profile (view, edit) | 2 | 0.5 week |
| Team members | 1 | 0.5 week |
| Push notifications (backend + mobile) | — | 1 week |
| Testing, polish, store submission | — | 2 weeks |
| **Total** | **~18 screens** | **~12 weeks** |

### 5.3 API Endpoint Mapping (v1.0 — All Existing)

| Screen | Endpoints Used |
|---|---|
| **Login** | `POST /api/auth/login`, `POST /api/auth/refresh-token` |
| **Employee Dashboard** | `GET /api/dashboard/employee-stats`, `GET /api/attendance/today` |
| **Manager Dashboard** | `GET /api/dashboard/stats`, `GET /api/leaves/pending-for-manager`, `GET /api/timesheets/approval/pending` |
| **Attendance** | `POST /api/attendance/check-in`, `POST /api/attendance/check-out`, `GET /api/attendance/my`, `GET /api/attendance/today` |
| **Leave Submit** | `POST /api/leaves`, `GET /api/leaves/meta/types`, `GET /api/leaves/meta/balance` |
| **Leave History** | `GET /api/leaves/me` |
| **Leave Approval** | `GET /api/leaves/pending-for-manager`, `PUT /api/leaves/:id/approve`, `PUT /api/leaves/:id/reject` |
| **Timesheet** | `GET /api/timesheets/week/:weekStart`, `POST /api/timesheets/bulk-save`, `POST /api/timesheets/week/submit` |
| **Timesheet Approval** | `GET /api/timesheets/approval/pending`, `POST /api/timesheets/:id/approve`, `POST /api/timesheets/:id/reject` |
| **Payslips** | `GET /api/payslips/my`, `GET /api/payslips/:id`, `GET /api/payslips/:id/pdf` |
| **Tasks** | `GET /api/tasks`, `PUT /api/tasks/:id` |
| **Profile** | `GET /api/employees/me`, `PUT /api/employees/:id` |
| **Team** | `GET /api/employees/team-members` |

---

## 6. What Makes This Different

| Web Pattern | Mobile Rethink |
|---|---|
| Sidebar navigation (12+ items) | 5-tab bottom bar — only what matters |
| Full CRUD tables | Read-focused cards with single-action buttons |
| Multi-step forms with tabs | Bottom sheets with minimal fields |
| Click-heavy approval workflow | Swipe-to-approve (like email triage) |
| Desktop-first data tables | Mobile-native cards and lists |
| PDF opens in browser tab | In-app PDF viewer with share sheet |
| Manual data refresh | Pull-to-refresh + real-time push |
| Password entry every session | Biometric unlock (fingerprint / face) |
| No notifications | Push for approvals, reminders, payslip ready |

---

## 7. Success Metrics

| Metric | Target |
|---|---|
| Daily active users (Employee) | 80% of workforce within 3 months |
| Check-in via mobile | 60% of all check-ins |
| Leave request submission time | < 30 seconds (vs 2+ minutes web) |
| Manager approval response time | < 1 hour (push notification driven) |
| Timesheet submission rate | 95% on-time (Friday reminder) |
| App crash rate | < 0.1% |
| App size | < 25 MB |
| Cold start time | < 2 seconds |

---

*This plan uses 100% of the existing backend API. The only new backend work is a push-notification token endpoint and a notification dispatch service.*
