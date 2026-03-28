import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useQuery } from '@tanstack/react-query';
import { useLeaveBalances, useCreateLeaveRequest } from '../../../hooks/queries';
import { leaveService } from '../../../services/leave.service';

const LeaveRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  // 🚀 React Query hooks for data fetching
  const { data: leaveTypesData } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => leaveService.getLeaveTypes(),
    enabled: !!user,
  });
  
  const { data: balancesData } = useLeaveBalances(user?.employeeId, {
    enabled: !!user?.employeeId,
  });
  
  // Derive data from queries
  const leaveTypes = leaveTypesData?.data || leaveTypesData || [];
  const balances = balancesData?.data || balancesData || [];
  
  // 🚀 Mutation for creating leave request
  const createMutation = useCreateLeaveRequest();
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: null,
    endDate: null,
    isHalfDay: false,
    halfDayType: '',
    reason: '',
  });
  const [errors, setErrors] = useState({});

  const halfDayDisabled = useMemo(
    () => {
      if (!form.startDate || !form.endDate) return true;
      const start = form.startDate instanceof Date ? form.startDate.toDateString() : String(form.startDate);
      const end = form.endDate instanceof Date ? form.endDate.toDateString() : String(form.endDate);
      return start !== end;
    },
    [form.startDate, form.endDate]
  );

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleDateChange = (field) => (value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // If dates are now a multi-day range, ensure half-day is cleared
      if (updated.startDate && updated.endDate &&
          (updated.startDate instanceof Date ? updated.startDate.toDateString() : String(updated.startDate)) !==
          (updated.endDate instanceof Date ? updated.endDate.toDateString() : String(updated.endDate))) {
        updated.isHalfDay = false;
      }

      return updated;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.leaveTypeId) newErrors.leaveTypeId = 'Leave type is required';
    if (!form.startDate) newErrors.startDate = 'Start date is required';
    if (!form.endDate) newErrors.endDate = 'End date is required';

    // Allow up to 2 weeks in the past (consistent with AddLeaveRequestModern)
    if (form.startDate) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setHours(0, 0, 0, 0);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      if (new Date(form.startDate) < twoWeeksAgo) {
        newErrors.startDate = 'Start date cannot be more than 2 weeks in the past';
      }
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      newErrors.endDate = 'End date cannot be before start date';
    }

    // Max 90-day leave duration
    if (form.startDate && form.endDate && !newErrors.endDate) {
      const diffDays = Math.ceil(
        (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)
      ) + 1;
      if (diffDays > 90) {
        newErrors.endDate = 'Leave duration cannot exceed 90 days';
      }
    }

    // Validate halfDayType when isHalfDay is true (required by backend)
    if (form.isHalfDay && !form.halfDayType) {
      newErrors.halfDayType = 'Please select First Half or Second Half';
    }

    if (!form.reason || form.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }

    // Max reason length (backend allows 500)
    if (form.reason && form.reason.trim().length > 500) {
      newErrors.reason = 'Reason cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    // Format dates as local YYYY-MM-DD (avoids UTC shift from toISOString)
    const formatLocalDate = (d) => {
      if (!d) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const payload = {
      leaveTypeId: form.leaveTypeId,
      startDate: formatLocalDate(form.startDate),
      endDate: formatLocalDate(form.endDate),
      isHalfDay: form.isHalfDay,
      ...(form.isHalfDay && form.halfDayType ? { halfDayType: form.halfDayType } : {}),
      reason: form.reason.trim(),
    };

    // 🚀 Use React Query mutation
    createMutation.mutate(payload, {
      onSuccess: (res) => {
        showSuccess(res?.data?.message || 'Leave request submitted successfully.');
        navigate('/leave-requests');
      },
      onError: (error) => {
        const message = error?.response?.data?.message || 'Failed to submit leave request.';
        showError(message);
      }
    });
  };

  const getBalanceForType = (typeId) => {
    const entry = balances.find((b) => b.leaveTypeId === typeId || b.leaveType?.id === typeId);
    if (!entry) return null;
    return entry.balance;
  };

  const selectedBalance = form.leaveTypeId ? getBalanceForType(form.leaveTypeId) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box maxWidth={800} mx="auto" mt={4}>
        <Card>
          <CardHeader
            title="New Leave Request"
            subheader="Submit a new leave request for approval"
          />
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.leaveTypeId}>
                    <InputLabel id="leave-type-label">Leave Type</InputLabel>
                    <Select
                      labelId="leave-type-label"
                      id="leaveTypeId"
                      name="leaveTypeId"
                      label="Leave Type"
                      value={form.leaveTypeId}
                      onChange={handleChange('leaveTypeId')}
                      inputProps={{ 'data-testid': 'leave-type-select' }}
                    >
                      {leaveTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.leaveTypeId && (
                      <Typography variant="caption" color="error">
                        {errors.leaveTypeId}
                      </Typography>
                    )}
                  </FormControl>
                  {selectedBalance != null && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Available balance: {selectedBalance} day(s)
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} sm={3}>
                  <DatePicker
                    label="Start Date"
                    value={form.startDate}
                    onChange={handleDateChange('startDate')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={!!errors.startDate}
                        helperText={errors.startDate}
                        inputProps={{ ...params.inputProps, 'data-testid': 'leave-start-date' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <DatePicker
                    label="End Date"
                    value={form.endDate}
                    onChange={handleDateChange('endDate')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={!!errors.endDate}
                        helperText={errors.endDate}
                        inputProps={{ ...params.inputProps, 'data-testid': 'leave-end-date' }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isHalfDay}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((prev) => ({
                            ...prev,
                            isHalfDay: checked,
                            halfDayType: checked ? prev.halfDayType : '',
                          }));
                          setErrors((prev) => ({ ...prev, isHalfDay: undefined, halfDayType: undefined }));
                        }}
                        color="primary"
                        disabled={halfDayDisabled}
                      />
                    }
                    label={halfDayDisabled ? 'Half day (select same start & end date)' : 'Half day' }
                  />
                  <Typography variant="caption" color="textSecondary">
                    Half-day leave counts as 0.5 day and only applies when start and end dates are the same.
                  </Typography>
                </Grid>

                {form.isHalfDay && (
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth error={!!errors.halfDayType}>
                      <InputLabel id="half-day-type-label">Half Day Type</InputLabel>
                      <Select
                        labelId="half-day-type-label"
                        id="halfDayType"
                        name="halfDayType"
                        label="Half Day Type"
                        value={form.halfDayType}
                        onChange={handleChange('halfDayType')}
                      >
                        <MenuItem value="First Half">First Half</MenuItem>
                        <MenuItem value="Second Half">Second Half</MenuItem>
                      </Select>
                      {errors.halfDayType && (
                        <Typography variant="caption" color="error">
                          {errors.halfDayType}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Reason"
                    multiline
                    minRows={3}
                    fullWidth
                    value={form.reason}
                    onChange={handleChange('reason')}
                    error={!!errors.reason}
                    helperText={errors.reason}
                    inputProps={{ 'data-testid': 'leave-reason-input' }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button variant="outlined" onClick={() => navigate(-1)} data-testid="leave-cancel-btn">
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" data-testid="leave-submit-btn">
                      Submit Request
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default LeaveRequest;
