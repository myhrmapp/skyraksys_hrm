# SkyrakSys HRM — Architecture & Design

> **Document Owner**: Solution Architect  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: Architects, senior developers, tech leads

---

## 1. Architectural Style

SkyrakSys HRM follows a **layered monolithic** architecture with clear separation of concerns, designed for single-team development with a path to decomposition if needed.

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                              │
│  React SPA · Material-UI · TanStack Query · Axios               │
│  Runs in the user's browser                                     │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTPS / REST (JSON)
┌───────────────────────────┴────────────────────────────────────┐
│                        API TIER                                 │
│  Express.js · 19-step middleware pipeline · JWT auth             │
│  27 route files · ~238 endpoints · Joi validation               │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────────────┐
│                     SERVICE TIER                                │
│  Business Services · Data Services · Base Service               │
│  Domain logic · Workflow engines · Validation rules             │
└───────────────────────────┬────────────────────────────────────┘
                            │ Sequelize ORM
┌───────────────────────────┴────────────────────────────────────┐
│                      DATA TIER                                  │
│  PostgreSQL 15+ · 22 tables · UUID PKs · Soft deletes           │
│  Migrations · Indexes · Foreign keys                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Responsibilities

### 2.1 Presentation Layer (Frontend)

| Concern | Implementation |
|---------|---------------|
| Rendering | React 18 with functional components & hooks |
| State management | TanStack Query for server state; React Context for auth/loading/notifications |
| Routing | React Router 6 with role-based guards |
| Forms | React Hook Form + Yup validation |
| API communication | Axios with interceptors (401 → silent refresh) |
| Error handling | ErrorBoundary + global notification system |

### 2.2 API Layer (Routes + Controllers)

| Concern | Implementation |
|---------|---------------|
| HTTP handling | Express route handlers (thin controllers) |
| Request validation | Joi schemas via `validate()` middleware |
| Authentication | JWT token verification via `authenticateToken()` |
| Authorization | Role check via `authorize(['admin', 'hr'])` |
| Field-level access | `enhancedFieldAccessControl` middleware |
| Rate limiting | Per-route rate limiters (login, bulk ops, password) |
| Response format | Standardized `ApiResponse` utility |

### 2.3 Service Layer (Business Logic)

#### Service Hierarchy

```
BaseService                          BaseBusinessService
    │                                       │
    ├── AuthService                         ├── EmployeeBusinessService
    ├── EmployeeService                     ├── LeaveBusinessService
    ├── LeaveService                        ├── TimesheetBusinessService
    ├── TimesheetService                    └── PayrollBusinessService
    ├── PayrollService
    ├── DashboardService
    ├── CacheService
    └── AuditService

Data Services (pure CRUD)
    ├── EmployeeDataService
    ├── UserDataService
    ├── SalaryDataService
    └── LeaveBalanceDataService
```

**Design Principles**:
- **Business** services enforce domain rules (validation, workflows, cross-entity logic)
- **Data** services are pure CRUD wrappers (no business logic)
- **Root** services combine data + business operations
- All services are stateless singletons (instantiated once, exported from index.js)

### 2.4 Data Layer (Models + Database)

| Concern | Implementation |
|---------|---------------|
| ORM | Sequelize 6.37 with PostgreSQL dialect |
| Primary keys | UUID v4 (globally unique, no sequential leaks) |
| Timestamps | `createdAt`, `updatedAt` on all tables |
| Soft delete | `paranoid: true` → `deletedAt` column, excluded from default queries |
| Associations | `belongsTo`, `hasMany`, `hasOne` with foreign key constraints |
| Hooks | `afterFind` (salary sync), `beforeValidate`, `beforeCreate` |
| Migrations | Versioned schema changes (20260209 → 20260217) |

---

## 3. Component Architecture

### 3.1 Backend Component Diagram

