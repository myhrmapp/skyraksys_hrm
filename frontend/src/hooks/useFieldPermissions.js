/**
 * Enhanced Frontend Field-Level Permissions Hook
 * Provides granular field access control based on user roles and context
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Field permissions configuration (mirrors backend)
const FIELD_PERMISSIONS = {
  admin: {
    view: ['*'], // Can view all fields
    edit: ['*'], // Can edit all fields
    sensitive: true // Can access sensitive data
  },
  hr: {
    view: [
      // Personal Information
      'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
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
      'salaryStructure'
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
      'firstName', 'lastName', 'email', 'phone', 'employeeId',
      'hireDate', 'departmentId', 'positionId', 'employmentType', 'workLocation',
      'status', 'photoUrl',

      // Contact Information (for emergencies)
      'emergencyContactName', 'emergencyContactPhone',

      // Work-related address
      'workLocation', 'address', 'city', 'state'
    ],
    edit: [
      'departmentId', 'positionId', 'workLocation', 'status'
    ],
    sensitive: false
  },
  employee: {
    view: [
      // Own basic information
      'firstName', 'lastName', 'email', 'phone', 'employeeId',
      'hireDate', 'departmentId', 'positionId', 'employmentType',
      'address', 'city', 'state', 'pinCode', 'photoUrl',
      'dateOfBirth', 'gender', 'maritalStatus', 'nationality',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
      'bankName', 'ifscCode', 'bankBranch' // Can see bank name but not account number
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
  'salaryStructure',
  'uanNumber',
  'pfNumber',
  'esiNumber'
];

const FIELD_CATEGORIES = {
  personal: [
    'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
    'maritalStatus', 'nationality', 'address', 'city', 'state', 'pinCode', 'photoUrl'
  ],
  employment: [
    'employeeId', 'hireDate', 'joiningDate', 'confirmationDate', 'departmentId',
    'positionId', 'managerId', 'employmentType', 'workLocation', 'status',
    'probationPeriod', 'noticePeriod', 'resignationDate', 'lastWorkingDate'
  ],
  contact: [
    'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'
  ],
  statutory: [
    'aadhaarNumber', 'panNumber', 'uanNumber', 'pfNumber', 'esiNumber'
  ],
  banking: [
    'bankName', 'bankAccountNumber', 'ifscCode', 'bankBranch', 'accountHolderName'
  ],
  salary: [
    'salaryStructure'
  ]
};

/**
 * Enhanced Field Permissions Hook
 */
