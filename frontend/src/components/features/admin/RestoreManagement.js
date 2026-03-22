/**
 * Restore/Recovery Admin Page
 * Admin-only UI for restoring soft-deleted records (employee reviews, leave balances, users)
 */
import React, { useState } from 'react';
import {
  Container, Paper, Box, Typography, Button, Tabs, Tab, Badge,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, CircularProgress, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  RestoreFromTrash as RestoreIcon,
  Assessment as ReviewIcon,
  AccountBalanceWallet as BalanceIcon,
  People as UserIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { restoreService } from '../../../services/restore.service';

const RestoreManagement = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', id: null, label: '' });

  // Queries
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['restore', 'reviews'],
    queryFn: () => restoreService.getDeletedReviews(),
  });

  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: ['restore', 'balances'],
    queryFn: () => restoreService.getDeletedBalances(),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['restore', 'users'],
    queryFn: () => restoreService.getDeletedUsers(),
  });

  // Mutations
  const restoreReviewMutation = useMutation({
    mutationFn: (id) => restoreService.restoreReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restore', 'reviews'] });
      enqueueSnackbar('Review restored successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to restore review', { variant: 'error' });
    },
  });

  const restoreBalanceMutation = useMutation({
    mutationFn: (id) => restoreService.restoreBalance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restore', 'balances'] });
      enqueueSnackbar('Leave balance restored successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to restore balance', { variant: 'error' });
    },
  });

  const restoreUserMutation = useMutation({
    mutationFn: (id) => restoreService.restoreUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restore', 'users'] });
      enqueueSnackbar('User restored successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to restore user', { variant: 'error' });
    },
  });

  const deletedReviews = reviewsData?.data || [];
  const deletedBalances = balancesData?.data || [];
  const deletedUsers = usersData?.data || [];

  const isMutating = restoreReviewMutation.isPending || restoreBalanceMutation.isPending || restoreUserMutation.isPending;

  // Handle restore confirmation
  const handleRestore = () => {
    const { type, id } = confirmDialog;
    setConfirmDialog({ open: false, type: '', id: null, label: '' });
    if (type === 'review') {
      restoreReviewMutation.mutate(id);
    } else if (type === 'balance') {
      restoreBalanceMutation.mutate(id);
    } else if (type === 'user') {
      restoreUserMutation.mutate(id);
    }
  };

  // Redirect non-admin users (placed after all hooks)
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }} data-testid="restore-management-page">
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #ef5350 0%, #b71c1c 100%)', color: 'white' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <RestoreIcon sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Restore Deleted Records</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Recover soft-deleted employee reviews, leave balances, and user accounts
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab data-testid="restore-tab-reviews" label={
            <Badge badgeContent={deletedReviews.length} color="error" max={99}>
              <Box display="flex" alignItems="center" gap={0.5}><ReviewIcon fontSize="small" /> Reviews</Box>
            </Badge>
          } />
          <Tab data-testid="restore-tab-balances" label={
            <Badge badgeContent={deletedBalances.length} color="error" max={99}>
              <Box display="flex" alignItems="center" gap={0.5}><BalanceIcon fontSize="small" /> Balances</Box>
            </Badge>
          } />
          <Tab data-testid="restore-tab-users" label={
            <Badge badgeContent={deletedUsers.length} color="error" max={99}>
              <Box display="flex" alignItems="center" gap={0.5}><UserIcon fontSize="small" /> Users</Box>
            </Badge>
          } />
        </Tabs>
      </Paper>

      {/* ======== TAB 0: Deleted Reviews ======== */}
      {activeTab === 0 && (
        <Paper>
          <TableContainer>
            {reviewsLoading && <LinearProgress />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Review Period</TableCell>
                  <TableCell>Review Type</TableCell>
                  <TableCell>Reviewer</TableCell>
                  <TableCell>Deleted At</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {reviewsLoading ? 'Loading...' : 'No deleted reviews found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedReviews.map((review) => (
                    <TableRow key={review.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {review.employee?.firstName} {review.employee?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.employee?.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>{review.reviewPeriod}</TableCell>
                      <TableCell>
                        <Chip label={review.reviewType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(review.deletedAt)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small" variant="outlined" color="success"
                          startIcon={<RestoreIcon />}
                          disabled={isMutating}
                          onClick={() => setConfirmDialog({
                            open: true, type: 'review', id: review.id,
                            label: `${review.employee?.firstName} ${review.employee?.lastName} — ${review.reviewPeriod}`,
                          })}
                          aria-label={`Restore review for ${review.employee?.firstName} ${review.employee?.lastName}`}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ======== TAB 1: Deleted Leave Balances ======== */}
      {activeTab === 1 && (
        <Paper>
          <TableContainer>
            {balancesLoading && <LinearProgress />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell align="center">Year</TableCell>
                  <TableCell align="center">Balance</TableCell>
                  <TableCell>Deleted At</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {balancesLoading ? 'Loading...' : 'No deleted balances found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedBalances.map((bal) => (
                    <TableRow key={bal.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {bal.employee?.firstName} {bal.employee?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {bal.employee?.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={bal.leaveType?.name || bal.leaveType?.code || 'Unknown'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{bal.year}</TableCell>
                      <TableCell align="center">
                        <Chip label={bal.balance ?? 0} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(bal.deletedAt)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small" variant="outlined" color="success"
                          startIcon={<RestoreIcon />}
                          disabled={isMutating}
                          onClick={() => setConfirmDialog({
                            open: true, type: 'balance', id: bal.id,
                            label: `${bal.employee?.firstName} ${bal.employee?.lastName} — ${bal.leaveType?.name || 'Unknown'}`,
                          })}
                          aria-label={`Restore balance for ${bal.employee?.firstName} ${bal.employee?.lastName}`}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ======== TAB 2: Deleted Users ======== */}
      {activeTab === 2 && (
        <Paper>
          <TableContainer>
            {usersLoading && <LinearProgress />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Deleted At</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deletedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {usersLoading ? 'Loading...' : 'No deleted users found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {user.firstName} {user.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(user.deletedAt)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small" variant="outlined" color="success"
                          startIcon={<RestoreIcon />}
                          disabled={isMutating}
                          onClick={() => setConfirmDialog({
                            open: true, type: 'user', id: user.id,
                            label: `${user.firstName} ${user.lastName} (${user.email})`,
                          })}
                          aria-label={`Restore user ${user.firstName} ${user.lastName}`}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, type: '', id: null, label: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Restore</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1 }}>
            Are you sure you want to restore <strong>{confirmDialog.label}</strong>?
            This will make the record active again.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog({ open: false, type: '', id: null, label: '' })} data-testid="restore-cancel-btn">
            Cancel
          </Button>
          <Button
            variant="contained" color="success" onClick={handleRestore}
            disabled={isMutating}
            startIcon={isMutating ? <CircularProgress size={16} /> : <RestoreIcon />}
            data-testid="restore-confirm-btn"
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RestoreManagement;