```
                    ┌─────────────────────────┐
                    │      server.js           │
                    │   (Express bootstrap)    │
                    └────┬──────────────┬──────┘
                         │              │
              ┌──────────┴──┐    ┌──────┴──────────┐
              │ Middleware   │    │   Route Files    │
              │ Pipeline     │    │  (27 files)      │
              │ (19 steps)   │    └──────┬───────────┘
              └──────────────┘           │
                                  ┌──────┴──────────┐
                                  │   Controllers    │
                                  │   (6 files)      │
                                  └──────┬───────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        │                │                │
                 ┌──────┴──────┐  ┌──────┴──────┐  ┌─────┴──────┐
                 │  Business   │  │    Root     │  │   Data     │
                 │  Services   │  │  Services   │  │  Services  │
                 │  (rules)    │  │  (workflows)│  │  (CRUD)    │
                 └──────┬──────┘  └──────┬──────┘  └─────┬──────┘
                        └────────────────┼────────────────┘
                                         │
                                  ┌──────┴──────────┐
                                  │  Sequelize      │
                                  │  Models (22)    │
                                  └──────┬──────────┘
                                         │
                                  ┌──────┴──────────┐
                                  │  PostgreSQL     │
                                  │  Database       │
                                  └─────────────────┘
```

### 3.2 Frontend Component Diagram

```
                    ┌─────────────────────────────┐
                    │          App.js              │
                    │  (Providers + Error Boundary)│
                    └────────────┬────────────────┘
                                 │
                    ┌────────────┴────────────────┐
                    │     Route Definitions        │
                    │  (8 route groups + guards)   │
                    └────────────┬────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
       ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐
       │   Layout    │   │   Feature   │   │   Shared    │
       │ Components  │   │ Components  │   │ Components  │
       │(Header,Side │   │(Employee,   │   │(Tables,     │
       │ bar,Footer) │   │ Leave,Pay,  │   │ Dialogs,    │
       └─────────────┘   │ Timesheet)  │   │ Buttons)    │
                         └──────┬──────┘   └─────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
             ┌──────┴──┐  ┌────┴────┐  ┌───┴─────┐
             │  Hooks  │  │Services │  │Contexts │
             │(useApi, │  │(19 API  │  │(Auth,   │
             │ useForm)│  │ files)  │  │ Loading)│
             └─────────┘  └────┬────┘  └─────────┘
                               │
                        ┌──────┴──────┐
                        │   Axios     │
                        │http-common  │
                        └─────────────┘
```

---

## 4. Middleware Pipeline (Request Lifecycle)

Every HTTP request passes through a 19-step middleware pipeline before reaching a route handler:

```
Request →
  ① express-status-monitor     (health endpoint at /status)
  ② responseTime               (X-Response-Time header)
  ③ helmet()                   (security headers: CSP, HSTS, X-Frame)
  ④ xss-clean                  (sanitize req.body, req.query, req.params)
  ⑤ hpp()                      (prevent HTTP parameter pollution)
  ⑥ trust proxy                (X-Forwarded-For for IP detection)
  ⑦ CORS                       (origin whitelist from CORS_ORIGIN env)
  ⑧ global rate limiter        (300 req / 15 min per IP)
  ⑨ auth rate limiter          (20 req / 15 min on /api/auth/*)
  ⑩ express.json()             (parse JSON body, 2 MB limit)
  ⑪ express.urlencoded()       (parse form data)
  ⑫ cookieParser()             (parse httpOnly cookies)
  ⑬ requestLogger              (assign X-Request-ID, log entry)
  ⑭ morgan                     (HTTP access log)
  ⑮ express.static(/uploads)   (serve uploaded files)
  ⑯ ROUTE HANDLER              (per-route middleware chain below)
  ⑰ 404 handler                (unmatched routes)
  ⑱ error logger               (log errors with stack trace)
  ⑲ global error handler       (format error response JSON)
→ Response
```

### Per-Route Middleware Chain

For a typical protected endpoint like `PUT /api/employees/:id`:

```
authenticateToken → authorize(['admin','hr']) → validateParams(uuidSchema) →
  validate(updateEmployeeSchema) → enhancedFieldAccessControl →
    controller.update → response
```

---

## 5. Authentication & Session Architecture

### 5.1 Token Flow

