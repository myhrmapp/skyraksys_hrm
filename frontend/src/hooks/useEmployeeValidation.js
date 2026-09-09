import { useState, useCallback, useMemo } from 'react';
import { validateEmployeeForm, validateField, transformEmployeeDataForAPI } from '../utils/employeeValidation';

/**
 * Custom hook for employee form validation
 * Provides consistent validation logic for both create and edit forms
 */
export const useEmployeeValidation = (initialData = {}, mode = 'create') => {
  const [validationErrors, setValidationErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Validates a single field in real-time
   * @param {string} fieldName - Name of the field to validate
   * @param {any} value - Value to validate
   * @param {Object} formData - Complete form data for cross-field validation
   */
  const validateSingleField = useCallback((fieldName, value, formData) => {
    const error = validateField(fieldName, value, formData, { mode });

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));

    return error;
  }, [mode]);

  /**
   * Validates the entire form
   * @param {Object} formData - Complete form data to validate
   * @returns {Object} - Validation result with isValid and errors
   */
  const validateForm = useCallback((formData) => {
    setIsValidating(true);

    try {
      const validation = validateEmployeeForm(formData, { mode });

      setValidationErrors(validation.errors);
      setFieldErrors(validation.errors);

      return validation;
    } finally {
      setIsValidating(false);
    }
  }, [mode]);

  /**
   * Clears all validation errors
   */
  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
    setFieldErrors({});
  }, []);

  /**
   * Clears validation error for a specific field
   * @param {string} fieldName - Name of the field to clear
   */
  const clearFieldError = useCallback((fieldName) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * Gets error message for a specific field
   * @param {string} fieldName - Name of the field
   * @returns {string|null} - Error message or null
   */
  const getFieldError = useCallback((fieldName) => {
    return fieldErrors[fieldName] || validationErrors[fieldName] || null;
  }, [fieldErrors, validationErrors]);

  /**
   * Checks if a specific field has an error
   * @param {string} fieldName - Name of the field
   * @returns {boolean} - True if field has error
   */
  const hasFieldError = useCallback((fieldName) => {
    return !!(fieldErrors[fieldName] || validationErrors[fieldName]);
  }, [fieldErrors, validationErrors]);

  /**
   * Validates specific form sections for step-by-step forms
   * @param {Array} fieldNames - Array of field names to validate
   * @param {Object} formData - Form data to validate
   * @returns {boolean} - True if all fields in section are valid
   */
  const validateSection = useCallback((fieldNames, formData) => {
    const validation = validateEmployeeForm(formData, { mode });
    return fieldNames.every(field => !validation.errors[field]);
  }, [mode]);

  /**
   * Prepares form data for API submission
   * @param {Object} formData - Raw form data
   * @returns {Object} - Transformed data ready for API
   */
  const prepareDataForSubmission = useCallback((formData) => {
    return transformEmployeeDataForAPI(formData);
  }, []);

  /**
   * Validates required fields for the current mode
   * @param {Object} formData - Form data to validate
   * @returns {Array} - Array of missing required fields
   */
  const validateRequiredFields = useCallback((formData) => {
    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'hireDate',
      'departmentId',
      'positionId'
    ];

    // For create mode, employeeId is also required
    if (mode === 'create') {
      requiredFields.push('employeeId');
    }

    const missingFields = requiredFields.filter(field => {
      const value = formData[field];
      return !value || (typeof value === 'string' && !value.trim());
    });

    return missingFields;
  }, [mode]);

  /**
   * Enhanced validation that includes business logic
   * @param {Object} formData - Form data to validate
   * @returns {Object} - Enhanced validation result
   */
  const validateWithBusinessLogic = useCallback((formData) => {
    const basicValidation = validateForm(formData);
    const missingRequired = validateRequiredFields(formData);

    const businessErrors = {};

    // Additional business logic validations
    if (formData.joiningDate && formData.confirmationDate) {
      const joining = new Date(formData.joiningDate);
      const confirmation = new Date(formData.confirmationDate);

      if (confirmation < joining) {
        businessErrors.confirmationDate = 'Confirmation date cannot be before joining date';
      }
    }

    // Validate probation period logic
    if (formData.probationPeriod && formData.confirmationDate && formData.joiningDate) {
      const joining = new Date(formData.joiningDate);
      const confirmation = new Date(formData.confirmationDate);
      const probationMonths = parseInt(formData.probationPeriod);

      const expectedConfirmation = new Date(joining);
      expectedConfirmation.setMonth(expectedConfirmation.getMonth() + probationMonths);

      if (confirmation < expectedConfirmation) {
        businessErrors.confirmationDate = `Confirmation date should be at least ${probationMonths} months after joining date`;
      }
    }

    const allErrors = {
      ...basicValidation.errors,
      ...businessErrors
    };

    return {
      isValid: Object.keys(allErrors).length === 0 && missingRequired.length === 0,
      errors: allErrors,
      missingRequired,
      hasBusinessLogicErrors: Object.keys(businessErrors).length > 0
    };
  }, [validateForm, validateRequiredFields]);

  // Memoized computed values
  const hasErrors = useMemo(() => {
    return Object.keys(validationErrors).length > 0 || Object.keys(fieldErrors).length > 0;
  }, [validationErrors, fieldErrors]);

  const errorCount = useMemo(() => {
    const allErrors = { ...validationErrors, ...fieldErrors };
    return Object.keys(allErrors).length;
  }, [validationErrors, fieldErrors]);

  return {
    // State
    validationErrors,
    fieldErrors,
    isValidating,
    hasErrors,
    errorCount,

    // Validation functions
    validateSingleField,
    validateForm,
    validateSection,
    validateRequiredFields,
    validateWithBusinessLogic,

    // Error management
    clearValidationErrors,
    clearFieldError,
    getFieldError,
    hasFieldError,

    // Utility functions
    prepareDataForSubmission
  };
};

export default useEmployeeValidation;
