import { useState, useCallback, useMemo } from 'react';

/**
 * Centralized form validation hook
 * Provides consistent form handling across the application
 */
export const useFormValidation = (initialValues = {}, validationSchema = {}, options = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Options with defaults
  const {
    validateOnChange = true,
    validateOnBlur = true,
    resetOnSubmit = false
  } = options;

  /**
   * Validate a single field
   */
  const validateField = useCallback((fieldName, value, allValues = values) => {
    const fieldSchema = validationSchema[fieldName];
    if (!fieldSchema) return null;

    // Required validation
    if (fieldSchema.required && (!value || value.toString().trim() === '')) {
      return fieldSchema.requiredMessage || `${fieldName} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return null;
    }

    // Type validation
    if (fieldSchema.type) {
      switch (fieldSchema.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return fieldSchema.typeMessage || 'Please enter a valid email address';
          }
          break;
        case 'phone':
          const phoneRegex = /^\+?[\d\s-()]{10,}$/;
          if (!phoneRegex.test(value)) {
            return fieldSchema.typeMessage || 'Please enter a valid phone number';
          }
          break;
        case 'number':
          if (isNaN(value)) {
            return fieldSchema.typeMessage || 'Please enter a valid number';
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            return fieldSchema.typeMessage || 'Please enter a valid date';
          }
          break;
      }
    }

    // Length validation
    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
      return fieldSchema.minLengthMessage || `Minimum ${fieldSchema.minLength} characters required`;
    }
    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
      return fieldSchema.maxLengthMessage || `Maximum ${fieldSchema.maxLength} characters allowed`;
    }

    // Pattern validation
    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
      return fieldSchema.patternMessage || 'Invalid format';
    }

    // Custom validation
    if (fieldSchema.validate) {
      const customError = fieldSchema.validate(value, allValues);
      if (customError) return customError;
    }

    return null;
  }, [validationSchema, values]);

  /**
   * Validate all fields
   */
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationSchema]);

  /**
   * Handle field value change
   */
  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));

    if (validateOnChange) {
      const error = validateField(fieldName, value, { ...values, [fieldName]: value });
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [validateField, validateOnChange, values]);

  /**
   * Handle field blur event
   */
  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    if (validateOnBlur) {
      const error = validateField(fieldName, values[fieldName]);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [validateField, validateOnBlur, values]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);

    try {
      // Mark all fields as touched
      const touchedFields = {};
      Object.keys(validationSchema).forEach(field => {
        touchedFields[field] = true;
      });
      setTouched(touchedFields);

      // Validate form
      const isValid = validateForm();

      if (isValid) {
        await onSubmit(values);

        if (resetOnSubmit) {
          setValues(initialValues);
          setErrors({});
          setTouched({});
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, initialValues, resetOnSubmit, validationSchema]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Set form values programmatically
   */
  const setFormValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  /**
   * Set form errors programmatically
   */
  const setFormErrors = useCallback((newErrors) => {
    setErrors(prev => ({ ...prev, ...newErrors }));
  }, []);

  /**
   * Check if form is valid
   */
  const isFormValid = useMemo(() => {
    return Object.values(errors).every(error => !error);
  }, [errors]);

  /**
   * Check if form has been modified
   */
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  /**
   * Get field props for easy integration with input components
   */
  const getFieldProps = useCallback((fieldName) => ({
    value: values[fieldName] || '',
    onChange: (e) => {
      const value = e.target ? e.target.value : e;
      handleChange(fieldName, value);
    },
    onBlur: () => handleBlur(fieldName),
    error: touched[fieldName] && !!errors[fieldName],
    helperText: touched[fieldName] ? errors[fieldName] : ''
  }), [values, errors, touched, handleChange, handleBlur]);

  return {
    // Values and state
    values,
    errors,
    touched,
    isSubmitting,
    isFormValid,
    isDirty,

    // Actions
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFormValues,
    setFormErrors,
    validateForm,
    validateField,

    // Helpers
    getFieldProps
  };
};

/**
 * Common validation schemas
 */
export const validationSchemas = {
  employee: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s]+$/,
      patternMessage: 'First name should only contain letters and spaces'
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s]+$/,
      patternMessage: 'Last name should only contain letters and spaces'
    },
    email: {
      required: true,
      type: 'email'
    },
    phone: {
      required: true,
      type: 'phone'
    },
    hireDate: {
      required: true,
      type: 'date',
      validate: (value) => {
        const hireDate = new Date(value);
        const today = new Date();
        if (hireDate > today) {
          return 'Hire date cannot be in the future';
        }
        return null;
      }
    },
    departmentId: {
      required: true,
      requiredMessage: 'Please select a department'
    },
    positionId: {
      required: true,
      requiredMessage: 'Please select a position'
    },
    aadhaarNumber: {
      pattern: /^\d{4}\s?\d{4}\s?\d{4}$/,
      patternMessage: 'Aadhaar number should be in format: 1234 5678 9012'
    },
    panNumber: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      patternMessage: 'PAN number should be in format: ABCDE1234F'
    },
    ifscCode: {
      pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
      patternMessage: 'IFSC code should be in format: SBIN0000123'
    }
  },

  leave: {
    leaveTypeId: {
      required: true,
      requiredMessage: 'Please select a leave type'
    },
    startDate: {
      required: true,
      type: 'date',
      validate: (value) => {
        const startDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDate < today) {
          return 'Start date cannot be in the past';
        }
        return null;
      }
    },
    endDate: {
      required: true,
      type: 'date',
      validate: (value, allValues) => {
        const endDate = new Date(value);
        const startDate = new Date(allValues.startDate);
        if (endDate < startDate) {
          return 'End date must be after start date';
        }
        return null;
      }
    },
    reason: {
      required: true,
      minLength: 10,
      maxLength: 500
    }
  },

  timesheet: {
    workDate: {
      required: true,
      type: 'date',
      validate: (value) => {
        const workDate = new Date(value);
        const today = new Date();
        if (workDate > today) {
          return 'Work date cannot be in the future';
        }
        return null;
      }
    },
    projectId: {
      required: true,
      requiredMessage: 'Please select a project'
    },
    hoursWorked: {
      required: true,
      type: 'number',
      validate: (value) => {
        const hours = parseFloat(value);
        if (hours <= 0) {
          return 'Hours worked must be greater than 0';
        }
        if (hours > 24) {
          return 'Hours worked cannot exceed 24 hours per day';
        }
        return null;
      }
    }
  }
};

export default useFormValidation;