```
    Browser                        Backend                      Database
       │                              │                            │
       │──── POST /auth/login ────────│                            │
       │     {email, password}        │──── validate creds ────────│
       │                              │←─── user record ───────────│
       │                              │──── store refresh token ───│
       │←── Set-Cookie: accessToken ──│                            │
       │←── Set-Cookie: refreshToken ─│                            │
       │                              │                            │
       │── GET /api/employees ────────│                            │
       │   Cookie: accessToken=...    │                            │
       │                              │── verify JWT ──┐           │
       │                              │←── decoded ────┘           │
       │←── 200 {data: [...]} ────────│                            │
       │                              │                            │
       │── GET /api/employees ────────│  (token expired)           │
       │←── 401 Unauthorized ─────────│                            │
       │                              │                            │
       │── POST /auth/refresh-token ──│                            │
       │   Cookie: refreshToken=...   │──── verify refresh ────────│
       │                              │←─── valid ─────────────────│
       │←── Set-Cookie: accessToken ──│──── rotate refresh token ──│
       │                              │                            │
       │   (retry original request)   │                            │
```

### 5.2 Token Specifications

| Token | Algorithm | Lifetime | Storage | Payload |
|-------|-----------|----------|---------|---------|
| Access | HS256 | 15 min | httpOnly cookie | `{id, email, role, employeeId, jti}` |
| Refresh | HS256 | 7 days | httpOnly cookie + DB | `{id, type:'refresh', jti}` |

### 5.3 Silent Refresh (Frontend)

The Axios interceptor in `http-common.js` implements a **token refresh queue**:
1. Response interceptor catches 401
2. First 401 triggers `/auth/refresh-token` call
3. Subsequent 401s during refresh are queued
4. On success: all queued requests are retried with new token
5. On failure: user redirected to `/login`

---

## 6. RBAC Design

### 6.1 Role Hierarchy

```
  Admin  ──→  Full system access (all modules, all data, config)
    │
    HR   ──→  Employee mgmt, leave/timesheet review, payroll, reports
    │
  Manager ──→  Team scope: approve team leave & timesheets, view team data
    │
 Employee ──→  Self-service: own profile, submit leave & timesheets, view payslips
```

### 6.2 Permission Matrix

| Module | Admin | HR | Manager | Employee |
|--------|-------|----|---------|----------|
| Employee CRUD | ✅ Full | ✅ Full | 🔶 Team view only | 🔶 Self only |
| Salary / Bank | ✅ Read/Write | ✅ Read/Write | ❌ Hidden | ❌ Hidden |
| Leave submit | ✅ | ✅ | ✅ | ✅ |
| Leave approve | ✅ All | ✅ All | 🔶 Team only | ❌ |
| Timesheet submit | ✅ | ✅ | ✅ | ✅ |
| Timesheet approve | ✅ All | ✅ All | 🔶 Team only | ❌ |
| Payroll generate | ✅ | ✅ | ❌ | ❌ |
| Payroll approve | ✅ | ❌ | ❌ | ❌ |
| Payslip view | ✅ All | ✅ All | 🔶 Team | 🔶 Self |
| Department / Position | ✅ CRUD | ✅ CRUD | 👁 Read | 👁 Read |
| Projects / Tasks | ✅ CRUD | ✅ CRUD | 🔶 Assigned | 🔶 Assigned |
| System Config | ✅ | ❌ | ❌ | ❌ |
| Audit Log | ✅ | 👁 Read | ❌ | ❌ |

### 6.3 Field-Level Access Control

The `enhancedFieldAccessControl` middleware filters response fields based on role:

```javascript
// Example: Employee record fields visible per role
{
  admin:    ['*'],                           // All fields
  hr:       ['*'],                           // All fields
  manager:  ['id','name','email','dept',     // Basic info only
             'status','position'],
  employee: ['id','name','email','dept',     // Self-service subset
             'position','phone']
}
```

---

## 7. Error Handling Strategy

### 7.1 Backend Error Classes

```
AppError (base class, extends Error)
  ├── ValidationError   (400)  — Field-level validation failures
  ├── BadRequestError   (400)  — Malformed request
  ├── UnauthorizedError (401)  — Invalid/missing credentials
  ├── ForbiddenError    (403)  — Insufficient permissions
  ├── NotFoundError     (404)  — Resource not found
  └── ConflictError     (409)  — Duplicate/conflict
```

### 7.2 Standard Error Response

