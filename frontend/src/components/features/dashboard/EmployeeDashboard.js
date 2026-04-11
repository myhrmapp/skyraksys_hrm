import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  useTheme,
  alpha,
  Container,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  EventNote as LeaveIcon,
  Schedule as TimesheetIcon,
  TrendingUp as StatsIcon,
  CalendarMonth as CalendarIcon,
  Pending as PendingIcon,
  Schedule as ClockIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { dashboardService } from '../../../services/dashboard.service';

const EmployeeDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch employee dashboard stats using React Query
  const { data: employeeStatsData, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats', 'employee', user?.employeeId || user?.id],
    queryFn: async () => {
      const response = await dashboardService.getEmployeeStats();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: !!user
  });

  // Derive stats with defaults
  const employeeStats = {
    leaveBalance: employeeStatsData?.leaveBalance || {},
    pendingRequests: {
      leaves: employeeStatsData?.pendingRequests?.leaves || 0,
      timesheets: employeeStatsData?.pendingRequests?.timesheets || 0
    },
    recentActivity: employeeStatsData?.recentActivity || [],
    upcomingLeaves: employeeStatsData?.upcomingLeaves || [],
    currentMonth: {
      hoursWorked: employeeStatsData?.currentMonth?.hoursWorked || 0,
      expectedHours: employeeStatsData?.currentMonth?.expectedHours || 0,
      daysWorked: employeeStatsData?.currentMonth?.daysWorked || 0,
      efficiency: employeeStatsData?.currentMonth?.efficiency || 0
    }
  };

  const QuickActionCard = ({ icon, title, description, onClick, color = 'primary' }) => (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': { 
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        },
        height: '100%',
        boxShadow: 1,
        border: `1px solid ${alpha(theme.palette[color].main, 0.1)}`
      }}
      onClick={onClick}
    >
      <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ mb: 1 }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
    <Card sx={{ 
      height: '100%', 
      boxShadow: 1,
      border: `1px solid ${alpha(theme.palette[color].main, 0.1)}` 
    }}>
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
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={40} />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert data-testid="employee-dashboard-error-alert" severity="error">Failed to load dashboard data. Please try refreshing the page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {/* Minimalistic Header */}
      <Box sx={{ mb: 3 }}>
        <Typography data-testid="employee-dashboard-heading" variant="h5" fontWeight="600" gutterBottom>
          Welcome, {user?.firstName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Typography>
      </Box>

      {/* Essential Stats Only */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} data-testid="stat-card-pending">
          <StatCard
            title="Pending"
            value={(employeeStats.pendingRequests?.leaves || 0) + (employeeStats.pendingRequests?.timesheets || 0)}
            subtitle={`${employeeStats.pendingRequests?.leaves || 0}L • ${employeeStats.pendingRequests?.timesheets || 0}T`}
            icon={<PendingIcon sx={{ fontSize: 24 }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-this-month">
          <StatCard
            title="This Month"
            value={`${employeeStats.currentMonth?.hoursWorked || 0}h`}
            subtitle={`${employeeStats.currentMonth?.daysWorked || 0} days`}
            icon={<ClockIcon sx={{ fontSize: 24 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-leave-balance">
          <StatCard
            title="Leave Balance"
            value={employeeStats.leaveBalance?.annual?.remaining || 0}
            subtitle={`of ${employeeStats.leaveBalance?.annual?.total || 0}`}
            icon={<CalendarIcon sx={{ fontSize: 24 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="stat-card-upcoming-leaves">
          <StatCard
            title="Upcoming"
            value={employeeStats.upcomingLeaves?.length || 0}
            subtitle="leaves"
            icon={<LeaveIcon sx={{ fontSize: 24 }} />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Essential Quick Actions Only */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} data-testid="quick-action-timesheet">
          <QuickActionCard
            icon={<TimesheetIcon sx={{ fontSize: 28, color: 'primary.main' }} />}
            title="Timesheet"
            description="Log hours"
            onClick={() => navigate('/timesheets')}
            color="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="quick-action-leave-request">
          <QuickActionCard
            icon={<LeaveIcon sx={{ fontSize: 28, color: 'warning.main' }} />}
            title="Leave Request"
            description="Time off"
            onClick={() => navigate('/leave-requests')}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="quick-action-payslips">
          <QuickActionCard
            icon={<StatsIcon sx={{ fontSize: 28, color: 'secondary.main' }} />}
            title="Payslips"
            description="View & download"
            onClick={() => navigate('/employee-payslips')}
            color="secondary"
          />
        </Grid>
        <Grid item xs={6} sm={3} data-testid="quick-action-profile">
          <QuickActionCard
            icon={<PersonIcon sx={{ fontSize: 28, color: 'info.main' }} />}
            title="Profile"
            description="My details"
            onClick={() => navigate('/my-profile')}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Recent Activity - Compact */}
      {employeeStats.recentActivity?.length > 0 && (
        <>
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
            Recent Activity
          </Typography>
          <Card sx={{ boxShadow: 1 }}>
            <List dense>
              {employeeStats.recentActivity.slice(0, 3).map((activity, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {activity.type === 'leave' ? 
                        <LeaveIcon sx={{ fontSize: 20 }} /> : 
                        <TimesheetIcon sx={{ fontSize: 20 }} />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {activity.action}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.date).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    <Chip 
                      label={activity.status} 
                      size="small" 
                      variant="outlined"
                      color={activity.status === 'approved' ? 'success' : 'default'}
                      sx={{ fontSize: '0.75rem' }}
                    />
                  </ListItem>
                  {index < Math.min(employeeStats.recentActivity.length, 3) - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        </>
      )}
    </Container>
  );
};

export default EmployeeDashboard;