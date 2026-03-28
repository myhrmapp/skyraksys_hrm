/**
 * Frontend Validation Schema to match Backend Joi Validation
 * This ensures all fields are properly validated before submission
 */

import { DEFAULT_CURRENCY_CODE } from './formatCurrency';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (10-15 digits to match backend)
const PHONE_REGEX = /^[0-9+]{10,15}$/;

// Emergency Phone validation regex (10-15 digits)
const EMERGENCY_PHONE_REGEX = /^[0-9]{10,15}$/;

// PAN Number validation regex (India)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Aadhaar Number validation regex (12 digits)
const AADHAAR_REGEX = /^[0-9]{12}$/;

// UAN Number validation regex (12+ alphanumeric characters)
const UAN_REGEX = /^[A-Z0-9]{12,}$/;

// ESI Number validation regex (10-17 alphanumeric characters)
const ESI_REGEX = /^[A-Z0-9]{10,17}$/;

// IFSC Code validation regex
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// PIN Code validation regex (6 digits)
const PINCODE_REGEX = /^[0-9]{6}$/;

/**
 * Comprehensive Employee Validation Schema
 * @param {Object} formData - Employee form data
 * @param {Object} options - Validation options { mode: 'create'|'edit', originalData: Object }
 * @returns {Object} - { isValid: boolean, errors: object }
 */
