import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { CURRENCY_SYMBOL } from '../../utils/formatCurrency';

// Validation Schema
const employeeValidationSchema = Yup.object({
  firstName: Yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .matches(/^[a-zA-Z\s]+$/, 'First name can only contain letters')
    .trim(),
  lastName: Yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .matches(/^[a-zA-Z\s]+$/, 'Last name can only contain letters')
    .trim(),
  email: Yup.string()
    .required('Email is required')
    .email('Invalid email address')
    .max(100, 'Email must not exceed 100 characters')
    .lowercase()
    .trim(),
  phoneNumber: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .trim(),
  hireDate: Yup.date()
    .required('Hire date is required')
    .max(new Date(), 'Hire date cannot be in the future')
    .typeError('Please enter a valid date'),
  departmentId: Yup.string()
    .required('Department is required'),
  positionId: Yup.string()
    .required('Position is required'),
  baseSalary: Yup.number()
    .required('Base salary is required')
    .positive('Salary must be positive')
    .min(1000, 'Salary must be at least 1000')
    .max(10000000, 'Salary must not exceed 10,000,000')
    .typeError('Please enter a valid number'),
  employmentType: Yup.string()
    .required('Employment type is required')
    .oneOf(['Full-time', 'Part-time', 'Contract', 'Intern'], 'Invalid employment type'),
  workLocation: Yup.string()
    .nullable()
    .max(100, 'Work location must not exceed 100 characters'),
  emergencyContactName: Yup.string()
    .nullable()
    .min(2, 'Contact name must be at least 2 characters')
    .max(100, 'Contact name must not exceed 100 characters'),
  emergencyContactPhone: Yup.string()
    .nullable()
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
});

const employmentTypes = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' }
];

