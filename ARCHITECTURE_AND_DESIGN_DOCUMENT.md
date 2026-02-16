# SKYRAKSYS HRM — Architecture, Design, LLD, Business Use Cases & Gap Analysis

**Version:** 1.0  
**Date:** 2026-02-09  
**Prepared by:** Architecture Audit  
**Company:** SKYRAKSYS TECHNOLOGIES LLP  
**Scope:** End-to-end code review covering Frontend, Middleware, Backend, Database

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Module Inventory](#4-module-inventory)
5. [High-Level Design (HLD)](#5-high-level-design-hld)
6. [Low-Level Design (LLD)](#6-low-level-design-lld)
7. [Database Design](#7-database-design)
8. [API Specification](#8-api-specification)
9. [Business Use Cases](#9-business-use-cases)
10. [Security Architecture](#10-security-architecture)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Cross-Layer Field Mapping](#12-cross-layer-field-mapping)
13. [Gap Analysis & Issues](#13-gap-analysis--issues)
14. [Recommendations](#14-recommendations)

---

## 1. Executive Summary

The SkyrakSys HRM is a full-stack Human Resource Management System designed for small-to-medium enterprises, tailored for Indian statutory compliance. The system manages the complete employee lifecycle: onboarding, attendance, leave management, timesheet tracking, payroll processing with Indian tax calculations (EPF, ESI, PT, TDS), payslip generation with PDF export, and performance reviews.

### Key Metrics

| Metric | Value |
|--------|-------|
| Frontend Screens | ~30 route-level pages |
| Frontend Components | ~170+ files |
| Backend API Endpoints | ~160+ |
| Backend Controllers | 8 |
| Backend Services | 31 (data + business + legacy) |
| Middleware Files | 16 + 7 validators |
| Database Tables | 19 |
| Total DB Fields | ~240 |
| Foreign Key Relationships | 35 |
| Validation Schemas (Joi) | ~45 |

### Audit Severity Summary

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 12 | Security, data integrity, runtime errors |
| 🟠 High | 14 | Missing validations, RBAC gaps, broken features |
| 🟡 Medium | 18 | Inconsistencies, missing constraints, code quality |
| 🟢 Low | 10 | Console logs, dead code, cosmetic |

---

## 2. System Architecture

### 2.1 Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Browser     │  │   Mobile     │  │   API Client │              │
│  │ (React SPA)   │  │  (Future)    │  │  (Postman)   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ SSL Termination │ Static Files │ Gzip │ Rate Limit (Layer1) │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  Port 80/443 → localhost:5000                                       │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS APPLICATION (PM2 Cluster ×2)          │
│                                                                      │
│  ┌──────────────────── MIDDLEWARE PIPELINE ────────────────────┐    │
│  │ Helmet → ResponseTime → CORS → RateLimiter → BodyParser     │    │
│  │ → CookieParser → RequestLogger → Morgan                     │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌─── Auth Layer ────────────┼───────────────────────────────┐      │
│  │ JWT Verify → Role Check → Field Access Control → Validate │      │
│  └───────────────────────────┼───────────────────────────────┘      │
│                              │                                       │
│  ┌─── Route Layer ───────────┼───────────────────────────────┐      │
│  │ 24 Route Files → ~160 Endpoints                            │      │
│  └───────────────────────────┼───────────────────────────────┘      │
│                              │                                       │
│  ┌─── Controller Layer ──────┼───────────────────────────────┐      │
│  │ 8 Controllers (Auth, Employee, Leave, Timesheet,           │      │
│  │ Payroll, Payslip, Settings, Index)                         │      │
│  └───────────────────────────┼───────────────────────────────┘      │
│                              │                                       │
│  ┌─── Service Layer ─────────┼───────────────────────────────┐      │
│  │ Business Services (5) ← orchestration, rules, workflows   │      │
│  │ Data Services (7)     ← pure DB access, no logic          │      │
│  │ Legacy Services (19)  ← mixed data+business               │      │
│  └───────────────────────────┼───────────────────────────────┘      │
│                              │                                       │
│  ┌─── Model Layer ───────────┼───────────────────────────────┐      │
│  │ 19 Sequelize Models + index.js (Assoc wiring)             │      │
│  └───────────────────────────┼───────────────────────────────┘      │
│                              │                                       │
│  Port 5000                                                           │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL 15                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 19 Tables │ 35 FKs │ 40+ Indexes │ UUID PKs │ Soft Deletes│    │
│  └─────────────────────────────────────────────────────────────┘    │
│  Pool: Max 10 (dev) / 20 (prod), Acquire 60s, Idle 30s             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Deployment Architecture

```
┌────────────────────── Red Hat Linux Server (95.216.14.232) ──────────┐
│                                                                       │
│  ┌── PM2 (Process Manager) ─────────────────────────────────────┐    │
│  │ Instance 1 (Cluster) ──► Express App (port 5000)              │    │
│  │ Instance 2 (Cluster) ──► Express App (port 5000)              │    │
│  │ Memory Limit: 1GB per instance                                │    │
│  │ Auto-restart on crash / memory overflow                       │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌── Nginx ─────────────────────────────────────────────────────┐    │
│  │ :80/443 → proxy_pass http://127.0.0.1:5000                   │    │
│  │ SSL via Let's Encrypt (certbot)                               │    │
│  │ Serves: /static, /uploads (from React build)                  │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌── PostgreSQL 15 ─────────────────────────────────────────────┐    │
│  │ DB: skyraksys_hrm_prod │ User: hrm_app │ Auth: md5           │    │
│  │ Daily backup cron → /var/backups/skyraksys/                   │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌── Firewall (firewalld) ──────────────────────────────────────┐    │
│  │ Open: 22 (SSH), 80 (HTTP), 443 (HTTPS)                       │    │
│  │ Blocked: 5432 (PostgreSQL), 5000 (App direct)                 │    │
│  └───────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework (CRA-based) |
| React Router | 6.x | Client-side routing |
| MUI (Material-UI) | 5.15 | Component library |
| @mui/x-data-grid | 7.x | Data tables |
| @tanstack/react-query | 5.x | Server state management |
| React Hook Form | 7.x | Form management |
| Yup | 1.x | Schema validation |
| Recharts | 2.x | Charts and visualizations |
| Axios | 1.x | HTTP client |
| Notistack | 3.x | Toast notifications |
| dayjs + date-fns | — | Date manipulation (dual) |
| react-window | 1.x | Virtual scrolling |
| file-saver | 2.x | File download |

### 3.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18 | HTTP framework |
| Sequelize | 6.x | ORM |
| PostgreSQL | 15.x | Database |
| bcrypt | 5.x | Password hashing (12 rounds) |
| jsonwebtoken | 9.x | JWT auth |
| helmet | 7.x | HTTP security headers |
| cors | 2.x | Cross-origin control |
| express-rate-limit | 7.x | Rate limiting |
| joi | 17.x | Input validation |
| multer | 1.x | File uploads |
| winston | 3.x | Structured logging |
| morgan | 1.x | HTTP access logs |
| nodemailer | 6.x | Email sending |
| pdfkit | 0.14 | PDF generation |
| exceljs | 4.x | Excel export |
| swagger-ui-express | 5.x | API documentation |
| dotenv | 16.x | Environment config |
| cookie-parser | 1.x | Cookie handling |
| uuid | 9.x | UUID generation |

### 3.3 DevOps

| Technology | Purpose |
|------------|---------|
| PM2 | Process management (cluster mode × 2) |
| Nginx | Reverse proxy, SSL, static files |
| Let's Encrypt | SSL certificates |
| firewalld | Server firewall |
| cron | Daily DB backups |
| rsync | File deployment |

---

## 4. Module Inventory

### 4.1 Application Modules

| Module | Frontend Screens | API Endpoints | Models | Status |
|--------|:---:|:---:|:---:|:---:|
| **Authentication** | Login, Password Reset | 19 | User, RefreshToken | ✅ Complete |
| **Employee Management** | List, Create, Edit, View | 21 | Employee | ✅ Complete |
| **Department Management** | List, Create, Edit | 5 | Department | ✅ Complete |
| **Position Management** | List, Create, Edit | 5 | Position | ✅ Complete |
| **Leave Management** | My Leaves, Apply, Approval, Calendar, Balance | 17 | LeaveRequest, LeaveBalance, LeaveType | ✅ Complete |
| **Timesheet Management** | My Timesheets, Weekly Entry, Approval | 21 | Timesheet | ✅ Complete |
| **Project Management** | List, Create, Edit | 7+ | Project | ✅ Complete |
| **Task Management** | List, Create, Edit | 7+ | Task | ✅ Complete |
| **Payroll Processing** | List, Calculate, Approve | 15 | PayrollData | ✅ Complete |
| **Payslip Management** | List, Generate, PDF, Export | 17 | Payslip, PayslipAuditLog | ⚠️ Audit broken |
| **Salary Structure** | List, Create, Edit | 8 | SalaryStructure | ✅ Complete |
| **Payslip Templates** | List, Create, Edit, Preview | 9 | PayslipTemplate | ✅ Complete |
| **Employee Reviews** | Create, Dashboard | 7 | EmployeeReview | ✅ Complete |
| **Dashboard** | Employee, Manager, Admin | 3 | Aggregated | ✅ Complete |
| **Settings** | System Config, Email Config | 12 | SystemConfig | ✅ Complete |
| **Admin Panel** | User Management, Debug | 15+ | User, various | ⚠️ Debug insecure |
| **Audit Trail** | — | Built-in | AuditLog | ✅ Complete |
| **Restore** | — | 6 | Various (paranoid) | ✅ Complete |

---

## 5. High-Level Design (HLD)

### 5.1 Component Interaction

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React SPA)                     │
├──────────────┬──────────────┬──────────────┬─────────────────────┤
│  Auth Module │  HR Module   │ Finance Mod. │ Admin Module        │
│  ─ Login     │  ─ Employees │ ─ Payroll    │ ─ User Management   │
│  ─ Password  │  ─ Leave     │ ─ Payslips   │ ─ System Config     │
│  ─ Profile   │  ─ Timesheet │ ─ Salary     │ ─ Email Config      │
│              │  ─ Reviews   │ ─ Templates  │ ─ Debug Panel       │
├──────────────┴──────────────┴──────────────┴─────────────────────┤
│  Shared: AppContext, AuthContext, ThemeProvider, QueryClient      │
│  HTTP Layer: Axios instance (with interceptor) + apiService      │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API (JSON)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express.js)                       │
├──────────────────────────────────────────────────────────────────┤
│  Middleware Pipeline                                              │
│  ┌────────┬──────┬──────────┬────────┬──────────┬──────────┐    │
│  │Helmet  │CORS  │RateLimit │BodyPrs │ CookiePrs│ReqLogger│     │
│  └────────┴──────┴──────────┴────────┴──────────┴──────────┘    │
│                                                                   │
│  Auth & Access Control                                            │
│  ┌──────────────┬──────────────┬──────────────────────────────┐  │
│  │JWT Verify    │Role Authorize│Field Access Control (2 layers)│  │
│  └──────────────┴──────────────┴──────────────────────────────┘  │
│                                                                   │
│  Validation                                                       │
│  ┌──────────────┬──────────────┬──────────────────────────────┐  │
│  │Joi Schemas   │FK Validators │File Upload Validators         │  │
│  └──────────────┴──────────────┴──────────────────────────────┘  │
│                                                                   │
│  Business Logic (3-Layer Service Architecture)                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Controllers → Business Services → Data Services → Models     ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  Cross-Cutting: AuditService, CacheService, EmailService,        │
│                 LogService, ConfigService                         │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Sequelize ORM
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL 15                               │
│  19 Tables │ UUID PKs │ Soft Deletes │ JSON Fields │ Indexes     │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Authentication Flow

```
Client                    Express                     Database
  │                          │                            │
  │  POST /api/auth/login    │                            │
  │  {email, password}       │                            │
  │ ─────────────────────►   │                            │
  │                          │  loginRateLimiter check    │
  │                          │  (per-IP + per-username)   │
  │                          │                            │
  │                          │  Find User by email        │
  │                          │  ──────────────────────►   │
  │                          │  ◄──────────────────────   │
  │                          │                            │
  │                          │  Check lockout (5 failures │
  │                          │  → 15min lock)             │
  │                          │                            │
  │                          │  bcrypt.compare(password)  │
  │                          │                            │
  │                          │  Generate Access Token     │
  │                          │  (JWT, 15min, with jti)    │
  │                          │                            │
  │                          │  Generate Refresh Token    │
  │                          │  (JWT, 7d, stored in DB)   │
  │                          │  ──────────────────────►   │
  │                          │                            │
  │  200 OK + Set-Cookie:    │                            │
  │  accessToken (httpOnly)  │                            │
  │  + body: {user,          │                            │
  │   accessToken,           │                            │
  │   refreshToken}          │                            │
  │ ◄─────────────────────   │                            │
  │                          │                            │
  │  GET /api/employees      │                            │
  │  Cookie: accessToken=... │                            │
  │ ─────────────────────►   │                            │
  │                          │  authenticateToken         │
  │                          │  → verify JWT              │
  │                          │  → load User+Employee      │
  │                          │  → check isActive          │
  │                          │  → set req.user/role/empId │
  │                          │                            │
  │                          │  authorize('admin','hr')   │
  │                          │  → check req.userRole      │
  │                          │                            │
  │                          │  fieldAccessControl        │
  │                          │  → strip restricted fields │
  │                          │                            │
  │  200 OK {employees}      │                            │
  │ ◄─────────────────────   │                            │
```

### 5.3 Data Flow — Payslip Generation

```
Admin/HR                   Backend                       Database
  │                          │                              │
  │ POST /payslips/generate  │                              │
  │ {employeeIds,month,year} │                              │
  │ ─────────────────────►   │                              │
  │                          │                              │
  │                          │  For each employee:          │
  │                          │  ┌──────────────────────┐    │
  │                          │  │ 1. Get Employee       │    │
  │                          │  │ 2. Get SalaryStructure│    │
  │                          │  │ 3. Get PayrollData    │    │
  │                          │  │ 4. Get Template       │    │
  │                          │  └──────────┬───────────┘    │
  │                          │             │                │
  │                          │  Calculate:                  │
  │                          │  ┌──────────────────────┐    │
  │                          │  │ Basic (prorated)     │    │
  │                          │  │ + HRA (50% of basic) │    │
  │                          │  │ + Allowances         │    │
  │                          │  │ = Gross Earnings     │    │
  │                          │  │                      │    │
  │                          │  │ - EPF (12% on 15K)   │    │
  │                          │  │ - ESIC (0.75%)       │    │
  │                          │  │ - PT (₹200 max)      │    │
  │                          │  │ - TDS (slab-based)   │    │
  │                          │  │ = Total Deductions   │    │
  │                          │  │                      │    │
  │                          │  │ Net = Gross - Deduct.│    │
  │                          │  │ + Net Pay in Words   │    │
  │                          │  └──────────┬───────────┘    │
  │                          │             │                │
  │                          │  Create Payslip (draft)      │
  │                          │  ──────────────────────────► │
  │                          │  Create AuditLog             │
  │                          │  ──────────────────────────► │
  │                          │                              │
  │  200 OK {payslips}       │                              │
  │ ◄─────────────────────   │                              │
  │                          │                              │
  │ PUT /payslips/:id/finalize                              │
  │ ─────────────────────►   │                              │
  │                          │  Lock payslip (isLocked=true)│
  │                          │  ──────────────────────────► │
  │                          │                              │
  │ GET /payslips/:id/pdf    │                              │
  │ ─────────────────────►   │                              │
  │                          │  Generate PDF (PDFKit)       │
  │  ◄── PDF Stream ──────  │                              │
```

---

## 6. Low-Level Design (LLD)

### 6.1 Backend Service Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    CONTROLLER LAYER (8 files)                  │
│  AuthController │ EmployeeController │ LeaveController        │
│  TimesheetController │ PayrollController │ PayslipController  │
│  SettingsController │ IndexController (barrel)                │
├───────────────────────────────────────────────────────────────┤
│                 BUSINESS SERVICE LAYER (5 files)               │
│  EmployeeBusinessService: createEmployee, updateEmployee,     │
│    terminateEmployee, updateCompensation                      │
│  LeaveBusinessService: createLeaveRequest, approve, reject,   │
│    cancel (with transactional balance deduction + row lock)   │
│  TimesheetBusinessService: createTimeEntry, updateTimeEntry,  │
│    submit, approve, reject (status machine enforcement)       │
│  PayrollBusinessService: calculate, create, update, process,  │
│    approve (Indian statutory: EPF, ESI, PT, TDS)              │
│  PayslipService: calculatePreview, validate, generate,        │
│    edit (with audit trail), finalize, markAsPaid, PDF, XLSX   │
├───────────────────────────────────────────────────────────────┤
│                   DATA SERVICE LAYER (7 files)                 │
│  EmployeeDataService │ UserDataService │ SalaryDataService    │
│  LeaveBalanceDataService │ LeaveDataService                    │
│  TimesheetDataService │ PayrollDataService                     │
├───────────────────────────────────────────────────────────────┤
│              CROSS-CUTTING SERVICES (12 files)                 │
│  AuditService: log, sanitize, query (non-blocking)            │
│  CacheService: in-memory TTL cache, 1000 entries, LRU-like    │
│  EmailService: SMTP with encrypted credentials (AES-256-GCM)  │
│  ConfigService: runtime .env management with backups           │
│  DatabaseService: SQL console (restricted keywords)            │
│  DashboardService: employee/admin/manager stats (5min cache)   │
│  LogService: log file management and rotation                  │
│  PasswordResetTokenService: secure token lifecycle             │
│  LeaveBalanceValidationService: balance rule enforcement       │
│  PayslipCalculationService: Indian statutory math              │
│  PayslipTemplateService: template CRUD                         │
│  TimesheetCalc/Submission/Approval/BulkService: 4 sub-services│
├───────────────────────────────────────────────────────────────┤
│                     MODEL LAYER (19 models)                    │
│  (See Section 7 for full data dictionary)                     │
└───────────────────────────────────────────────────────────────┘
```

### 6.2 Middleware Pipeline (Per-Request)

```
Request ──►
  │
  ├─ [1] helmet()                     // Security headers
  ├─ [2] responseTime()               // X-Response-Time + slow logging
  ├─ [3] cors(whitelist)              // Origin validation
  ├─ [4] rateLimiter (if enabled)     // 300 req/15min general
  ├─ [5] express.json({limit:'10mb'}) // Body parsing
  ├─ [6] cookieParser()               // Cookie extraction
  ├─ [7] requestLogger                // UUID request ID + Winston
  ├─ [8] morgan                       // Access log to file
  │
  ├─ [Route-Level Middleware]:
  │  ├─ authenticateToken             // JWT verify, load user
  │  ├─ authorize(roles)              // Role allowlist
  │  ├─ enhancedFieldAccessControl    // Request-level field filtering
  │  ├─ validate(joiSchema)           // Body validation
  │  ├─ validateQuery(schema)         // Query param validation
  │  ├─ validateParams(schema)        // URL param validation (UUID)
  │  ├─ foreignKeyValidator           // DB referential integrity check
  │  ├─ upload.single('photo')        // File upload handling
  │  └─ requirePasswordReauth        // Sensitive op re-auth
  │
  ├─ Controller/Handler
  ├─ fieldAccessControl               // Response-level field stripping
  │
  ├─ [Error Path]:
  │  ├─ errorLogger                   // Winston structured error log
  │  └─ errorHandler                  // Sequelize/JWT/Custom → JSON
  │
  ◄── Response
```

### 6.3 State Machines

#### Leave Request Lifecycle:
```
                      ┌──────────┐
                      │ Pending  │◄─── Employee creates
                      └────┬─────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────────────┐
        │ Approved │ │ Rejected │ │ Cancelled (by owner) │
        └────┬─────┘ └──────────┘ └──────────────────────┘
             │
             ▼
   ┌─────────────────────┐
   │ Cancellation         │
   │ Requested            │
   └─────────┬───────────┘
             │
        ┌────┴────┐
        ▼         ▼
   Cancelled   Denied
   (balance    (stays
    restored)  Approved)
```

#### Timesheet Lifecycle:
```
   ┌───────┐     submit     ┌───────────┐
   │ Draft │───────────────►│ Submitted │
   └───┬───┘                └─────┬─────┘
       ▲                          │
       │     reject         ┌─────┴─────┐
       └────────────────────│           │
                            ▼           ▼
                      ┌──────────┐ ┌──────────┐
                      │ Approved │ │ Rejected │
                      └──────────┘ └────┬─────┘
                                        │
                                        ▼
                                    (Back to Draft
                                     for re-work)
```

#### Payslip Lifecycle:
```
   ┌───────┐   finalize   ┌───────────┐   mark paid   ┌──────┐
   │ Draft │──────────────►│ Finalized │──────────────►│ Paid │
   └───┬───┘               └───────────┘               └──────┘
       │
       │  cancel
       ▼
   ┌───────────┐
   │ Cancelled │
   └───────────┘
```

#### Payroll Lifecycle:
```
   ┌───────┐    submit    ┌────────────┐   approve   ┌──────────┐
   │ Draft │─────────────►│ Calculated │────────────►│ Approved │
   └───────┘              └────────────┘             └────┬─────┘
                                                          │ process
                                                          ▼
                                                     ┌────────┐
                                                     │  Paid  │
                                                     └────────┘
```

### 6.4 Role-Based Access Control Matrix

| Resource | Admin | HR | Manager | Employee |
|----------|:-----:|:--:|:-------:|:--------:|
| **Users** — CRUD | ✅ | ❌ | ❌ | ❌ |
| **Users** — List | ✅ | ✅ | ❌ | ❌ |
| **Employees** — Create/Delete | ✅ | ✅ | ❌ | ❌ |
| **Employees** — View All | ✅ | ✅ | Team only | Self only |
| **Employees** — Edit | ✅ | ✅ | Limited | Own profile |
| **Employees** — Salary/Bank | ✅ | ✅ | ❌ | ❌ |
| **Departments** — CRUD | ✅ | ✅ | ❌ | ❌ |
| **Positions** — CRUD | ✅ | ✅ | ❌ | ❌ |
| **Leave** — Apply | ✅ | ✅ | ✅ | ✅ (own) |
| **Leave** — Approve/Reject | ✅ | ✅ | Team only | ❌ |
| **Leave** — View All | ✅ | ✅ | Team | Own |
| **Leave Balances** — Admin CRUD | ✅ | ✅ | ❌ | ❌ |
| **Timesheets** — Create/Edit | ✅ | ✅ | ✅ | ✅ (own) |
| **Timesheets** — Approve/Reject | ✅ | ✅ | Team only | ❌ |
| **Projects** — CRUD | ✅ | ❌ | ✅ | ❌ |
| **Tasks** — CRUD | ✅ | ❌ | ✅ | Status only |
| **Payroll** — Calculate/Process | ✅ | ✅ | ❌ | ❌ |
| **Payroll** — View | ✅ | ✅ | ❌ | Own only |
| **Payslips** — Generate | ✅ | ✅ | ❌ | ❌ |
| **Payslips** — View | ✅ | ✅ | ❌ | Own only |
| **Payslip Templates** | ✅ | ✅ | ❌ | ❌ |
| **Salary Structures** | ✅ | ✅ | ❌ | Own (view) |
| **Employee Reviews** | ✅ | ✅ | Create/Edit | Self-input |
| **System Config** | ✅ (+ password) | ❌ | ❌ | ❌ |
| **Email Config** | ✅ | ❌ | ❌ | ❌ |
| **Dashboard** | Admin stats | All stats | Team stats | Own stats |
| **Restore (soft-deleted)** | ✅ | ❌ | ❌ | ❌ |
| **Debug Panel** | Dev only | Dev only | Dev only | Dev only |

---

## 7. Database Design

### 7.1 Entity-Relationship Diagram

```
┌──────────┐     1:1     ┌────────────┐    N:1     ┌─────────────┐
│  users   │─────────────│ employees  │────────────│ departments │
│          │             │            │            │             │
│ id (UUID)│             │ id (UUID)  │    N:1     │ id (UUID)   │
│ email    │             │ employeeId │────────────│ managerId──►│
│ password │             │ userId ──► │            │ parentId──► │
│ role     │             │ departmentId──►         │             │
│ isActive │             │ positionId──►  ┌───────►│             │
│          │             │ managerId──►│  │        └─────────────┘
└──────────┘             │ salary(JSON)│  │               │
     │                   │ statutory   │  │          N:1  │
     │ 1:N               │ bank info   │  │        ┌──────┘
     ▼                   └─────────────┘  │        ▼
┌──────────────┐              │           │  ┌───────────┐
│refresh_tokens│              │           │  │ positions │
│ token (TEXT)  │              │ 1:N       │  │ title     │
│ expiresAt    │              │           │  │ level     │
│ ipAddress    │              ▼           │  │ dept ──►  │
└──────────────┘    ┌─────────────────┐   │  └───────────┘
                    │ leave_requests  │   │
                    │ employeeId ──►  │   │
                    │ leaveTypeId──►  │   │  ┌────────────┐
                    │ startDate       │   │  │ leave_types│
                    │ endDate         │───┘  │ name       │
                    │ status          │      │ maxDays    │
                    │ approvedBy ──►  │      │ carryFwd   │
                    └─────────────────┘      └──────┬─────┘
                                                    │
                    ┌─────────────────┐              │
                    │ leave_balances  │◄─────────────┘
                    │ employeeId ──►  │
                    │ leaveTypeId──►  │
                    │ year            │
                    │ totalAccrued    │
                    │ UNIQUE(emp,type,│
                    │        year)    │
                    └─────────────────┘

┌───────────┐   1:N   ┌──────────┐   N:1   ┌────────────┐
│ projects  │─────────│  tasks   │─────────│ employees  │
│ name      │         │ name     │  assignedTo          │
│ managerId──►        │ projectId──►                     │
│ status    │         │ status   │                       │
└─────┬─────┘         └────┬─────┘                       │
      │                    │                             │
      │         ┌──────────┘                             │
      │ N:1     │ N:1                                    │
      ▼         ▼                                        │
┌──────────────────────┐                                 │
│    timesheets        │  N:1                            │
│ employeeId ──────────┼─────────────────────────────────┘
│ projectId ──►        │
│ taskId ──►           │
│ weekStartDate        │
│ Mon-Sun Hours (×7)   │
│ totalHoursWorked     │
│ status               │
│ approvedBy ──►       │
└──────────────────────┘

┌──────────────────┐  1:1  ┌──────────────┐  N:1  ┌────────────────┐
│  payroll_data    │───────│   payslips   │───────│payslip_templates│
│ id (INTEGER!) ★  │       │ id (UUID)    │       │ id (UUID)       │
│ employeeId ──►   │       │ employeeId──►│       │ headerFields(J) │
│ payPeriod        │       │ payrollDataId│       │ earningsFields  │
│ grossSalary      │       │ month, year  │       │ deductionFields │
│ netSalary        │       │ earnings(J)  │       │ footerFields    │
│ status           │       │ deductions(J)│       │ styling (JSON)  │
│ UNIQUE(emp,period)│       │ netPay       │       │ isDefault       │
└──────────────────┘       │ payslipNumber│       └────────────────┘
                           │ status       │
  ★ Only table with        │ isLocked     │
    INTEGER PK             │UNQ(emp,mo,yr)│
                           └──────┬───────┘
                                  │ 1:N
                           ┌──────┴───────┐
                           │payslip_audit │
                           │    _logs     │
                           │ payslipId ──►│ ⚠️ BROKEN (type mismatch)
                           │ performedBy──►│
                           │ action       │
                           │ changes(JSONB)│
                           └──────────────┘

┌────────────────┐      ┌──────────────┐      ┌──────────────────┐
│salary_structures│      │ audit_logs   │      │ system_configs   │
│ employeeId ──► │      │ action       │      │ category         │
│ basicSalary    │      │ entityType   │      │ key              │
│ hra            │      │ entityId     │      │ value            │
│ pfContribution │      │ userId ──►   │      │ version          │
│ tds            │      │ old/newValues│      │ changedBy ──►    │
│ professionalTax│      │ metadata(J)  │      └──────────────────┘
│ effectiveFrom  │      │ immutable ★  │
└────────────────┘      └──────────────┘  ┌──────────────────┐
                                          │ employee_reviews │
                                          │ employeeId ──►   │
                                          │ reviewerId ──►   │
                                          │ 6 rating fields  │
                                          │ status workflow  │
                                          │ hrApproved       │
                                          └──────────────────┘
```

### 7.2 Table Summary

| # | Table | PK Type | Paranoid | Records (Seed) | Key Constraints |
|---|-------|---------|----------|:---:|---|
| 1 | users | UUID | Yes | 5 | UNIQUE(email) |
| 2 | employees | UUID | Yes | 5 | UNIQUE(employeeId), UNIQUE(email) |
| 3 | departments | UUID | Yes | 5 | UNIQUE(name), UNIQUE(code) |
| 4 | positions | UUID | Yes | 11 | UNIQUE(code) |
| 5 | refresh_tokens | UUID | No | — | UNIQUE(token) |
| 6 | leave_types | UUID | No | 5 | UNIQUE(name) |
| 7 | leave_balances | UUID | Yes | 25 | UNIQUE(emp,type,year) |
| 8 | leave_requests | UUID | Yes | — | — |
| 9 | projects | UUID | No | 3 | — |
| 10 | tasks | UUID | No | 6 | — |
| 11 | timesheets | UUID | Yes | — | — |
| 12 | salary_structures | UUID | No | 5 | — |
| 13 | payslip_templates | UUID | No | 4 | — |
| 14 | payroll_data | **INTEGER** | No | — | UNIQUE(emp,period) |
| 15 | payslips | UUID | Yes | — | UNIQUE(emp,mo,yr), UNIQUE(payslipNumber) |
| 16 | payslip_audit_logs | INTEGER | No | — | ⚠️ BROKEN MODEL |
| 17 | audit_logs | UUID | No | — | IMMUTABLE (hooks) |
| 18 | system_configs | UUID | No | — | — |
| 19 | employee_reviews | UUID | Yes | — | — |

---

## 8. API Specification

### 8.1 Endpoint Summary by Module

#### Authentication (19 endpoints)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | Public | Email/password login |
| POST | `/api/auth/logout` | JWT | Destroy refresh token |
| POST | `/api/auth/refresh-token` | Public | Token rotation |
| GET | `/api/auth/profile` | JWT | Current user profile |
| GET | `/api/auth/me` | JWT | Alias for /profile |
| PUT | `/api/auth/change-password` | JWT | Password change |
| POST | `/api/auth/forgot-password` | Public | Request reset email |
| POST | `/api/auth/reset-password` | Public | Reset with token |
| POST | `/api/auth/verify-reset-token` | Public | Validate token |
| POST | `/api/auth/cleanup-tokens` | Admin | Purge expired tokens |
| POST | `/api/auth/register` | Admin | Create user account |
| GET | `/api/auth/users` | Admin/HR | List user accounts |
| PUT | `/api/auth/users/:id/reset-password` | Admin | Force password reset |
| PUT | `/api/auth/users/:id/account` | Admin | Update email/role |
| POST | `/api/auth/users/employee/:empId` | Admin | Create user for employee |
| PUT | `/api/auth/users/:id/role` | Admin | Change role |
| PUT | `/api/auth/users/:id/status` | Admin | Activate/deactivate |
| PUT | `/api/auth/users/:id/lock` | Admin | Lock/unlock account |
| DELETE | `/api/auth/users/:id` | Admin | Soft-delete user |

#### Employees (21 endpoints)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/employees` | JWT+RBAC | List (role-filtered) |
| GET | `/api/employees/me` | JWT | Current employee profile |
| GET | `/api/employees/statistics` | Admin/HR | Aggregate stats |
| GET | `/api/employees/meta/departments` | JWT | Department dropdown |
| GET | `/api/employees/meta/positions` | JWT | Position dropdown |
| GET | `/api/employees/managers` | Admin/HR | Manager dropdown |
| GET | `/api/employees/export` | Admin/HR | CSV export |
| GET | `/api/employees/by-employee-id/:id` | RBAC | Lookup by SKYT#### |
| GET | `/api/employees/manager/:id/team` | JWT | Team members |
| GET | `/api/employees/team-members` | Manager+ | My team |
| GET | `/api/employees/:id` | RBAC | Get by UUID |
| POST | `/api/employees` | Admin/HR | Create employee |
| POST | `/api/employees/:id/photo` | Admin/HR | Upload photo |
| POST | `/api/employees/bulk-update` | Admin/HR | Batch update |
| PUT | `/api/employees/:id` | RBAC | Update employee |
| PUT | `/api/employees/:id/compensation` | Admin/HR | Update salary |
| PATCH | `/api/employees/:id/status` | Admin/HR | Change status |
| DELETE | `/api/employees/:id` | Admin/HR | Soft-delete |

#### Leave Management (17 endpoints)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/leave` | RBAC | List (role-filtered) |
| GET | `/api/leave/me` | JWT | My leave requests |
| GET | `/api/leave/statistics` | Admin/HR+ | Stats by status |
| GET | `/api/leave/balance/:empId` | RBAC | Employee balance |
| GET | `/api/leave/meta/types` | JWT | Leave type dropdown |
| GET | `/api/leave/meta/balance` | JWT | My balance summary |
| GET | `/api/leave/balance` | Admin/HR | All balances |
| GET | `/api/leave/pending-for-manager` | Manager+ | Pending approvals |
| GET | `/api/leave/recent-approvals` | Manager+ | Recent decisions |
| GET | `/api/leave/:id` | RBAC | Get by UUID |
| POST | `/api/leave` | JWT | Apply for leave |
| PUT | `/api/leave/:id` | RBAC | Update pending |
| PATCH | `/api/leave/:id/approve` | Manager+ | Approve request |
| PATCH | `/api/leave/:id/reject` | Manager+ | Reject request |
| PATCH | `/api/leave/:id/cancel` | RBAC | Cancel request |
| DELETE | `/api/leave/:id` | RBAC | Delete request |

#### Timesheets (21 endpoints)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/timesheets` | RBAC | List (role-filtered) |
| GET | `/api/timesheets/me` | JWT | My timesheets |
| GET | `/api/timesheets/summary` | RBAC | Hours summary |
| GET | `/api/timesheets/week/:weekStart` | RBAC | Week view |
| GET | `/api/timesheets/approval/pending` | Manager+ | Pending approvals |
| GET | `/api/timesheets/stats/summary` | RBAC | Statistics |
| GET | `/api/timesheets/:id` | RBAC | Get by UUID |
| POST | `/api/timesheets` | JWT | Create entry |
| PUT | `/api/timesheets/:id` | RBAC | Update draft |
| PATCH | `/api/timesheets/:id/submit` | JWT | Submit for approval |
| PATCH | `/api/timesheets/:id/approve` | Manager+ | Approve |
| PATCH | `/api/timesheets/:id/reject` | Manager+ | Reject |
| POST | `/api/timesheets/bulk-submit` | JWT | Batch submit |
| POST | `/api/timesheets/week/submit` | JWT | Submit full week |
| POST | `/api/timesheets/bulk-approve` | Manager+ | Batch approve |
| POST | `/api/timesheets/bulk-reject` | Manager+ | Batch reject |
| POST | `/api/timesheets/bulk-save` | JWT | ⚠️ STUB (not saving) |
| PUT | `/api/timesheets/bulk-update` | JWT | ⚠️ STUB (not saving) |
| DELETE | `/api/timesheets/:id` | RBAC | Delete entry |

#### Payroll (15 endpoints)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/payroll` | Admin/HR | List all payroll data |
| GET | `/api/payroll/summary` | Admin/HR | Summary statistics |
| GET | `/api/payroll/employee/:empId` | RBAC | Employee payroll |
| GET | `/api/payroll/export-csv` | Admin/HR | CSV export |
| GET | `/api/payroll/:id` | RBAC | Get by ID |
| POST | `/api/payroll/calculate` | Admin/HR | Calculate preview |
| POST | `/api/payroll` | Admin/HR | Create payroll record |
| POST | `/api/payroll/import-csv` | Admin | CSV import |
| PUT | `/api/payroll/:id` | Admin/HR | Update draft |
| POST | `/api/payroll/:id/submit` | Admin/HR | Submit for processing |
| POST | `/api/payroll/:id/approve` | Admin/HR | Approve |
| POST | `/api/payroll/:id/process` | Admin | Mark paid |
| POST | `/api/payroll/:id/payslip` | Admin/HR | Generate payslip |
| POST | `/api/payroll/bulk-approve` | Admin/HR | Batch approve |
| DELETE | `/api/payroll/:id` | Admin | Delete draft |

#### Payslips (17 endpoints)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/payslips` | RBAC | List all |
| GET | `/api/payslips/my` | JWT | My payslips |
| GET | `/api/payslips/history/:empId` | RBAC | Employee history |
| GET | `/api/payslips/reports/summary` | Admin/HR | Summary report |
| GET | `/api/payslips/reports/export` | Admin/HR | XLSX/CSV export |
| GET | `/api/payslips/:id` | RBAC | Get by ID |
| GET | `/api/payslips/:id/pdf` | RBAC | Download PDF |
| POST | `/api/payslips/calculate-preview` | Admin/HR | Preview calc |
| POST | `/api/payslips/validate` | Admin/HR | Pre-gen validation |
| POST | `/api/payslips/generate` | Admin/HR | Generate for selected |
| POST | `/api/payslips/generate-all` | Admin/HR | Generate for all |
| PUT | `/api/payslips/:id` | Admin/HR | Edit draft (+ audit) |
| PUT | `/api/payslips/:id/finalize` | Admin/HR | Lock & finalize |
| PUT | `/api/payslips/:id/mark-paid` | Admin/HR | Mark as paid |
| POST | `/api/payslips/bulk-finalize` | Admin/HR | Batch finalize |
| POST | `/api/payslips/bulk-paid` | Admin/HR | Batch mark paid |
| DELETE | `/api/payslips/bulk` | Admin | Batch delete drafts |

*(Additional endpoints for salary-structures, payslip-templates, departments, positions, projects, tasks, dashboard, settings, admin, restore, reviews, debug — see Section 4)*

---

## 9. Business Use Cases

### 9.1 Employee Lifecycle

| # | Use Case | Actors | Flow |
|---|----------|--------|------|
| UC-01 | **Onboard Employee** | Admin/HR | Create employee record → Auto-generate SKYT#### ID → Create user account → Assign department + position + manager → Set salary structure → Initialize leave balances (25 CL, 12 SL, 5 misc) → Send welcome email with temp password |
| UC-02 | **Update Employee** | Admin/HR, Employee | Edit profile fields → Field access control by role → Audit log created → Email sync if email changes → Manager assignment triggers team update |
| UC-03 | **Terminate Employee** | Admin/HR | Set status to 'Terminated' → Soft-delete employee → Deactivate user account → Salary structure persists for records |
| UC-04 | **Employee Self-Service** | Employee | View own profile → Update allowed fields (phone, address, emergency contact) → Upload photo → Rate-limited profile updates (20/15min) |
| UC-05 | **Organizational Hierarchy** | Admin/HR | Create departments → Create positions (with levels) → Assign department managers → Employee→Manager→Department chain |

### 9.2 Leave Management

| # | Use Case | Actors | Flow |
|---|----------|--------|------|
| UC-06 | **Apply for Leave** | Employee | Select leave type → Date range → Half-day option → Reason (10-500 chars) → System validates: balance check + overlap check + max 90 days → Status = Pending |
| UC-07 | **Approve/Reject Leave** | Manager/HR/Admin | View pending requests → Approve (balance deducted with row-level lock in transaction) OR Reject (requires comments) |
| UC-08 | **Cancel Leave** | Employee | Cancel pending (immediate) OR Cancel approved (creates Cancellation Request → Manager approves → Balance restored) |
| UC-09 | **Manage Leave Balances** | Admin/HR | View all balances → Bulk initialize for year → Adjust individual balances → Carry forward processing |
| UC-10 | **Leave Calendar** | All | View team/department leave calendar → Filter by date range (max 180 days) |

### 9.3 Timesheet Management

| # | Use Case | Actors | Flow |
|---|----------|--------|------|
| UC-11 | **Weekly Timesheet Entry** | Employee | Select project + task → Enter Mon-Sun hours (0-24/day, 0-168/week) → Save as Draft → Auto-save support |
| UC-12 | **Submit Timesheet** | Employee | Submit individual or bulk → Draft→Submitted → Week-wide submission supported |
| UC-13 | **Approve/Reject Timesheet** | Manager | View pending → Check hours → Approve (records approver + timestamp) OR Reject (requires comments → back to Draft) |
| UC-14 | **Bulk Timesheet Operations** | Manager/Admin | Bulk approve/reject multiple timesheets → Per-record error handling |
| UC-15 | **Timesheet Reporting** | Manager/Admin | Summary by employee/project/week → Total hours breakdown |

### 9.4 Payroll & Compensation

| # | Use Case | Actors | Flow |
|---|----------|--------|------|
| UC-16 | **Manage Salary Structure** | Admin/HR | Create/edit employee salary: basic salary + allowances (HRA, transport, medical, food, communication, special) + statutory deductions → Effective from date |
| UC-17 | **Calculate Payroll** | Admin/HR | Select employee + month/year → System calculates: prorate by attendance → EPF (12% on min(basic,₹15K)) → ESIC (0.75% if gross ≤ ₹21K) → PT (₹0/₹150/₹200 slab) → TDS (annualized, slab-based, old/new regime) → Preview before save |
| UC-18 | **Process Payroll** | Admin | Draft → Calculated → Approved → Paid workflow → Bulk approve supported |
| UC-19 | **Import/Export Payroll** | Admin/HR | CSV import (admin only) → CSV export for all payroll data |

### 9.5 Payslip Management

| # | Use Case | Actors | Flow |
|---|----------|--------|------|
| UC-20 | **Generate Payslips** | Admin/HR | Select employees + month/year → Validate (salary structure exists, no duplicates) → Calculate earnings/deductions → Apply template → Generate draft payslips |
| UC-21 | **Review & Edit Payslip** | Admin/HR | View draft → Edit requires reason (audit trail) → Version incrementing |
| UC-22 | **Finalize & Pay** | Admin/HR | Finalize (lock) → Mark as Paid → Batch operations supported |
| UC-23 | **Generate PDF** | Admin/HR/Employee | Download individual payslip as PDF → PDFKit with company branding + earnings/deductions table + net pay in words |
| UC-24 | **Export Reports** | Admin/HR | XLSX/CSV export → Summary reports with filtering |
| UC-25 | **Manage Templates** | Admin/HR | CRUD payslip templates → JSON-defined header/earnings/deductions/footer/styling → Set default template → Duplicate templates |

### 9.6 Performance Reviews

| # | Use Case | Actors | Flow |
|---|----------|--------|------|
| UC-26 | **Create Review** | Manager/HR/Admin | Select employee → Review type (quarterly/annual/probationary/PIP) → Rate 6 categories (1.0-5.0): technical, communication, teamwork, leadership, punctuality + overall |
| UC-27 | **Employee Self-Assessment** | Employee | Add self-assessment text → Goals → Achievements → Areas for improvement |
| UC-28 | **Review Approval** | HR/Admin | Review pending → HR approve → Status: draft → pending_employee_input → pending_approval → completed → archived |

### 9.7 Administration

| # | Use Case | Actors | Flow |
|---|----------|--------|------|
| UC-29 | **User Account Management** | Admin | Create/deactivate/lock users → Force password reset → Assign roles → Send welcome emails |
| UC-30 | **System Configuration** | Admin | View all config (with password re-auth) → Update .env at runtime → Backup before changes → Audit trail |
| UC-31 | **Email Configuration** | Admin | CRUD SMTP settings → Encrypted password storage (AES-256-GCM) → Test email → History & rollback |
| UC-32 | **Restore Soft-Deleted** | Admin | Restore deleted employees, reviews, leave balances, users |
| UC-33 | **Dashboard Analytics** | All | Employee: own stats → Manager: team stats → Admin: org-wide stats (5min cache) |
| UC-34 | **Audit Trail** | Admin | Immutable audit logs → Entity history → User activity tracking → Sensitive field redaction |

---

## 10. Security Architecture

### 10.1 Authentication & Session Management

| Mechanism | Implementation |
|-----------|---------------|
| Password Storage | bcrypt, 12 rounds |
| Password Complexity | 8+ chars, upper+lower+digit+special (on registration) |
| Access Token | JWT, 15min expiry, unique jti claim |
| Refresh Token | JWT, 7d expiry, stored in DB with IP/UA |
| Token Transport | httpOnly cookie (preferred) + Authorization header |
| Token Rotation | New refresh token on each refresh |
| Account Lockout | 5 failed attempts → 15-minute lockout |
| Login Rate Limiting | Per-IP (5/15min) + Per-username (10/1hr) + Distributed attack detection |
| Password Reset | JWT-based, 1hr expiry, one-time use, 3 attempts/15min |
| Sensitive Ops | Password re-authentication (system config) |

### 10.2 Authorization

| Layer | Mechanism |
|-------|-----------|
| Route-level | `authorize(roles)` middleware — role allowlist |
| Resource-level | `canAccessEmployee` — owner/manager/admin check |
| Field-level (request) | `enhancedFieldAccessControl` — strips restricted fields from input |
| Field-level (response) | `fieldAccessControl` — masks sensitive fields based on role |
| Sensitive Fields | Aadhaar, PAN, bank account, salary, UAN, PF, ESI masked as `***RESTRICTED***` |

### 10.3 Input Protection

| Protection | Implementation |
|-----------|---------------|
| Validation | 45+ Joi schemas, `stripUnknown: true` |
| UUID Validation | All `:id` params validated |
| SQL Injection | Sequelize parameterized queries + keyword blocking in DB service |
| File Upload | MIME type + extension check, 5MB limit, dangerous extension blocking |
| Body Size | 10MB limit |
| FK Integrity | DB-level validation before writes |

### 10.4 HTTP Security

| Header/Config | Implementation |
|--------------|---------------|
| CSP, HSTS, X-Frame, X-Content-Type | Helmet.js |
| CORS | Explicit origin whitelist |
| Rate Limiting | Tiered (general/auth/bulk/payroll/dashboard) |
| Request Tracing | UUID `X-Request-ID` per request |
| Error Responses | Structured JSON, no stack traces |
| Logging | Winston structured + Morgan access logs, 5MB rotation × 5 files |

---

## 11. Frontend Architecture

### 11.1 Project Structure

```
frontend/src/
├── api/                  # Service layer (API calls)
│   ├── http.js           # Axios instance + interceptors
│   ├── apiEndpoints.js   # Centralized endpoint config (largely unused)
│   └── apiService.js     # Generic CRUD wrapper
├── components/           # Shared UI components
│   ├── common/           # GenericDataTable, FormFields, ErrorBoundary
│   ├── dashboard/        # StatCard, DashboardCharts
│   ├── layout/           # MainLayout, Sidebar, Header
│   ├── payslips/         # PayslipPreview, PDF viewer
│   └── employees/        # EmployeeForm, EmployeeCard
├── contexts/             # React Context providers
│   ├── AuthContext.js     # Auth state + login/logout
│   ├── AppContext.js      # Global state (useReducer) — overlaps with React Query
│   ├── NotificationContext.js
│   └── ThemeContext.js
├── hooks/                # Custom React hooks
│   ├── useEmployees.js   # React Query hooks for employees
│   ├── useAuth.js        # Auth operations
│   └── ...
├── pages/                # Route-level page components
│   ├── auth/             # LoginPage, ForgotPassword
│   ├── dashboard/        # DashboardPage (role-dispatched)
│   ├── employees/        # EmployeeList, EmployeeDetail, EmployeeForm
│   ├── departments/      # DepartmentList, DepartmentForm
│   ├── positions/        # PositionList, PositionForm
│   ├── leave/            # LeaveList, LeaveForm, LeaveApproval, LeaveCalendar
│   ├── timesheets/       # TimesheetList, WeeklyTimesheet, TimesheetApproval
│   ├── payroll/          # PayrollList, PayrollForm, PayrollProcess
│   ├── payslips/         # PayslipList, PayslipGenerate, PayslipDetail
│   ├── salary/           # SalaryStructureList, SalaryStructureForm
│   ├── projects/         # ProjectList, ProjectForm
│   ├── tasks/            # TaskList, TaskForm
│   ├── reviews/          # ReviewList, ReviewForm, ReviewDashboard
│   ├── settings/         # SystemConfig, EmailConfig, PayslipTemplates
│   └── admin/            # UserManagement, AdminDebugPanel
├── services/             # Business logic services
│   ├── employeeService.js
│   ├── leaveService.js
│   ├── timesheetService.js
│   ├── payrollService.js
│   ├── payslipService.js  # ⚠️ Uses raw fetch instead of Axios
│   └── ...
├── utils/                # Helpers
│   ├── formatters.js     # Date, currency, number formatting
│   ├── validators.js     # Yup schemas
│   └── constants.js      # Role constants, status enums
├── App.js                # Route definitions + lazy loading
└── index.js              # Entry point
```

### 11.2 Screen Inventory (~30 routes)

| # | Screen | Route | Role Access | Key Fields |
|---|--------|-------|------------|------------|
| 1 | Login | `/login` | Public | email, password |
| 2 | Forgot Password | `/forgot-password` | Public | email |
| 3 | Reset Password | `/reset-password/:token` | Public | newPassword, confirmPassword |
| 4 | Dashboard | `/dashboard` | All (role-dispatched) | Stats cards, charts, recent activity |
| 5 | Employee List | `/employees` | Admin/HR/Manager | DataGrid: name, email, department, position, status |
| 6 | Employee Create | `/employees/new` | Admin/HR | Full form: personal, contact, statutory, bank, salary |
| 7 | Employee Detail | `/employees/:id` | RBAC | All fields (masked by role) |
| 8 | Employee Edit | `/employees/:id/edit` | RBAC | Same as create, role-limited fields |
| 9 | Department List | `/departments` | Admin/HR | DataGrid: name, code, manager, status |
| 10 | Department Form | `/departments/new` `/departments/:id/edit` | Admin/HR | name, code, description, parentDept, manager |
| 11 | Position List | `/positions` | Admin/HR | DataGrid: title, code, level, department |
| 12 | Position Form | `/positions/new` `/positions/:id/edit` | Admin/HR | title, code, level, department, salary range |
| 13 | My Leaves | `/leaves/my` | All | DataGrid: type, dates, status, days |
| 14 | Apply Leave | `/leaves/apply` | All | leaveType, startDate, endDate, halfDay, reason |
| 15 | Leave Approval | `/leaves/approval` | Manager+ | Pending list with approve/reject actions |
| 16 | Leave Calendar | `/leaves/calendar` | All | Month view with team leaves |
| 17 | Leave Balance | `/leaves/balance` | Admin/HR | Employee balances with adjustment |
| 18 | My Timesheets | `/timesheets` | All | Weekly grid: project, task, Mon-Sun hours |
| 19 | Weekly Entry | `/timesheets/weekly` | All | Full weekly timesheet form |
| 20 | Timesheet Approval | `/timesheets/approval` | Manager+ | Pending with approve/reject |
| 21 | Project List | `/projects` | Admin/Manager | DataGrid: name, client, status, dates |
| 22 | Task List | `/tasks` | All | DataGrid: name, project, assignee, status |
| 23 | Payroll List | `/payroll` | Admin/HR | DataGrid: employee, period, gross, net, status |
| 24 | Payslip List | `/payslips` | RBAC | DataGrid: employee, period, net pay, status |
| 25 | Payslip Generate | `/payslips/generate` | Admin/HR | Employee selection, month/year, template |
| 26 | Salary Structures | `/salary-structures` | Admin/HR | DataGrid: employee, basic, HRA, PF, effective date |
| 27 | Reviews | `/reviews` | RBAC | DataGrid: employee, type, ratings, status |
| 28 | System Settings | `/settings` | Admin | Company info, system config |
| 29 | Email Settings | `/settings/email` | Admin | SMTP config, test email |
| 30 | User Management | `/admin/users` | Admin | DataGrid: user, email, role, status, actions |

### 11.3 Frontend Patterns

| Pattern | Implementation | Status |
|---------|---------------|--------|
| **Routing** | React Router v6 + lazy loading | ✅ Good |
| **State Management** | React Query (server state) + AppContext (useReducer) | ⚠️ Overlap |
| **Forms** | React Hook Form + Yup validation | ✅ Good |
| **Data Tables** | MUI X DataGrid (virtualized) | ✅ Good |
| **Notifications** | Notistack (toast) | ✅ Good |
| **Error Handling** | ErrorBoundary + React Query error state | ✅ Good |
| **Auth** | AuthContext + Axios interceptor (401 → refresh) | ✅ Good |
| **RBAC** | Route guards + component-level role checks + sidebar filtering | ✅ Good |
| **HTTP Client** | 3 patterns (Axios instance, apiService, raw fetch) | ⚠️ Inconsistent |
| **Dates** | dayjs + date-fns (dual) | ⚠️ Should pick one |
| **Charts** | Recharts | ✅ Good |
| **Virtualization** | react-window for large lists | ✅ Good |

---

## 12. Cross-Layer Field Mapping

### 12.1 Employee Module — End-to-End

| Frontend Field | API Field | Model Field | DB Column | Validation |
|---|---|---|---|---|
| First Name | firstName | firstName | first_name | Joi: 2-50, letters+spaces |
| Last Name | lastName | lastName | last_name | Joi: 2-50, letters+spaces |
| Email | email | email | email | Joi: valid email, UNIQUE |
| Phone | phone | phone | phone | Joi: 10-15 digits |
| Employee ID | employeeId | employeeId | employee_id | Auto-generated SKYT#### |
| Date of Birth | dateOfBirth | dateOfBirth | date_of_birth | Joi: past, age ≥ 18 |
| Gender | gender | gender | gender | ENUM: Male/Female/Other |
| Department | departmentId | departmentId | department_id | UUID, FK validated |
| Position | positionId | positionId | position_id | UUID, FK validated |
| Manager | managerId | managerId | manager_id | UUID, FK validated |
| Hire Date | hireDate | hireDate | hire_date | Required, past date |
| Status | status | status | status | ENUM: Active/Inactive/On Leave/Terminated |
| Aadhaar Number | aadhaarNumber | aadhaarNumber | aadhaar_number | 12 digits |
| PAN Number | panNumber | panNumber | pan_number | XXXXX9999X pattern |
| Bank Account | bankAccountNumber | bankAccountNumber | bank_account_number | Max 20 chars |
| IFSC Code | ifscCode | ifscCode | ifsc_code | XXXX0XXXXXX pattern |
| Salary (JSON) | salary | salary | salary | Complex nested: basic, allowances, deductions |

### 12.2 Payslip Module — End-to-End

| Frontend Field | API Field | Calculation | DB Column |
|---|---|---|---|
| Basic Salary | earnings.basic | prorated(basicSalary × payableDays/workingDays) | earnings(JSON) |
| HRA | earnings.hra | 50% of basic (default) or salary.allowances.hra | earnings(JSON) |
| Transport | earnings.transport | From salary.allowances.transport | earnings(JSON) |
| Medical | earnings.medical | From salary.allowances.medical | earnings(JSON) |
| EPF | deductions.pf | 12% × min(basic, ₹15,000) | deductions(JSON) |
| ESIC | deductions.esic | 0.75% if gross ≤ ₹21,000 | deductions(JSON) |
| Professional Tax | deductions.pt | ₹0/₹150/₹200 (slab) | deductions(JSON) |
| TDS | deductions.tds | Annualized slab calc | deductions(JSON) |
| Gross Earnings | grossEarnings | Sum of all earnings | gross_earnings |
| Total Deductions | totalDeductions | Sum of all deductions | total_deductions |
| Net Pay | netPay | gross - deductions | net_pay |
| Net Pay in Words | netPayInWords | numberToWords(netPay) | net_pay_in_words |

---

## 13. Gap Analysis & Issues

### 13.1 🔴 CRITICAL Issues (12)

| # | Category | Issue | Impact | Fix Effort |
|---|----------|-------|--------|------------|
| C01 | **DB Model** | `PayslipAuditLog` model broken — wrong table name (`PayslipAuditLogs` vs `payslip_audit_logs`), wrong FK types (INTEGER vs UUID), wrong FK references (PascalCase vs lowercase) | **Runtime crash** on any payslip audit operation | Low — fix 4 lines in model |
| C02 | **Security** | Debug routes (`/api/debug/*`) have **zero authentication** — including SQL console. Gated only by `NODE_ENV !== 'production'` | Complete DB access if env misconfigured | Low — add `authenticateToken` + `authorize('admin')` |
| C03 | **Security** | System config endpoint returns JWT_SECRET, DB_PASSWORD, SMTP_PASSWORD in plaintext via `POST /api/system-config/view` | Full secret exposure from compromised admin session | Medium — mask sensitive values |
| C04 | **Security** | `changePassword` stores both old and new **password hashes** in AuditLog metadata | Hash exposure if audit DB compromised | Low — remove hashes from metadata |
| C05 | **Security** | JWT secret has insecure fallback: `'test-secret-key-do-not-use-in-production'` in `auth.config.js` | Trivially forgeable tokens if env var missing | Low — throw error if not set |
| C06 | **Frontend** | `payslipService.js` uses raw `fetch()` instead of shared Axios instance — bypasses auth interceptor and token refresh | Payslip operations may fail silently on token expiry | Low — switch to `http` instance |
| C07 | **Frontend** | `EmailConfiguration.js` imports raw `axios` instead of configured `http` instance | Email config calls bypass auth interceptor | Low — switch to `http` instance |
| C08 | **Frontend** | Leave balance is **hardcoded** to 25/12/5 days instead of fetched from API | Incorrect balance displayed to employees | Medium — fetch from `/api/leave/balance` |
| C09 | **API** | Route ordering bug: `/api/leave/meta/types` and `/api/leave/meta/balance` registered after `/:id` — Express matches `meta` as UUID param | 400 "Invalid UUID" for meta endpoints | Low — reorder routes |
| C10 | **API** | `POST /api/timesheets/bulk-save` and `PUT /api/timesheets/bulk-update` are **stubs** — push to results array but never save/update DB | Data loss — users think data is saved | Medium — implement or remove |
| C11 | **Security** | `CORS_ALLOW_ALL=true` env var bypasses all origin checks | Any website can make authenticated API calls | Low — remove or restrict to dev |
| C12 | **API** | Duplicate `/api/health` endpoint — second definition leaks `dbHost`, `dbPort`, `dbName` | Sensitive info in health response | Low — remove duplicate |

### 13.2 🟠 HIGH Issues (14)

| # | Category | Issue | Impact |
|---|----------|-------|--------|
| H01 | **Validation** | Admin user management endpoints (`/auth/users/:id/*`) missing validation — no password complexity, email format, role enum, boolean checks | Admin can set invalid data |
| H02 | **Auth** | Employee review routes use Title Case roles (`'Admin'`, `'HR'`) while JWT stores lowercase (`'admin'`, `'hr'`) | RBAC failures — 403 for legitimate users |
| H03 | **Auth** | Leave DELETE endpoint allows any non-employee role to delete any leave request (intended admin-only) | Managers can delete others' leave requests |
| H04 | **Auth** | No rate limiting on `POST /api/auth/forgot-password` at route level (only global) | Email flooding attack vector |
| H05 | **Security** | No CSRF protection despite cookie-based auth (no SameSite attribute set) | Cross-site request forgery vulnerable |
| H06 | **DB** | `AuditLog.userId` onDelete mismatch — model says RESTRICT, migration says SET NULL | User deletion orphans critical audit records |
| H07 | **DB** | No uniqueness constraint on `salary_structures.employeeId` — despite `hasOne` association | Multiple active salary structures per employee |
| H08 | **DB** | 15 model-defined indexes missing from migration (won't exist in DB since project uses migrations, not sync) | Missing query performance optimization |
| H09 | **Frontend** | Admin debug panel exposes powerful DB/system endpoints — no production guard in frontend | Users could discover/use debug API via dev tools |
| H10 | **API** | Performance `api-metrics` endpoint returns **fake random data** | Misleading operational monitoring |
| H11 | **Validation** | Duplicate validation systems — `validation.js` (min 6 password) vs `auth.validator.js` (min 8 + complexity) | Inconsistent password requirements |
| H12 | **Auth** | Inconsistent auth middleware imports — some routes use `auth.js`, others `auth.simple.js` | Potentially different token handling |
| H13 | **Frontend** | `numberToWords()` in PayslipTemplate.js is a stub handling only 2 values | Incorrect net pay in words on payslips |
| H14 | **Security** | Uploads directory served with `Access-Control-Allow-Origin: *` | Employee photos accessible from any domain |

### 13.3 🟡 MEDIUM Issues (18)

| # | Issue |
|---|-------|
| M01 | Rate limiting is CONDITIONAL (`RATE_LIMIT_ENABLED=true`) — no protection if not explicitly enabled |
| M02 | Enhanced security middleware (`enhancedSecurity.js`) AuditLog calls are all commented out — non-functional |
| M03 | In-memory rate limiting (Maps) not suitable for PM2 cluster mode ×2 (needs Redis) |
| M04 | `timesheetQuerySchema` allows `limit: max 10000` — potential excessive data retrieval |
| M05 | 10MB body size limit is generous for a non-file-upload JSON API |
| M06 | `payslip_templates` and `projects` have no unique constraint on `name` |
| M07 | No CHECK constraints at DB level for date ranges (`endDate >= startDate`) |
| M08 | No CHECK constraints at DB level for rating values (1.0-5.0) in `employee_reviews` |
| M09 | Frontend uses dual date libraries (`dayjs` + `date-fns`) — unnecessary bundle bloat |
| M10 | Frontend `AppContext` (useReducer) overlaps with React Query caching — dual source of truth |
| M11 | Centralized `apiEndpoints.js` config is largely unused by service files |
| M12 | Leave request `startDate` validation inconsistency — one validator requires future, other allows past |
| M13 | `AuditLog.action` ENUM has duplicate semantics (lowercase + UPPERCASE variants) |
| M14 | PayrollData uses INTEGER PK while all other tables use UUID — inconsistent across system |
| M15 | Missing pagination on GET `/departments`, `/positions`, `/projects`, `/tasks` |
| M16 | Inconsistent response formats — `ApiResponse.success()` vs raw `res.json()` vs `{message}` |
| M17 | Admin email config route defined twice — second shadows first |
| M18 | Leave request `approvedBy` references `employees.id` but payroll `approvedBy` references `users.id` — inconsistent FK targets |

### 13.4 🟢 LOW Issues (10)

| # | Issue |
|---|-------|
| L01 | Console.log statements throughout middleware (should use structured logger) |
| L02 | Password reset tokens stored in-memory Set/Map — lost on restart |
| L03 | Catch-all handler is GET-only — POST/PUT/DELETE to unknown paths get default Express 404 |
| L04 | `BaseService.js` has duplicate return statement (dead code) |
| L05 | Debug routes enabled for non-`'production'` envs including staging |
| L06 | AuditLog `updatedAt` column created in DB but model sets `updatedAt: false` |
| L07 | Payslip `companyInfo` is NOT NULL but `generateBulkPayslips()` may not populate it |
| L08 | SQL dangerous keyword blocklist doesn't cover GRANT, REVOKE, COPY, EXPLAIN |
| L09 | Frontend has 3 different HTTP client patterns |
| L10 | `config.json` still has development password `"admin"` committed to repo |

### 13.5 Missing Features / Business Gaps

| # | Gap | Description | Priority |
|---|-----|-------------|----------|
| G01 | **Attendance Module** | No dedicated attendance system — payroll relies on manual working days input | High |
| G02 | **Leave Accrual Automation** | Leave balances manually initialized — no monthly/quarterly auto-accrual | High |
| G03 | **Email Notifications** | Welcome email + password reset exist but no leave/timesheet/payslip notifications | Medium |
| G04 | **Document Management** | No employee document upload/storage (offer letters, ID proofs, certificates) | Medium |
| G05 | **Announcement/Notice Board** | No company-wide communication feature | Low |
| G06 | **Holiday Calendar** | No holiday management — holidays field in payroll_data is manual | Medium |
| G07 | **Shift Management** | No shift/schedule tracking despite timesheet hours | Low |
| G08 | **Expense Management** | No expense claims/reimbursement module | Low |
| G09 | **Training/Certification Tracking** | No learning management or certification tracking | Low |
| G10 | **Multi-Company/Branch** | Single company — no multi-company/branch support | Low |
| G11 | **Workflow Engine** | All approvals are 1-level (manager/HR) — no multi-level approval workflow | Medium |
| G12 | **Report Builder** | Reports are hardcoded — no dynamic/custom report generation | Medium |
| G13 | **Mobile App / PWA** | No mobile-optimized experience | Medium |
| G14 | **SSO / OAuth** | Only email/password — no Google/Microsoft/SAML SSO | Low |
| G15 | **2FA / MFA** | No two-factor authentication option | Medium |
| G16 | **API Versioning** | No `/v1/` prefix — breaking changes cannot be managed | Low |
| G17 | **WebSocket/Real-time** | No real-time notifications — polling only | Low |
| G18 | **Data Export (GDPR)** | No employee data export/purge for compliance | Medium |

---

## 14. Recommendations

### 14.1 Immediate Fixes (Priority 1 — Do Now)

| # | Action | Effort |
|---|--------|--------|
| 1 | Fix `PayslipAuditLog` model — correct tableName, FK types, FK references | 30 min |
| 2 | Add auth middleware to debug routes (`authenticateToken` + `authorize('admin')`) | 15 min |
| 3 | Mask sensitive values in system-config view endpoint | 30 min |
| 4 | Remove password hashes from audit log metadata in `changePassword` | 15 min |
| 5 | Replace JWT secret fallback with `throw new Error()` in production | 10 min |
| 6 | Fix `payslipService.js` — replace `fetch()` with `http` instance | 15 min |
| 7 | Fix `EmailConfiguration.js` — replace raw `axios` with `http` instance | 10 min |
| 8 | Reorder leave routes — move `/meta/*` before `/:id` | 15 min |
| 9 | Implement or remove timesheet `bulk-save`/`bulk-update` stubs | 1 hour |
| 10 | Remove `CORS_ALLOW_ALL` bypass or restrict to development | 10 min |
| 11 | Remove duplicate `/api/health` endpoint | 10 min |
| 12 | Fix employee review roles to lowercase | 15 min |

**Total Priority 1 effort: ~4 hours**

### 14.2 Short-Term Improvements (Priority 2 — This Sprint)

| # | Action | Effort |
|---|--------|--------|
| 1 | Add validation to admin user management endpoints | 2 hours |
| 2 | Add CSRF protection (SameSite=Strict cookies or CSRF tokens) | 2 hours |
| 3 | Add rate limiting on forgot-password endpoint | 30 min |
| 4 | Fix AuditLog.userId onDelete to RESTRICT in migration | 30 min |
| 5 | Add unique constraint on salary_structures.employeeId | 30 min |
| 6 | Create missing 15 indexes in a new migration | 1 hour |
| 7 | Consolidate validation systems (keep modular `validators/` ) | 3 hours |
| 8 | Standardize response format across all routes | 4 hours |
| 9 | Fetch leave balance from API instead of hardcoding in frontend | 2 hours |
| 10 | Implement proper `numberToWords()` for payslip templates | 1 hour |
| 11 | Remove `Access-Control-Allow-Origin: *` from uploads | 15 min |
| 12 | Add missing pagination to department/position/project/task list endpoints | 2 hours |

**Total Priority 2 effort: ~18 hours**

### 14.3 Medium-Term Architecture (Priority 3 — Next Quarter)

| # | Action |
|---|--------|
| 1 | Migrate in-memory rate limiting to Redis for PM2 cluster support |
| 2 | Implement attendance module with biometric/check-in integration points |
| 3 | Build automated leave accrual (monthly credit with configurable rules) |
| 4 | Add email notifications for leave approval, timesheet reminders, payslip generation |
| 5 | Build holiday calendar management |
| 6 | Add document management (S3/local storage for employee documents) |
| 7 | Implement 2FA/MFA for admin accounts |
| 8 | Add API versioning (`/api/v1/`) |
| 9 | Unify frontend HTTP client to single pattern |
| 10 | Pick one date library (dayjs — smaller bundle) |
| 11 | Implement comprehensive E2E test suite |
| 12 | Add data export/purge for GDPR compliance |

---

## Appendix A: File Inventory

### Backend (Key Files)

| Category | Count | Location |
|----------|:-----:|----------|
| Route files | 24 | `backend/routes/` |
| Controller files | 8 | `backend/controllers/` |
| Model files | 19 | `backend/models/` |
| Service files | 31 | `backend/services/` + sub-dirs |
| Middleware files | 16 | `backend/middleware/` |
| Validator files | 7 | `backend/middleware/validators/` |
| Config files | 7 | `backend/config/` |
| Migration | 1 | `backend/migrations/` |
| Seeder | 1 | `backend/seeders/` |
| Entry point | 1 | `backend/server.js` |

### Frontend (Key Files)

| Category | Count | Location |
|----------|:-----:|----------|
| Page components | ~30 | `frontend/src/pages/` |
| Shared components | ~40 | `frontend/src/components/` |
| Service files | ~15 | `frontend/src/services/` + `src/api/` |
| Context providers | 4 | `frontend/src/contexts/` |
| Custom hooks | ~10 | `frontend/src/hooks/` |
| Utility files | ~8 | `frontend/src/utils/` |

---

## Appendix B: Indian Statutory Calculation Reference

### EPF (Employee Provident Fund)
- **Employee contribution:** 12% of min(basic salary, ₹15,000)
- **Employer contribution:** 12% (8.33% to EPS + 3.67% to EPF)
- **Wage ceiling:** ₹15,000/month

### ESIC (Employee State Insurance)
- **Employee contribution:** 0.75% of gross salary
- **Employer contribution:** 3.25% of gross salary
- **Applicability:** Gross salary ≤ ₹21,000/month

### Professional Tax (Maharashtra/Tamil Nadu rates)
- Monthly salary ≤ ₹21,000: ₹0
- Monthly salary ₹21,001 – ₹25,000: ₹150
- Monthly salary > ₹25,000: ₹200
- **Annual cap:** ₹2,500

### TDS (Tax Deducted at Source) — FY 2025-26
**Old Regime:**
- Up to ₹2,50,000: NIL
- ₹2,50,001 – ₹5,00,000: 5%
- ₹5,00,001 – ₹10,00,000: 20%
- Above ₹10,00,000: 30%
- **Standard deduction:** ₹50,000

**New Regime:**
- Up to ₹3,00,000: NIL
- ₹3,00,001 – ₹7,00,000: 5%
- ₹7,00,001 – ₹10,00,000: 10%
- ₹10,00,001 – ₹12,00,000: 15%
- ₹12,00,001 – ₹15,00,000: 20%
- Above ₹15,00,000: 30%

---

## Appendix C: Environment Variables Reference

| Variable | Required | Default | Purpose |
|----------|:--------:|---------|---------|
| `NODE_ENV` | Yes | development | Environment mode |
| `PORT` | No | 5000 | Server port |
| `DB_HOST` | Yes | localhost | PostgreSQL host |
| `DB_PORT` | No | 5432 | PostgreSQL port |
| `DB_NAME` | Yes | — | Database name |
| `DB_USER` | Yes | postgres | Database user |
| `DB_PASSWORD` | Yes | — | Database password |
| `JWT_SECRET` | Yes | ⚠️ fallback | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | ⚠️ fallback | Refresh token signing key |
| `CORS_ORIGIN` | No | localhost:3000 | Allowed origins |
| `CORS_ALLOW_ALL` | No | false | ⚠️ Bypass origin check |
| `RATE_LIMIT_ENABLED` | No | false | Enable rate limiting |
| `RATE_LIMIT_MAX` | No | 300 | Max requests per window |
| `SMTP_HOST` | No | — | SMTP server |
| `SMTP_PORT` | No | — | SMTP port |
| `SMTP_USER` | No | — | SMTP user |
| `SMTP_PASSWORD` | No | — | SMTP password |
| `SMTP_SECURE` | No | false | Use TLS |
| `EMAIL_FROM` | No | — | Sender email |
| `UPLOAD_DIR` | No | uploads/ | File upload directory |

---

*End of Document*

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-09 | Architecture Audit | Initial comprehensive audit |
