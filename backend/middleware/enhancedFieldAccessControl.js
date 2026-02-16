/**
 * Enhanced Field-Level Access Control with Role-Based Permissions
 * Implements granular field access control based on user roles
 */

const db = require('../models');
const logger = require('../utils/logger');

const FIELD_PERMISSIONS = {
  admin: {
    view: ['*'], // Can view all fields
    edit: ['*'], // Can edit all fields
    sensitive: true // Can access sensitive data
  },
  hr: {
    view: [
      // Personal Information
      'id', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
      'maritalStatus', 'nationality', 'address', 'city', 'state', 'pinCode',
      'photoUrl',
      
      // Employment Information
      'employeeId', 'hireDate', 'joiningDate', 'confirmationDate', 'departmentId',
      'positionId', 'managerId', 'employmentType', 'workLocation', 'status',
      'probationPeriod', 'noticePeriod', 'resignationDate', 'lastWorkingDate',
      
      // Contact Information
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
      
      // Statutory Information
      'aadhaarNumber', 'panNumber', 'uanNumber', 'pfNumber', 'esiNumber',
      
      // Banking Information
      'bankName', 'bankAccountNumber', 'ifscCode', 'bankBranch', 'accountHolderName',
      
      // Salary Information
      'salary', 'salaryStructure',
      
      // User Account Information
      'userId', 'user'
    ],
    edit: [
      'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
      'maritalStatus', 'nationality', 'hireDate', 'departmentId',
      'positionId', 'managerId', 'employmentType', 'workLocation', 'status',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
      'address', 'city', 'state', 'pinCode', 'aadhaarNumber', 'panNumber',
      'bankName', 'bankAccountNumber', 'ifscCode', 'bankBranch', 'accountHolderName',
      'joiningDate', 'confirmationDate', 'resignationDate', 'lastWorkingDate'
    ],
    sensitive: true
  },
  manager: {
    view: [
      // Basic Information
      'id', 'firstName', 'lastName', 'email', 'phone', 'employeeId',
      'hireDate', 'departmentId', 'positionId', 'employmentType', 'workLocation',
      'status', 'photoUrl',
      
      // Contact Information (for emergencies)
      'emergencyContactName', 'emergencyContactPhone',
      
      // Work-related address
      'workLocation', 'address', 'city', 'state',
      
      // User Account Information
      'userId', 'user'
    ],
    edit: [
      'departmentId', 'positionId', 'workLocation', 'status'
    ],
    sensitive: false
  },
  employee: {
    view: [
      // Own basic information
      'id', 'firstName', 'lastName', 'email', 'phone', 'employeeId',
      'hireDate', 'departmentId', 'positionId', 'employmentType',
      'address', 'city', 'state', 'pinCode', 'photoUrl',
      'dateOfBirth', 'gender', 'maritalStatus', 'nationality',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
      
      // Banking Information
      'bankName', 'ifscCode', 'bankBranch', 'bankAccountNumber', 'accountHolderName',
      
      // Statutory Information
      'aadhaarNumber', 'panNumber', 'uanNumber', 'pfNumber', 'esiNumber',
      
      // Salary Information
      'salary', 'salaryStructure',
      
      // Work Details
      'joiningDate', 'confirmationDate', 'probationPeriod', 'noticePeriod', 'workLocation', 'status',
      'resignationDate', 'lastWorkingDate',
      
      // User Account Information (own only)
      'userId', 'user'
    ],
    edit: [
      'phone', 'address', 'city', 'state', 'pinCode',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'
    ],
    sensitive: false
  }
};

const SENSITIVE_FIELDS = [
  'aadhaarNumber',
  'panNumber',
  'bankAccountNumber',
  'salary',
  'salaryStructure',
  'uanNumber',
  'pfNumber',
  'esiNumber'
];

const AUDIT_REQUIRED_FIELDS = [
  'status',
  'departmentId',
  'positionId',
  'managerId',
  'salary',
  'salaryStructure',
  'aadhaarNumber',
  'panNumber',
  'bankAccountNumber'
];

/**
 * Check if user has permission to view a specific field
 */
function canViewField(userRole, fieldName, isOwnRecord = false) {
  const permissions = FIELD_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  // Admin can view everything
  if (permissions.view.includes('*')) return true;
  
  // Check if field is explicitly allowed
  if (permissions.view.includes(fieldName)) return true;
  
  // Special case: employees can only view their own sensitive data
  if (isOwnRecord && userRole === 'employee') {
    return permissions.view.includes(fieldName);
  }
  
  // Check for wildcard patterns (e.g., 'emergencyContact*')
  const wildcardMatch = permissions.view.find(pattern => {
    if (pattern.endsWith('*')) {
      const basePattern = pattern.slice(0, -1);
      return fieldName.startsWith(basePattern);
    }
    return false;
  });
  
  return !!wildcardMatch;
}

/**
 * Check if user has permission to edit a specific field
 */
function canEditField(userRole, fieldName, isOwnRecord = false) {
  const permissions = FIELD_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  // Admin can edit everything
  if (permissions.edit.includes('*')) return true;
  
  // Check if field is explicitly allowed for editing
  if (permissions.edit.includes(fieldName)) return true;
  
  // Special case: employees can only edit their own allowed fields
  if (isOwnRecord && userRole === 'employee') {
    return permissions.edit.includes(fieldName);
  }
  
  return false;
}

