# SkyrakSys HRM — Security Architecture

> **Document Owner**: Security Architect  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: Security engineers, auditors, DevOps, all developers

---

## 1. Security Overview

| Layer | Technology | Status |
|-------|-----------|--------|
| Transport | HTTPS (TLS 1.2+) via Nginx | ✅ |
| Headers | Helmet.js (16 headers) | ✅ |
| Authentication | JWT (httpOnly cookies) | ✅ |
| Authorization | RBAC (4 roles) + field-level ACL | ✅ |
| Input Validation | Joi schemas (all routes) | ✅ |
| XSS Prevention | sanitize-html (all inputs) | ✅ |
| CSRF Protection | SameSite cookies + CORS | ✅ |
| Rate Limiting | express-rate-limit (global + per-route) | ✅ |
| Encryption at Rest | AES-256-GCM (sensitive fields) | ✅ |
| Password Security | bcrypt + lockout + complexity | ✅ |
| File Upload Security | Magic-byte validation | ✅ |
| Audit Trail | Non-blocking AuditLog | ✅ |
| Parameter Pollution | hpp middleware | ✅ |

---

## 2. Authentication Architecture

### 2.1 JWT Token Design

```
Access Token (15 min)               Refresh Token (7 days)
┌──────────────────────┐            ┌──────────────────────┐
│ header: HS256        │            │ header: HS256        │
│ payload:             │            │ payload:             │
│   id: UUID           │            │   id: UUID           │
│   role: string       │            │   role: string       │
│   employeeId: UUID   │            │   type: "refresh"    │
│   jti: UUID          │            │   jti: UUID          │
│   iat, exp           │            │   iat, exp           │
│ signature: JWT_SECRET│            │ signature: REFRESH_  │
└──────────────────────┘            │             SECRET   │
                                    └──────────────────────┘
```

**Key decisions**:
- **Separate secrets** for access and refresh tokens
- **JTI (JWT ID)**: Unique identifier for blacklisting on logout
- **httpOnly cookies**: Tokens never accessible from JavaScript
- **SameSite=Lax**: CSRF protection on cookies
- **Secure flag**: Enabled in production (HTTPS only)

### 2.2 Token Lifecycle

```
Login → Access (15min) + Refresh (7d) in httpOnly cookies
  │
  ├─ Normal request: Access token auto-sent via cookie
  │
  ├─ Access expired (401):
  │    → Frontend interceptor calls /auth/refresh-token
  │    → Server validates refresh token
  │    → Issues new access + refresh pair
  │    → Revokes old refresh token (rotation)
  │    → Retries original request
  │
  ├─ Refresh expired/invalid:
  │    → Redirect to /login
  │
  └─ Logout:
       → Access token JTI added to blacklist
       → Refresh token revoked in DB
       → Cookies cleared
```

### 2.3 Token Blacklist

In-memory Map with auto-cleanup:

```javascript
tokenBlacklist.add(jti, ttlMs);  // On logout
tokenBlacklist.has(jti);          // On every request
// Auto-cleanup: expired entries purged every 5 minutes
```

> **Note**: For multi-instance deployment (PM2 cluster), the blacklist needs Redis. Current in-memory implementation has a race window between instances.

---

## 3. Account Security

### 3.1 Password Policy

| Rule | Enforcement |
|------|------------|
| Minimum length | 6 characters (Joi validation) |
| Hashing | bcrypt with auto-salt |
| Storage | `password` column excluded from default query scope |
| Change tracking | `passwordChangedAt` timestamp |
| Reset | JWT-based token (1hr expiry), one-time use, DB-tracked |

### 3.2 Account Lockout

```
Failed login → increment failedLoginAttempts
  │
  ├─ < 5 attempts: Allow retry
  │
  └─ ≥ 5 attempts:
       → Set lockoutUntil = now + 15 minutes
       → Return 423 Locked
       → Log security event
       → Admin can manually unlock via /api/auth/users/:id/lock
```

### 3.3 Login Rate Limiting

| Scope | Limit | Window | Behavior |
|-------|-------|--------|----------|
| Per-IP | 5 attempts | 15 min | Block IP |
| Per-user | 10 attempts | 1 hour | Lock account |
| Distributed | 50+ concurrent | — | Alert triggered |

