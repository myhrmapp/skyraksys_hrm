import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Fade,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { Save, Refresh, Close } from '@mui/icons-material';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Universal StandardForm component with enhanced features
 * - Multi-step form support with validation
 * - Auto-save functionality
 * - Responsive design
 * - Error recovery
 * - Progress tracking
 */
const StandardForm = ({
  title,
  subtitle,
  steps = [],
  initialData = {},
  validationSchema = {},
  onSubmit,
  onCancel,
  onAutoSave,
  submitText = 'Submit',
  cancelText = 'Cancel',
  showStepper = false,
  autoSave = false,
  autoSaveInterval = 30000,
  children,
  maxWidth = 'md',
  elevation = 2,
  disabled = false,
  loading = false,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSuccess, showError, showWarning } = useNotification();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [lastAutoSave, setLastAutoSave] = useState(null);

  // Enhanced form validation hook
  const {
    values,
    errors,
    touched,
    isSubmitting,
    isFormValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFormValues,
    setFormErrors,
    validateForm,
    getFieldProps
  } = useFormValidation(initialData, validationSchema, {
    validateOnChange: true,
    validateOnBlur: true
  });

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !isDirty || !onAutoSave || isSubmitting) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        await onAutoSave(values);
        setAutoSaveStatus('saved');
        setLastAutoSave(new Date());

        if (process.env.NODE_ENV === 'development') {
          console.log('Form auto-saved at:', new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
        showWarning('Auto-save failed. Your changes are saved locally.', {
          autoHideDuration: 3000
        });
      }
    }, autoSaveInterval);

    return () => clearTimeout(autoSaveTimer);
  }, [values, isDirty, autoSave, autoSaveInterval, onAutoSave, isSubmitting, showWarning]);

  // Step validation for multi-step forms
  const isStepValid = useCallback((stepIndex) => {
    if (!steps[stepIndex]?.fields) return true;

    const stepFields = steps[stepIndex].fields;
    return stepFields.every(field => !errors[field]);
  }, [steps, errors]);

  const canProceedToNextStep = useMemo(() => {
    return isStepValid(currentStep);
  }, [currentStep, isStepValid]);

  // Calculate overall form progress
  const formProgress = useMemo(() => {
    if (!showStepper || steps.length === 0) return 100;

    const completedSteps = steps.filter((_, index) =>
      index < currentStep || isStepValid(index)
    ).length;

    return Math.round((completedSteps / steps.length) * 100);
  }, [showStepper, steps, currentStep, isStepValid]);

  // Navigation handlers for multi-step forms
  const handleNext = useCallback(() => {
    if (!canProceedToNextStep) {
      setSubmitAttempted(true);

      // Validate current step fields and show errors
      const stepFields = steps[currentStep]?.fields || [];
      const stepErrors = {};

      stepFields.forEach(field => {
        const error = errors[field];
        if (error) {
          stepErrors[field] = error;
        }
      });

      if (Object.keys(stepErrors).length > 0) {
        showError('Please fix the errors before proceeding to the next step');
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    setSubmitAttempted(false);
  }, [canProceedToNextStep, currentStep, steps, errors, showError]);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setSubmitAttempted(false);
  }, []);

  const handleStepClick = useCallback((stepIndex) => {
    // Allow navigation to previous steps or next step if current is valid
    if (stepIndex <= currentStep || (stepIndex === currentStep + 1 && canProceedToNextStep)) {
      setCurrentStep(stepIndex);
      setSubmitAttempted(false);
    }
  }, [currentStep, canProceedToNextStep]);

  // Enhanced submit handler
  const handleFormSubmit = useCallback(async (event) => {
    event?.preventDefault();
    setSubmitAttempted(true);

    try {
      await handleSubmit(async (formValues) => {
        const result = await onSubmit(formValues);

        if (result?.success !== false) {
          showSuccess('Form submitted successfully');
          setSubmitAttempted(false);
          setAutoSaveStatus('saved');
        } else {
          throw new Error(result?.message || 'Submission failed');
        }

        return result;
      });
    } catch (error) {
      console.error('Form submission error:', error);

      // Handle different types of errors
      if (error.response?.status === 422) {
        // Validation errors from backend
        const backendErrors = error.response.data.errors || {};
        setFormErrors(backendErrors);
        showError('Please fix the validation errors highlighted below');
      } else if (error.response?.status === 409) {
        // Conflict errors (e.g., duplicate email)
        showError(error.response.data.message || 'Data conflict occurred. Please refresh and try again.');
      } else if (error.response?.status >= 500) {
        // Server errors
        showError('Server error occurred. Please try again later.');
      } else {
        // Generic errors
        showError(error.message || 'An unexpected error occurred. Please try again.');
      }
    }
  }, [handleSubmit, onSubmit, showSuccess, showError, setFormErrors]);

  // Handle form reset
  const handleReset = useCallback(() => {
    resetForm();
    setCurrentStep(0);
    setSubmitAttempted(false);
    setAutoSaveStatus('saved');
  }, [resetForm]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    if (!onAutoSave || !isDirty) return;

    try {
      setAutoSaveStatus('saving');
      await onAutoSave(values);
      setAutoSaveStatus('saved');
      setLastAutoSave(new Date());
      showSuccess('Changes saved successfully', { autoHideDuration: 2000 });
    } catch (error) {
      setAutoSaveStatus('error');
      showError('Failed to save changes');
    }
  }, [onAutoSave, isDirty, values, showSuccess, showError]);

  // Render form content
  const renderFormContent = () => {
    if (typeof children === 'function') {
      return children({
        values,
        errors,
        touched,
        isFormValid,
        isDirty,
        isSubmitting,
        submitAttempted,
        currentStep,
        handleChange,
        handleBlur,
        setFormValues,
        setFormErrors,
        getFieldProps,
        validateForm
      });
    }
    return children;
  };

  // Auto-save status indicator
  const renderAutoSaveStatus = () => {
    if (!autoSave) return null;

    const getStatusText = () => {
      switch (autoSaveStatus) {
        case 'saving':
          return 'Saving...';
        case 'saved':
          return lastAutoSave
            ? `Last saved at ${lastAutoSave.toLocaleTimeString()}`
            : 'All changes saved';
        case 'error':
          return 'Auto-save failed';
        default:
          return '';
      }
    };

    const getStatusColor = () => {
      switch (autoSaveStatus) {
        case 'saving':
          return 'primary';
        case 'saved':
          return 'success';
        case 'error':
          return 'error';
        default:
          return 'text.secondary';
      }
    };

    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mt: 1
      }}>
        <Typography
          variant="caption"
          color={getStatusColor()}
          sx={{ fontSize: '0.75rem' }}
        >
          {getStatusText()}
        </Typography>
        {autoSaveStatus === 'saving' && (
          <CircularProgress size={12} />
        )}
        {onAutoSave && isDirty && (
          <Tooltip title="Save changes now">
            <IconButton
              size="small"
              onClick={handleManualSave}
              disabled={autoSaveStatus === 'saving'}
            >
              <Save sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper
      elevation={elevation}
      sx={{
        maxWidth: theme.breakpoints.values[maxWidth],
        mx: 'auto',
        p: { xs: 2, md: 4 },
        mt: 2,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
      {...props}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>

          {onCancel && (
            <Tooltip title="Close">
              <IconButton onClick={onCancel} sx={{ mt: -1 }}>
                <Close />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {renderAutoSaveStatus()}
      </Box>

      {/* Progress indicator for submission */}
      {isSubmitting && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Progress indicator for multi-step forms */}
      {showStepper && steps.length > 1 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Step {currentStep + 1} of {steps.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formProgress}% Complete
            </Typography>
          </Box>

          <Stepper
            activeStep={currentStep}
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{ mb: 2 }}
          >
            {steps.map((step, index) => (
              <Step
                key={step.label}
                completed={index < currentStep}
              >
                <StepLabel
                  onClick={() => handleStepClick(index)}
                  sx={{
                    cursor: (index <= currentStep || (index === currentStep + 1 && canProceedToNextStep))
                      ? 'pointer'
                      : 'default',
                    opacity: index <= currentStep ? 1 : 0.6
                  }}
                  error={submitAttempted && !isStepValid(index)}
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      {/* Global form errors */}
      {submitAttempted && !isFormValid && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following errors before submitting:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(errors).filter(([, error]) => error).map(([field, error]) => (
              <li key={field}>
                <strong>{field}:</strong> {error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Form content */}
      <form onSubmit={handleFormSubmit} noValidate>
        <Fade in={!isSubmitting}>
          <Box>
            {renderFormContent()}
          </Box>
        </Fade>

        {/* Form actions */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 4,
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2
        }}>
          {/* Reset button */}
          <Box>
            {isDirty && (
              <Tooltip title="Reset to original values">
                <Button
                  onClick={handleReset}
                  disabled={isSubmitting}
                  startIcon={<Refresh />}
                  variant="text"
                  color="secondary"
                >
                  Reset
                </Button>
              </Tooltip>
            )}
          </Box>

          {/* Navigation for multi-step forms */}
          {showStepper && steps.length > 1 ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
                variant="outlined"
              >
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceedToNextStep || isSubmitting}
                  variant="contained"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={(!isFormValid && submitAttempted) || isSubmitting}
                  variant="contained"
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {isSubmitting ? 'Submitting...' : submitText}
                </Button>
              )}
            </Box>
          ) : (
            /* Single-step form actions */
            <Box sx={{ display: 'flex', gap: 2 }}>
              {onCancel && (
                <Button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {cancelText}
                </Button>
              )}
              <Button
                type="submit"
                disabled={(!isFormValid && submitAttempted) || isSubmitting}
                variant="contained"
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Submitting...' : submitText}
              </Button>
            </Box>
          )}
        </Box>
      </form>
    </Paper>
  );
};

export default StandardForm;
