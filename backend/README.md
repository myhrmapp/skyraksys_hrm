# SkyRakSys HRM System - Backend

A comprehensive Human Resources Management System backend built with Node.js, Express, and PostgreSQL.

## 🌟 Recent Improvements (October 2025)

**Phase 1 Enhancements Complete:**
- ✅ **Standardized Error Handling** - 7 custom error classes for consistent error responses
- ✅ **Input Validation** - Joi schemas with validation middleware on all routes
- ✅ **Performance Optimized** - N+1 query fixes (50x improvement on bulk operations)
- ✅ **Database Indexed** - 13 new indexes for faster queries
- ✅ **Real-Time Monitoring** - Performance dashboard at `/status` endpoint
- ✅ **Code Organization** - 99 debug scripts organized into logical directories

**Performance Metrics:**
- Bulk timesheet approval (100 records): 2000ms → 50ms (**40x faster**)
- Payroll generation (50 employees): 1500ms → 150ms (**10x faster**)
- Database queries reduced from ~650 to ~13 for batch operations

See [PHASE1_IMPLEMENTATION_SUMMARY.md](../PHASE1_IMPLEMENTATION_SUMMARY.md) for details.

## Features

- **Employee Management**: Complete employee lifecycle management with validation
- **Leave Management**: Leave requests, approvals, and balance tracking
- **Timesheet Management**: Optimized time tracking and approval workflows
- **Payroll Management**: Automated payroll processing and payslip generation
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **RESTful API**: Well-documented REST API endpoints with error handling
- **Performance Monitoring**: Real-time metrics dashboard and query logging

## Tech Stack

- **Backend**: Node.js 22.16.0, Express.js 4.18.2
- **Database**: PostgreSQL 17.5 with Sequelize ORM 6.37.7
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi 17.11.0 with custom middleware
- **Security**: Helmet, bcryptjs, rate limiting, CORS
- **Logging**: Winston with structured logging
- **Monitoring**: express-status-monitor, response-time tracking
- **Error Handling**: Custom error classes with proper HTTP status codes

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Quick Start

**First time?** Follow the full step-by-step guide in [docs/SETUP.md](../docs/SETUP.md).
It covers PostgreSQL setup, environment configuration, migrations, and seeding in one place.

**Short version (if you know what you are doing):**

```bash
# 1. Copy and fill in environment config
cp .env.example .env
# Edit .env: set DB_USER, DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 2. Install dependencies
npm install

# 3. Run migrations and seed data
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# 4. Start the backend (development mode with auto-reload)
npm run dev
```

The backend API runs on **http://localhost:5000**

Health check: http://localhost:5000/health


## 📖 API Documentation

### Swagger/OpenAPI Documentation

Interactive API documentation is available via Swagger UI:

```
http://localhost:5000/api-docs
```

**Features:**
- Complete API endpoint reference
- Request/response schemas
- Try it out functionality (test endpoints directly)
- Authentication support (add Bearer token)
- Organized by module (Auth, Employees, Leave, Timesheets, Payroll, etc.)

**How to Use:**
1. Start the backend server
2. Open `http://localhost:5000/api-docs` in your browser
3. Click "Authorize" button to add your JWT token
4. Browse and test endpoints using "Try it out"

### API Endpoints Summary

**Authentication**: `/api/auth/*`
- POST `/auth/login` - User login
- GET `/auth/profile` - Get current user
- PUT `/auth/change-password` - Change password

**Employees**: `/api/employees/*`
- GET `/employees` - List all employees (paginated)
- GET `/employees/:id` - Get employee details
- POST `/employees` - Create new employee
- PUT `/employees/:id` - Update employee
- DELETE `/employees/:id` - Soft delete employee

**Leave Management**: `/api/leaves/*`
- GET `/leaves` - List leave requests
- POST `/leaves` - Create leave request
- PUT `/leaves/:id/approve` - Approve leave
- PUT `/leaves/:id/reject` - Reject leave
- GET `/leaves/balance/:employeeId` - Get leave balance