Exponential backoff: After 3 failures → 2s, 4s, 8s delay before next attempt.

---

## 4. Authorization (RBAC)

### 4.1 Role Hierarchy

```
admin → Full system access, user management, config
  ↓
hr → Employee management, payroll, leave admin (no system config)
  ↓
manager → Team management, approvals, reports (own team only)
  ↓
employee → Self-service only (own profile, leave, timesheet)
```

### 4.2 Middleware Chain

```
Request → authenticateToken → authorize(roles) → [route handler]
                │                    │
                │                    └─ Checks req.user.role ∈ roles
                └─ Verifies JWT, sets req.user
```

### 4.3 Field-Level Access Control

The `enhancedFieldAccessControl` middleware filters employee data by role:

| Field Category | Admin | HR | Manager | Employee |
|---------------|-------|-----|---------|----------|
| Basic info (name, email) | ✅ | ✅ | ✅ team | ✅ self |
| Employment (dept, position) | ✅ | ✅ | ✅ team | ✅ self |
| Personal (DOB, address) | ✅ | ✅ | ❌ | ✅ self |
| Statutory (Aadhaar, PAN) | ✅ | ✅ | ❌ | ✅ self |
| Bank details | ✅ | ✅ | ❌ | ✅ self |
| Salary/compensation | ✅ | ✅ | ❌ | 📋 limited |
| Emergency contact | ✅ | ✅ | ✅ team | ✅ self |

Changes to sensitive fields (salary, statutory, bank) trigger audit log entries.

### 4.4 Manager Team Access

Managers can only access employees where `managerId = manager.employeeId`. The `canAccessEmployee` middleware:

1. Admin/HR → always pass
2. Own record (`employee.userId === req.user.id`) → pass
3. Manager → query employee's managerId chain → pass/deny

---

## 5. Input Security

### 5.1 XSS Prevention

Applied globally in `server.js`:

```javascript
// sanitize-html strips all HTML tags from req.body, req.query, req.params
function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeHtml(obj[key], { allowedTags: [], allowedAttributes: {} });
    }
  }
}
```

### 5.2 Joi Validation

Every route with body/query/params input uses Joi schemas:

```javascript
// middleware/validate.js
validate(schema)        // req.body
validateQuery(schema)   // req.query
validateParams(schema)  // req.params
```

Configuration: `stripUnknown: true`, `abortEarly: false`

### 5.3 HTTP Parameter Pollution (HPP)

The `hpp` middleware prevents parameter pollution attacks:
```
GET /api/employees?status=Active&status=Admin  →  Only last value used
```

---

## 6. Security Headers (Helmet)

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | `nosniff` | Prevent MIME-type sniffing |
| X-Frame-Options | `DENY` | Prevent clickjacking |
| X-XSS-Protection | `1; mode=block` | XSS filter |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | Force HTTPS |
| Content-Security-Policy | Default restrictive | Prevent code injection |
| X-DNS-Prefetch-Control | `off` | Privacy |
| Referrer-Policy | `strict-origin-when-cross-origin` | Limit referrer leakage |
| X-Permitted-Cross-Domain-Policies | `none` | Restrict Flash/PDF access |

---

## 7. CORS Configuration

