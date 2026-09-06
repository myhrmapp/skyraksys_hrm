# Architecture Overview

## Application overview

SkyrakSys HRM is a full-stack HR management platform with a React frontend, a Node.js/Express backend, PostgreSQL persistence, Redis for runtime support, Docker Compose for orchestration, and Nginx as the reverse proxy.

## Runtime architecture

- Frontend: React application served through the containerized frontend service and proxied by Nginx
- Backend: Express API on port 5000
- Database: PostgreSQL 17 running inside the internal Docker network
- Redis: in-memory support for session and token runtime use cases
- Nginx: public entry point for HTTP and HTTPS traffic

## Main system boundaries

### Frontend boundary

- User interface for employee, leave, attendance, timesheet, payroll, invoice, and performance workflows
- Calls the backend through a routed API path
- Uses a production API base URL configured through environment variables

### Backend boundary

- REST API layer
- Business logic services
- Auth and authorization middleware
- Database access through Sequelize models
- File upload and PDF generation for sensitive workflows

### Database boundary

- Core operational data stored in PostgreSQL
- Model-driven schema managed through migrations
- Internal-only connectivity between containers

### Security boundary

- Secrets stored in environment configuration, not hardcoded in source files
- JWT secrets and encryption keys validated during startup
- Production deployment keeps database and admin surfaces off the public network

## Key modules

- Employee management
- Leave management
- Attendance
- Timesheet
- Payroll and payslips
- Invoices
- Notifications
- Performance and goals
- System settings and security configuration

## Deployment topology

The supported deployment model is Docker Compose with:

- Postgres service inside the private Docker network
- Backend service inside the same network
- Frontend and mobile web build services behind Nginx
- Nginx exposed on port 80 and 443
- Internal-only database and service-to-service traffic

This is the current production deployment model. Legacy PM2 and custom host-specific deployment instructions are not the active support model.
