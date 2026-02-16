# Security Architecture Guide

> **Last updated:** 2026-02-14 | **Stack:** Express 4.18, JWT httpOnly cookies, bcryptjs, Helmet 7

---

## 1. Request Processing Pipeline

Every HTTP request passes through a 19-step middleware chain in this exact order:

```
Request →
  1. express-status-monitor        Server health monitor (non-Windows)
  2. responseTime                   Logs slow requests (>500ms warning)
  3. helmet()                       Security headers (CSP, HSTS, X-Frame-Options)
  4. xss-clean                      XSS payload sanitization on body/query/params
  5. hpp()                          HTTP Parameter Pollution protection
  6. trust proxy                    Configurable (TRUST_PROXY env var)
  7. cors(corsOptions)              CORS enforcement with origin whitelist
  8. Rate Limiter (general)         300 req/15min on /api/*
  9. Rate Limiter (auth)            20 req/15min on /api/auth/*
 10. express.json({ limit: '2mb' }) JSON body parser (size limit)
 11. express.urlencoded()           URL-encoded parser (2mb limit)
 12. cookieParser()                 Parse cookies
 13. requestLogger                  Assigns unique X-Request-ID
 14. morgan()                       HTTP access logging to file
 15. Static files (/uploads)        Behind authenticateToken
 16. → Route handlers               Per-route middleware + controllers
 17. 404 catch-all                  Unmatched routes
 18. errorLogger                    Error logging middleware
 19. Error handler                  Structured error responses
→ Response
```

---

## 2. Authentication

### 2.1 JWT Configuration

| Setting | Value | Source |
|---------|-------|--------|
| Access Token Secret | Required | `JWT_SECRET` env |
| Access Token Expiry | 15 minutes | |
| Refresh Token Secret | Required | `JWT_REFRESH_SECRET` env |
| Refresh Token Expiry | 7 days | |
| Algorithm | HS256 (default) | |

Production enforcement: Server throws error if secrets are not set when `NODE_ENV === 'production'`.

### 2.2 Token Payload

**Access Token:**
```json
{
  "id": "user UUID",
  "email": "user.email",
  "role": "admin|hr|manager|employee",
  "employeeId": "employee UUID or null",
  "jti": "unique token ID (UUIDv4)"
}
```

**Refresh Token:**
```json
{
  "id": "user UUID",
  "tokenId": "refresh_tokens.id",
  "type": "refresh"
}
```

### 2.3 Cookie Settings

**Access Token Cookie:**

| Property | Production | Development |
|----------|-----------|-------------|
| httpOnly | `true` | `true` |
| secure | `true` | `false` |
| sameSite | `Strict` | `Strict` |
| maxAge | 900,000 ms (15 min) | 900,000 ms |
| path | `/` | `/` |

**Refresh Token Cookie:**

| Property | Production | Development |
|----------|-----------|-------------|
| httpOnly | `true` | `true` |
| secure | `true` | `false` |
| sameSite | `Strict` | `Strict` |
| maxAge | 604,800,000 ms (7 days) | 604,800,000 ms |
| path | `/api/auth` | `/api/auth` |

The refresh token cookie is restricted to `/api/auth` path — it's only sent for auth-related requests.

### 2.4 Token Verification (`authenticateToken`)

```
1. Extract token from req.cookies.accessToken OR Authorization: Bearer <token>
2. jwt.verify() — checks signature + expiry
3. Check jti against in-memory blacklist → reject if blacklisted
4. Look up User from database (with Employee include)
5. Check user.isActive === true → reject if deactivated
6. Populate req.user, req.userId, req.userRole, req.employeeId
```

### 2.5 Token Blacklist

- **Storage:** In-memory `Map<jti, expiresAtTimestamp>`
- **Add:** On logout, the token's `jti` is added
- **Check:** `isBlacklisted(jti)` — returns true if jti exists and not expired
- **Cleanup:** Every 5 minutes, expired entries are purged
- **⚠️ Limitation:** Not shared across PM2 cluster instances. Requires Redis for multi-process deployments.

### 2.6 Silent Token Refresh (Frontend)

Axios interceptor in `http-common.js`:

```
1. Response returns 401 AND request not already retried
2. POST /api/auth/refresh-token (sends refresh cookie)
3. Queue concurrent requests while refresh in-flight
4. On success → replay all queued requests with new token
5. On failure → redirect to /login
```

---

## 3. Authorization (RBAC)

### 3.1 Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access, user management, system config |
| `hr` | Employee management, payroll, leave admin |
| `manager` | Team management, approvals |
| `employee` | Self-service (own profile, leave, timesheet, payslips) |

### 3.2 `authorize(...roles)` Middleware

Accepts string or array of roles. Checks `req.userRole` against allowed roles. Returns `403 Forbidden` if not matched.

### 3.3 RBAC Matrix

