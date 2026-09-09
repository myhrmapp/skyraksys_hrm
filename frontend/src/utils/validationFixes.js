/**
 * Common Validation Fixes and Utilities
 * Provides quick fixes for common validation issues
 */

/**
 * Fix common data format issues before API submission
 */
export const sanitizeEmployeeData = (formData) => {
  const sanitized = { ...formData };

  // Remove spaces from Aadhaar number
  if (sanitized.aadhaarNumber) {
    sanitized.aadhaarNumber = sanitized.aadhaarNumber.replace(/\s/g, '');
  }

  // Ensure PAN is uppercase
  if (sanitized.panNumber) {
    sanitized.panNumber = sanitized.panNumber.toUpperCase();
  }

  // Ensure IFSC is uppercase
  if (sanitized.ifscCode) {
    sanitized.ifscCode = sanitized.ifscCode.toUpperCase();
  }

  // Format phone number (remove non-digits)
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.replace(/\D/g, '');
  }

  // Ensure dates are in ISO format
  const dateFields = ['hireDate', 'dateOfBirth', 'joiningDate', 'confirmationDate'];
  dateFields.forEach(field => {
    if (sanitized[field] && sanitized[field] !== '') {
      const date = new Date(sanitized[field]);
      if (!isNaN(date.getTime())) {
        sanitized[field] = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    }
  });

  // Remove empty string values for optional fields
  const optionalFields = [
    'middleName', 'phone', 'address', 'city', 'state', 'pinCode',
    'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
    'aadhaarNumber', 'panNumber', 'uanNumber', 'pfNumber', 'esiNumber',
    'bankName', 'bankAccountNumber', 'ifscCode', 'bankBranch', 'accountHolderName',
    'workLocation', 'dateOfBirth', 'joiningDate', 'confirmationDate'
  ];

  optionalFields.forEach(field => {
    if (sanitized[field] === '') {
      delete sanitized[field];
    }
  });

  // Set default values
  if (!sanitized.nationality) {
    sanitized.nationality = 'Indian';
  }

  if (!sanitized.employmentType) {
    sanitized.employmentType = 'Full-time';
  }

  if (!sanitized.status) {
    sanitized.status = 'Active';
  }

  return sanitized;
};

/**
 * Validate required fields for employee creation
 */
export const validateRequiredFields = (formData) => {
  const errors = {};
  const requiredFields = [
    'firstName',
    'lastName',
    'email',
    'hireDate',
    'departmentId',
    'positionId'
  ];

  requiredFields.forEach(field => {
    if (!formData[field] || formData[field].toString().trim() === '') {
      errors[field] = `${field} is required`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate data formats
 */
export const validateDataFormats = (formData) => {
  const errors = {};

  // Email validation
  if (formData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
  }

  // Phone validation (if provided)
  if (formData.phone) {
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Phone number should be 10-15 digits';
    }
  }

  // Date validation
  const dateFields = ['hireDate', 'dateOfBirth', 'joiningDate', 'confirmationDate'];
  dateFields.forEach(field => {
    if (formData[field] && formData[field] !== '') {
      const date = new Date(formData[field]);
      if (isNaN(date.getTime())) {
        errors[field] = 'Please enter a valid date';
      }

      // Hire date shouldn't be in future
      if (field === 'hireDate' && date > new Date()) {
        errors[field] = 'Hire date cannot be in the future';
      }
    }
  });

  // Aadhaar validation (if provided)
  if (formData.aadhaarNumber) {
    const aadhaar = formData.aadhaarNumber.replace(/\s/g, '');
    if (!/^[0-9]{12}$/.test(aadhaar)) {
      errors.aadhaarNumber = 'Aadhaar number should be 12 digits';
    }
  }

  // PAN validation (if provided)
  if (formData.panNumber) {
    const pan = formData.panNumber.toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      errors.panNumber = 'PAN should be in format: ABCDE1234F';
    }
  }

  // IFSC validation (if provided)
  if (formData.ifscCode) {
    const ifsc = formData.ifscCode.toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      errors.ifscCode = 'IFSC should be in format: SBIN0000123';
    }
  }

  // PIN code validation (if provided)
  if (formData.pinCode) {
    if (!/^[0-9]{6}$/.test(formData.pinCode)) {
      errors.pinCode = 'PIN code should be 6 digits';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Comprehensive validation for employee data
 */
export const validateEmployeeData = (formData) => {
  // First sanitize the data
  const sanitizedData = sanitizeEmployeeData(formData);

  // Check required fields
  const requiredValidation = validateRequiredFields(sanitizedData);
  if (!requiredValidation.isValid) {
    return {
      isValid: false,
      errors: requiredValidation.errors,
      sanitizedData
    };
  }

  // Check data formats
  const formatValidation = validateDataFormats(sanitizedData);
  if (!formatValidation.isValid) {
    return {
      isValid: false,
      errors: formatValidation.errors,
      sanitizedData
    };
  }

  return {
    isValid: true,
    errors: {},
    sanitizedData
  };
};

/**
 * Common validation error messages
 */
export const validationMessages = {
  required: (fieldName) => `${fieldName} is required`,
  invalidEmail: 'Please enter a valid email address',
  invalidPhone: 'Please enter a valid phone number (10-15 digits)',
  invalidDate: 'Please enter a valid date',
  futureDateNotAllowed: 'Date cannot be in the future',
  invalidAadhaar: 'Aadhaar number should be 12 digits',
  invalidPAN: 'PAN should be in format: ABCDE1234F',
  invalidIFSC: 'IFSC should be in format: SBIN0000123',
  invalidPinCode: 'PIN code should be 6 digits',
  departmentRequired: 'Please select a department',
  positionRequired: 'Please select a position'
};

/**
 * Quick fix for common validation issues
 */
export const getValidationQuickFixes = (errors) => {
  const fixes = [];

  if (errors.firstName || errors.lastName) {
    fixes.push({
      type: 'error',
      message: 'Name fields are required and should only contain letters and spaces',
      fix: 'Enter valid first and last name'
    });
  }

  if (errors.email) {
    fixes.push({
      type: 'error',
      message: 'Email format is invalid',
      fix: 'Use format: user@domain.com'
    });
  }

  if (errors.phone) {
    fixes.push({
      type: 'error',
      message: 'Phone number format is invalid',
      fix: 'Enter 10-15 digits without spaces or special characters'
    });
  }

  if (errors.hireDate) {
    fixes.push({
      type: 'error',
      message: 'Hire date is invalid or in the future',
      fix: 'Use format: YYYY-MM-DD and ensure date is not in future'
    });
  }

  if (errors.departmentId) {
    fixes.push({
      type: 'error',
      message: 'Department is required',
      fix: 'Select a department from the dropdown'
    });
  }

  if (errors.positionId) {
    fixes.push({
      type: 'error',
      message: 'Position is required',
      fix: 'Select a position from the dropdown'
    });
  }

  if (errors.aadhaarNumber) {
    fixes.push({
      type: 'warning',
      message: 'Aadhaar format is invalid',
      fix: 'Enter 12 digits (spaces will be removed automatically)'
    });
  }

  if (errors.panNumber) {
    fixes.push({
      type: 'warning',
      message: 'PAN format is invalid',
      fix: 'Use format: ABCDE1234F (will be converted to uppercase)'
    });
  }

  return fixes;
};

const validationFixesUtils = {
  sanitizeEmployeeData,
  validateRequiredFields,
  validateDataFormats,
  validateEmployeeData,
  validationMessages,
  getValidationQuickFixes
};

export default validationFixesUtils;