```javascript
cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,           // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

Production: Set `CORS_ORIGIN` to your domain. Multiple origins supported as comma-separated list.

---

## 8. Rate Limiting

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| Global | 100 req | 15 min | DDoS mitigation |
| Login | 5/IP, 10/user | 15min, 1hr | Brute force prevention |
| Password reset | 3 req | 1 hour | Abuse prevention |
| Bulk operations | 20 req | 15 min | Server protection |
| Profile update | 20 req | 15 min | Update flooding |
| System config | 10 req | 15 min | Config change control |

---

## 9. Data Encryption

### 9.1 At Rest (AES-256-GCM)

`EncryptionService` singleton encrypts sensitive stored data:

| Field | Table | When Encrypted |
|-------|-------|----------------|
| SMTP password | email.config.json | On save |
| System config values | system_configs | On save |

**Format**: `encrypted:iv:authTag:ciphertext` (base64)

### 9.2 Passwords

- **Hashing**: bcrypt with auto-generated salt (10 rounds)
- **Storage**: `password` field excluded from default Sequelize scope
- **Comparison**: `bcrypt.compare()` — constant-time comparison

### 9.3 In Transit

- **Development**: HTTP (localhost only)
- **Production**: HTTPS via Nginx with TLS 1.2+
- **Cookies**: `Secure` flag in production

---

## 10. File Upload Security

### Validation Chain

1. **Extension check**: `.jpg`, `.jpeg`, `.png`, `.webp` only
2. **MIME type check**: `image/jpeg`, `image/png`, `image/webp` only
3. **Magic-byte validation**: Reads first 4 bytes to verify actual file format
   - JPEG: `FF D8 FF`
   - PNG: `89 50 4E 47`
   - WebP: `52 49 46 46`
4. **Size limit**: 5MB maximum
5. **Storage**: Local `uploads/` directory (not in database)

### Upload Middleware

```javascript
// middleware/upload.js
const upload = multer({
  storage: multer.diskStorage({ destination: 'uploads/', filename: uuidFilename }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: extensionAndMimeCheck
});

// After multer: validateMagicBytes middleware reads file header
```

---

## 11. Audit Trail

### AuditLog Table

Every sensitive operation creates a non-blocking audit entry:

```javascript
await db.AuditLog.create({
  userId: req.user.id,
  entityName: 'Employee',
  entityId: employee.id,
  action: 'UPDATE',        // CREATE, UPDATE, DELETE, RESTORE
  changes: { salary: { old: 50000, new: 60000 } },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

**Auto-sanitization**: Fields like `password`, `token`, `aadhaar`, `pan`, `bankAccount` are redacted from stored changes.

### Audited Operations

- Employee salary/statutory/bank changes
- User role changes
- Account lock/unlock
- System configuration changes
- Login success/failure
- Password reset
- Payslip generation/finalization

---

## 12. Sensitive Data Handling

| Data Type | Storage | Access | Protection |
|-----------|---------|--------|-----------|
| Passwords | bcrypt hash | Never returned in API | Excluded from default scope |
| Aadhaar numbers | Plain text (DB) | Admin/HR/self only | Field-level ACL + audit |
| PAN numbers | Plain text (DB) | Admin/HR/self only | Field-level ACL + audit |
| Bank details | Plain text (DB) | Admin/HR/self only | Field-level ACL + audit |
| SMTP credentials | AES-256-GCM | Admin only | Encrypted at rest |
| JWT secrets | Environment vars | Server only | Never in code/DB |
| Salary data | Decimal columns | Admin/HR/limited | Field-level ACL + audit |

> **Recommendation**: Aadhaar, PAN, and bank account numbers should be encrypted at rest using `EncryptionService`. Currently they are stored in plain text with access control only.

---

## 13. Security Monitoring

### Logging

| Event | Log Level | Destination |
|-------|-----------|------------|
| Failed login | WARN | error.log + AuditLog |
| Account lockout | ERROR | error.log + AuditLog |
| Distributed attack | ERROR | error.log |
| Rate limit exceeded | WARN | access.log |
| Slow request (>1s) | WARN | combined.log |
| Auth token rotated | INFO | combined.log |
| Sensitive field change | INFO | AuditLog |

### Health Endpoints

```
GET /health          → { status: 'ok', uptime, memoryUsage, dbConnected }
GET /api/performance/server-metrics  → CPU, memory, DB pool stats (admin)
```

---

## 14. Security Checklist for Deployment

- [ ] Set strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Enable HTTPS via Nginx with valid TLS certificate
- [ ] Set `CORS_ORIGIN` to production domain only
- [ ] Set `NODE_ENV=production`
- [ ] Enable `RATE_LIMIT_ENABLED=true`
- [ ] Disable `SEED_DEMO_DATA`
- [ ] Remove `/api/debug` routes in production
- [ ] Set cookie `Secure` and `SameSite` flags
- [ ] Configure database SSL (`DB_SSL=true`)
- [ ] Set up log rotation and monitoring
- [ ] Review PostgreSQL `pg_hba.conf` for access control
- [ ] Never expose admin-debug-panel to production

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