const ValidatedEmployeeForm = ({ 
  onSubmit, 
  onCancel, 
  initialValues,
  departments = [],
  positions = [],
  isEditMode = false 
}) => {
  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    hireDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    positionId: '',
    baseSalary: '',
    employmentType: 'Full-time',
    workLocation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    ...initialValues
  };

  return (
    <Formik
      initialValues={defaultValues}
      validationSchema={employeeValidationSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        try {
          setStatus(null);
          await onSubmit(values);
        } catch (error) {
          setStatus({ error: error.message || 'Failed to save employee' });
        } finally {
          setSubmitting(false);
        }
      }}
      validateOnChange={true}
      validateOnBlur={true}
      enableReinitialize
    >
      {({ values, errors, touched, isSubmitting, isValid, dirty, status, setFieldValue }) => (
        <Form>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Status Messages */}
            {status?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {status.error}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              {isEditMode ? 'Edit Employee' : 'Add New Employee'}
            </Typography>

            {/* Personal Information */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Personal Information
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="firstName"
                  label="First Name *"
                  value={values.firstName}
                  onChange={(e) => setFieldValue('firstName', e.target.value)}
                  error={touched.firstName && Boolean(errors.firstName)}
                  helperText={touched.firstName && errors.firstName}
                  disabled={isSubmitting}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="lastName"
                  label="Last Name *"
                  value={values.lastName}
                  onChange={(e) => setFieldValue('lastName', e.target.value)}
                  error={touched.lastName && Boolean(errors.lastName)}
                  helperText={touched.lastName && errors.lastName}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="email"
                  name="email"
                  label="Email *"
                  value={values.email}
                  onChange={(e) => setFieldValue('email', e.target.value.toLowerCase())}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  disabled={isSubmitting || isEditMode}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="phoneNumber"
                  label="Phone Number *"
                  placeholder="10 digits"
                  value={values.phoneNumber}
                  onChange={(e) => setFieldValue('phoneNumber', e.target.value.replace(/\D/g, ''))}
                  error={touched.phoneNumber && Boolean(errors.phoneNumber)}
                  helperText={touched.phoneNumber && errors.phoneNumber}
                  disabled={isSubmitting}
                  inputProps={{ maxLength: 10 }}
                />
              </Grid>
            </Grid>

            {/* Employment Details */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
              Employment Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  name="hireDate"
                  label="Hire Date *"
                  value={values.hireDate}
                  onChange={(e) => setFieldValue('hireDate', e.target.value)}
                  error={touched.hireDate && Boolean(errors.hireDate)}
                  helperText={touched.hireDate && errors.hireDate}
                  disabled={isSubmitting}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: new Date().toISOString().split('T')[0] }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  name="employmentType"
                  label="Employment Type *"
                  value={values.employmentType}
                  onChange={(e) => setFieldValue('employmentType', e.target.value)}
                  error={touched.employmentType && Boolean(errors.employmentType)}
                  helperText={touched.employmentType && errors.employmentType}
                  disabled={isSubmitting}
                >
                  {employmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  name="departmentId"
                  label="Department *"
                  value={values.departmentId}
                  onChange={(e) => setFieldValue('departmentId', e.target.value)}
                  error={touched.departmentId && Boolean(errors.departmentId)}
                  helperText={touched.departmentId && errors.departmentId}
                  disabled={isSubmitting}
                >
                  <MenuItem value="">
                    <em>Select Department</em>
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  name="positionId"
                  label="Position *"
                  value={values.positionId}
                  onChange={(e) => setFieldValue('positionId', e.target.value)}
                  error={touched.positionId && Boolean(errors.positionId)}
                  helperText={touched.positionId && errors.positionId}
                  disabled={isSubmitting}
                >
                  <MenuItem value="">
                    <em>Select Position</em>
                  </MenuItem>
                  {positions.map((pos) => (
                    <MenuItem key={pos.id} value={pos.id}>
                      {pos.title}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="baseSalary"
                  label="Base Salary *"
                  value={values.baseSalary}
                  onChange={(e) => setFieldValue('baseSalary', e.target.value)}
                  error={touched.baseSalary && Boolean(errors.baseSalary)}
                  helperText={touched.baseSalary && errors.baseSalary}
                  disabled={isSubmitting}
                  InputProps={{
                    startAdornment: CURRENCY_SYMBOL
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="workLocation"
                  label="Work Location"
                  value={values.workLocation}
                  onChange={(e) => setFieldValue('workLocation', e.target.value)}
                  error={touched.workLocation && Boolean(errors.workLocation)}
                  helperText={touched.workLocation && errors.workLocation}
                  disabled={isSubmitting}
                />
              </Grid>
            </Grid>

            {/* Emergency Contact */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
              Emergency Contact (Optional)
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="emergencyContactName"
                  label="Contact Name"
                  value={values.emergencyContactName}
                  onChange={(e) => setFieldValue('emergencyContactName', e.target.value)}
                  error={touched.emergencyContactName && Boolean(errors.emergencyContactName)}
                  helperText={touched.emergencyContactName && errors.emergencyContactName}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="emergencyContactPhone"
                  label="Contact Phone"
                  placeholder="10 digits"
                  value={values.emergencyContactPhone}
                  onChange={(e) => setFieldValue('emergencyContactPhone', e.target.value.replace(/\D/g, ''))}
                  error={touched.emergencyContactPhone && Boolean(errors.emergencyContactPhone)}
                  helperText={touched.emergencyContactPhone && errors.emergencyContactPhone}
                  disabled={isSubmitting}
                  inputProps={{ maxLength: 10 }}
                />
              </Grid>
            </Grid>

            {/* Validation Summary */}
            {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Please fix the following errors:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {Object.entries(errors).map(([field, error]) => 
                    touched[field] && (
                      <li key={field}>
                        <Typography variant="caption">{error}</Typography>
                      </li>
                    )
                  )}
                </ul>
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              {onCancel && (
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={isSubmitting || !isValid || !dirty}
              >
                {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Employee' : 'Add Employee')}
              </Button>
            </Box>
          </Box>
        </Form>
      )}
    </Formik>
  );
};

export default ValidatedEmployeeForm;
