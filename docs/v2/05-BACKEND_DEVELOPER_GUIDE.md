# SkyrakSys HRM — Backend Developer Guide

> **Document Owner**: Senior Backend Developer  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: Backend developers, new team members, maintainers

---

## 1. Quick Start

```bash
cd backend
cp .env.production.template .env
# Edit .env: set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_REFRESH_SECRET

npm install
npx sequelize-cli db:migrate        # Apply schema
npx sequelize-cli db:seed:all       # Seed demo data (optional)
npm run dev                          # Start with nodemon (port 5000)
```

---

## 2. Project Structure

```
backend/
├── server.js                  # Application entry point
├── package.json               # Dependencies & scripts
├── jest.config.js             # Test configuration
├── config/
│   ├── config.js              # Sequelize DB config (multi-env)
│   ├── auth.config.js         # JWT settings (secrets, TTLs)
│   ├── email.config.json      # SMTP credentials (encrypted)
│   ├── logger.js              # Winston logging setup
│   └── swagger.js             # OpenAPI 3.0 spec
├── controllers/               # HTTP request handlers (6 files)
├── middleware/                 # Express middleware (13 files)
│   └── validators/            # Joi validation schemas (16 modules)
├── models/                    # Sequelize model definitions (22 tables)
│   └── index.js               # Model loader + associations
├── routes/                    # Route definitions (28 files)
├── services/                  # Business logic layer
│   ├── BaseService.js         # Generic CRUD wrapper
│   ├── business/              # Business rules + RBAC enforcement
│   ├── data/                  # Pure data access wrappers
│   ├── timesheet/             # Timesheet sub-services
│   ├── leave/                 # Leave sub-services
│   ├── employee/              # Employee sub-services
│   ├── project/               # Project service
│   └── task/                  # Task service
├── migrations/                # Sequelize CLI migrations
├── seeders/                   # Sequelize CLI seed files
├── templates/                 # Email templates (Handlebars)
├── uploads/                   # File upload directory
├── logs/                      # Application log files
├── utils/                     # Utility classes & helpers
└── tests/                     # Jest test suites
```

---

## 3. Architecture Layers

```
┌─────────────────────────────────────────────┐
│                HTTP Layer                     │
│  Routes → Controllers (request/response)     │
├─────────────────────────────────────────────┤
│              Middleware Layer                  │
│  Auth → RBAC → Validate → Field Access       │
├─────────────────────────────────────────────┤
│            Business Service Layer             │
│  RBAC enforcement, transactions, rules       │
│  services/business/*.js                      │
├─────────────────────────────────────────────┤
│             Data Service Layer                │
│  Sequelize queries, includes, scopes         │
│  services/data/*.js + BaseService.js         │
├─────────────────────────────────────────────┤
│               Model Layer                     │
│  Sequelize definitions, hooks, associations  │
│  models/*.js                                 │
├─────────────────────────────────────────────┤
│              PostgreSQL                       │
└─────────────────────────────────────────────┘
```

---

## 4. Server Initialization Sequence

`server.js` initializes in this exact order:

1. **Environment**: `dotenv.config()` → load environment variables
2. **Express**: Create app instance
3. **Status Monitor**: `express-status-monitor` at `/api/status`
4. **Response Time**: `response-time` header on all responses
5. **Security Headers**: `helmet()` (CSP, HSTS, X-Frame-Options)
6. **XSS Sanitization**: `sanitize-html` on all `req.body` / `req.query` / `req.params`
7. **HPP**: HTTP Parameter Pollution protection
8. **Proxy Trust**: `app.set('trust proxy', 1)` for Nginx
9. **CORS**: Origins from `CORS_ORIGIN` env var, credentials: true
10. **Rate Limiter**: 100 req/15min per IP (skipped in test)
11. **Body Parsing**: JSON + URL-encoded (10MB limit)
12. **Cookie Parser**: For JWT httpOnly cookies
13. **Request Logger**: UUID per request, duration tracking
14. **Morgan**: HTTP access logs
15. **Static Files**: Authenticated `/uploads` directory
16. **Database**: Sequelize connection + `sync({ alter: true })`
17. **Demo Seeding**: Optional when `SEED_DEMO_DATA=true`
18. **Route Mounting**: 25+ route modules under `/api/*`
19. **Swagger**: OpenAPI docs at `/api/docs`
20. **Error Handling**: 404 → errorLogger → centralized error handler
21. **Server Start**: Listen on `PORT` (default 5000)
22. **Cron Scheduler**: Monthly accrual, year-end carry-forward, token cleanup
23. **Graceful Shutdown**: SIGTERM/SIGINT handlers

