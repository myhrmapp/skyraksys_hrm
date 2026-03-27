# SkyrakSys HRM — Data Flow & Integration

> **Document Owner**: Integration Architect  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: Full-stack developers, system integrators

---

## 1. System Integration Map

```
┌──────────────────┐         ┌──────────────────┐
│   React Frontend │         │ Admin Debug Panel │
│   (Port 3000)    │         │   (Port 8080)    │
│   Webpack Dev    │         │   Python HTTP     │
└────────┬─────────┘         └────────┬─────────┘
         │  HTTPS / HTTP              │  HTTP (dev only)
         │  httpOnly Cookies          │  REST API
         ▼                            ▼
┌───────────────────────────────────────────────┐
│              Nginx Reverse Proxy               │
│         (Port 80/443 in production)            │
│   /api/* → backend:5000                        │
│   /*     → frontend static build               │
└─────────────────────┬─────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────┐
│            Express Backend (Port 5000)         │
│  ┌─────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ Routes  │→│Middleware │→│ Controllers    │ │
│  └─────────┘ └──────────┘ └───────┬────────┘ │
│                                    │          │
│  ┌─────────────────────────────────▼────────┐ │
│  │         Business Services                 │ │
│  │  (RBAC, transactions, validation)         │ │
│  └─────────────────────┬────────────────────┘ │
│                        │                      │
│  ┌─────────────────────▼────────────────────┐ │
│  │         Data Services / Sequelize ORM     │ │
│  └─────────────────────┬────────────────────┘ │
└────────────────────────┼──────────────────────┘
                         │
                         ▼
              ┌───────────────────┐
              │  PostgreSQL 15+   │
              │  (Port 5432)      │
              └───────────────────┘
```

---

## 2. Request Lifecycle

### 2.1 Complete Request Flow

```
Browser                Nginx           Express              Business           Database
  │                      │                 │                     │                  │
  ├─ HTTP Request ──────→│                 │                     │                  │
  │                      ├─ Proxy ────────→│                     │                  │
  │                      │                 ├─ Helmet ────────┐   │                  │
  │                      │                 ├─ XSS Sanitize ──┤   │                  │
  │                      │                 ├─ HPP ───────────┤   │                  │
  │                      │                 ├─ CORS ──────────┤   │                  │
  │                      │                 ├─ Rate Limiter ──┤   │                  │
  │                      │                 ├─ Body Parse ────┤   │                  │
  │                      │                 ├─ Cookie Parse ──┤   │                  │
  │                      │                 ├─ Request ID ────┤   │                  │
  │                      │                 ├─ Morgan Log ────┤   │                  │
  │                      │                 ├─ Auth Token ────┤   │                  │
  │                      │                 ├─ Authorize ─────┤   │                  │
  │                      │                 ├─ Validate ──────┘   │                  │
  │                      │                 │                     │                  │
  │                      │                 ├─ Controller ───────→│                  │
  │                      │                 │                     ├─ RBAC Check ─┐   │
  │                      │                 │                     ├─ Transaction─┤   │
  │                      │                 │                     │              │   │
  │                      │                 │                     ├─ Query ─────→├──→│
  │                      │                 │                     │              │   │
  │                      │                 │                     │←── Results ──┤←──│
  │                      │                 │                     ├─ Commit ────┘   │
  │                      │                 │←─ Response ─────────│                  │
  │                      │←─ JSON ─────────│                     │                  │
  │←─ Response ──────────│                 │                     │                  │
```

### 2.2 Authentication Flow Detail