| Resource | admin | hr | manager | employee |
|----------|:-----:|:--:|:-------:|:--------:|
| **User CRUD** | ✅ | ❌ | ❌ | ❌ |
| **Employee CRUD** | ✅ | ✅ | ❌ | ❌ |
| **Employee Read (own)** | ✅ | ✅ | ✅ | ✅ |
| **Employee Read (team)** | ✅ | ✅ | ✅ | ❌ |
| **Department CRUD** | ✅ (all) | ✅ (no delete) | ❌ | ❌ |
| **Position CRUD** | ✅ (all) | ✅ (no delete) | ❌ | ❌ |
| **Project CRUD** | ✅ | ✅ | ✅ | ❌ |
| **Task CRUD** | ✅ | ✅ | ✅ | Limited |
| **Timesheet (own)** | ✅ | ✅ | ✅ | ✅ |
| **Timesheet (approve)** | ✅ | ✅ | ✅ | ❌ |
| **Leave (own)** | ✅ | ✅ | ✅ | ✅ |
| **Leave (approve)** | ✅ | ✅ | ✅ | ❌ |
| **Leave Balance Admin** | ✅ | ✅ | ❌ | ❌ |
| **Payroll/Payslip CRUD** | ✅ | ✅ | ❌ | ❌ |
| **Payslip (own)** | ✅ | ✅ | ✅ | ✅ |
| **Payslip Delete** | ✅ | ❌ | ❌ | ❌ |
| **Salary Structure** | ✅ | ✅ | ❌ | Read own |
| **Attendance (own)** | ✅ | ✅ | ✅ | ✅ |
| **Attendance Admin** | ✅ | ✅ | ❌ | ❌ |
| **Attendance (view all)** | ✅ | ✅ | ✅ | ❌ |
| **Holiday CRUD** | ✅ (all) | ✅ (no delete) | ❌ | ❌ |
| **Holiday Read** | ✅ | ✅ | ✅ | ✅ |
| **Employee Reviews** | ✅ | ✅ | ✅ | Self only |
| **System Config** | ✅ | ❌ | ❌ | ❌ |
| **Admin Config** | ✅ | ❌ | ❌ | ❌ |
| **Email Config** | ✅ | ❌ | ❌ | ❌ |
| **Performance Metrics** | ✅ | ❌ | ❌ | Health only |
| **Debug Routes** | ✅ | ❌ | ❌ | ❌ |
| **Restore Routes** | ✅ | ❌ | ❌ | ❌ |

### 3.4 `canAccessEmployee` Middleware

Resource-level access control for employee records:

```
1. Admin/HR → ALLOW (any employee)
2. Self access (req.employeeId === target) → ALLOW
3. Manager → Check if target.managerId === req.employeeId → ALLOW/DENY
4. Otherwise → 403 Forbidden
```

### 3.5 `enhancedFieldAccessControl` Middleware

