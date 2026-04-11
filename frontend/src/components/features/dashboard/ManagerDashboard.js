import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
  Badge,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  Group as TeamIcon,
  EventNote as LeaveIcon,
  Schedule as TimesheetIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { leaveService } from '../../../services/leave.service';
import { timesheetService } from '../../../services/timesheet.service';
import { employeeService } from '../../../services/employee.service';

const ManagerDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalComments, setApprovalComments] = useState('');

  // Fetch team members using React Query
  const { data: teamMembersData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team-members', user?.employee?.id],
    queryFn: async () => {
      const response = await employeeService.getTeamMembers(user.employee.id);
      return response.data || [];
    },
    enabled: !!user?.employee?.id
  });

  // Fetch pending leaves
  const { data: pendingLeavesData, isLoading: isLoadingLeaves } = useQuery({
    queryKey: ['pending-leaves', 'manager', user?.id],
    queryFn: async () => {
      const response = await leaveService.getPendingForManager();
      return response || [];
    },
    enabled: !!user?.id
  });

  // Fetch pending timesheets
  const { data: pendingTimesheetsData, isLoading: isLoadingTimesheets } = useQuery({
    queryKey: ['pending-timesheets', 'manager'],
    queryFn: async () => {
      const response = await timesheetService.getPendingApprovals();
      return response.data || [];
    },
    enabled: !!user?.id
  });

  // Derive data
  const teamMembers = teamMembersData || [];
  const pendingLeaves = pendingLeavesData || [];
  const pendingTimesheets = pendingTimesheetsData || [];
  const isLoading = isLoadingTeam || isLoadingLeaves || isLoadingTimesheets;

  // Calculate statistics
  const stats = {
    totalTeamMembers: teamMembers.length,
    pendingLeaveApprovals: pendingLeaves.length,
    pendingTimesheetApprovals: pendingTimesheets.length,
    teamOnLeave: teamMembers.filter(member => member.isOnLeave)?.length || 0
  };

  // Leave approval mutation
  const leaveApprovalMutation = useMutation({
    mutationFn: async ({ id, action, comments }) => {
      if (action === 'approved') {
        return await leaveService.approveLeave(id, comments);
      } else {
        return await leaveService.rejectLeave(id, comments);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setApprovalDialog(false);
      setSelectedItem(null);
      setApprovalComments('');
    }
  });

  // Timesheet approval mutation
  const timesheetApprovalMutation = useMutation({
    mutationFn: async ({ id, action, comments }) => {
      const apiAction = action === 'approved' ? 'approve' : 'reject';
      return await timesheetService.approve(id, {
        action: apiAction,
        approverComments: comments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets'] });
      setApprovalDialog(false);
      setSelectedItem(null);
      setApprovalComments('');
    }
  });

  const handleApproval = () => {
    if (!selectedItem || !approvalAction) return;
    
    const mutationData = {
      id: selectedItem.id,
      action: approvalAction,
      comments: approvalComments
    };

    if (activeTab === 1) { // Leave approval
      leaveApprovalMutation.mutate(mutationData);
    } else if (activeTab === 2) { // Timesheet approval
      timesheetApprovalMutation.mutate(mutationData);
    }
  };

  const openApprovalDialog = (item, action) => {
    setSelectedItem(item);
    setApprovalAction(action);
    setApprovalDialog(true);
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card 
      sx={{ 
        height: '100%',
        boxShadow: 1,
        border: `1px solid ${alpha(color, 0.1)}`,
        transition: 'all 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" variant="caption" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h6" fontWeight="600" sx={{ color, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.6 }}>
            {React.cloneElement(icon, { sx: { fontSize: 24 } })}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );





  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {/* Minimalistic Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="600" gutterBottom>
          Manager Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Typography>
      </Box>

      {/* Compact Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Team"
            value={stats.totalTeamMembers}
            icon={<TeamIcon />}
            color={theme.palette.primary.main}
            subtitle="members"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Leave Requests"
            value={stats.pendingLeaveApprovals}
            icon={<LeaveIcon />}
            color={theme.palette.warning.main}
            subtitle="pending"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Timesheets"
            value={stats.pendingTimesheetApprovals}
            icon={<TimesheetIcon />}
            color={theme.palette.info.main}
            subtitle="pending"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="On Leave"
            value={stats.teamOnLeave}
            icon={<CalendarIcon />}
            color={theme.palette.error.main}
            subtitle="today"
          />
        </Grid>
      </Grid>

      {/* ⚡ Quick Actions */}
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        ⚡ Quick Actions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<TeamIcon />}
            onClick={() => setActiveTab(0)}
            size="small"
            sx={{ py: 1.5 }}
          >
            View Team
          </Button>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LeaveIcon />}
            onClick={() => setActiveTab(1)}
            size="small"
            sx={{ py: 1.5 }}
            color="warning"
          >
            Leave Approvals
            {stats.pendingLeaveApprovals > 0 && (
              <Badge 
                badgeContent={stats.pendingLeaveApprovals} 
                color="error" 
                sx={{ ml: 1 }}
              />
            )}
          </Button>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TimesheetIcon />}
            onClick={() => setActiveTab(2)}
            size="small"
            sx={{ py: 1.5 }}
            color="info"
          >
            Timesheet Approvals
            {stats.pendingTimesheetApprovals > 0 && (
              <Badge 
                badgeContent={stats.pendingTimesheetApprovals} 
                color="error" 
                sx={{ ml: 1 }}
              />
            )}
          </Button>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AssignmentIcon />}
            onClick={() => navigate('/reports')}
            size="small"
            sx={{ py: 1.5 }}
          >
            Reports
          </Button>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TrendingUpIcon />}
            onClick={() => navigate('/performance')}
            size="small"
            sx={{ py: 1.5 }}
          >
            Performance
          </Button>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={() => navigate('/my-profile')}
            size="small"
            sx={{ py: 1.5 }}
          >
            My Profile
          </Button>
        </Grid>
      </Grid>

      {/* Simplified Content Area */}
      <Paper sx={{ boxShadow: 1 }}>
        <Box sx={{ p: 2 }}>
          {/* Team Members */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                Team Members ({stats.totalTeamMembers})
              </Typography>
              {teamMembers.length === 0 ? (
                <Alert severity="info" sx={{ py: 1 }}>
                  No team members found.
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {teamMembers.slice(0, 5).map((member) => (
                    <Card key={member.id} sx={{ p: 1 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                            {member.firstName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {member.firstName} {member.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.position}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {member.isOnLeave && (
                            <Chip label="On Leave" color="warning" size="small" />
                          )}
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/employees/${member.id}`)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Card>
                  ))}
                  {teamMembers.length > 5 && (
                    <Button size="small" onClick={() => navigate('/employees')} sx={{ mt: 1 }}>
                      View all {teamMembers.length} team members
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          )}

          {/* Leave Approvals */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                Pending Leave Requests ({stats.pendingLeaveApprovals})
              </Typography>
              {pendingLeaves.length === 0 ? (
                <Alert severity="success" sx={{ py: 1 }}>
                  No pending leave approvals!
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {pendingLeaves.slice(0, 3).map((request) => (
                    <Card key={request.id} sx={{ p: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {request.Employee?.firstName} {request.Employee?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.leaveType} • {request.startDate} to {request.endDate}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            {request.reason}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            color="success"
                            variant="contained"
                            onClick={() => openApprovalDialog(request, 'approved')}
                            startIcon={<ApproveIcon />}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => openApprovalDialog(request, 'rejected')}
                            startIcon={<RejectIcon />}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  ))}
                  {pendingLeaves.length > 3 && (
                    <Button size="small" onClick={() => navigate('/leave-management')} sx={{ mt: 1 }}>
                      View all {pendingLeaves.length} pending requests
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          )}

          {/* Timesheet Approvals */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                Pending Timesheets ({stats.pendingTimesheetApprovals})
              </Typography>
              {pendingTimesheets.length === 0 ? (
                <Alert severity="success" sx={{ py: 1 }}>
                  No pending timesheet approvals!
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {pendingTimesheets.slice(0, 3).map((timesheet) => (
                    <Card key={timesheet.id} sx={{ p: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {timesheet.Employee?.firstName} {timesheet.Employee?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Week of {timesheet.weekStart} • {timesheet.totalHours}h
                          </Typography>
                          {timesheet.description && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {timesheet.description}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            color="success"
                            variant="contained"
                            onClick={() => openApprovalDialog(timesheet, 'approved')}
                            startIcon={<ApproveIcon />}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => openApprovalDialog(timesheet, 'rejected')}
                            startIcon={<RejectIcon />}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  ))}
                  {pendingTimesheets.length > 3 && (
                    <Button size="small" onClick={() => navigate('/timesheets?view=approvals')} sx={{ mt: 1 }}>
                      View all {pendingTimesheets.length} pending timesheets
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Approval Dialog */}
      <Dialog 
        open={approvalDialog} 
        onClose={() => setApprovalDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalAction === 'approved' ? 'Approve' : 'Reject'} {activeTab === 1 ? 'Leave Request' : 'Timesheet'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to {approvalAction === 'approved' ? 'approve' : 'reject'} this {activeTab === 1 ? 'leave request' : 'timesheet'}?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comments (Optional)"
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            placeholder="Add any comments for this approval/rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApproval}
            variant="contained"
            color={approvalAction === 'approved' ? 'success' : 'error'}
            disabled={leaveApprovalMutation.isPending || timesheetApprovalMutation.isPending}
            startIcon={
              (leaveApprovalMutation.isPending || timesheetApprovalMutation.isPending) 
                ? <CircularProgress size={20} /> 
                : null
            }
          >
            {approvalAction === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManagerDashboard;