```
┌─ Login ─────────────────────────────────────────────────┐
│                                                          │
│  POST /api/auth/login                                    │
│    │                                                     │
│    ├─ [validate] loginSchema (email, password)           │
│    ├─ [rate-limiter] checkRateLimit (IP + user)          │
│    ├─ [auth-service] authenticate()                      │
│    │    ├─ User.findOne({ email })                       │
│    │    ├─ Check lockout (lockoutUntil > now?)           │
│    │    ├─ bcrypt.compare(password, hash)                │
│    │    ├─ If fail: increment failedLoginAttempts        │
│    │    │   If ≥5: set lockoutUntil = +15min             │
│    │    ├─ If success: reset failedLoginAttempts         │
│    │    ├─ Generate access token (15min, JTI)            │
│    │    ├─ Generate refresh token (7d, JTI)              │
│    │    ├─ Store refresh token in DB                     │
│    │    └─ Log auth event                                │
│    │                                                     │
│    └─ Set-Cookie: accessToken, refreshToken (httpOnly)   │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ Silent Refresh ────────────────────────────────────────┐
│                                                          │
│  axios 401 interceptor → POST /api/auth/refresh-token   │
│    │                                                     │
│    ├─ Read refreshToken from cookie                      │
│    ├─ Verify JWT signature                               │
│    ├─ Find refresh token in DB (not revoked, not expired)│
│    ├─ Revoke old refresh token                           │
│    ├─ Issue new access + refresh pair                    │
│    ├─ Set new cookies                                    │
│    └─ Retry all queued 401 requests                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Data Transformation Pipeline

### 3.1 Employee Create — Full Transaction

```
Frontend Form                API Request              Backend Processing
┌──────────────┐            ┌──────────┐            ┌─────────────────────────┐
│ Step 1:      │            │ POST /api│            │ Transaction Start        │
│ Personal Info│───JSON───→ │/employees│───────────→│                          │
│ Step 2:      │            │          │            │ 1. Create User           │
│ Employment   │            │ Body:    │            │    (hash password)       │
│ Step 3:      │            │ {        │            │ 2. Generate Employee ID  │
│ Compensation │            │  first,  │            │    (SKYT0042, with lock) │
│              │            │  last,   │            │ 3. Create Employee       │
│ Photo Upload │            │  email,  │            │    (link to User)        │
│ (multipart)  │            │  dept,   │            │ 4. Map Salary Structure  │
└──────────────┘            │  pos,    │            │    (nested → flat)       │
                            │  salary: │            │ 5. Create SalaryStructure│
                            │  {...}   │            │ 6. Init LeaveBalances    │
                            │ }        │            │    (12 types × 1 year)   │
                            └──────────┘            │ 7. Commit                │
                                                    └─────────────────────────┘
