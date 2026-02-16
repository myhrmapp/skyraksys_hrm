import React, { useState, useEffect, useCallback } from 'react';
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
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchTodayStatus = useCallback(async () => {
    try {
      const res = await attendanceService.getToday();
      setTodayStatus(res.data);
    } catch (error) {
      // No check-in yet — that's normal
      setTodayStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthlyReport = useCallback(async () => {
    try {
      const res = await attendanceService.getMyReport(year, month);
      setMonthlyReport(res.data);
    } catch (error) {
      enqueueSnackbar('Failed to load monthly report', { variant: 'error' });
    }
  }, [year, month, enqueueSnackbar]);

  useEffect(() => { fetchTodayStatus(); }, [fetchTodayStatus]);
  useEffect(() => { fetchMonthlyReport(); }, [fetchMonthlyReport]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceService.checkIn();
      enqueueSnackbar('Checked in successfully!', { variant: 'success' });
      fetchTodayStatus();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Check-in failed', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await attendanceService.checkOut();
      enqueueSnackbar('Checked out successfully!', { variant: 'success' });
      fetchTodayStatus();
      fetchMonthlyReport(); // Refresh report after checkout
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Check-out failed', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const hasCheckedIn = todayStatus?.checkIn != null;
  const hasCheckedOut = todayStatus?.checkOut != null;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
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
                    variant="contained"
                    color="success"
                    startIcon={<CheckInIcon />}
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                  >
                    Check In
                  </Button>
                )}
                {hasCheckedIn && !hasCheckedOut && (
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<CheckOutIcon />}
                    onClick={handleCheckOut}
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
