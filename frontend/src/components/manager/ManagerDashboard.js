import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tab,
  Tabs,
  Badge,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  BeachAccess as LeaveIcon,
  Assignment as TimesheetIcon,
  CheckCircle as ApproveIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useNotification } from '../../contexts/NotificationContext';
import { employeeService } from '../../services/employee.service';
import { leaveService } from '../../services/leave.service';
import { timesheetService } from '../../services/timesheet.service';
import ManagerLeaveApproval from './ManagerLeaveApproval';
import ManagerTimesheetApproval from './ManagerTimesheetApproval';
import TeamMembersList from './TeamMembersList';

const ManagerDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { isLoading, setLoading } = useLoading();
  const { showNotification } = useNotification();

  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState({
    teamMembers: [],
    pendingLeaves: [],
    pendingTimesheets: [],
    recentApprovals: []
  });

  // Load manager dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading('manager-dashboard', true);
    try {
      // Get team members using the /team-members endpoint (current user's team, no ID needed)
      const teamResponse = await employeeService.getMyTeam();
      const rawTeam = teamResponse.data || [];
      const teamMembers = Array.isArray(rawTeam) ? rawTeam : (rawTeam.data || []);

      // Get pending leave requests for team members
      const pendingLeavesResponse = await leaveService.getPendingForManager();
      const pendingLeaves = pendingLeavesResponse || [];

      // Get pending timesheets for team members
      const pendingTimesheetsResponse = await timesheetService.getPendingApprovals();
      const pendingTimesheets = pendingTimesheetsResponse.data || [];

      // Get recent approvals
      const recentApprovalsResponse = await leaveService.getRecentApprovals();
      const recentApprovals = recentApprovalsResponse || [];

      setDashboardData({
        teamMembers,
        pendingLeaves,
        pendingTimesheets,
        recentApprovals
      });

    } catch (error) {
      console.error('Failed to load manager dashboard:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading('manager-dashboard', false);
    }
  }, [setLoading, showNotification]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleApprovalUpdate = useCallback(() => {
    // Refresh dashboard data after approval/rejection
    loadDashboardData();
  }, [loadDashboardData]);

  // Dashboard summary cards
  const summaryCards = useMemo(() => [
    {
      title: 'Team Members',
      value: dashboardData.teamMembers.length,
      icon: <PeopleIcon />,
      color: 'primary'
    },
    {
      title: 'Pending Leaves',
      value: dashboardData.pendingLeaves.length,
      icon: <LeaveIcon />,
      color: 'warning'
    },
    {
      title: 'Pending Timesheets',
      value: dashboardData.pendingTimesheets.length,
      icon: <TimesheetIcon />,
      color: 'info'
    },
    {
      title: 'Recent Approvals',
      value: dashboardData.recentApprovals.length,
      icon: <ScheduleIcon />,
      color: 'success'
    }
  ], [dashboardData]);

  if (isLoading('manager-dashboard')) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography data-testid="manager-dashboard-heading" variant="h4" gutterBottom>
          Manager Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your team's leave requests, timesheets, and track team performance
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" color={`${card.color}.main`}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                  <Box sx={{ color: `${card.color}.main` }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              data-testid="manager-btn-approve-leaves"
              variant="contained"
              startIcon={<ApproveIcon />}
              onClick={() => setActiveTab(1)}
              disabled={dashboardData.pendingLeaves.length === 0}
            >
              <Badge badgeContent={dashboardData.pendingLeaves.length} color="error">
                Approve Leaves
              </Badge>
            </Button>
            <Button
              data-testid="manager-btn-approve-timesheets"
              variant="contained"
              startIcon={<ApproveIcon />}
              onClick={() => setActiveTab(2)}
              disabled={dashboardData.pendingTimesheets.length === 0}
            >
              <Badge badgeContent={dashboardData.pendingTimesheets.length} color="error">
                Approve Timesheets
              </Badge>
            </Button>
            <Button
              data-testid="manager-btn-view-team"
              variant="outlined"
              startIcon={<PeopleIcon />}
              onClick={() => setActiveTab(0)}
            >
              View Team
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            data-testid="manager-tabs"
            value={activeTab} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
          >
            <Tab 
              data-testid="manager-tab-team-members"
              label={
                <Badge badgeContent={dashboardData.teamMembers.length} color="primary">
                  Team Members
                </Badge>
              } 
            />
            <Tab 
              data-testid="manager-tab-leave-approvals"
              label={
                <Badge badgeContent={dashboardData.pendingLeaves.length} color="error">
                  Leave Approvals
                </Badge>
              } 
            />
            <Tab 
              data-testid="manager-tab-timesheet-approvals"
              label={
                <Badge badgeContent={dashboardData.pendingTimesheets.length} color="error">
                  Timesheet Approvals
                </Badge>
              } 
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <CardContent>
          {activeTab === 0 && (
            <TeamMembersList 
              teamMembers={dashboardData.teamMembers}
              onRefresh={loadDashboardData}
            />
          )}
          
          {activeTab === 1 && (
            <ManagerLeaveApproval 
              pendingLeaves={dashboardData.pendingLeaves}
              onApprovalUpdate={handleApprovalUpdate}
            />
          )}
          
          {activeTab === 2 && (
            <ManagerTimesheetApproval 
              pendingTimesheets={dashboardData.pendingTimesheets}
              onApprovalUpdate={handleApprovalUpdate}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default React.memo(ManagerDashboard);