```

### 3.2 Salary Data Transformation

**Frontend → API** (nested JSON):
```json
{
  "salary": {
    "basicSalary": 85000,
    "allowances": { "hra": 34000, "other": 12500 },
    "deductions": { "pf": 1800, "esi": 750, "incomeTax": 5000, "professionalTax": 200 },
    "currency": "INR",
    "effectiveFrom": "2026-01-01"
  }
}
```

**Backend Mapping** (`EmployeeBusinessService.prepareSalaryStructureData()`):
```
salary.basicSalary           → basicSalary: 85000
salary.allowances.hra        → hra: 34000
salary.allowances.other      → allowances: 12500
salary.deductions.pf         → pfContribution: 1800
salary.deductions.esi        → esi: 750
salary.deductions.incomeTax  → tds: 5000
salary.deductions.professionalTax → professionalTax: 200
salary.currency              → currency: "INR"
salary.effectiveFrom         → effectiveFrom: "2026-01-01"
```

**Database → API** (`Employee.afterFind` hook):
```json
{
  "salary": {
    "basicSalary": 85000,
    "allowances": { "hra": 34000, "other": 12500 },
    "deductions": { "pf": 1800, "esi": 750, "incomeTax": 5000, "professionalTax": 200 },
    "currency": "INR",
    "effectiveFrom": "2026-01-01"
  }
}
```

The `afterFind` hook on the Employee model reads the associated SalaryStructure and maps flat DB columns back to the nested JSON format for API consumers.

---

## 4. Caching Strategy

### 4.1 Server-Side (CacheService)

```javascript
// In-memory cache with TTL
CacheService.getOrSet('dashboard:admin', () => expensiveQuery(), 5 * 60 * 1000);
CacheService.invalidate('dashboard:*');    // Wildcard invalidation
CacheService.getStats();                    // { hits, misses, hitRate }
```

| Cache Key | TTL | Invalidation |
|-----------|-----|-------------|
| `dashboard:admin` | 5 min | Employee/leave/payroll changes |
| `dashboard:manager:{id}` | 5 min | Team member changes |
| `holidays:{year}` | 30 min | Holiday CRUD |
| `leaveTypes:active` | 30 min | Leave type changes |

### 4.2 Client-Side (TanStack React Query)

```javascript
// Global settings
staleTime: 5 * 60 * 1000    // 5 min — data considered fresh
gcTime: 10 * 60 * 1000      // 10 min — cache garbage collected
retry: (count, err) => count < 3 && err.status >= 500  // Only retry 5xx
refetchOnWindowFocus: false  // No invisible refetches
```

| Query Key | Stale Time | Cache Time | Invalidation |
|-----------|-----------|-----------|-------------|
| `['employees', filters]` | 5 min | 10 min | On create/update/delete mutation |
| `['employee', id]` | 5 min | 10 min | On update mutation |
| `['leaveRequests', filters]` | 5 min | 10 min | On create/approve/reject |
| `['timesheets', filters]` | 5 min | 10 min | On create/submit/approve |
| `['dashboard-stats']` | 5 min | 10 min | On any entity change |

---

## 5. Error Propagation

```
Database Error
  ↓ Sequelize wraps → SequelizeValidationError / UniqueConstraintError
  ↓ Service catches → rethrows as AppError subclass
  ↓ Controller catches → passes to next(error)
  ↓ Error handler formats → { success: false, message, errors[], timestamp }
  ↓ HTTP response → 4xx or 5xx JSON
  ↓ Axios interceptor → normalizeError(error)
  ↓ React Query / useApiCall → error state
  ↓ Component → shows error notification or error boundary
```

### Error Handler Translation Table

| Source Error | HTTP Status | Response Message |
|-------------|-------------|-----------------|
| `ValidationError` | 400 | Field-level errors array |
| `BadRequestError` | 400 | Descriptive message |
| `UnauthorizedError` | 401 | "Authentication required" |
| `ForbiddenError` | 403 | "Insufficient permissions" |
| `NotFoundError` | 404 | "Resource not found" |
| `ConflictError` | 409 | "Resource already exists" |
| `SequelizeValidationError` | 400 | Validation errors array |
| `SequelizeUniqueConstraintError` | 409 | "Duplicate entry" |
| `SequelizeForeignKeyConstraintError` | 400 | "Referenced record not found" |
| `JsonWebTokenError` | 401 | "Invalid token" |
| `TokenExpiredError` | 401 | "Token expired" |
| Unhandled | 500 | "Internal server error" |

---

## 6. Key Data Flows

### 6.1 Payroll Processing Flow

```
1. Admin selects pay period (e.g., "2026-03") + employees
2. POST /api/payroll/calculate
   ├─ For each employee:
   │   ├─ Get SalaryStructure (basicSalary, hra, allowances, deductions)
   │   ├─ Get Attendance (present days, absent days, LOP)
   │   ├─ Get Holidays (working day count)
   │   ├─ Calculate proration (if mid-month join/exit)
   │   ├─ Calculate EPF (12% basic, cap ₹15k)
   │   ├─ Calculate ESI (0.75% if gross ≤ ₹21k)
   │   ├─ Calculate PT (state slab)
   │   ├─ Calculate TDS (YTD projection)
   │   ├─ Gross = Basic + HRA + Allowances + Variable
   │   ├─ Deductions = PF + ESI + PT + TDS + Loan + Other
   │   └─ Net = Gross - Deductions
   └─ Create/update PayrollData records (status: calculated)