**Timesheets**: `/api/timesheets/*`
- GET `/timesheets` - List timesheets (filtered)
- POST `/timesheets` - Create timesheet
- POST `/timesheets/bulk-approve` - Bulk approve
- POST `/timesheets/bulk-reject` - Bulk reject

**Payroll**: `/api/payroll/*`
- POST `/payroll/generate` - Generate payroll
- GET `/payroll/:id` - Get payroll details
- PUT `/payroll/:id/status` - Update payroll status

See Swagger documentation for complete details.

## Default Users

## API Documentation

### Base URL
```
http://localhost:8080/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/register` | User registration |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | User logout |
| GET | `/auth/profile` | Get user profile |
| PUT | `/auth/profile` | Update user profile |
| PUT | `/auth/change-password` | Change password |

### Employee Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/employees` | Get all employees | All |
| GET | `/employees/:id` | Get employee by ID | All |
| POST | `/employees` | Create employee | Admin, HR |
| PUT | `/employees/:id` | Update employee | Admin, HR, Self |
| DELETE | `/employees/:id` | Deactivate employee | Admin, HR |
| GET | `/employees/meta/departments` | Get departments | All |
| GET | `/employees/meta/positions` | Get positions | All |
| GET | `/employees/meta/dashboard` | Get dashboard stats | All |

### Leave Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/leaves` | Get leave requests | All |
| GET | `/leaves/:id` | Get leave request by ID | All |
| POST | `/leaves` | Create leave request | All |
| PUT | `/leaves/:id/status` | Approve/reject leave | Manager, Admin, HR |
| PUT | `/leaves/:id/cancel` | Cancel leave request | Self |
| GET | `/leaves/balance/:employeeId?` | Get leave balance | All |
| GET | `/leaves/types` | Get leave types | All |
| GET | `/leaves/statistics` | Get leave statistics | All |

### Timesheet Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/timesheets` | Get timesheets | All |
| GET | `/timesheets/:id` | Get timesheet by ID | All |
| POST | `/timesheets` | Create timesheet | All |
| PUT | `/timesheets/:id` | Update timesheet | Self |
| PUT | `/timesheets/:id/submit` | Submit timesheet | Self |
| PUT | `/timesheets/:id/status` | Approve/reject timesheet | Manager, Admin, HR |
| DELETE | `/timesheets/:id` | Delete timesheet | Self (Draft only) |
| GET | `/timesheets/summary/:employeeId?` | Get timesheet summary | All |
| GET | `/timesheets/meta/projects` | Get projects | All |
| GET | `/timesheets/meta/projects/:id/tasks` | Get project tasks | All |

### Payroll Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/payroll` | Get payroll records | Admin, HR, Self |
| GET | `/payroll/:id` | Get payroll by ID | Admin, HR, Self |
| POST | `/payroll/generate` | Generate payroll | Admin, HR |
| PUT | `/payroll/:id/status` | Update payroll status | Admin, HR |
| GET | `/payroll/meta/dashboard` | Get payroll dashboard | Admin, HR |
| GET | `/payroll/employee/:id/summary` | Get employee payroll summary | All |

## Default Users

After running the seeders, you can login with these demo accounts:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@skyraksys.com | StrongSeedPassword2026! | System Administrator |
| HR | hr@skyraksys.com | StrongSeedPassword2026! | HR Manager |
| Manager | lead@skyraksys.com | StrongSeedPassword2026! | Team Lead/Manager |
| Employee | employee1@skyraksys.com | StrongSeedPassword2026! | Software Engineer |
| Employee | employee2@skyraksys.com | StrongSeedPassword2026! | Software Engineer |

## Role-Based Access Control

### Admin
- Full access to all modules
- Can manage all employees, leaves, timesheets, and payroll
- Can view system-wide reports and analytics

### HR
- Full access to employee management
- Can view and manage all leave requests
- Can process payroll for all employees
- Can view HR analytics and reports

### Manager
- Can view and manage subordinates' data
- Can approve/reject leave requests for team members
- Can approve/reject timesheets for team members
- Can view team analytics

