# Security and Hardening Guide

## Security principles

- No secrets in source-controlled files
- No default production passwords
- No public database exposure
- No public admin or diagnostic tooling by default
- Fail-closed environment validation before startup

## Required secret values

The application requires strong values for:

- DB_PASSWORD
- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- SEED_DEFAULT_PASSWORD
- SMTP credentials when email is enabled

These values must be present in the environment file and should never be stored in legacy deployment scripts, shell command history, or logs.

## Runtime validation

The backend validates required configuration before service startup. Missing or placeholder values should stop startup instead of continuing in a broken configuration state.

## Network exposure policy

- PostgreSQL remains internal-only
- Nginx is the public entry point
- pgAdmin is opt-in and should remain non-public in production
- Public access is restricted to the app and TLS termination layer only

## RBAC and auth

- Role-based authorization controls access to protected endpoints
- JWT access and refresh tokens are required for protected flows
- Refresh and credential handling must be validated before release

## Data protection

- Sensitive payroll and invoice fields must remain encrypted and handled by the server-managed vault layers
- PDFs and exports should not expose protected data beyond authorized users
- Logging should avoid persistent recording of raw secrets or sensitive payloads

## Production hardening checklist

- Remove placeholder and demo credentials
- Keep app and database private to the internal network
- Validate `.env.production` before service start
- Keep a valid backup and rollback process
- Review TLS and reverse proxy configuration before live deployment
