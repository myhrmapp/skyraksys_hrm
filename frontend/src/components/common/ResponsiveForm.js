import React, { useState } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

/**
 * Enhanced Responsive Form Component
 * Provides optimal form experience across all device sizes
 */
const ResponsiveForm = ({
  children,
  onSubmit,
  title,
  subtitle,
  steps,
  currentStep = 0,
  onStepChange,
  loading = false,
  submitText = 'Submit',
  showStepper = false,
  maxWidth = 'md',
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  return (
    <Box sx={{
      px: { xs: 2, sm: 3, md: 4 },
      py: { xs: 2, md: 3 },
      maxWidth: maxWidth,
      mx: 'auto',
      minHeight: '100vh'
    }}>
      {/* Header */}
      {(title || subtitle) && (
        <Box sx={{ mb: { xs: 3, md: 4 }, textAlign: { xs: 'center', md: 'left' } }}>
          {title && (
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              component="h1"
              fontWeight="bold"
              gutterBottom
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {/* Stepper for Multi-step Forms */}
      {showStepper && steps && (
        <Card sx={{ mb: { xs: 3, md: 4 } }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stepper
              activeStep={currentStep}
              orientation={isMobile ? 'vertical' : 'horizontal'}
              sx={{
                '& .MuiStepLabel-label': {
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }
              }}
            >
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      )}

      {/* Form Content */}
      <Card elevation={isMobile ? 0 : 2}>
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <form onSubmit={onSubmit} {...props}>
            {children}
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Responsive Form Field Component
 */
export const ResponsiveFormField = ({
  children,
  xs = 12,
  sm = 6,
  md = 6,
  lg,
  xl,
  fullWidth = true,
  ...props
}) => (
  <Grid item xs={xs} sm={sm} md={md} lg={lg} xl={xl} {...props}>
    {React.cloneElement(children, { fullWidth })}
  </Grid>
);

/**
 * Enhanced Form Actions Component
 */
export const ResponsiveFormActions = ({
  onBack,
  onNext,
  onSubmit,
  loading = false,
  submitText = 'Submit',
  showBack = false,
  showNext = false,
  isLastStep = true,
  orientation = 'horizontal'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const buttonSize = isMobile ? 'large' : 'medium';
  const buttonProps = {
    size: buttonSize,
    sx: {
      minHeight: { xs: 48, md: 40 },
      px: { xs: 3, md: 2 },
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 'medium'
    }
  };

  if (orientation === 'vertical' || isMobile) {
    return (
      <Stack
        spacing={2}
        sx={{
          mt: { xs: 3, md: 4 },
          width: '100%'
        }}
      >
        {isLastStep ? (
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? null : <SaveIcon />}
            {...buttonProps}
          >
            {loading ? 'Processing...' : submitText}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            variant="contained"
            disabled={loading}
            endIcon={<ArrowForwardIcon />}
            {...buttonProps}
          >
            Next
          </Button>
        )}

        {showBack && (
          <Button
            onClick={onBack}
            variant="outlined"
            disabled={loading}
            startIcon={<ArrowBackIcon />}
            {...buttonProps}
          >
            Back
          </Button>
        )}
      </Stack>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mt: { xs: 3, md: 4 },
      gap: 2
    }}>
      {showBack ? (
        <Button
          onClick={onBack}
          variant="outlined"
          disabled={loading}
          startIcon={<ArrowBackIcon />}
          {...buttonProps}
        >
          Back
        </Button>
      ) : <Box />}

      {isLastStep ? (
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? null : <SaveIcon />}
          {...buttonProps}
        >
          {loading ? 'Processing...' : submitText}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          variant="contained"
          disabled={loading}
          endIcon={<ArrowForwardIcon />}
          {...buttonProps}
        >
          Next
        </Button>
      )}
    </Box>
  );
};

/**
 * Enhanced Password Field with Toggle
 */
export const ResponsivePasswordField = ({
  label = 'Password',
  value,
  onChange,
  error,
  helperText,
  required = false,
  autoComplete = 'current-password',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextField
      type={showPassword ? 'text' : 'password'}
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      required={required}
      autoComplete={autoComplete}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={() => setShowPassword(!showPassword)}
              edge="end"
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        )
      }}
      {...props}
    />
  );
};

/**
 * Mobile-Optimized Select Field
 */
export const ResponsiveSelectField = ({
  label,
  value,
  onChange,
  options = [],
  error,
  helperText,
  required = false,
  native = false,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <FormControl error={error} required={required} {...props}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={onChange}
        label={label}
        native={native && isMobile} // Use native select on mobile for better UX
        MenuProps={!native ? {
          PaperProps: {
            sx: {
              maxHeight: { xs: 200, md: 300 },
              '& .MuiMenuItem-root': {
                minHeight: { xs: 44, md: 36 }
              }
            }
          }
        } : undefined}
      >
        {native && isMobile ? (
          <>
            <option value="" disabled>Select {label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </>
        ) : (
          options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))
        )}
      </Select>
      {helperText && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: 1 }}>
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

/**
 * Form Section Divider
 */
export const FormSection = ({ title, children, ...props }) => (
  <Box sx={{ mb: { xs: 3, md: 4 } }} {...props}>
    {title && (
      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{
          mb: 2,
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        {title}
      </Typography>
    )}
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {children}
    </Grid>
  </Box>
);

export default ResponsiveForm;