### Employee
- Can view and update own profile
- Can create and cancel own leave requests
- Can create and submit own timesheets
- Can view own payslips and leave balance

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Secure token-based authentication
- **Refresh Tokens**: Automatic token refresh mechanism
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Joi schema validation for all inputs
- **SQL Injection Protection**: Sequelize ORM with parameterized queries
- **CORS Protection**: Configurable CORS settings
- **Helmet**: Security headers middleware

## Database Schema

The system uses PostgreSQL with the following main entities:

- **Users**: Authentication and user roles
- **Employees**: Employee profiles and organizational data
- **Departments**: Organizational departments
- **Positions**: Job positions and roles
- **LeaveTypes**: Types of leave (sick, annual, etc.)
- **LeaveRequests**: Leave request records
- **LeaveBalances**: Employee leave balances
- **Projects**: Project management
- **Tasks**: Task assignment and tracking
- **Timesheets**: Time tracking entries
- **Payroll**: Payroll processing records
- **PayrollComponents**: Salary component breakdown
- **SalaryStructures**: Employee salary configurations

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Run tests
npm test

# Run database migrations
npm run migrate

# Run database seeders
npm run seed

# Reset database
npm run db:reset
```

## 📊 Performance Monitoring

### Real-Time Dashboard

Access the performance monitoring dashboard:
```
http://localhost:5000/status
```

**Features:**
- CPU and memory usage graphs
- Response time tracking
- Requests per second (RPS)
- HTTP status code distribution
- Real-time metrics updates

### Query Logging

Enable database query logging in development:

```bash
# In .env file
ENABLE_QUERY_LOGGING=true
LOG_ALL_QUERIES=false  # Set to true for verbose logging
```

**Automatic Alerts:**
- Slow requests (>500ms) are logged automatically
- Slow queries (>100ms) trigger warnings
- Response time included in all HTTP responses via `X-Response-Time` header

See [MONITORING.md](./MONITORING.md) for complete documentation.

## 🛠️ Utility Scripts

Scripts are organized into logical directories:

### Debug Scripts (`utils/debug/`)
Database inspection and verification tools:
```bash
node utils/debug/check-database.js
node utils/debug/verify-indexes.js
node utils/debug/check-employees.js
```

### Maintenance Scripts (`utils/maintenance/`)
Data setup, fixes, and updates:
```bash
node utils/maintenance/setup-leave-system.js
node utils/maintenance/create-sample-data.js
```

### Manual Tests (`tests/manual/`)
API endpoint testing scripts:
```bash
node tests/manual/test-auth-token.js
node tests/manual/test-timesheet-workflow.js
```

See README files in each directory for detailed documentation.

## Error Handling

The API uses standardized error classes with consistent response format:

**Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

**Available Error Classes:**
- `ValidationError` (400) - Input validation failures
- `UnauthorizedError` (401) - Authentication required
- `ForbiddenError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict (duplicate)
- `BadRequestError` (400) - Invalid request
- `AppError` (custom) - Base error class

See [VALIDATION_INTEGRATION.md](./VALIDATION_INTEGRATION.md) for validation documentation.

## Health Check

Check API and database status:

```bash
GET /api/health
```

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-10-28T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "database": "connected"
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-10-28T10:30:00.000Z",
  "error": "Database connection failed"
}
```

## 📚 Documentation

- **[PHASE1_IMPLEMENTATION_SUMMARY.md](../PHASE1_IMPLEMENTATION_SUMMARY.md)** - Phase 1 improvements summary
- **[VALIDATION_INTEGRATION.md](./VALIDATION_INTEGRATION.md)** - Validation system guide
- **[N+1_QUERY_FIXES.md](./N+1_QUERY_FIXES.md)** - Performance optimization details
- **[MONITORING.md](./MONITORING.md)** - Performance monitoring guide
- **[API Documentation](./docs/api/)** - Complete API reference
- **[10-RECOMMENDATIONS.md](../guides/10-RECOMMENDATIONS.md)** - Improvement roadmap

## Contributing

1. Follow the existing code style and patterns
2. Use validation schemas for all new endpoints
3. Write tests for new features
4. Update documentation for API changes
5. Use meaningful commit messages
6. Test performance impact of changes
7. Check monitoring dashboard after deployments

## License

This project is licensed under the MIT License.
