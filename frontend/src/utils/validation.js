import { validateEmail, validatePhone } from './helpers';

/**
 * Employee form validation schema
 * @param {Object} values - Form values
 * @returns {Object} - Validation errors
 */
export const validateEmployee = (values) => {
  const errors = {};

  // Required fields
  if (!values.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!values.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!values.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Optional but validated fields
  if (values.phone && !validatePhone(values.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (values.salary && (isNaN(values.salary) || values.salary < 0)) {
    errors.salary = 'Please enter a valid salary amount';
  }

  if (values.hireDate) {
    const hireDate = new Date(values.hireDate);
    const today = new Date();
    if (hireDate > today) {
      errors.hireDate = 'Hire date cannot be in the future';
    }
  }

  return errors;
};

/**
 * Leave request form validation schema
 * @param {Object} values - Form values
 * @returns {Object} - Validation errors
 */
export const validateLeaveRequest = (values) => {
  const errors = {};

  if (!values.employeeId?.trim()) {
    errors.employeeId = 'Employee ID is required';
  }

  if (!values.leaveType?.trim()) {
    errors.leaveType = 'Leave type is required';
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required';
  }

  if (!values.endDate) {
    errors.endDate = 'End date is required';
  }

  if (values.startDate && values.endDate) {
    const startDate = new Date(values.startDate);
    const endDate = new Date(values.endDate);
    const today = new Date();
    
    if (startDate < today) {
      errors.startDate = 'Start date cannot be in the past';
    }
    
    if (endDate < startDate) {
      errors.endDate = 'End date must be after start date';
    }
  }

  if (!values.reason?.trim()) {
    errors.reason = 'Reason is required';
  } else if (values.reason.length < 10) {
    errors.reason = 'Reason must be at least 10 characters long';
  }

  if (values.isHalfDay) {
    if (!values.halfDayType) {
      errors.halfDayType = 'Please select half day type (First Half / Second Half)';
    } else if (!['First Half', 'Second Half'].includes(values.halfDayType)) {
      errors.halfDayType = 'Invalid half day type';
    }
  }

  return errors;
};

/**
 * Timesheet entry validation schema
 * @param {Object} entry - Timesheet entry
 * @returns {Object} - Validation errors
 */
export const validateTimesheetEntry = (entry) => {
  const errors = {};

  if (!entry.project?.trim()) {
    errors.project = 'Project is required';
  }

  if (!entry.task?.trim()) {
    errors.task = 'Task is required';
  }

  if (!entry.hours) {
    errors.hours = 'Hours is required';
  } else {
    const hours = parseFloat(entry.hours);
    if (isNaN(hours) || hours <= 0) {
      errors.hours = 'Please enter valid hours (greater than 0)';
    } else if (hours > 24) {
      errors.hours = 'Hours cannot exceed 24 per day';
    }
  }

  if (!entry.date) {
    errors.date = 'Date is required';
  } else {
    const entryDate = new Date(entry.date);
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    if (entryDate > today) {
      errors.date = 'Date cannot be in the future';
    } else if (entryDate < oneMonthAgo) {
      errors.date = 'Date cannot be more than one month ago';
    }
  }

  return errors;
};

/**
 * Validate all timesheet entries
 * @param {Array} entries - Array of timesheet entries
 * @returns {Object} - Validation result
 */
export const validateTimesheet = (entries) => {
  const errors = {};
  let isValid = true;

  if (!Array.isArray(entries) || entries.length === 0) {
    return { isValid: false, errors: { general: 'At least one entry is required' } };
  }

  entries.forEach((entry, index) => {
    const entryErrors = validateTimesheetEntry(entry);
    if (Object.keys(entryErrors).length > 0) {
      errors[`entry_${index}`] = entryErrors;
      isValid = false;
    }
  });

  // Check for duplicate entries (same project, task, and date)
  const duplicates = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (
        entries[i].project === entries[j].project &&
        entries[i].task === entries[j].task &&
        entries[i].date === entries[j].date
      ) {
        duplicates.push({ index1: i, index2: j });
      }
    }
  }

  if (duplicates.length > 0) {
    errors.duplicates = 'Duplicate entries found for the same project, task, and date';
    isValid = false;
  }

  return { isValid, errors };
};

/**
 * Payslip validation schema
 * @param {Object} values - Form values
 * @returns {Object} - Validation errors
 */
export const validatePayslip = (values) => {
  const errors = {};

  if (!values.employeeId?.trim()) {
    errors.employeeId = 'Employee ID is required';
  }

  if (!values.payPeriodStart) {
    errors.payPeriodStart = 'Pay period start date is required';
  }

  if (!values.payPeriodEnd) {
    errors.payPeriodEnd = 'Pay period end date is required';
  }

  if (values.payPeriodStart && values.payPeriodEnd) {
    const startDate = new Date(values.payPeriodStart);
    const endDate = new Date(values.payPeriodEnd);
    
    if (endDate <= startDate) {
      errors.payPeriodEnd = 'End date must be after start date';
    }
  }

  if (!values.basicSalary || isNaN(values.basicSalary) || values.basicSalary <= 0) {
    errors.basicSalary = 'Please enter a valid basic salary';
  }

  if (values.overtime && (isNaN(values.overtime) || values.overtime < 0)) {
    errors.overtime = 'Please enter a valid overtime amount';
  }

  if (values.deductions && (isNaN(values.deductions) || values.deductions < 0)) {
    errors.deductions = 'Please enter a valid deductions amount';
  }

  return errors;
};

/**
 * Generic required field validator
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} - Error message or null
 */
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {string|null} - Error message or null
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    required = false
  } = options;

  if (!file) {
    return required ? 'File is required' : null;
  }

  if (file.size > maxSize) {
    return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
  }

  if (!allowedTypes.includes(file.type)) {
    return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
  }

  return null;
};
