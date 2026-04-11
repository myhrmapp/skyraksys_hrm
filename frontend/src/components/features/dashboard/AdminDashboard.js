import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  useTheme,
  alpha,
  Stack,
  CircularProgress,
  Container,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Chip
} from '@mui/material';
import {
  People as PeopleIcon,
  EventNote as LeaveIcon,
  Schedule as TimesheetIcon,
  AccountBalance as PayrollIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from './ManagerDashboard';
import { dashboardService } from '../../../services/dashboard.service';

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isEmployee, isAdmin, isHR, isManager } = useAuth();
  const { showNotification } = useNotification();
  
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dashboard stats using React Query
  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', 'admin'],
    queryFn: async () => {
      const response = await dashboardService.getStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load dashboard data');
      }
      return response.data?.stats || response.data || {};
    },
    enabled: isAdmin || isHR, // Only run when user is admin/HR
    onError: (err) => {
      setError(err.message || 'Failed to load dashboard data');
      showNotification('Failed to load dashboard data', 'error');
    },
    onSuccess: () => {
      setError(null);
    }
  });

  // Derive stats with defaults
  const stats = {
    employees: statsData?.employees || { total: 0, active: 0, onLeave: 0, newHires: 0 },
    leaves: statsData?.leaves || { pending: 0, approved: 0, rejected: 0 },
    timesheets: statsData?.timesheets || { pending: 0, submitted: 0, approved: 0 },
    payroll: statsData?.payroll || { processed: 0, pending: 0, total: 0 }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    if (!error) {
      showNotification('✅ Dashboard data refreshed successfully', 'success');
    }
  };

  // Return employee or manager dashboard if not admin/HR
  if (isEmployee && !isAdmin && !isHR) {
    return <EmployeeDashboard />;
  }

  if (isManager && !isAdmin && !isHR) {
    return <ManagerDashboard />;
  }

  const StatCard = ({ title, value, subtitle, icon, color = 'primary', onClick }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        boxShadow: 1,
        border: `1px solid ${alpha(theme.palette[color].main, 0.1)}`,
        ...(onClick && {
          '&:hover': { 
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4]
          }
        })
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" variant="caption" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h6" fontWeight="600" color={`${color}.main`} sx={{ mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: `${color}.main`, opacity: 0.6 }}>
            {React.cloneElement(icon, { sx: { fontSize: 24 } })}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: 400,
            gap: 2
          }}
        >
          <CircularProgress 
            size={48} 
            thickness={4}
            sx={{
              color: theme.palette.primary.main,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round'
              }
            }}
          />
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            Loading dashboard data...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {/* Minimalistic Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h5" fontWeight="600" gutterBottom>
              Admin Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton
              data-testid="admin-dashboard-refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              size="small"
            >
              {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          data-testid="admin-dashboard-error-alert"
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button data-testid="admin-dashboard-retry-btn" color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Failed to Load Dashboard</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Essential Quick Actions */}
      {!isLoading && !error && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Button
              data-testid="admin-btn-add-employee"
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/employees/add')}
              size="small"
            >
              Add Employee
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button
              data-testid="admin-btn-leave-requests"
              fullWidth
              variant="outlined"
              startIcon={<LeaveIcon />}
              onClick={() => navigate('/leave-requests')}
              size="small"
            >
              Leave Requests
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button
              data-testid="admin-btn-timesheets"
              fullWidth
              variant="outlined"
              startIcon={<TimesheetIcon />}
              onClick={() => navigate('/timesheets')}
              size="small"
            >
              Timesheets
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button
              data-testid="admin-btn-payroll"
              fullWidth
              variant="outlined"
              startIcon={<PayrollIcon />}
              onClick={() => navigate('/payroll-management')}
              size="small"
            >
              Payroll
            </Button>
          </Grid>
        </Grid>
      )}

      {/* Simple Alerts */}
      {!isLoading && !error && (stats.leaves.pending > 0 || stats.timesheets.submitted > 0) && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              {stats.leaves.pending > 0 && (
                <Chip label={`${stats.leaves.pending} leaves`} size="small" color="warning" variant="outlined" />
              )}
              {stats.timesheets.submitted > 0 && (
                <Chip label={`${stats.timesheets.submitted} timesheets`} size="small" color="info" variant="outlined" />
              )}
            </Stack>
          }
        >
          Pending approvals require attention
        </Alert>
      )}

      {/* Employee Overview */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Employee Overview
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} data-testid="stat-card-total-employees">
          <StatCard
            title="Total Employees"
            value={stats.employees.total}
            subtitle={`${stats.employees.active} active`}
            icon={<PeopleIcon />}
            color="primary"
            onClick={() => navigate('/employees')}
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-on-leave">
          <StatCard
            title="On Leave"
            value={stats.employees.onLeave}
            subtitle="today"
            icon={<LeaveIcon />}
            color="warning"
            onClick={() => navigate('/leave-requests')}
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-new-hires">
          <StatCard
            title="New Hires"
            value={stats.employees.newHires}
            subtitle="this month"
            icon={<TrendingUpIcon />}
            color="success"
            onClick={() => navigate('/employees')}
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-pending-leaves">
          <StatCard
            title="Pending Leaves"
            value={stats.leaves.pending}
            subtitle="awaiting"
            icon={<LeaveIcon />}
            color="error"
            onClick={() => navigate('/leave-requests')}
          />
        </Grid>
      </Grid>

      {/* Operations Overview */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Operations Overview
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3} data-testid="stat-card-submitted-timesheets">
          <StatCard
            title="Submitted"
            value={stats.timesheets.submitted}
            subtitle="timesheets"
            icon={<TimesheetIcon />}
            color="info"
            onClick={() => navigate('/timesheets')}
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-draft-timesheets">
          <StatCard
            title="Draft"
            value={stats.timesheets.pending}
            subtitle="timesheets"
            icon={<TimesheetIcon />}
            color="warning"
            onClick={() => navigate('/timesheets')}
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-approved-timesheets">
          <StatCard
            title="Approved"
            value={stats.timesheets.approved}
            subtitle="this month"
            icon={<CheckCircleIcon />}
            color="success"
            onClick={() => navigate('/timesheets')}
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-payroll">
          <StatCard
            title="Payroll"
            value={stats.payroll.processed}
            subtitle={`of ${stats.payroll.total}`}
            icon={<PayrollIcon />}
            color="primary"
            onClick={() => navigate('/payroll-management')}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;