Field-level visibility control on employee routes. Controls which fields appear in API responses based on role. See [Frontend Architecture → 7.1 Field-Level Permissions](01-FRONTEND_ARCHITECTURE.md#71-field-level-permissions-usefieldpermissions) for the frontend counterpart.

---

## 4. Rate Limiting

### 4.1 General API

| Setting | Value |
|---------|-------|
| Window | 15 minutes |
| Max requests | 300 (`RATE_LIMIT_MAX` env) |
| Scope | `/api/*` |
| Key | IP address |
| Response | 429 Too Many Requests |

### 4.2 Auth Endpoints

| Setting | Value |
|---------|-------|
| Window | 15 minutes |
| Max requests | 20 (`AUTH_RATE_LIMIT_MAX` env) |
| Scope | `/api/auth/*` |

### 4.3 Login Rate Limiter (Advanced)

Custom implementation in `middleware/login-rate-limiter.js` (249 lines):

**Per-IP:**
- Max 5 attempts per 15 minutes
- Exponential backoff after 3+ consecutive failures (multiplier ×2, ×4, ×8...)

**Per-Username:**
- Max 10 attempts per 1 hour

**Features:**
- Distributed attack detection (alerting when 50+ attempts from different IPs target same username, scanned every 60s)
- Localhost whitelist (`127.0.0.1`, `::1`)
- Automatic cleanup every 5 minutes
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

### 4.4 Additional Route-Specific Limiters

| Limiter | Route | Purpose |
|---------|-------|---------|
| `profileUpdateLimiter` | `PUT /employees/:id` | Prevent rapid profile changes |
| `bulkOperationLimiter` | `POST /timesheets/bulk-reject` | Protect against mass operations |
| `passwordResetLimiter` | `POST /auth/forgot-password` | Prevent email flooding |

---

## 5. CORS Configuration

**Allowed Origins:**
```
http://localhost:3000      http://127.0.0.1:3000
http://localhost:3001      http://127.0.0.1:3001
http://localhost:5000      http://127.0.0.1:5000
http://localhost:8080      http://127.0.0.1:8080
http://95.216.14.232:3000  (production)
http://95.216.14.232       (production)
${FRONTEND_URL}            (env override)
${CORS_ORIGIN}             (env override)
```

| Option | Value |
|--------|-------|
| credentials | `true` (required for cookies) |
| methods | `GET, POST, PUT, DELETE, OPTIONS, PATCH` |
| allowedHeaders | `Content-Type, Authorization, X-Requested-With` |
| optionsSuccessStatus | `200` |

No-origin requests (server-to-server, cURL) are allowed.

---

## 6. Security Headers (Helmet)

Default Helmet configuration provides:

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Default CSP | XSS/injection prevention |
| Strict-Transport-Security | max-age=15552000 | Force HTTPS (6 months) |
| X-Content-Type-Options | nosniff | MIME type sniffing prevention |
| X-Frame-Options | SAMEORIGIN | Clickjacking prevention |
| X-XSS-Protection | 0 | Deprecated (CSP preferred) |
| X-DNS-Prefetch-Control | off | DNS prefetch prevention |
| X-Download-Options | noopen | IE download execution prevention |
| X-Permitted-Cross-Domain-Policies | none | Flash/PDF cross-domain |
| Referrer-Policy | no-referrer | Referrer leakage prevention |

---

## 7. Input Validation & Sanitization

| Layer | Technology | Scope |
|-------|-----------|-------|
| **XSS Sanitization** | xss-clean | All `req.body`, `req.query`, `req.params` |
| **Parameter Pollution** | hpp | Prevents duplicate query params |
| **Body Size Limit** | express.json `{ limit: '2mb' }` | Prevents large payload attacks |
| **Schema Validation** | Joi schemas via `validate()` middleware | Per-route body/query/params |
| **UUID Validation** | `validateParams` middleware | Path param UUID format check |
| **Query Validation** | `validateQuery` middleware | Query string type/range checks |

---

## 8. Password Security

| Feature | Implementation |
|---------|---------------|
| **Hashing** | bcryptjs (User model beforeCreate/beforeUpdate hooks) |
| **Account Lockout** | Configurable failed attempt threshold → `lockoutUntil` timestamp |
| **Failed Login Tracking** | `failedLoginAttempts` counter, reset on success |
| **Password Change Tracking** | `passwordChangedAt` field |
| **Password Reset Flow** | Token-based via `password_reset_tokens` table |
| **Reset Token Security** | Hashed `tokenId` (64 chars), `expiresAt`, `usedAt` tracking |
| **Sensitive Config Access** | `requirePasswordReauth` middleware (re-enter password) |

---

## 9. Audit Logging

### 9.1 General Audit Trail

`audit_logs` table — immutable, append-only:

- **Immutability enforced:** `beforeUpdate` and `beforeDestroy` hooks throw errors
- **Sensitive data redaction:** `beforeCreate` sanitizes: `password`, `passwordHash`, `token`, `apiKey`, `secret`, `ssn`
- **Context captured:** userId, entityType, entityId, oldValues, newValues, ipAddress, userAgent, metadata, duration, success/failure

**30+ tracked actions:** `LOGIN_SUCCESS`, `LOGIN_FAILED`, `CREATED`, `UPDATED`, `DELETED`, `APPROVED`, `REJECTED`, `STATUS_CHANGED`, `BALANCE_ADJUSTED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `DISTRIBUTED_ATTACK_DETECTED`, etc.

### 9.2 Payslip Audit Trail

Separate `payslip_audit_logs` table with specific actions:
- `manual_edit` — payslip data changed manually
- `status_change` — draft → finalized → paid
- `finalize` — payslip finalized
- `mark_paid` — payment recorded
- `regenerate` — payslip regenerated

Captures `changes` (JSONB before/after), `ipAddress`, `userAgent`.

---

## 10. Error Handling

Centralized error handler catches and normalizes:

| Error Type | Status | Response |
|-----------|--------|----------|
| `AppError` | Custom | Custom message |
| Sequelize `ValidationError` | 400 | Field-level messages |
| Sequelize `UniqueConstraintError` | 409 | Conflict message |
| Sequelize `ForeignKeyConstraintError` | 409 | Reference conflict |
| JWT `JsonWebTokenError` | 401 | Invalid token |
| JWT `TokenExpiredError` | 401 | Token expired |
| Multer errors | 400 | File upload messages |
| Unknown errors | 500 | Generic (stack hidden in production) |

---

## 11. File Upload Security

| Setting | Value |
|---------|-------|
| Library | Multer |
| Storage | Disk (`uploads/` directory) |
| Access | Behind `authenticateToken` middleware |
| Handlers | `uploadEmployeePhoto`, `uploadCompanyLogo` |
| Error handling | Dedicated upload error middleware |

---

## 12. Debug Route Protection

- **Guard:** Routes only loaded when `NODE_ENV !== 'production'`
- **Auth:** Even in dev, requires `authenticateToken` + `admin` role
- **⚠️ Dangerous endpoints:** Raw SQL execution, config changes, DB browsing — all restricted