/**
 * Check if user can access sensitive data
 */
function canAccessSensitiveData(userRole) {
  const permissions = FIELD_PERMISSIONS[userRole];
  return permissions?.sensitive || false;
}

/**
 * Filter employee data based on user permissions
 */
function filterEmployeeData(employeeData, userRole, userId, isOwnRecord = false) {
  if (!employeeData) return null;
  
  const filteredData = {};
  
  Object.keys(employeeData).forEach(field => {
    // Special handling for nested objects (department, position, manager)
    if (field === 'department' && employeeData[field]) {
      if (canViewField(userRole, 'departmentId', isOwnRecord)) {
        filteredData[field] = employeeData[field];
      }
      return;
    }
    
    if (field === 'position' && employeeData[field]) {
      if (canViewField(userRole, 'positionId', isOwnRecord)) {
        filteredData[field] = employeeData[field];
      }
      return;
    }
    
    if (field === 'manager' && employeeData[field]) {
      if (canViewField(userRole, 'managerId', isOwnRecord)) {
        filteredData[field] = employeeData[field];
      }
      return;
    }
    
    // Check if user can view this field
    if (canViewField(userRole, field, isOwnRecord)) {
      // Additional check for sensitive fields
      if (SENSITIVE_FIELDS.includes(field)) {
        if (canAccessSensitiveData(userRole) || isOwnRecord) {
          filteredData[field] = employeeData[field];
        } else {
          filteredData[field] = '***RESTRICTED***';
        }
      } else {
        filteredData[field] = employeeData[field];
      }
    }
  });
  
  return filteredData;
}

/**
 * Validate edit permissions for update data
 */
function validateEditPermissions(updateData, userRole, isOwnRecord = false) {
  const errors = [];
  
  Object.keys(updateData).forEach(field => {
    if (!canEditField(userRole, field, isOwnRecord)) {
      errors.push(`You don't have permission to edit field: ${field}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create audit log entry for sensitive operations and persist to DB
 */
async function createAuditLog(action, employeeId, fieldName, oldValue, newValue, userId, userRole) {
  // Only log changes to audit-required fields
  if (!AUDIT_REQUIRED_FIELDS.includes(fieldName)) return null;
  
  const logEntry = {
    action: `field_update:${action}`,
    entityType: 'Employee',
    entityId: employeeId,
    fieldName,
    oldValue: SENSITIVE_FIELDS.includes(fieldName) ? '***MASKED***' : String(oldValue ?? ''),
    newValue: SENSITIVE_FIELDS.includes(fieldName) ? '***MASKED***' : String(newValue ?? ''),
    userId,
    userRole,
    timestamp: new Date()
  };

  try {
    if (db.AuditLog) {
      await db.AuditLog.create(logEntry);
    }
  } catch (err) {
    logger.error('Failed to persist field audit log:', { detail: err.message, logEntry });
  }

  return logEntry;
}

/**
 * Enhanced middleware for field-level access control
 */
function enhancedFieldAccessControl(options = {}) {
  return (req, res, next) => {
    // Add field permission checking functions to request
    req.canViewField = (fieldName, isOwnRecord = false) => 
      canViewField(req.userRole, fieldName, isOwnRecord);
    
    req.canEditField = (fieldName, isOwnRecord = false) => 
      canEditField(req.userRole, fieldName, isOwnRecord);
    
    req.canAccessSensitiveData = () => 
      canAccessSensitiveData(req.userRole);
    
    req.filterEmployeeData = (employeeData, isOwnRecord = false) => 
      filterEmployeeData(employeeData, req.userRole, req.userId, isOwnRecord);
    
    req.validateEditPermissions = (updateData, isOwnRecord = false) => 
      validateEditPermissions(updateData, req.userRole, isOwnRecord);
    
    req.createAuditLog = (action, employeeId, fieldName, oldValue, newValue) => 
      createAuditLog(action, employeeId, fieldName, oldValue, newValue, req.userId, req.userRole);
    
    next();
  };
}

/**
 * Helper function for testing - filters data based on role and action
 */
function filterFieldsByRole(data, role, action = 'view') {
  if (action === 'view') {
    const filtered = filterEmployeeData(data, role, null, false);
    // Remove any masked/restricted fields for cleaner test results
    const cleaned = {};
    Object.keys(filtered).forEach(key => {
      if (filtered[key] !== '***RESTRICTED***') {
        cleaned[key] = filtered[key];
      }
    });
    return cleaned;
  } else if (action === 'edit') {
    // For edit action, filter to only include editable fields
    const filteredData = {};
    const permissions = FIELD_PERMISSIONS[role];
    
    if (!permissions) return {};
    
    // Admin can edit everything
    if (permissions.edit.includes('*')) return data;
    
    Object.keys(data).forEach(field => {
      if (permissions.edit.includes(field)) {
        filteredData[field] = data[field];
      }
    });
    
    return filteredData;
  }
  
  return {};
}

module.exports = {
  FIELD_PERMISSIONS,
  SENSITIVE_FIELDS,
  AUDIT_REQUIRED_FIELDS,
  canViewField,
  canEditField,
  canAccessSensitiveData,
  filterEmployeeData,
  validateEditPermissions,
  createAuditLog,
  enhancedFieldAccessControl,
  filterFieldsByRole // For testing
};