export function useFieldPermissions(targetEmployeeId = null) {
  const { user } = useAuth();
  const [securityContext, setSecurityContext] = useState({
    isOwnRecord: false,
    hasElevatedAccess: false,
    sessionRiskScore: 0
  });

  // Determine if this is user's own record
  useEffect(() => {
    if (user && targetEmployeeId) {
      setSecurityContext(prev => ({
        ...prev,
        isOwnRecord: user.employeeId === targetEmployeeId,
        hasElevatedAccess: ['admin', 'hr'].includes(user.role)
      }));
    }
  }, [user, targetEmployeeId]);

  // Permission checking functions
  const permissions = useMemo(() => {
    if (!user?.role) {
      return {
        canViewField: () => false,
        canEditField: () => false,
        canAccessSensitive: () => false,
        filterEmployeeData: () => ({}),
        getFieldCategory: () => null,
        getVisibleFields: () => [],
        getEditableFields: () => [],
        validateFieldEdit: () => ({ isValid: false, errors: ['No permissions'] })
      };
    }

    const userPermissions = FIELD_PERMISSIONS[user.role] || FIELD_PERMISSIONS.employee;

    /**
     * Check if user can view a specific field
     */
    function canViewField(fieldName) {
      // Admin can view everything
      if (userPermissions.view.includes('*')) return true;

      // Check if field is explicitly allowed
      if (userPermissions.view.includes(fieldName)) return true;

      // Special case: employees can only view their own data
      if (securityContext.isOwnRecord && user.role === 'employee') {
        return userPermissions.view.includes(fieldName);
      }

      return false;
    }

    /**
     * Check if user can edit a specific field
     */
    function canEditField(fieldName) {
      // Admin can edit everything
      if (userPermissions.edit.includes('*')) return true;

      // Check if field is explicitly allowed for editing
      if (userPermissions.edit.includes(fieldName)) return true;

      // Special case: employees can only edit their own allowed fields
      if (securityContext.isOwnRecord && user.role === 'employee') {
        return userPermissions.edit.includes(fieldName);
      }

      return false;
    }

    /**
     * Check if user can access sensitive data
     */
    function canAccessSensitive() {
      return userPermissions.sensitive || false;
    }

    /**
     * Filter employee data based on permissions
     */
    function filterEmployeeData(employeeData) {
      if (!employeeData) return {};

      const filteredData = {};

      Object.keys(employeeData).forEach(field => {
        if (canViewField(field)) {
          // Additional check for sensitive fields
          if (SENSITIVE_FIELDS.includes(field)) {
            if (canAccessSensitive() || securityContext.isOwnRecord) {
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
     * Get field category
     */
    function getFieldCategory(fieldName) {
      for (const [category, fields] of Object.entries(FIELD_CATEGORIES)) {
        if (fields.includes(fieldName)) {
          return category;
        }
      }
      return 'other';
    }

    /**
     * Get all visible fields for current user
     */
    function getVisibleFields(category = null) {
      let allFields = [];

      if (category && FIELD_CATEGORIES[category]) {
        allFields = FIELD_CATEGORIES[category];
      } else {
        allFields = Object.values(FIELD_CATEGORIES).flat();
      }

      return allFields.filter(field => canViewField(field));
    }

    /**
     * Get all editable fields for current user
     */
    function getEditableFields(category = null) {
      let allFields = [];

      if (category && FIELD_CATEGORIES[category]) {
        allFields = FIELD_CATEGORIES[category];
      } else {
        allFields = Object.values(FIELD_CATEGORIES).flat();
      }

      return allFields.filter(field => canEditField(field));
    }

    /**
     * Validate field edit permissions
     */
    function validateFieldEdit(updateData) {
      const errors = [];

      Object.keys(updateData).forEach(field => {
        if (!canEditField(field)) {
          errors.push(`You don't have permission to edit ${field}`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    return {
      canViewField,
      canEditField,
      canAccessSensitive,
      filterEmployeeData,
      getFieldCategory,
      getVisibleFields,
      getEditableFields,
      validateFieldEdit
    };
  }, [user, securityContext]);

  return {
    ...permissions,
    securityContext,
    userRole: user?.role,
    FIELD_CATEGORIES,
    SENSITIVE_FIELDS
  };
}

/**
 * Enhanced Form Field Component with Permission-Based Rendering
 */
export function PermissionField({
  fieldName,
  children,
  targetEmployeeId = null,
  showRestricted = true,
  restrictedText = 'Access Restricted'
}) {
  const { canViewField, canEditField } = useFieldPermissions(targetEmployeeId);

  const canView = canViewField(fieldName);
  const canEdit = canEditField(fieldName);

  if (!canView) {
    return showRestricted ? (
      <div className="restricted-field">
        <span className="text-muted">{restrictedText}</span>
      </div>
    ) : null;
  }

  // Clone children and add disabled prop if user can't edit
  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        disabled: child.props.disabled || !canEdit,
        readOnly: child.props.readOnly || !canEdit
      });
    }
    return child;
  });

  return <>{enhancedChildren}</>;
}

/**
 * Permission-based field group component
 */
export function PermissionFieldGroup({
  category,
  children,
  targetEmployeeId = null,
  title = null
}) {
  const { getVisibleFields } = useFieldPermissions(targetEmployeeId);

  const visibleFields = getVisibleFields(category);

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div className="permission-field-group">
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}

/**
 * Security indicator component
 */
export function SecurityIndicator({ fieldName, showLevel = true }) {
  const isSensitive = SENSITIVE_FIELDS.includes(fieldName);
  const { canAccessSensitive } = useFieldPermissions();

  if (!isSensitive) return null;

  return (
    <div className={`security-indicator ${isSensitive ? 'sensitive' : ''}`}>
      🔒
      {showLevel && (
        <span className="security-level">
          {canAccessSensitive() ? 'Authorized' : 'Restricted'}
        </span>
      )}
    </div>
  );
}

export default useFieldPermissions;