3. Admin reviews → POST /api/payroll/:id/approve → status: approved
4. Admin processes → POST /api/payroll/:id/process → status: paid
5. Generate payslips → POST /api/payroll/:id/payslip
   ├─ Snapshot employee info + company info
   ├─ Create Payslip record
   └─ Generate PDF (PDFKit or Puppeteer)
```

### 6.2 Leave Request Flow

```
1. Employee submits leave request
   POST /api/leave → LeaveRequest (status: Pending)

2. Manager views pending queue
   GET /api/leave/pending-for-manager → filtered by managerId

3. Manager approves
   PATCH /api/leave/:id/approve
   ├─ Transaction start
   ├─ Lock LeaveBalance row (SELECT FOR UPDATE)
   ├─ Validate: available ≥ requested days
   ├─ Update LeaveRequest (status: Approved, approvedBy)
   ├─ Update LeaveBalance (totalTaken += days)
   └─ Transaction commit

4. If cancellation after approval:
   POST /api/leave/:id/cancel → status: Cancellation Requested
   POST /api/leave/:id/approve-cancellation
   ├─ Update LeaveRequest (status: Cancelled)
   └─ Restore balance (totalTaken -= days)
```

### 6.3 Dashboard Aggregation

```
GET /api/dashboard/admin-stats
  ├─ Parallel queries (Promise.all):
  │   ├─ Employee.count({ status: 'Active' })
  │   ├─ LeaveRequest.count({ status: 'Pending' })
  │   ├─ Timesheet.count({ status: 'Submitted' })
  │   ├─ Payslip.count({ status: 'generated' })
  │   ├─ Employee.count({ group: 'departmentId' }) → dept chart
  │   ├─ LeaveRequest.count({ group: 'leaveTypeId' }) → leave chart
  │   └─ Attendance summary for today
  ├─ Cache result (5 min TTL)
  └─ Return aggregated stats
```

---

## 7. File Movement

### Upload Flow

```
Browser → multipart/form-data → Multer → validateMagicBytes → store in /uploads/
                                              │
                                    Save relative path to Employee.photoUrl
```

### PDF Generation Flow

```
Payslip data → payslipPdfGenerator (Puppeteer)
  ├─ Build HTML from template + data
  ├─ Render with Puppeteer headless browser
  ├─ Generate PDF buffer
  └─ Stream to response (application/pdf)

OR

Payslip data → payslipGenerator (PDFKit)
  ├─ Build PDF using PDFKit API
  ├─ Add header, earnings table, deductions table, summary
  └─ Buffer → response
```

---

## 8. Scheduled Jobs (Cron)

| Job | Schedule | Flow |
|-----|----------|------|
| Monthly Leave Accrual | 1st of month, 00:05 | `LeaveAccrualService.runMonthlyAccrual()` → Credit `maxDays/12` to each active employee's balance |
| Year-End Carry Forward | Jan 1, 00:00 | `LeaveAccrualService.runYearEndCarryForward()` → Calculate carry-forward (respecting max), create new year balances |
| Token Cleanup | Daily, 02:00 | Purge expired refresh tokens + blacklist entries |

---

## 9. External Integrations

| System | Integration | Status |
|--------|------------|--------|
| SMTP (Email) | Nodemailer | ✅ Active |
| PostgreSQL | Sequelize ORM | ✅ Active |
| PDF Generation | PDFKit + Puppeteer | ✅ Active |
| Excel Export | xlsx library | ✅ Active |
| CSV Import/Export | payrollController | ✅ Active |
| Docker | Compose (3 containers) | ✅ Active |
| Nginx | Reverse proxy | ✅ Active |
| PM2 | Process manager | ✅ Active |

No external SaaS integrations (API gateways, payment processors, etc.) — the system is self-contained.

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