All API errors return a consistent JSON structure:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email is required" },
    { "field": "hireDate", "message": "Hire date must be a valid date" }
  ]
}
```

### 7.3 Frontend Error Recovery

```
API Error
  ↓
Axios Interceptor (normalize error shape)
  ↓
Service Layer (catch & re-throw with context)
  ↓
Component (try/catch or useApiCall hook)
  ↓
  ├── 401 → Silent refresh → Retry or redirect to login
  ├── 403 → Show "Access Denied" notification
  ├── 400 → Show field-level validation errors
  ├── 404 → Show "Not Found" message
  └── 500 → Show generic error toast + log to console
```

---

## 8. Caching Strategy

### 8.1 Server-Side

| Layer | Mechanism | TTL | Invalidation |
|-------|-----------|-----|-------------|
| CacheService | In-memory Map | Configurable | On write operations |
| Dashboard data | Cached aggregations | 5 min | On relevant data change |
| Reference data | Departments, positions | 10 min | On CRUD operations |

### 8.2 Client-Side (TanStack Query)

| Query Key | Stale Time | Cache Time | Refetch |
|-----------|-----------|------------|---------|
| `['employees']` | 5 min | 10 min | On window focus |
| `['employee', id]` | 2 min | 5 min | On mutation |
| `['departments']` | 30 min | 60 min | Manual |
| `['dashboard']` | 1 min | 5 min | On window focus |
| `['timesheets']` | 2 min | 5 min | On mutation |

---

## 9. Logging & Observability

### 9.1 Backend Logging

| Logger | Output | Format | Rotation |
|--------|--------|--------|----------|
| Winston (app) | `backend/logs/combined.log` | JSON | 5 MB max, 5 files |
| Winston (error) | `backend/logs/error.log` | JSON | 5 MB max, 5 files |
| Morgan (HTTP) | stdout + `backend/logs/access.log` | combined | — |

**Log Levels**: error → warn → info → debug

**Request Tracking**:
- Every request gets a `X-Request-ID` header (UUID)
- Slow requests (>5s) are flagged in logs
- All auth events logged (login, logout, failed attempts, lockout)

### 9.2 Audit Trail

The `AuditLog` table captures all data mutations:

| Field | Description |
|-------|-------------|
| userId | Who performed the action |
| entityName | Which table (e.g., 'Employee', 'LeaveRequest') |
| entityId | UUID of the affected record |
| action | CREATE, UPDATE, DELETE, RESTORE |
| changes | JSON diff of old → new values |
| ipAddress | Client IP |
| userAgent | Browser/client info |
| timestamp | When it happened |

---

## 10. Scalability Considerations

### 10.1 Current Capacity

| Resource | Design Limit | Notes |
|----------|-------------|-------|
| Concurrent users | ~100 | PM2 x2 workers, shared PostgreSQL |
| Employees | ~5,000 | Indexed queries, paginated |
| API throughput | 300 req/15 min per IP | Global rate limit |
| File uploads | 5 MB / file | Photo only |
| Database connections | Pool: 2 min, 10 max | Per PM2 instance |

### 10.2 Scaling Path

| Phase | Action |
|-------|--------|
| **Vertical** | Increase PM2 instances (4–8), enlarge PG pool, add Redis cache |
| **Horizontal** | Load balancer → multiple Node containers; PG read replicas |
| **Decomposition** | Extract payroll/payslip as separate microservice if needed |

---

## 11. Design Patterns Used

| Pattern | Where Applied | Purpose |
|---------|--------------|---------|
| **Repository** | Data services (SalaryDataService, etc.) | Abstract data access from business logic |
| **Strategy** | Leave accrual rules per leave type | Pluggable calculation algorithms |
| **Factory** | Employee ID generation | Centralized ID creation with gap-proof sequence |
| **Middleware** | Express pipeline | Cross-cutting concerns (auth, logging, rate-limit) |
| **Observer** | Sequelize hooks (afterFind, beforeCreate) | Reactive data transformations |
| **Singleton** | Service instances | One instance per service class |
| **Guard** | ProtectedRoute component | Role-based UI access control |
| **Provider** | React Context (Auth, Loading, Notification) | Dependency injection for UI |
| **Page Object** | Playwright E2E tests | Test maintainability |

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
