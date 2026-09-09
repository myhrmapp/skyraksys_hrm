import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { Send as SendIcon, Cancel as CancelIcon } from '@mui/icons-material';

// Validation Schema
const leaveRequestValidationSchema = Yup.object({
  leaveType: Yup.string()
    .required('Leave type is required')
    .oneOf(
      ['Sick Leave', 'Annual Leave', 'Casual Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave'],
      'Invalid leave type'
    ),
  startDate: Yup.date()
    .required('Start date is required')
    .min(new Date(), 'Start date cannot be in the past')
    .typeError('Please enter a valid date'),
  endDate: Yup.date()
    .required('End date is required')
    .min(Yup.ref('startDate'), 'End date must be after start date')
    .typeError('Please enter a valid date'),
  reason: Yup.string()
    .required('Reason is required')
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters')
    .trim(),
  halfDay: Yup.boolean(),
  emergencyContact: Yup.string()
    .nullable()
    .max(100, 'Emergency contact must not exceed 100 characters')
});

const leaveTypes = [
  { value: 'Sick Leave', label: 'Sick Leave' },
  { value: 'Annual Leave', label: 'Annual Leave' },
  { value: 'Casual Leave', label: 'Casual Leave' },
  { value: 'Maternity Leave', label: 'Maternity Leave' },
  { value: 'Paternity Leave', label: 'Paternity Leave' },
  { value: 'Unpaid Leave', label: 'Unpaid Leave' }
];

const ValidatedLeaveRequestForm = ({ onSubmit, onCancel, initialValues }) => {
  // Set tomorrow as default start date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const defaultValues = {
    leaveType: '',
    startDate: tomorrow.toISOString().split('T')[0],
    endDate: tomorrow.toISOString().split('T')[0],
    reason: '',
    halfDay: false,
    emergencyContact: '',
    ...initialValues
  };

  return (
    <Formik
      initialValues={defaultValues}
      validationSchema={leaveRequestValidationSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        try {
          setStatus(null);
          await onSubmit(values);
        } catch (error) {
          setStatus({ error: error.message || 'Failed to submit leave request' });
        } finally {
          setSubmitting(false);
        }
      }}
      validateOnChange={true}
      validateOnBlur={true}
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

            {/* Leave Type */}
            <TextField
              select
              fullWidth
              name="leaveType"
              label="Leave Type *"
              value={values.leaveType}
              onChange={(e) => setFieldValue('leaveType', e.target.value)}
              error={touched.leaveType && Boolean(errors.leaveType)}
              helperText={touched.leaveType && errors.leaveType}
              disabled={isSubmitting}
            >
              <MenuItem value="">
                <em>Select Leave Type</em>
              </MenuItem>
              {leaveTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            {/* Start Date */}
            <TextField
              fullWidth
              type="date"
              name="startDate"
              label="Start Date *"
              value={values.startDate}
              onChange={(e) => setFieldValue('startDate', e.target.value)}
              error={touched.startDate && Boolean(errors.startDate)}
              helperText={touched.startDate && errors.startDate}
              disabled={isSubmitting}
              InputLabelProps={{
                shrink: true
              }}
            />

            {/* End Date */}
            <TextField
              fullWidth
              type="date"
              name="endDate"
              label="End Date *"
              value={values.endDate}
              onChange={(e) => setFieldValue('endDate', e.target.value)}
              error={touched.endDate && Boolean(errors.endDate)}
              helperText={touched.endDate && errors.endDate}
              disabled={isSubmitting}
              InputLabelProps={{
                shrink: true
              }}
              inputProps={{
                min: values.startDate
              }}
            />

            {/* Reason */}
            <TextField
              fullWidth
              multiline
              rows={4}
              name="reason"
              label="Reason *"
              placeholder="Please provide a detailed reason for your leave request (min 10 characters)"
              value={values.reason}
              onChange={(e) => setFieldValue('reason', e.target.value)}
              error={touched.reason && Boolean(errors.reason)}
              helperText={
                (touched.reason && errors.reason) ||
                `${values.reason.length}/500 characters`
              }
              disabled={isSubmitting}
            />

            {/* Emergency Contact (Optional) */}
            <TextField
              fullWidth
              name="emergencyContact"
              label="Emergency Contact (Optional)"
              placeholder="Phone number or email to reach you during leave"
              value={values.emergencyContact}
              onChange={(e) => setFieldValue('emergencyContact', e.target.value)}
              error={touched.emergencyContact && Boolean(errors.emergencyContact)}
              helperText={touched.emergencyContact && errors.emergencyContact}
              disabled={isSubmitting}
            />

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
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
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
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                disabled={isSubmitting || !isValid || !dirty}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </Box>

            {/* Form State Debug (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Form State:</Typography>
                <pre style={{ fontSize: '0.7rem', margin: '4px 0' }}>
                  {JSON.stringify({ isValid, dirty, isSubmitting, touched: Object.keys(touched) }, null, 2)}
                </pre>
              </Box>
            )}
          </Box>
        </Form>
      )}
    </Formik>
  );
};

export default ValidatedLeaveRequestForm;
