import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useNotification } from '../../contexts/NotificationContext';
import { useLoading } from '../../contexts/LoadingContext';
import { leaveService } from '../../services/leave.service';

const ManagerLeaveApproval = ({ pendingLeaves, onApprovalUpdate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showNotification } = useNotification();
  const { isLoading, setLoading } = useLoading();

  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = useCallback(async (leaveRequest) => {
    setLoading('approve-leave', true);
    try {
      await leaveService.approveLeave(leaveRequest.id, {
        approvedBy: 'manager',
        comments: 'Approved by manager'
      });
      
      showNotification(
        `Leave request for ${leaveRequest.employee?.firstName} ${leaveRequest.employee?.lastName} approved successfully`,
        'success'
      );
      
      setApprovalDialog(false);
      onApprovalUpdate?.();
      
    } catch (error) {
      console.error('Failed to approve leave:', error);
      showNotification('Failed to approve leave request', 'error');
    } finally {
      setLoading('approve-leave', false);
    }
  }, [setLoading, showNotification, onApprovalUpdate]);

  const handleReject = useCallback(async (leaveRequest) => {
    if (!rejectionReason.trim()) {
      showNotification('Please provide a reason for rejection', 'warning');
      return;
    }

    setLoading('reject-leave', true);
    try {
      await leaveService.rejectLeave(leaveRequest.id, {
        rejectedBy: 'manager',
        comments: rejectionReason
      });
      
      showNotification(
        `Leave request for ${leaveRequest.employee?.firstName} ${leaveRequest.employee?.lastName} rejected`,
        'info'
      );
      
      setRejectionDialog(false);
      setRejectionReason('');
      onApprovalUpdate?.();
      
    } catch (error) {
      console.error('Failed to reject leave:', error);
      showNotification('Failed to reject leave request', 'error');
    } finally {
      setLoading('reject-leave', false);
    }
  }, [rejectionReason, setLoading, showNotification, onApprovalUpdate]);

  const openApprovalDialog = (leave) => {
    setSelectedLeave(leave);
    setApprovalDialog(true);
  };

  const openRejectionDialog = (leave) => {
    setSelectedLeave(leave);
    setRejectionDialog(true);
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      'Annual Leave': 'primary',
      'Sick Leave': 'warning',
      'Emergency Leave': 'error',
      'Maternity Leave': 'secondary',
      'Paternity Leave': 'info'
    };
    return colors[leaveType?.name] || 'default';
  };

  const calculateLeaveDays = (startDate, endDate) => {
    try {
      return dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    } catch (error) {
      return 0;
    }
  };

  if (!pendingLeaves || pendingLeaves.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="info">
          No pending leave requests to review at this time.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pending Leave Requests ({pendingLeaves.length})
      </Typography>
      
      <Grid container spacing={3}>
        {pendingLeaves.map((leave) => (
          <Grid item xs={12} md={6} key={leave.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                {/* Employee Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {leave.employee?.firstName} {leave.employee?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {leave.employee?.employeeId} • {leave.employee?.department?.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={leave.leaveType?.name || 'Unknown'}
                    color={getLeaveTypeColor(leave.leaveType)}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Leave Details */}
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>Duration:</strong> {dayjs(leave.startDate).format('MMM DD, YYYY')} - {dayjs(leave.endDate).format('MMM DD, YYYY')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScheduleIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      <strong>Days:</strong> {calculateLeaveDays(leave.startDate, leave.endDate)} day(s)
                    </Typography>
                  </Box>

                  {leave.reason && (
                    <Box>
                      <Typography variant="body2">
                        <strong>Reason:</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {leave.reason}
                      </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Submitted: {dayjs(leave.createdAt).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </Box>
                </Stack>

                {/* Action Buttons */}
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => openRejectionDialog(leave)}
                    disabled={isLoading('reject-leave')}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => openApprovalDialog(leave)}
                    disabled={isLoading('approve-leave')}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    Approve
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Approval Confirmation Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Leave Request</DialogTitle>
        <DialogContent>
          {selectedLeave && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to approve this leave request?
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Employee:</strong> {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                </Typography>
                <Typography variant="body2">
                  <strong>Leave Type:</strong> {selectedLeave.leaveType?.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Duration:</strong> {dayjs(selectedLeave.startDate).format('MMM DD, YYYY')} - {dayjs(selectedLeave.endDate).format('MMM DD, YYYY')}
                </Typography>
                <Typography variant="body2">
                  <strong>Days:</strong> {calculateLeaveDays(selectedLeave.startDate, selectedLeave.endDate)} day(s)
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleApprove(selectedLeave)}
            variant="contained"
            color="success"
            disabled={isLoading('approve-leave')}
          >
            {isLoading('approve-leave') ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onClose={() => setRejectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Leave Request</DialogTitle>
        <DialogContent>
          {selectedLeave && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Please provide a reason for rejecting this leave request:
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Employee:</strong> {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                </Typography>
                <Typography variant="body2">
                  <strong>Leave Type:</strong> {selectedLeave.leaveType?.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Duration:</strong> {dayjs(selectedLeave.startDate).format('MMM DD, YYYY')} - {dayjs(selectedLeave.endDate).format('MMM DD, YYYY')}
                </Typography>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why this leave request is being rejected..."
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRejectionDialog(false);
            setRejectionReason('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleReject(selectedLeave)}
            variant="contained"
            color="error"
            disabled={isLoading('reject-leave') || !rejectionReason.trim()}
          >
            {isLoading('reject-leave') ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(ManagerLeaveApproval);
