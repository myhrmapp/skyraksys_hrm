/**
 * API Endpoints Configuration
 * Centralized API endpoint definitions for the HRM System
 * Backend API Base: /api
 */

export const API_ENDPOINTS = {
  // Authentication & Authorization
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // User Management
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
    ACTIVATE: (id) => `/users/${id}/activate`,
    DEACTIVATE: (id) => `/users/${id}/deactivate`,
  },

  // Employee Management
  EMPLOYEES: {
    BASE: '/employees',
    BY_ID: (id) => `/employees/${id}`,
    ME: '/employees/me',
    PHOTO: (id) => `/employees/${id}/photo`,
    STATISTICS: '/employees/statistics',
    BULK_UPDATE: '/employees/bulk-update',
    META: {
      DEPARTMENTS: '/employees/meta/departments',
      POSITIONS: '/employees/meta/positions',
    },
  },

  // Department Management
  DEPARTMENTS: {
    BASE: '/departments',
    BY_ID: (id) => `/departments/${id}`,
    POSITIONS: (id) => `/departments/${id}/positions`,
  },

  // Position Management
  POSITIONS: {
    BASE: '/positions',
    BY_ID: (id) => `/positions/${id}`,
    BY_DEPARTMENT: (deptId) => `/positions/department/${deptId}`,
  },

  // Leave Management
  LEAVE: {
    BASE: '/leaves',
    BY_ID: (id) => `/leaves/${id}`,
    APPROVE: (id) => `/leaves/${id}/approve`,
    REJECT: (id) => `/leaves/${id}/reject`,
    CANCEL: (id) => `/leaves/${id}/cancel`,
    MY_REQUESTS: '/leaves/my-requests',
    PENDING: '/leaves/pending',
    TYPES: '/leaves/types',
    TYPE_BY_ID: (id) => `/leaves/types/${id}`,
  },

  // Leave Balance (Admin)
  LEAVE_BALANCES: {
    BASE: '/admin/leave-balances',
    BY_EMPLOYEE: (employeeId) => `/admin/leave-balances/employee/${employeeId}`,
    BY_ID: (id) => `/admin/leave-balances/${id}`,
    BULK_UPDATE: '/admin/leave-balances/bulk-update',
  },

  // Timesheet Management
  TIMESHEETS: {
    BASE: '/timesheets',
    BY_ID: (id) => `/timesheets/${id}`,
    SUBMIT: (id) => `/timesheets/${id}/submit`,
    APPROVE: (id) => `/timesheets/${id}/approve`,
    REJECT: (id) => `/timesheets/${id}/reject`,
    MY_TIMESHEETS: '/timesheets/my-timesheets',
    PENDING: '/timesheets/pending',
    WEEKLY: '/timesheets/weekly',
  },

  // Project Management
  PROJECTS: {
    BASE: '/projects',
    BY_ID: (id) => `/projects/${id}`,
    TASKS: (id) => `/projects/${id}/tasks`,
    MEMBERS: (id) => `/projects/${id}/members`,
  },

  // Task Management
  TASKS: {
    BASE: '/tasks',
    BY_ID: (id) => `/tasks/${id}`,
    BY_PROJECT: (projectId) => `/tasks?projectId=${projectId}`,
  },

  // Payroll Management
  PAYROLL: {
    BASE: '/payroll-data',
    BY_ID: (id) => `/payroll-data/${id}`,
    BY_EMPLOYEE: (employeeId) => `/payroll-data/employee/${employeeId}`,
    CALCULATE: '/payroll-data/calculate',
    PROCESS: '/payroll-data/process',
  },

  // Payslip Management
  PAYSLIPS: {
    BASE: '/payslips',
    BY_ID: (id) => `/payslips/${id}`,
    GENERATE: '/payslips/generate',
    REGENERATE: (id) => `/payslips/${id}/regenerate`,
    BY_EMPLOYEE: (employeeId) => `/payslips/employee/${employeeId}`,
    DOWNLOAD: (id) => `/payslips/${id}/download`,
    DOWNLOAD_BULK: '/payslips/download-bulk',
  },

  // Payslip Templates
  PAYSLIP_TEMPLATES: {
    BASE: '/payslip-templates',
    BY_ID: (id) => `/payslip-templates/${id}`,
    ACTIVE: '/payslip-templates/active',
    PREVIEW: (id) => `/payslip-templates/${id}/preview`,
  },

  // Salary Structure
  SALARY_STRUCTURES: {
    BASE: '/salary-structures',
    BY_ID: (id) => `/salary-structures/${id}`,
    BY_EMPLOYEE: (employeeId) => `/salary-structures/employee/${employeeId}`,
  },

  // Dashboard & Analytics
  DASHBOARD: {
    STATS: '/dashboard/stats',
    EMPLOYEE_STATS: '/dashboard/employee-stats',
    LEAVE_STATS: '/dashboard/leave-stats',
    TIMESHEET_STATS: '/dashboard/timesheet-stats',
    PAYROLL_STATS: '/dashboard/payroll-stats',
  },

  // Admin Features
  ADMIN: {
    AUDIT_LOGS: '/admin/audit-logs',
    EMAIL_CONFIG: '/admin/email-config',
    EMAIL_TEST: '/admin/email-config/test',
    EMAIL_SEND_TEST: '/admin/email-config/send-test',
    CONFIG: '/admin/config',
  },

  // System Configuration (Admin Only - Password Required)
  SYSTEM_CONFIG: {
    BASE: '/system-config',
    BACKUP: '/system-config/backup',
    RESTORE: '/system-config/restore',
    LOGS: '/system-config/logs',
  },

  // Email Management
  EMAIL: {
    WELCOME: (userId) => `/email/welcome/${userId}`,
    PASSWORD_RESET: (userId) => `/email/password-reset/${userId}`,
    ACCOUNT_STATUS: (userId) => `/email/account-status/${userId}`,
  },

  // Performance Monitoring
  PERFORMANCE: {
    SERVER_METRICS: '/performance/server-metrics',
    DATABASE_METRICS: '/performance/database-metrics',
  },

  // Employee Reviews
  EMPLOYEE_REVIEWS: {
    BASE: '/employee-reviews',
    BY_ID: (id) => `/employee-reviews/${id}`,
    STATUS: (id) => `/employee-reviews/${id}/status`,
    DASHBOARD: '/employee-reviews/meta/dashboard',
  },

  // Leave Accrual
  LEAVE_ACCRUAL: {
    STATUS: '/leave-accrual/status',
    PREVIEW: '/leave-accrual/preview',
    RUN: '/leave-accrual/run',
    CARRY_FORWARD: '/leave-accrual/carry-forward',
  },

  // Settings
  SETTINGS: {
    BASE: '/settings',
    BY_KEY: (key) => `/settings/${key}`,
    COMPANY: '/settings/company',
    LEAVE: '/settings/leave',
    PAYROLL: '/settings/payroll',
  },

  // Restore (Soft Delete Recovery)
  RESTORE: {
    EMPLOYEE_REVIEWS: '/restore/employee-reviews',
    RESTORE_REVIEW: (id) => `/restore/employee-reviews/${id}`,
    LEAVE_BALANCES: '/restore/leave-balances',
    RESTORE_BALANCE: (id) => `/restore/leave-balances/${id}`,
    USERS: '/restore/users',
    RESTORE_USER: (id) => `/restore/users/${id}`,
  },

  // Debug (Development Only)
  DEBUG: {
    HEALTH: '/debug/health',
    DATABASE: '/debug/database',
    SEED: '/debug/seed-demo',
  },

  // API Documentation
  DOCS: {
    SWAGGER: '/docs',
    JSON: '/api-docs.json',
  },
};

// Helper function to build query string
export const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

// Helper function to get full endpoint with query params
export const getEndpoint = (endpoint, params = {}) => {
  return `${endpoint}${buildQueryString(params)}`;
};

export default API_ENDPOINTS;