---

## 5. Configuration

### 5.1 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development         # development | production | test

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skyraksys_hrm
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_LOGGING=false

# JWT
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Features
SEED_DEMO_DATA=false
RATE_LIMIT_ENABLED=true
```

### 5.2 Database Config (`config/config.js`)

- **Connection pool**: min 2, max 10, acquire 60s, idle 30s
- **Slow query detection**: Queries >100ms logged as warnings
- **SSL**: Enabled in production (`rejectUnauthorized: false`)
- **Dialect options**: Decimal as floats, BigInt as strings

### 5.3 Auth Config (`config/auth.config.js`)

- **Access token**: Env `JWT_SECRET`, 15min expiry
- **Refresh token**: Env `JWT_REFRESH_SECRET`, 7 days expiry
- **Token payload**: `{ id, role, jti, employeeId }`

---

## 6. Middleware Reference

### Authentication (`middleware/auth.js`)

| Export | Purpose |
|--------|---------|
| `authenticateToken` | Reads JWT from `Authorization: Bearer` header OR `accessToken` cookie. Verifies signature, checks blacklist, attaches `req.user` |
| `authorize(...roles)` | Checks `req.user.role` against allowed roles |
| `isAdminOrHR` | Shorthand for `authorize('admin', 'hr')` |
| `isManagerOrAbove` | Shorthand for `authorize('manager', 'admin', 'hr')` |
| `canAccessEmployee` | Admin/HR → pass; own record → pass; manager → checks subordinate chain |
| `generateAccessToken(user)` | Creates signed JWT with 15min expiry |
| `generateRefreshToken(user)` | Creates signed refresh JWT with 7d expiry |

### Field Access Control (`middleware/enhancedFieldAccessControl.js`)

Role-based field permissions matrix. Sensitive fields like `aadhaarNumber`, `panNumber`, `bankAccountNumber`, `salary` are restricted.

| Role | View Fields | Edit Fields |
|------|------------|-------------|
| Admin | All fields | All fields |
| HR | All fields | Most fields (not system) |
| Manager | Team fields (no financial) | Limited team fields |
| Employee | Own fields (no sensitive) | Personal info only |

### Validation (`middleware/validate.js`)

```javascript
// Usage in route:
router.post('/', validate(createEmployeeSchema), controller.create);
router.get('/', validateQuery(querySchema), controller.getAll);
router.get('/:id', validateParams(uuidParamSchema), controller.getById);
```

- Strips unknown fields (`stripUnknown: true`)
- Returns all errors (`abortEarly: false`)
- 16 validation schema modules in `middleware/validators/`

### Rate Limiting

| Limiter | Limit | Window |
|---------|-------|--------|
| Global | 100 req | 15 min |
| Login (per-IP) | 5 attempts | 15 min |
| Login (per-user) | 10 attempts | 1 hour |
| Bulk operations | 20 req | 15 min |
| Password reset | 3 req | 1 hour |
| Profile update | 20 req | 15 min |

Login limiter uses exponential backoff after 3 failures.

### File Upload (`middleware/upload.js`)

- Multer with 5MB limit
- JPEG/PNG/WebP only (extension + MIME check)
- **Magic-byte validation**: Reads first 4 bytes to verify actual file type
- Parses embedded JSON in FormData fields (`salary`, `salaryStructure`)

---

## 7. Service Layer Patterns

### 7.1 BaseService

Generic CRUD wrapper for any Sequelize model:

```javascript
class MyService extends BaseService {
  constructor() {
    super(db.MyModel);
  }
  // Inherits: findAll, findById, create, update, delete
  // Override any method for custom logic
}
```

### 7.2 Business Services

Located in `services/business/`. Each service enforces RBAC and wraps multi-model operations in transactions:

```javascript
// Example: EmployeeBusinessService.createEmployee()
async createEmployee(employeeData, currentUser) {
  const transaction = await sequelize.transaction();
  try {
    // 1. Create User account
    // 2. Create Employee record
    // 3. Create SalaryStructure
    // 4. Initialize LeaveBalances for all types
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

**Key Business Services**:

| Service | Critical Logic |
|---------|---------------|
| `EmployeeBusinessService` | User+Employee+Salary+LeaveBalance in one transaction. Employee ID generation with row-level lock |
| `LeaveBusinessService` | Balance checking, approval with transaction lock, balance deduction/restoration |
| `TimesheetBusinessService` | Status workflow (Draft→Submitted→Approved), daily hour validation |
| `PayrollBusinessService` | Indian compliance: EPF, ESI, PT, TDS calculation. Status: draft→calculated→approved→paid |

### 7.3 Data Services

Located in `services/data/`. Pure Sequelize wrappers — no business logic:

```javascript
// EmployeeDataService
findEmployeeWithDetails(id)       // Includes dept, position, manager, salary
findByUserId(userId)              // Find employee by associated user
```

### 7.4 Salary Structure Mapping

`EmployeeBusinessService.prepareSalaryStructureData()` maps frontend JSON to DB columns:

```
Frontend (nested JSON)              →  Database (flat columns)
salary.basicSalary                  →  basicSalary
salary.allowances.hra               →  hra
salary.allowances.other             →  allowances
salary.deductions.pf                →  pfContribution
salary.deductions.esi               →  esi
salary.deductions.incomeTax         →  tds
salary.deductions.professionalTax   →  professionalTax
salary.deductions.other             →  otherDeductions
salary.currency                     →  currency
salary.effectiveFrom                →  effectiveFrom
```

---

## 8. Error Handling

### Error Hierarchy

```
AppError (base)
├── ValidationError   (400)
├── BadRequestError   (400)
├── UnauthorizedError (401)
├── ForbiddenError    (403)
├── NotFoundError     (404)
└── ConflictError     (409)
```

### Throwing Errors

```javascript
const { NotFoundError, ValidationError } = require('../utils/errors');

// In services:
throw new NotFoundError('Employee not found');
throw new ValidationError('Invalid email format', [
  { field: 'email', message: 'Must be a valid email address' }
]);
```

### Error Response Format

All errors are formatted by the centralized error handler:

```json
{
  "success": false,
  "message": "Employee not found",
  "errors": [{ "field": "id", "message": "No employee with this ID" }],
  "timestamp": "2026-03-26T10:00:00.000Z"
}
```

The handler also translates Sequelize errors:
- `SequelizeValidationError` → 400
- `SequelizeUniqueConstraintError` → 409
- `SequelizeForeignKeyConstraintError` → 400
- JWT errors → 401

---

## 9. Utility Reference

| Module | Key Exports | Usage |
|--------|------------|-------|
| `ApiResponse` | `success()`, `error()`, `paginated()` | Consistent response envelope |
| `errors` | 7 error classes | Throw typed operational errors |
| `LogHelper` | `logBusinessEvent()`, `logSecurityEvent()` | Structured event logging |
| `EncryptionService` | `encrypt()`, `decrypt()` | AES-256-GCM for sensitive data (PAN, Aadhaar, bank) |
| `sanitizer` | `sanitizeText()`, `sanitizeBasicHtml()` | XSS prevention |
| `tokenBlacklist` | `add(jti, ttl)`, `has(jti)` | In-memory JWT blacklist |
| `payslipGenerator` | `generatePayslipPDF()` | PDFKit-based payslip generation |
| `payslipPdfGenerator` | `generatePayslipPdf()` | Puppeteer HTML→PDF payslip |
| `TaskValidator` | `validateTaskAccess()` | Task access control logic |

---

## 10. Adding a New Feature

### Step-by-Step Guide

**Example: Adding a "Training" module**

1. **Create Model** (`models/training.model.js`):
   ```javascript
   module.exports = (sequelize, DataTypes) => {
     const Training = sequelize.define('Training', {
       id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
       title: { type: DataTypes.STRING, allowNull: false },
       // ... more fields
     }, { paranoid: true, timestamps: true });
     
     Training.associate = (models) => {
       Training.belongsTo(models.Employee, { foreignKey: 'employeeId' });
     };
     return Training;
   };
   ```

2. **Create Migration** (`migrations/20260326-create-training.js`):
   ```bash
   npx sequelize-cli migration:generate --name create-training
   ```

3. **Create Validation Schema** (`middleware/validators/training.validator.js`):
   ```javascript
   const Joi = require('joi');
   module.exports = {
     createTrainingSchema: Joi.object({ title: Joi.string().required(), ... }),
     updateTrainingSchema: Joi.object({ title: Joi.string(), ... })
   };
   ```

4. **Create Service** (`services/training.service.js`):
   ```javascript
   const BaseService = require('./BaseService');
   class TrainingService extends BaseService {
     constructor() { super(db.Training); }
     // Custom methods here
   }
   ```

5. **Create Route** (`routes/training.routes.js`):
   ```javascript
   const router = require('express').Router();
   const { authenticateToken, authorize } = require('../middleware/auth');
   const { validate } = require('../middleware/validate');
   
   router.get('/', authenticateToken, controller.getAll);
   router.post('/', authenticateToken, authorize('admin','hr'), validate(schema), controller.create);
   ```

6. **Mount Route** in `server.js`:
   ```javascript
   app.use('/api/training', require('./routes/training.routes'));
   ```

7. **Write Tests** (`tests/training.test.js`)

---

## 11. Testing

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- --watch         # Watch mode
npm test -- tests/auth.test.js  # Single file
```

### Test Configuration (`jest.config.js`)

- Test environment: Node
- Setup: `tests/setup.js` (loads .env.test)
- Coverage: statements/branches/functions/lines
- Timeout: 30s

### Test Patterns

```javascript
const request = require('supertest');
const app = require('../server');

describe('Employee API', () => {
  let authToken;
  
  beforeAll(async () => {
    // Login and get token
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'admin@skyraksys.com', password: 'Admin@123' });
    authToken = res.headers['set-cookie'];
  });

  it('should list employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Cookie', authToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## 12. Logging

### Log Files

| File | Content | Rotation |
|------|---------|----------|
| `logs/error.log` | Error-level only | 5MB, 5 files |
| `logs/combined.log` | All levels | 5MB, 5 files |
| `logs/access.log` | HTTP requests | 5MB, 5 files |

### Structured Logging

```javascript
const { LogHelper } = require('../utils/logHelper');

LogHelper.logBusinessEvent('Employee Created', { employeeId: emp.id });
LogHelper.logSecurityEvent('Failed Login', { email, ip: req.ip });
LogHelper.logAuthEvent('Token Refreshed', { userId });
LogHelper.logDataMutation('Salary Updated', { employeeId, changes });
LogHelper.logPerformance('Payroll Calculation', { duration: '2.3s' });
```

Sensitive fields (`password`, `token`, `aadhaar`, `pan`, `bankAccount`) are auto-sanitized.

---

## 13. Cron Jobs (`services/scheduler.js`)

| Schedule | Job | Description |
|----------|-----|-------------|
| `0 5 1 * *` | Monthly leave accrual | 1st of every month at 00:05 |
| `0 0 1 1 *` | Year-end carry-forward | January 1 at midnight |
| `0 0 2 * *` | Token cleanup | Daily at 02:00 — purges expired refresh tokens and blacklist entries |

---

## 14. Common Patterns

### Transaction Wrapping
```javascript
const transaction = await sequelize.transaction();
try {
  await Model1.create(data1, { transaction });
  await Model2.update(data2, { where: { id }, transaction });
  await transaction.commit();
} catch (err) {
  await transaction.rollback();
  throw err;
}
```

### Pagination
```javascript
const { page = 1, limit = 10 } = req.query;
const offset = (page - 1) * limit;
const { rows, count } = await Model.findAndCountAll({ where, limit, offset, include });
return ApiResponse.paginated(res, rows, { page, limit, total: count });
```

### Audit Logging
```javascript
await db.AuditLog.create({
  userId: req.user.id,
  entityName: 'Employee',
  entityId: employee.id,
  action: 'UPDATE',
  changes: { salary: { old: oldSalary, new: newSalary } },
  ipAddress: req.ip
});
```

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