export const validateEmployeeForm = (formData, options = {}) => {
  const errors = {};
  // eslint-disable-next-line no-unused-vars
  const { mode = 'create', originalData: _originalData = {} } = options;
  // eslint-disable-next-line no-unused-vars
  const _isEditMode = mode === 'edit' || formData._isEditMode;
  
  // ========== REQUIRED FIELDS ==========
  
  // First Name - Required, 2-50 characters
  if (!formData.firstName?.trim()) {
    errors.firstName = 'First name is required';
  } else if (formData.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  } else if (formData.firstName.trim().length > 50) {
    errors.firstName = 'First name must not exceed 50 characters';
  }
  
  // Last Name - Required, 2-50 characters
  if (!formData.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  } else if (formData.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  } else if (formData.lastName.trim().length > 50) {
    errors.lastName = 'Last name must not exceed 50 characters';
  }
  
  // Email - Required, valid format, unique
  if (!formData.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Employee ID - Optional on create (auto-generated if missing),
  // validated if provided in either create or edit mode
  if (formData.employeeId?.trim()) {
    if (formData.employeeId.trim().length < 3) {
      errors.employeeId = 'Employee ID must be at least 3 characters';
    } else if (formData.employeeId.trim().length > 20) {
      errors.employeeId = 'Employee ID must not exceed 20 characters';
    } else if (!/^SKYT\d{4}$/.test(formData.employeeId.trim())) {
      errors.employeeId = 'Employee ID must be in SKYT#### format (SKYT + exactly 4 digits)';
    }
  }
  
  // Hire Date - Required, not in future
  if (!formData.hireDate) {
    errors.hireDate = 'Hire date is required';
  } else {
    const hireDate = new Date(formData.hireDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (hireDate > today) {
      errors.hireDate = 'Hire date cannot be in the future';
    }
  }
  
  // Department ID - Required, must be valid UUID
  if (!formData.departmentId?.trim()) {
    errors.departmentId = 'Department is required';
  }
  
  // Position ID - Required, must be valid UUID  
  if (!formData.positionId?.trim()) {
    errors.positionId = 'Position is required';
  }
  
  // ========== OPTIONAL BUT VALIDATED FIELDS ==========
  
  // Phone - Optional, but if provided must be 10 digits
  if (formData.phone?.trim()) {
    if (!PHONE_REGEX.test(formData.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
  }
  
  // Date of Birth - Optional, but if provided must be in past and at least 18 years
  if (formData.dateOfBirth?.trim()) {
    const dob = new Date(formData.dateOfBirth);
    const today = new Date();
    const ageYears = (today - dob) / (365.25 * 24 * 60 * 60 * 1000);
    
    if (dob >= today) {
      errors.dateOfBirth = 'Date of birth must be in the past';
    } else if (ageYears > 100) {
      errors.dateOfBirth = 'Please enter a valid date of birth';
    } else if (ageYears < 18) {
      errors.dateOfBirth = 'Employee must be at least 18 years old';
    }
  }
  
  // Gender - Optional, but if provided must be valid value
  if (formData.gender?.trim() && !['Male', 'Female', 'Other'].includes(formData.gender)) {
    errors.gender = 'Please select a valid gender';
  }
  
  // Marital Status - Optional, but if provided must be valid value
  const validMaritalStatus = ['Single', 'Married', 'Divorced', 'Widowed'];
  if (formData.maritalStatus?.trim() && !validMaritalStatus.includes(formData.maritalStatus)) {
    errors.maritalStatus = 'Please select a valid marital status';
  }
  
  // Employment Type - Optional, but if provided must be valid value
  // Backend Enum: 'Full-time', 'Part-time', 'Contract', 'Intern'
  const validEmploymentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  if (formData.employmentType?.trim() && !validEmploymentTypes.includes(formData.employmentType)) {
    errors.employmentType = 'Please select a valid employment type';
  }
  
  // Status - Must be a valid enum value matching backend and DB
  const validStatuses = ['Active', 'Inactive', 'On Leave', 'Terminated'];
  if (formData.status?.trim() && !validStatuses.includes(formData.status)) {
    errors.status = 'Please select a valid status (Active, Inactive, On Leave, Terminated)';
  }
  
  // PIN Code - Optional, but if provided must be 6 digits
  if (formData.pinCode?.trim() && !PINCODE_REGEX.test(formData.pinCode)) {
    errors.pinCode = 'PIN code must be exactly 6 digits';
  }
  
  // ========== STATUTORY DETAILS (INDIA-SPECIFIC) ==========
  
  // Aadhaar Number - Optional, but if provided must be 12 digits
  if (formData.aadhaarNumber?.trim() && !AADHAAR_REGEX.test(formData.aadhaarNumber)) {
    errors.aadhaarNumber = 'Aadhaar number must be exactly 12 digits';
  }
  
  // PAN Number - Optional, but if provided must match pattern
  if (formData.panNumber?.trim() && !PAN_REGEX.test(formData.panNumber.toUpperCase())) {
    errors.panNumber = 'PAN number format is invalid (e.g., ABCDE1234F)';
  }
  
  // UAN Number - Optional, but if provided must be at least 12 alphanumeric characters
  if (formData.uanNumber?.trim() && !UAN_REGEX.test(formData.uanNumber.toUpperCase())) {
    errors.uanNumber = 'UAN number must be at least 12 alphanumeric characters';
  }
  
  // ESI Number - Optional, but if provided must be 10-17 alphanumeric characters
  if (formData.esiNumber?.trim() && !ESI_REGEX.test(formData.esiNumber.toUpperCase())) {
    errors.esiNumber = 'ESI number must be 10-17 alphanumeric characters';
  }
  
  // ========== BANK DETAILS ==========
  
  // IFSC Code - Optional, but if provided must match pattern
  if (formData.ifscCode?.trim() && !IFSC_REGEX.test(formData.ifscCode.toUpperCase())) {
    errors.ifscCode = 'IFSC code format is invalid (e.g., SBIN0000123)';
  }
  
  // Bank Account Number - Optional, but if provided must be reasonable length
  if (formData.bankAccountNumber?.trim() && (formData.bankAccountNumber.length < 9 || formData.bankAccountNumber.length > 20)) {
    errors.bankAccountNumber = 'Bank account number must be 9-20 characters';
  }
  
  // ========== EMERGENCY CONTACT ==========
  
  // Emergency Contact Phone - Optional, but if provided must be valid
  if (formData.emergencyContactPhone?.trim() && !EMERGENCY_PHONE_REGEX.test(formData.emergencyContactPhone)) {
    errors.emergencyContactPhone = 'Emergency contact phone must be 10-15 digits only';
  }
  
  // ========== DATE VALIDATIONS ==========
  
  // Joining Date - Optional, but if provided should not be before hire date
  if (formData.joiningDate && formData.hireDate) {
    const joiningDate = new Date(formData.joiningDate);
    const hireDate = new Date(formData.hireDate);
    
    if (joiningDate < hireDate) {
      errors.joiningDate = 'Joining date cannot be before hire date';
    }
  }
  
  // Confirmation Date - Optional, but if provided should be after joining/hire date
  if (formData.confirmationDate) {
    const confirmationDate = new Date(formData.confirmationDate);
    const referenceDate = formData.joiningDate ? new Date(formData.joiningDate) : new Date(formData.hireDate);
    
    if (confirmationDate < referenceDate) {
      errors.confirmationDate = 'Confirmation date cannot be before joining/hire date';
    }
  }
  
  // ========== NUMERIC VALIDATIONS ==========
  
  // Probation Period - Optional, but if provided must be 0-24 months
  if (formData.probationPeriod !== undefined && formData.probationPeriod !== null && formData.probationPeriod !== '') {
    const probation = Number(formData.probationPeriod);
    if (isNaN(probation) || probation < 0 || probation > 24) {
      errors.probationPeriod = 'Probation period must be between 0-24 months';
    }
  }
  
  // Notice Period - Optional, but if provided must be 0-365 days (to match backend)
  if (formData.noticePeriod !== undefined && formData.noticePeriod !== null && formData.noticePeriod !== '') {
    const notice = Number(formData.noticePeriod);
    if (isNaN(notice) || notice < 0 || notice > 365) {
      errors.noticePeriod = 'Notice period must be between 0-365 days';
    }
  }
  
  // Work Location - Optional, but if provided must be valid value
  const validWorkLocations = ['Office', 'Remote', 'Hybrid', 'Field', 'Client Site', 'office', 'remote', 'hybrid', 'field', 'client site'];
  if (formData.workLocation?.trim() && !validWorkLocations.includes(formData.workLocation)) {
    errors.workLocation = 'Please select a valid work location';
  }
  
  // Emergency Contact Relation - Optional, but if provided must be valid value
  const validRelations = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Guardian', 'Other', 'spouse', 'parent', 'child', 'sibling', 'friend', 'guardian', 'other'];
  if (formData.emergencyContactRelation?.trim() && !validRelations.includes(formData.emergencyContactRelation)) {
    errors.emergencyContactRelation = 'Please select a valid emergency contact relation';
  }
  
  // ========== SALARY VALIDATION ==========
  
  // Salary is completely optional - only validate if basic salary is provided
  const basicSalaryVal = formData.salary?.basicSalary;
  if (basicSalaryVal !== undefined && basicSalaryVal !== null && basicSalaryVal !== '') {
    // If basic salary is provided, validate it's a positive number (or zero)
    const basicSalary = Number(basicSalaryVal);
    if (isNaN(basicSalary) || basicSalary < 0) {
      errors['salary.basicSalary'] = 'Basic salary must be a positive number';
    }
    
    // Currency - Required only if salary is provided
    if (!formData.salary.currency) {
      errors['salary.currency'] = 'Currency is required when salary is provided';
    }
    
    // Pay Frequency - Required only if salary is provided
    if (!formData.salary.payFrequency) {
      errors['salary.payFrequency'] = 'Pay frequency is required when salary is provided';
    }
    
    // Effective From - Validate format if provided
    if (formData.salary.effectiveFrom) {
      const effectiveDate = new Date(formData.salary.effectiveFrom);
      if (isNaN(effectiveDate.getTime())) {
        errors['salary.effectiveFrom'] = 'Please enter a valid date';
      }
    }
    
    // Validate allowances (all optional but must be positive if provided)
    const allowanceFields = ['hra', 'transport', 'medical', 'food', 'communication', 'special', 'other'];
    allowanceFields.forEach(field => {
      const value = formData.salary.allowances?.[field];
      if (value !== undefined && value !== null && value !== '' && (isNaN(value) || value < 0)) {
        errors[`salary.allowances.${field}`] = `${field.toUpperCase()} allowance must be a positive number`;
      }
    });
    
    // Validate deductions (all optional but must be positive if provided)
    const deductionFields = ['pf', 'professionalTax', 'incomeTax', 'esi', 'other'];
    deductionFields.forEach(field => {
      const value = formData.salary.deductions?.[field];
      if (value !== undefined && value !== null && value !== '' && (isNaN(value) || value < 0)) {
        errors[`salary.deductions.${field}`] = `${field} deduction must be a positive number`;
      }
    });
    
    // Validate benefits (all optional but must be positive if provided)
    const benefitFields = ['bonus', 'incentive', 'overtime'];
    benefitFields.forEach(field => {
      const value = formData.salary.benefits?.[field];
      if (value !== undefined && value !== null && value !== '' && (isNaN(value) || value < 0)) {
        errors[`salary.benefits.${field}`] = `${field} must be a positive number`;
      }
    });
    
    // Validate tax information (all optional but must be positive if provided)
    if (formData.salary.taxInformation?.ctc !== undefined && formData.salary.taxInformation?.ctc !== null && formData.salary.taxInformation?.ctc !== '') {
      if (isNaN(formData.salary.taxInformation.ctc) || formData.salary.taxInformation.ctc < 0) {
        errors['salary.taxInformation.ctc'] = 'CTC must be a positive number';
      }
    }
    
    if (formData.salary.taxInformation?.takeHome !== undefined && formData.salary.taxInformation?.takeHome !== null && formData.salary.taxInformation?.takeHome !== '') {
      if (isNaN(formData.salary.taxInformation.takeHome) || formData.salary.taxInformation.takeHome < 0) {
        errors['salary.taxInformation.takeHome'] = 'Take home salary must be a positive number';
      }
    }
  }
  
  // ========== USER ACCOUNT VALIDATION ==========
  
  if (formData.userAccount?.enableLogin) {
    // Password validation
    if (!formData.userAccount.password) {
      errors['userAccount.password'] = 'Password is required when login is enabled';
    } else if (formData.userAccount.password.length < 6) {
      errors['userAccount.password'] = 'Password must be at least 6 characters';
    } else if (formData.userAccount.password.length > 50) {
      errors['userAccount.password'] = 'Password must not exceed 50 characters';
    }
    
    // Confirm password validation
    if (!formData.userAccount.confirmPassword) {
      errors['userAccount.confirmPassword'] = 'Please confirm the password';
    } else if (formData.userAccount.password !== formData.userAccount.confirmPassword) {
      errors['userAccount.confirmPassword'] = 'Passwords do not match';
    }
    
    // Role validation
    const validRoles = ['employee', 'manager', 'hr', 'admin'];
    if (!formData.userAccount.role || !validRoles.includes(formData.userAccount.role)) {
      errors['userAccount.role'] = 'Please select a valid user role';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Transform frontend form data to backend API format
 * @param {Object} formData - Frontend form data
 * @returns {Object} - Backend API formatted data
 */
export const transformEmployeeDataForAPI = (formData) => {
  // Helper to clean and add field only if it has a value
  const addIfNotEmpty = (obj, key, value) => {
    if (value !== undefined && value !== null && value !== '') {
      obj[key] = value;
    }
  };
  
  const transformedData = {
    // Required fields
    firstName: formData.firstName?.trim(),
    lastName: formData.lastName?.trim(), 
    email: formData.email?.trim(),
  };
  
  // Add optional fields only if they have values
  addIfNotEmpty(transformedData, 'employeeId', formData.employeeId?.trim());
  addIfNotEmpty(transformedData, 'hireDate', formData.hireDate);
  // Note: backend EmployeeBusinessService.prepareEmployeeData() automatically
  // sets joiningDate = hireDate, so no duplicate mapping needed here.
  addIfNotEmpty(transformedData, 'departmentId', formData.departmentId ? String(formData.departmentId) : null);
  addIfNotEmpty(transformedData, 'positionId', formData.positionId ? String(formData.positionId) : null);
  
  // Optional personal fields
  // Phone: only add if it's a non-empty string with valid format
  if (formData.phone && formData.phone.trim() && PHONE_REGEX.test(formData.phone.trim())) {
    transformedData.phone = formData.phone.trim();
  }
  
  // Date of Birth: only add if it's a valid, non-empty date string
  if (formData.dateOfBirth && typeof formData.dateOfBirth === 'string' && formData.dateOfBirth.trim()) {
    const dobStr = formData.dateOfBirth.trim();
    if (dobStr && dobStr !== 'Invalid Date' && dobStr !== 'null' && dobStr !== 'undefined') {
      const dob = new Date(dobStr);
      if (!isNaN(dob.getTime()) && dob < new Date()) {
        const formattedDate = dob.toISOString().split('T')[0];
        transformedData.dateOfBirth = formattedDate;
      }
    }
  }
  addIfNotEmpty(transformedData, 'gender', formData.gender);
  addIfNotEmpty(transformedData, 'address', formData.address);
  addIfNotEmpty(transformedData, 'city', formData.city);
  addIfNotEmpty(transformedData, 'state', formData.state);
  addIfNotEmpty(transformedData, 'pinCode', formData.pinCode);
  // Map nationality correctly
  addIfNotEmpty(transformedData, 'nationality', formData.nationality || 'Indian');
  // Backend validator expects country (defaults to India), but DB doesn't store it. 
  // We can send it for completeness if needed by other middleware.
  addIfNotEmpty(transformedData, 'country', 'India'); 
  addIfNotEmpty(transformedData, 'maritalStatus', formData.maritalStatus);
  
  // Optional employment fields
  // Map 'Internship' to 'Intern' for backend compatibility
  let employmentType = formData.employmentType || 'Full-time';
  if (employmentType === 'Internship') employmentType = 'Intern';
  
  addIfNotEmpty(transformedData, 'employmentType', employmentType);
  addIfNotEmpty(transformedData, 'workLocation', formData.workLocation);
  addIfNotEmpty(transformedData, 'joiningDate', formData.joiningDate);
  addIfNotEmpty(transformedData, 'confirmationDate', formData.confirmationDate);
  addIfNotEmpty(transformedData, 'resignationDate', formData.resignationDate);
  addIfNotEmpty(transformedData, 'lastWorkingDate', formData.lastWorkingDate);
  
  if (formData.probationPeriod !== undefined && formData.probationPeriod !== null && formData.probationPeriod !== '') {
    transformedData.probationPeriod = Number(formData.probationPeriod);
  }
  if (formData.noticePeriod !== undefined && formData.noticePeriod !== null && formData.noticePeriod !== '') {
    transformedData.noticePeriod = Number(formData.noticePeriod);
  }
  addIfNotEmpty(transformedData, 'managerId', formData.managerId);
  
  // Optional emergency contact
  addIfNotEmpty(transformedData, 'emergencyContactName', formData.emergencyContactName);
  addIfNotEmpty(transformedData, 'emergencyContactPhone', formData.emergencyContactPhone);
  addIfNotEmpty(transformedData, 'emergencyContactRelation', formData.emergencyContactRelation);
  
  // Optional statutory details
  addIfNotEmpty(transformedData, 'aadhaarNumber', formData.aadhaarNumber);
  addIfNotEmpty(transformedData, 'panNumber', formData.panNumber?.toUpperCase());
  addIfNotEmpty(transformedData, 'uanNumber', formData.uanNumber);
  addIfNotEmpty(transformedData, 'pfNumber', formData.pfNumber);
  addIfNotEmpty(transformedData, 'esiNumber', formData.esiNumber);
  
  // Optional bank details
  addIfNotEmpty(transformedData, 'bankName', formData.bankName);
  addIfNotEmpty(transformedData, 'bankAccountNumber', formData.bankAccountNumber);
  addIfNotEmpty(transformedData, 'ifscCode', formData.ifscCode?.toUpperCase());
  addIfNotEmpty(transformedData, 'bankBranch', formData.bankBranch);
  addIfNotEmpty(transformedData, 'accountHolderName', formData.accountHolderName);
  
  // Optional photo
  addIfNotEmpty(transformedData, 'photoUrl', formData.photoUrl);
  
  // Comprehensive salary structure - only include if basicSalary is provided and valid
  // Convert empty string to number, only include if >= 0
  const basicSalaryVal = formData.salary?.basicSalary;
  if (basicSalaryVal !== undefined && basicSalaryVal !== null && basicSalaryVal !== '') {
    const basicSalary = Number(basicSalaryVal);
    if (!isNaN(basicSalary) && basicSalary >= 0) {
    transformedData.salary = {
      basicSalary: basicSalary,
      currency: formData.salary.currency || DEFAULT_CURRENCY_CODE,
      payFrequency: (formData.salary.payFrequency || 'monthly').toLowerCase(),
      effectiveFrom: formData.salary.effectiveFrom || null,
      allowances: {
        hra: Number(formData.salary.allowances?.hra || formData.salary.houseRentAllowance) || 0,
        transport: Number(formData.salary.allowances?.transport || formData.salary.transportAllowance) || 0,
        medical: Number(formData.salary.allowances?.medical || formData.salary.medicalAllowance) || 0,
        food: Number(formData.salary.allowances?.food || formData.salary.foodAllowance) || 0,
        communication: Number(formData.salary.allowances?.communication || formData.salary.communicationAllowance) || 0,
        special: Number(formData.salary.allowances?.special || formData.salary.specialAllowance) || 0,
        other: Number(formData.salary.allowances?.other || formData.salary.otherAllowances) || 0
      },
      deductions: {
        pf: Number(formData.salary.deductions?.pf || formData.salary.providentFund) || 0,
        professionalTax: Number(formData.salary.deductions?.professionalTax || formData.salary.professionalTax) || 0,
        incomeTax: Number(formData.salary.deductions?.incomeTax || formData.salary.incomeTax) || 0,
        esi: Number(formData.salary.deductions?.esi || formData.salary.esi) || 0,
        other: Number(formData.salary.deductions?.other || formData.salary.otherDeductions) || 0
      },
      benefits: {
        bonus: Number(formData.salary.benefits?.bonus || formData.salary.bonus) || 0,
        incentive: Number(formData.salary.benefits?.incentive || formData.salary.incentive) || 0,
        overtime: Number(formData.salary.benefits?.overtime || formData.salary.overtime) || 0
      },
      taxInformation: {
        taxRegime: (formData.salary.taxInformation?.taxRegime || formData.salary.taxRegime || 'old').toLowerCase(),
        ctc: Number(formData.salary.taxInformation?.ctc || formData.salary.ctc) || 0,
        takeHome: Number(formData.salary.taxInformation?.takeHome || formData.salary.takeHome) || 0
      },
      salaryNotes: formData.salary.salaryNotes || ''
    };
  }
  }

  // User account data - backend requires password and role for user creation
  // during employee creation (EmployeeBusinessService.createEmployee always creates user)
  if (formData.userAccount?.enableLogin && formData.userAccount?.password) {
    transformedData.password = formData.userAccount.password;
    transformedData.role = formData.userAccount.role || 'employee';
    transformedData.enableLogin = true;
    transformedData.forcePasswordChange = formData.userAccount.forcePasswordChange ?? true;
  } else {
    // Backend still creates user account - generate a random temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    const randomValues = new Uint32Array(16);
    crypto.getRandomValues(randomValues);
    const tempPassword = Array.from(randomValues, v => chars[v % chars.length]).join('');
    transformedData.password = formData.userAccount?.password || tempPassword;
    transformedData.role = formData.userAccount?.role || 'employee';
  }

  return transformedData;
};

/**
 * Real-time field validation for immediate feedback
 * @param {string} fieldName - Name of the field being validated
 * @param {any} value - Current field value
 * @param {Object} formData - Complete form data for cross-field validation
 * @param {Object} options - Validation options { mode: 'create'|'edit' }
 * @returns {string|null} - Error message or null if valid
 */
export const validateField = (fieldName, value, formData = {}, options = {}) => {
  let tempData = { ...formData };
  
  // Handle nested field paths like 'salary.basicSalary' or 'salary.allowances.hra'
  if (fieldName.includes('.')) {
    const fieldPath = fieldName.split('.');
    let current = tempData;
    
    // Navigate to the parent object, creating nested objects if they don't exist
    for (let i = 0; i < fieldPath.length - 1; i++) {
      const key = fieldPath[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Set the final value
    const finalKey = fieldPath[fieldPath.length - 1];
    current[finalKey] = value;
  } else {
    tempData[fieldName] = value;
  }
  
  const validation = validateEmployeeForm(tempData, options);
  return validation.errors[fieldName] || null;
};

const employeeValidation = {
  validateEmployeeForm,
  transformEmployeeDataForAPI,
  validateField
};

export default employeeValidation;
