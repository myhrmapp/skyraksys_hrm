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
  Avatar,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Tooltip,
  IconButton,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Work as ProjectIcon,
  Visibility as ViewIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Article as DraftIcon,
  PlaylistAddCheck as BulkApproveIcon,
  PlaylistRemove as BulkRejectIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useNotification } from '../../contexts/NotificationContext';
import { timesheetService } from '../../services/timesheet.service';
import { useLoading } from '../../contexts/LoadingContext';

const ManagerTimesheetApproval = ({ pendingTimesheets, onApprovalUpdate }) => {
  const { showNotification } = useNotification();
  const { isLoading, setLoading } = useLoading();

  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  
  // Bulk operations state
  const [selectedTimesheets, setSelectedTimesheets] = useState(new Set());
  const [bulkApprovalDialog, setBulkApprovalDialog] = useState(false);
  const [bulkRejectionDialog, setBulkRejectionDialog] = useState(false);
  const [bulkComments, setBulkComments] = useState('');

  // Status configuration for chips and icons
  const getStatusConfig = (status) => {
    const configs = {
      Draft: { icon: <DraftIcon />, label: 'Draft', color: 'default' },
      Submitted: { icon: <PendingIcon />, label: 'Submitted', color: 'warning' },
      Approved: { icon: <ApprovedIcon />, label: 'Approved', color: 'success' },
      Rejected: { icon: <RejectedIcon />, label: 'Rejected', color: 'error' }
    };
    return configs[status] || { icon: <DraftIcon />, label: status, color: 'default' };
  };

  const handleApprove = useCallback(async (timesheet) => {
    setLoading('approve-timesheet', true);
    try {
      
      // Use the correct API format that matches the backend
      await timesheetService.approve(timesheet.id, {
        action: 'approve',
        approverComments: approvalComment.trim() || 'Approved'
      });
      
      showNotification(
        `Timesheet for ${timesheet.employee?.firstName} ${timesheet.employee?.lastName} approved successfully`,
        'success'
      );
      
      setApprovalDialog(false);
      setApprovalComment('');
      onApprovalUpdate?.();
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve timesheet';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading('approve-timesheet', false);
    }
  }, [setLoading, showNotification, onApprovalUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReject = useCallback(async (timesheet) => {
    if (!rejectionReason.trim()) {
      showNotification('Please provide a reason for rejection', 'warning');
      return;
    }

    setLoading('reject-timesheet', true);
    try {
      
      // Use the dedicated reject endpoint from the service
      await timesheetService.updateStatus(timesheet.id, 'rejected', rejectionReason);
      
      showNotification(
        `Timesheet for ${timesheet.employee?.firstName} ${timesheet.employee?.lastName} rejected`,
        'info'
      );
      
      setRejectionDialog(false);
      setRejectionReason('');
      onApprovalUpdate?.();
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject timesheet';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading('reject-timesheet', false);
    }
  }, [rejectionReason, setLoading, showNotification, onApprovalUpdate]);

  const openViewDialog = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setViewDialog(true);
  };

  const openApprovalDialog = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setApprovalDialog(true);
  };

  const openRejectionDialog = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setRejectionDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'warning',
      'Submitted': 'warning',
      'Approved': 'success',
      'Rejected': 'error',
      'Draft': 'default'
    };
    return colors[status] || 'default';
  };

  const calculateTotalHours = (timesheet) => {
    return parseFloat(timesheet.totalHoursWorked || 0);
  };

  // Bulk operation handlers
  const handleSelectTimesheet = (timesheetId) => {
    const newSelected = new Set(selectedTimesheets);
    if (newSelected.has(timesheetId)) {
      newSelected.delete(timesheetId);
    } else {
      newSelected.add(timesheetId);
    }
    setSelectedTimesheets(newSelected);
  };

  const handleSelectAll = (timesheets) => {
    const timesheetIds = timesheets.map(ts => ts.id);
    const allSelected = timesheetIds.every(id => selectedTimesheets.has(id));
    
    if (allSelected) {
      // Deselect all
      const newSelected = new Set(selectedTimesheets);
      timesheetIds.forEach(id => newSelected.delete(id));
      setSelectedTimesheets(newSelected);
    } else {
      // Select all
      const newSelected = new Set(selectedTimesheets);
      timesheetIds.forEach(id => newSelected.add(id));
      setSelectedTimesheets(newSelected);
    }
  };

  const handleBulkApprove = useCallback(async () => {
    const selectedIds = Array.from(selectedTimesheets);
    if (selectedIds.length === 0) return;

    setLoading('bulk-approve', true);
    try {
      const result = await timesheetService.bulkApprove(selectedIds, bulkComments);
      
      if (result.success) {
        showNotification(
          `Successfully approved ${result.data.summary.successful} timesheet(s)`,
          'success'
        );
        
        if (result.data.summary.failed > 0) {
          showNotification(
            `${result.data.summary.failed} timesheet(s) could not be approved`,
            'warning'
          );
        }
        
        setSelectedTimesheets(new Set());
        setBulkApprovalDialog(false);
        setBulkComments('');
        onApprovalUpdate?.();
      }
    } catch (error) {
      showNotification('Failed to approve timesheets', 'error');
    } finally {
      setLoading('bulk-approve', false);
    }
  }, [selectedTimesheets, bulkComments, setLoading, showNotification, onApprovalUpdate]);

  const handleBulkReject = useCallback(async () => {
    const selectedIds = Array.from(selectedTimesheets);
    if (selectedIds.length === 0) return;

    if (!bulkComments.trim()) {
      showNotification('Please provide a reason for rejection', 'warning');
      return;
    }

    setLoading('bulk-reject', true);
    try {
      const result = await timesheetService.bulkReject(selectedIds, bulkComments);
      
      if (result.success) {
        showNotification(
          `Successfully rejected ${result.data.summary.successful} timesheet(s)`,
          'info'
        );
        
        if (result.data.summary.failed > 0) {
          showNotification(
            `${result.data.summary.failed} timesheet(s) could not be rejected`,
            'warning'
          );
        }
        
        setSelectedTimesheets(new Set());
        setBulkRejectionDialog(false);
        setBulkComments('');
        onApprovalUpdate?.();
      }
    } catch (error) {
      showNotification('Failed to reject timesheets', 'error');
    } finally {
      setLoading('bulk-reject', false);
    }
  }, [selectedTimesheets, bulkComments, setLoading, showNotification, onApprovalUpdate]);

  const groupTimesheetsByEmployee = (timesheets) => {
    const grouped = {};
    timesheets.forEach(timesheet => {
      const employeeId = timesheet.employee?.id;
      if (!grouped[employeeId]) {
        grouped[employeeId] = {
          employee: timesheet.employee,
          timesheets: []
        };
      }
      grouped[employeeId].timesheets.push(timesheet);
    });
    return Object.values(grouped);
  };

  if (!pendingTimesheets || pendingTimesheets.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="info">
          No pending timesheets to review at this time.
        </Alert>
      </Box>
    );
  }

  const groupedTimesheets = groupTimesheetsByEmployee(pendingTimesheets);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Pending Timesheets ({pendingTimesheets.length})
        </Typography>
        
        {selectedTimesheets.size > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={`${selectedTimesheets.size} selected`} 
              color="primary" 
              size="small"
            />
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<BulkApproveIcon />}
              onClick={() => setBulkApprovalDialog(true)}
              disabled={isLoading('bulk-approve')}
            >
              Approve All
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<BulkRejectIcon />}
              onClick={() => setBulkRejectionDialog(true)}
              disabled={isLoading('bulk-reject')}
            >
              Reject All
            </Button>
          </Box>
        )}
      </Box>
      
      <Grid container spacing={3}>
        {groupedTimesheets.map((group, index) => (
          <Grid item xs={12} key={index}>
            <Card>
              <CardContent>
                {/* Employee Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {group.employee?.firstName} {group.employee?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.employee?.employeeId} • {group.employee?.department?.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${group.timesheets.length} timesheet(s)`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                {/* Timesheets Table */}
                <Box sx={{ mb: 3 }}>
                  {/* Bulk Actions Bar */}
                  {selectedTimesheets.size > 0 && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2" color="primary.main">
                          {selectedTimesheets.size} timesheet(s) selected
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<BulkApproveIcon />}
                          onClick={() => setBulkApprovalDialog(true)}
                          disabled={isLoading('bulk-approve')}
                        >
                          Approve Selected
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<BulkRejectIcon />}
                          onClick={() => setBulkRejectionDialog(true)}
                          disabled={isLoading('bulk-reject')}
                        >
                          Reject Selected
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setSelectedTimesheets(new Set())}
                        >
                          Clear Selection
                        </Button>
                      </Stack>
                    </Box>
                  )}
                  
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={
                              selectedTimesheets.size > 0 && 
                              selectedTimesheets.size < group.timesheets.length
                            }
                            checked={
                              group.timesheets.length > 0 && 
                              group.timesheets.every(ts => selectedTimesheets.has(ts.id))
                            }
                            onChange={() => handleSelectAll(group.timesheets)}
                            inputProps={{ 'aria-label': 'select all timesheets' }}
                          />
                        </TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Project</TableCell>
                        <TableCell>Task</TableCell>
                        <TableCell align="right">Hours</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.timesheets.map((timesheet) => (
                        <TableRow 
                          key={timesheet.id}
                          selected={selectedTimesheets.has(timesheet.id)}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedTimesheets.has(timesheet.id)}
                              onChange={() => handleSelectTimesheet(timesheet.id)}
                              inputProps={{ 'aria-labelledby': `timesheet-${timesheet.id}` }}
                            />
                          </TableCell>
                          <TableCell>
                            {timesheet.weekStartDate 
                              ? dayjs(timesheet.weekStartDate).format('MMM DD, YYYY')
                              : timesheet.workDate 
                                ? dayjs(timesheet.workDate).format('MMM DD, YYYY')
                                : 'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ProjectIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                              {timesheet.project?.name || 'No Project'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {timesheet.task?.name || 'No Task'}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <TimeIcon sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                              {calculateTotalHours(timesheet)}h
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={timesheet.status}
                              color={getStatusColor(timesheet.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => openViewDialog(timesheet)}
                                  color="primary"
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<RejectIcon />}
                                onClick={() => openRejectionDialog(timesheet)}
                                disabled={isLoading('reject-timesheet')}
                              >
                                Reject
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<ApproveIcon />}
                                onClick={() => openApprovalDialog(timesheet)}
                                disabled={isLoading('approve-timesheet')}
                              >
                                Approve
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>

                {/* Summary */}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours: {group.timesheets.reduce((sum, ts) => sum + calculateTotalHours(ts), 0)}h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submitted: {group.timesheets.length} timesheet(s)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed View Dialog - Similar to TimesheetHistory */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Timesheet Details - Week of {selectedTimesheet?.weekStartDate ? dayjs(selectedTimesheet.weekStartDate).format('MMM DD, YYYY') : 'N/A'}
        </DialogTitle>
        <DialogContent>
          {selectedTimesheet && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Employee Information</Typography>
                <Typography variant="body2">
                  {selectedTimesheet.employee?.firstName} {selectedTimesheet.employee?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {selectedTimesheet.employee?.employeeId} • {selectedTimesheet.employee?.department?.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>Project & Task</Typography>
                <Typography variant="body2">
                  {selectedTimesheet.project?.name || 'No Project'} - {selectedTimesheet.task?.name || 'No Task'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Hours Worked</Typography>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                  {parseFloat(selectedTimesheet.totalHoursWorked || 0).toFixed(1)} hours total
                </Typography>
                
                {/* Daily breakdown for weekly timesheets */}
                <Box sx={{ ml: 2 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>Daily Breakdown:</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mt: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Mon: {parseFloat(selectedTimesheet.mondayHours || 0).toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Tue: {parseFloat(selectedTimesheet.tuesdayHours || 0).toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Wed: {parseFloat(selectedTimesheet.wednesdayHours || 0).toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Thu: {parseFloat(selectedTimesheet.thursdayHours || 0).toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Fri: {parseFloat(selectedTimesheet.fridayHours || 0).toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Sat: {parseFloat(selectedTimesheet.saturdayHours || 0).toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', gridColumn: 'span 2' }}>
                      Sun: {parseFloat(selectedTimesheet.sundayHours || 0).toFixed(1)}h
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Description</Typography>
                <Typography variant="body2">{selectedTimesheet.description || 'No description provided'}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Status</Typography>
                <Chip
                  icon={getStatusConfig(selectedTimesheet.status).icon}
                  label={getStatusConfig(selectedTimesheet.status).label}
                  color={getStatusConfig(selectedTimesheet.status).color}
                />
              </Box>

              {selectedTimesheet.submittedAt && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Submitted At</Typography>
                  <Typography variant="body2">
                    {selectedTimesheet.submittedAt && dayjs(selectedTimesheet.submittedAt).isValid()
                      ? dayjs(selectedTimesheet.submittedAt).format('MMM DD, YYYY HH:mm')
                      : 'Not submitted'}
                  </Typography>
                </Box>
              )}

              {selectedTimesheet.approvedAt && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Approved At</Typography>
                  <Typography variant="body2">
                    {dayjs(selectedTimesheet.approvedAt).format('MMM DD, YYYY HH:mm')}
                  </Typography>
                </Box>
              )}

              {selectedTimesheet.rejectedAt && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Rejected At</Typography>
                  <Typography variant="body2">
                    {dayjs(selectedTimesheet.rejectedAt).format('MMM DD, YYYY HH:mm')}
                  </Typography>
                </Box>
              )}

              {selectedTimesheet.approverComments && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Manager Comments</Typography>
                  <Typography variant="body2">{selectedTimesheet.approverComments}</Typography>
                </Box>
              )}

              {/* Period Information */}
              {(selectedTimesheet.year || selectedTimesheet.weekNumber) && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Period</Typography>
                  <Typography variant="body2">
                    {selectedTimesheet.year && `Year ${selectedTimesheet.year}`} 
                    {selectedTimesheet.weekNumber && `, Week ${selectedTimesheet.weekNumber}`}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          {selectedTimesheet?.status === 'Submitted' && (
            <>
              <Button
                onClick={() => {
                  setViewDialog(false);
                  openRejectionDialog(selectedTimesheet);
                }}
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
              >
                Reject
              </Button>
              <Button
                onClick={() => {
                  setViewDialog(false);
                  openApprovalDialog(selectedTimesheet);
                }}
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Approve Timesheet</DialogTitle>
        <DialogContent>
          {selectedTimesheet && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to approve this timesheet?
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Employee:</strong> {selectedTimesheet.employee?.firstName} {selectedTimesheet.employee?.lastName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Employee ID:</strong> {selectedTimesheet.employee?.employeeId}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Week Starting:</strong> {selectedTimesheet.weekStartDate ? dayjs(selectedTimesheet.weekStartDate).format('MMM DD, YYYY') : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Project:</strong> {selectedTimesheet.project?.name || 'No Project'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Task:</strong> {selectedTimesheet.task?.name || 'No Task'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      <strong>Total Hours:</strong> {calculateTotalHours(selectedTimesheet)}h
                    </Typography>
                  </Grid>
                  {selectedTimesheet.description && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Description:</strong> {selectedTimesheet.description}
                      </Typography>
                    </Grid>
                  )}
                  {/* Week Details if available */}
                  {(selectedTimesheet.year || selectedTimesheet.weekNumber) && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Period:</strong> {selectedTimesheet.year && `Year ${selectedTimesheet.year}`} 
                        {selectedTimesheet.weekNumber && `, Week ${selectedTimesheet.weekNumber}`}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Box>
          )}
          <TextField
            fullWidth
            label="Approval Comment (optional)"
            multiline
            rows={2}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder="Add a comment..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setApprovalDialog(false); setApprovalComment(''); }}>Cancel</Button>
          <Button
            onClick={() => handleApprove(selectedTimesheet)}
            variant="contained"
            color="success"
            disabled={isLoading('approve-timesheet')}
          >
            {isLoading('approve-timesheet') ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onClose={() => setRejectionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Reject Timesheet</DialogTitle>
        <DialogContent>
          {selectedTimesheet && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Please provide a reason for rejecting this timesheet:
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Employee:</strong> {selectedTimesheet.employee?.firstName} {selectedTimesheet.employee?.lastName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Employee ID:</strong> {selectedTimesheet.employee?.employeeId}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Week Starting:</strong> {selectedTimesheet.weekStartDate ? dayjs(selectedTimesheet.weekStartDate).format('MMM DD, YYYY') : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Project:</strong> {selectedTimesheet.project?.name || 'No Project'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Task:</strong> {selectedTimesheet.task?.name || 'No Task'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      <strong>Total Hours:</strong> {calculateTotalHours(selectedTimesheet)}h
                    </Typography>
                  </Grid>
                  {/* Week Details if available */}
                  {(selectedTimesheet.year || selectedTimesheet.weekNumber) && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>Period:</strong> {selectedTimesheet.year && `Year ${selectedTimesheet.year}`} 
                        {selectedTimesheet.weekNumber && `, Week ${selectedTimesheet.weekNumber}`}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why this timesheet is being rejected..."
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
            onClick={() => handleReject(selectedTimesheet)}
            variant="contained"
            color="error"
            disabled={isLoading('reject-timesheet') || !rejectionReason.trim()}
          >
            {isLoading('reject-timesheet') ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Approval Dialog */}
      <Dialog open={bulkApprovalDialog} onClose={() => setBulkApprovalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BulkApproveIcon sx={{ mr: 1, color: 'success.main' }} />
            Bulk Approve Timesheets
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You are about to approve <strong>{selectedTimesheets.size}</strong> timesheet(s).
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Approval Comments (Optional)"
            value={bulkComments}
            onChange={(e) => setBulkComments(e.target.value)}
            placeholder="Add any comments for the approval..."
            sx={{ mt: 2 }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            This action cannot be undone. The selected timesheets will be marked as approved.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkApprovalDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkApprove}
            variant="contained"
            color="success"
            startIcon={<BulkApproveIcon />}
            disabled={isLoading('bulk-approve')}
          >
            {isLoading('bulk-approve') ? 'Approving...' : `Approve ${selectedTimesheets.size} Timesheet(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Rejection Dialog */}
      <Dialog open={bulkRejectionDialog} onClose={() => setBulkRejectionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BulkRejectIcon sx={{ mr: 1, color: 'error.main' }} />
            Bulk Reject Timesheets
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You are about to reject <strong>{selectedTimesheets.size}</strong> timesheet(s).
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason *"
            value={bulkComments}
            onChange={(e) => setBulkComments(e.target.value)}
            placeholder="Please provide a reason for rejection..."
            required
            sx={{ mt: 2 }}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The selected timesheets will be marked as rejected and returned to employees for correction.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkRejectionDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkReject}
            variant="contained"
            color="error"
            startIcon={<BulkRejectIcon />}
            disabled={isLoading('bulk-reject') || !bulkComments.trim()}
          >
            {isLoading('bulk-reject') ? 'Rejecting...' : `Reject ${selectedTimesheets.size} Timesheet(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(ManagerTimesheetApproval);
