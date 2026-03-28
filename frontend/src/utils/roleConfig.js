/**
 * Role-Based Access Control Configuration
 * Centralized configuration for route access and feature permissions
 * Updated for full route coverage
 */

// Define user roles
export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
};

// Define route access permissions
export const ROUTE_PERMISSIONS = {
  // Dashboard Routes
  '/dashboard': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/admin-dashboard': [ROLES.ADMIN, ROLES.HR],
  '/employee-dashboard': [ROLES.EMPLOYEE],
  '/manager-dashboard': [ROLES.MANAGER],
  '/performance-dashboard': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER],
  
  // Employee Management Routes
  '/employees': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER],
  '/employees/add': [ROLES.ADMIN, ROLES.HR],
  '/employees/:id': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER],
  '/employees/:id/edit': [ROLES.ADMIN, ROLES.HR],
  '/employees/:id/user-account': [ROLES.ADMIN, ROLES.HR],
  '/employee-records': [ROLES.ADMIN, ROLES.HR],
  '/my-profile': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/my-profile/edit/:id': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  
  // Leave Management Routes
  '/leave-management': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER],
  '/leave-requests': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/add-leave-request': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/admin/leave-balances': [ROLES.ADMIN, ROLES.HR],
  
  // Attendance Routes
  '/my-attendance': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/attendance-management': [ROLES.ADMIN, ROLES.HR],

  // Timesheet Routes
  '/timesheets': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/timesheets/week/:weekStart': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/timesheets/history': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/timesheets/approvals': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER],
  
  // Payroll Routes
  '/payroll-management': [ROLES.ADMIN, ROLES.HR],
  '/employee-payslips': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/admin/payslip-templates': [ROLES.ADMIN, ROLES.HR],
  
  // Project & Task Routes
  '/project-task-config': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/my-tasks': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],
  
  // Employee Reviews
  '/employee-reviews': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE],

  // Organization
  '/organization': [ROLES.ADMIN, ROLES.HR],

  // Leave Admin Routes
  '/admin/leave-accrual': [ROLES.ADMIN, ROLES.HR],
  '/admin/leave-types': [ROLES.ADMIN, ROLES.HR],

  // Admin Routes
  '/user-management': [ROLES.ADMIN, ROLES.HR],
  '/position-management': [ROLES.ADMIN, ROLES.HR],
  '/settings': [ROLES.ADMIN],
  '/admin/config': [ROLES.ADMIN],
  '/admin/debug': [ROLES.ADMIN],
  '/admin/settings-hub': [ROLES.ADMIN],
  '/admin/restore': [ROLES.ADMIN, ROLES.HR],
  '/reports': [ROLES.ADMIN, ROLES.HR],
  '/admin/consolidated-reports': [ROLES.ADMIN, ROLES.HR],
  '/admin/payslip-templates-old': [ROLES.ADMIN, ROLES.HR],
  
  // Debug Routes
  '/debug/validation': [ROLES.ADMIN],
  
  // Utility Routes
  '/user-guide': [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]
};

// Helper function to check if user has access to route
export const hasRouteAccess = (userRole, routePath) => {
  // Admin has access to everything
  if (userRole === ROLES.ADMIN) return true;
  
  // Check exact match first
  if (ROUTE_PERMISSIONS[routePath]) {
    return ROUTE_PERMISSIONS[routePath].includes(userRole);
  }
  
  // Check pattern match for dynamic routes
  const routePattern = Object.keys(ROUTE_PERMISSIONS).find(pattern => {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      return regex.test(routePath);
    }
    return false;
  });
  
  if (routePattern) {
    return ROUTE_PERMISSIONS[routePattern].includes(userRole);
  }
  
  // Default deny
  return false;
};

// Get default dashboard route based on role
export const getDefaultDashboard = (userRole) => {
  switch (userRole) {
    case ROLES.ADMIN:
    case ROLES.HR:
      return '/admin-dashboard';
    case ROLES.MANAGER:
      return '/manager-dashboard';
    case ROLES.EMPLOYEE:
      return '/employee-dashboard';
    default:
      return '/employee-dashboard';
  }
};

// Check if user has any of the required roles
export const hasAnyRole = (userRole, requiredRoles) => {
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles];
  }
  return requiredRoles.includes(userRole);
};
