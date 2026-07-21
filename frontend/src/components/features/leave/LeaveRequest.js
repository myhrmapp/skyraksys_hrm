import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  const retroactiveMinDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 14);
    return d;
  }, []);
  
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
      <Box maxWidth={900} mx="auto" mt={4} mb={6}>
        <Card sx={{
          borderRadius: 4,
          boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}>
          <Box sx={{
            p: 4,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              New Leave Request
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Submit a new time-off request for manager approval
            </Typography>
          </Box>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
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
                      sx={{ borderRadius: 2 }}
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
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="600" color="primary.main">
                        Available balance: {selectedBalance} day(s)
                      </Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Start Date"
                    value={form.startDate}
                    minDate={retroactiveMinDate}
                    onChange={handleDateChange('startDate')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={!!errors.startDate}
                        helperText={errors.startDate || 'Up to 14 days in past'}
                        inputProps={{ ...params.inputProps, 'data-testid': 'leave-start-date' }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="End Date"
                    value={form.endDate}
                    minDate={form.startDate || retroactiveMinDate}
                    onChange={handleDateChange('endDate')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={!!errors.endDate}
                        helperText={errors.endDate}
                        inputProps={{ ...params.inputProps, 'data-testid': 'leave-end-date' }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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
                      label={<Typography fontWeight="600">{halfDayDisabled ? 'Half Day (N/A)' : 'Half Day' }</Typography>}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Only applies when start and end dates are the same.
                    </Typography>
                  </Box>
                </Grid>

                {form.isHalfDay && (
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth error={!!errors.halfDayType}>
                      <InputLabel id="half-day-type-label">Half Day Type</InputLabel>
                      <Select
                        labelId="half-day-type-label"
                        id="halfDayType"
                        name="halfDayType"
                        label="Half Day Type"
                        value={form.halfDayType}
                        onChange={handleChange('halfDayType')}
                        sx={{ borderRadius: 2 }}
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

                <Grid item xs={12}>
                  <TextField
                    label="Reason"
                    multiline
                    minRows={4}
                    fullWidth
                    value={form.reason}
                    onChange={handleChange('reason')}
                    error={!!errors.reason}
                    helperText={errors.reason}
                    inputProps={{ 'data-testid': 'leave-reason-input' }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                    <Button 
                      variant="outlined" 
                      onClick={() => navigate(-1)} 
                      data-testid="leave-cancel-btn"
                      sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      data-testid="leave-submit-btn"
                      sx={{ 
                        borderRadius: 2, 
                        px: 4, 
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          boxShadow: '0 6px 20px 0 rgba(99, 102, 241, 0.39)',
                        }
                      }}
                    >
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
