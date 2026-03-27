import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  MenuItem
} from '@mui/material';
import {
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  AccessTime as ClockIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as StatsIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../../services/attendance.service';

const statusColors = {
  present: 'success',
  late: 'warning',
  absent: 'error',
  'half-day': 'info',
  'on-leave': 'secondary',
  holiday: 'default',
  weekend: 'default'
};

export default function MyAttendance() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const { data: todayData, isLoading } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceService.getToday().then(r => r.data).catch(() => null),
    staleTime: 60 * 1000, // 1 minute
  });
  const todayStatus = todayData ?? null;

  const { data: reportData } = useQuery({
    queryKey: ['attendance', 'monthly', year, month],
    queryFn: () => attendanceService.getMyReport(year, month).then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });
  const monthlyReport = reportData ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
    queryClient.invalidateQueries({ queryKey: ['attendance', 'monthly', year, month] });
  };

  const checkInMutation = useMutation({
    mutationFn: () => attendanceService.checkIn(),
    onSuccess: () => { enqueueSnackbar('Checked in successfully!', { variant: 'success' }); invalidate(); },
    onError: (err) => enqueueSnackbar(err.response?.data?.message || 'Check-in failed', { variant: 'error' }),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => attendanceService.checkOut(),
    onSuccess: () => { enqueueSnackbar('Checked out successfully!', { variant: 'success' }); invalidate(); },
    onError: (err) => enqueueSnackbar(err.response?.data?.message || 'Check-out failed', { variant: 'error' }),
  });

  const actionLoading = checkInMutation.isPending || checkOutMutation.isPending;
  const hasCheckedIn = todayStatus?.checkIn != null;
  const hasCheckedOut = todayStatus?.checkOut != null;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} data-testid="my-attendance-page">
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <ClockIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h5" fontWeight={600}>My Attendance</Typography>
      </Stack>

      {/* Today's Status Card */}
      <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today — {dayjs().format('dddd, MMM DD, YYYY')}
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  data-testid="attendance-status-chip"
                  label={todayStatus?.status?.toUpperCase() || 'NOT CHECKED IN'}
                  color={todayStatus ? statusColors[todayStatus.status] || 'default' : 'default'}
                  variant="filled"
                />
              </Stack>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Check-In</Typography>
              <Typography variant="body1" fontWeight={500}>
                {hasCheckedIn ? dayjs(todayStatus.checkIn).format('hh:mm A') : '—'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Check-Out</Typography>
              <Typography variant="body1" fontWeight={500}>
                {hasCheckedOut ? dayjs(todayStatus.checkOut).format('hh:mm A') : '—'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">Hours</Typography>
              <Typography variant="body1" fontWeight={500}>
                {todayStatus?.hoursWorked || '0'} hrs
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Stack direction="row" spacing={1}>
                {!hasCheckedIn && (
                  <Button
                    data-testid="attendance-checkin-btn"
                    variant="contained"
                    color="success"
                    startIcon={<CheckInIcon />}
                    onClick={() => checkInMutation.mutate()}
                    disabled={actionLoading}
                  >
                    Check In
                  </Button>
                )}
                {hasCheckedIn && !hasCheckedOut && (
                  <Button
                    data-testid="attendance-checkout-btn"
                    variant="contained"
                    color="warning"
                    startIcon={<CheckOutIcon />}
                    onClick={() => checkOutMutation.mutate()}
                    disabled={actionLoading}
                  >
                    Check Out
                  </Button>
                )}
                {hasCheckedIn && hasCheckedOut && (
                  <Alert severity="success" sx={{ py: 0 }}>Done for today</Alert>
                )}
              </Stack>
            </Grid>
          </Grid>

          {todayStatus?.lateMinutes > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You were {todayStatus.lateMinutes} minutes late today.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* Monthly Report */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <CalendarIcon color="primary" />
        <Typography variant="h6">Monthly Report</Typography>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          data-testid="attendance-month-select"
          select
          size="small"
          label="Month"
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          sx={{ width: 150 }}
        >
          {months.map((m, i) => (
            <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
          ))}
        </TextField>
        <TextField
          data-testid="attendance-year-select"
          select
          size="small"
          label="Year"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          sx={{ width: 120 }}
        >
          {[year - 1, year, year + 1].map(y => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {monthlyReport?.summary && (
        <Grid container spacing={2}>
          {[
            { label: 'Working Days', value: monthlyReport.summary.workingDays, icon: <StatsIcon /> },
            { label: 'Present', value: monthlyReport.summary.presentDays, color: 'success.main' },
            { label: 'Absent', value: monthlyReport.summary.absentDays, color: 'error.main' },
            { label: 'Late', value: monthlyReport.summary.lateDays, color: 'warning.main' },
            { label: 'Half Days', value: monthlyReport.summary.halfDays, color: 'info.main' },
            { label: 'On Leave', value: monthlyReport.summary.leaveDays, color: 'secondary.main' },
            { label: 'Holidays', value: monthlyReport.summary.holidays },
            { label: 'Avg Hours/Day', value: monthlyReport.summary.averageHoursPerDay },
            { label: 'Total Hours', value: monthlyReport.summary.totalHoursWorked },
            { label: 'Overtime', value: monthlyReport.summary.totalOvertimeHours, color: 'warning.main' }
          ].map((stat, idx) => (
            <Grid item xs={6} sm={4} md={2.4} key={idx}>
              <Paper sx={{ p: 2, textAlign: 'center', borderTop: 3, borderColor: stat.color || 'grey.300' }}>
                <Typography variant="h4" fontWeight={700}>{stat.value}</Typography>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
