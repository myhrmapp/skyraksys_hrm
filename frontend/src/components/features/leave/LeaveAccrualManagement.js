/**
 * Leave Accrual Admin Page
 * Admin UI for managing leave accrual: view status, preview, run accrual, carry-forward
 * Restricted to admin and HR roles
 */
import React, { useState, useMemo } from 'react';
import {
  Container, Paper, Box, Typography, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Alert, CircularProgress, TextField, MenuItem, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  SwapHoriz as CarryForwardIcon,
  Refresh as RefreshIcon,
  AccountBalanceWallet as AccrualIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { leaveAccrualService } from '../../../services/leaveAccrual.service';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LeaveAccrualManagement = () => {
  const { isAdmin, isHR } = useAuth();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: '', message: '' });
  const [resultDialog, setResultDialog] = useState({ open: false, title: '', data: null });

  // Queries
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['leave-accrual', 'status', year],
    queryFn: () => leaveAccrualService.getStatus({ year }),
  });

  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useQuery({
    queryKey: ['leave-accrual', 'preview', year, month],
    queryFn: () => leaveAccrualService.preview({ year, month }),
    enabled: activeTab === 1,
  });

  // Mutations
  const runAccrualMutation = useMutation({
    mutationFn: (data) => leaveAccrualService.runAccrual(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leave-accrual'] });
      enqueueSnackbar('Monthly accrual completed successfully', { variant: 'success' });
      setResultDialog({
        open: true,
        title: 'Accrual Results',
        data: result.data || result,
      });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to run accrual', { variant: 'error' });
    },
  });

  const carryForwardMutation = useMutation({
    mutationFn: (data) => leaveAccrualService.carryForward(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leave-accrual'] });
      enqueueSnackbar('Year-end carry-forward completed', { variant: 'success' });
      setResultDialog({
        open: true,
        title: 'Carry-Forward Results',
        data: result.data || result,
      });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || 'Failed to run carry-forward', { variant: 'error' });
    },
  });

  // Data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statusRecords = statusData?.data || [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previewRecords = previewData?.data || [];

  // Filter records by search
  const filteredStatusRecords = useMemo(() => {
    if (!searchTerm) return statusRecords;
    const term = searchTerm.toLowerCase();
    return statusRecords.filter((r) => {
      const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
      const empId = (r.employee?.employeeId || '').toLowerCase();
      const leaveType = (r.leaveType?.name || '').toLowerCase();
      return name.includes(term) || empId.includes(term) || leaveType.includes(term);
    });
  }, [statusRecords, searchTerm]);

  const filteredPreviewRecords = useMemo(() => {
    if (!searchTerm) return previewRecords;
    const term = searchTerm.toLowerCase();
    return previewRecords.filter((r) => {
      const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
      const empId = (r.employee?.employeeId || '').toLowerCase();
      return name.includes(term) || empId.includes(term);
    });
  }, [previewRecords, searchTerm]);

  // Pagination
  const paginatedStatus = filteredStatusRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const paginatedPreview = filteredPreviewRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Confirm action
  const handleConfirmAction = () => {
    const { action } = confirmDialog;
    setConfirmDialog({ open: false, action: null, title: '', message: '' });
    if (action === 'run') {
      runAccrualMutation.mutate({ year, month });
    } else if (action === 'carry-forward') {
      carryForwardMutation.mutate({ newYear: year + 1 });
    }
  };

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  // Redirect non-admin/hr users (placed after all hooks)
  if (!isAdmin && !isHR) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <Container maxWidth="xl" sx={{ py: 3 }} data-testid="leave-accrual-page">
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #43a047 0%, #1b5e20 100%)', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <AccrualIcon sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">Leave Accrual Management</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Manage monthly leave accrual and year-end carry-forward
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            {isAdmin && (
              <>
                <Button
                  variant="contained" startIcon={<RunIcon />}
                  onClick={() => setConfirmDialog({
                    open: true, action: 'run',
                    title: 'Run Monthly Accrual',
                    message: `Run monthly leave accrual for ${MONTHS[month - 1]} ${year}? This will add accrued leave days to all active employees.`,
                  })}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                  disabled={runAccrualMutation.isPending}
                  data-testid="leave-accrual-run-btn"
                >
                  Run Accrual
                </Button>
                <Button
                  variant="contained" startIcon={<CarryForwardIcon />}
                  onClick={() => setConfirmDialog({
                    open: true, action: 'carry-forward',
                    title: 'Year-End Carry Forward',
                    message: `Carry forward unused balances from ${year} to ${year + 1}? This should typically be run once at year-end.`,
                  })}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                  disabled={carryForwardMutation.isPending}
                  data-testid="leave-accrual-carry-forward-btn"
                >
                  Carry Forward
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" select label="Year" value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setPage(0); }}
            >
              {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" select label="Month" value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setPage(0); }}
            >
              {MONTHS.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small"
              placeholder="Search by employee name or ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              startIcon={<RefreshIcon />} size="small"
              onClick={() => { refetchStatus(); refetchPreview(); }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setPage(0); }}>
          <Tab label="Current Balances" />
          <Tab label="Accrual Preview" data-testid="leave-accrual-preview-btn" />
        </Tabs>
      </Paper>

      {/* ======== TAB 0: Current Balances ======== */}
      {activeTab === 0 && (
        <Paper>
          <TableContainer>
            {statusLoading && <LinearProgress />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell align="center">Total Accrued</TableCell>
                  <TableCell align="center">Taken</TableCell>
                  <TableCell align="center">Pending</TableCell>
                  <TableCell align="center">Balance</TableCell>
                  <TableCell align="center">Carry Forward</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedStatus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {statusLoading ? 'Loading...' : 'No balance records found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStatus.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {record.employee?.firstName} {record.employee?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.employee?.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={record.leaveType?.name || 'Unknown'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{record.totalAccrued ?? 0}</TableCell>
                      <TableCell align="center">{record.totalTaken ?? 0}</TableCell>
                      <TableCell align="center">{record.totalPending ?? 0}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={record.balance ?? 0}
                          size="small"
                          color={Number(record.balance) > 0 ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">{record.carryForward ?? 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredStatusRecords.length}
            page={page} onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number.parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Paper>
      )}

      {/* ======== TAB 1: Accrual Preview ======== */}
      {activeTab === 1 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Preview for {MONTHS[month - 1]} {year} — this is a dry-run showing what would be accrued if you run accrual now.
            </Alert>
          </Box>
          <TableContainer>
            {previewLoading && <LinearProgress />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell align="center">Current Accrued</TableCell>
                  <TableCell align="center">Would Accrue</TableCell>
                  <TableCell align="center">New Total</TableCell>
                  <TableCell align="center">At Max</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedPreview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {previewLoading ? 'Loading preview...' : 'No preview data available'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPreview.map((record) => (
                    <TableRow key={`${record.employee?.employeeId}-${record.leaveType?.name || record.leaveTypeName}`} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {record.employee?.firstName} {record.employee?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.employee?.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={record.leaveType?.name || record.leaveTypeName || 'Unknown'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{record.currentAccrued ?? 0}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`+${record.wouldAccrue ?? 0}`}
                          size="small" color="primary" variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">{record.newTotal ?? 0}</TableCell>
                      <TableCell align="center">
                        {record.atMax ? (
                          <Chip label="At Max" size="small" color="warning" />
                        ) : (
                          <Chip label="No" size="small" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredPreviewRecords.length}
            page={page} onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number.parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Paper>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>{confirmDialog.message}</Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained" color="primary" onClick={handleConfirmAction}
            disabled={runAccrualMutation.isPending || carryForwardMutation.isPending}
          >
            {(runAccrualMutation.isPending || carryForwardMutation.isPending) ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultDialog.open} onClose={() => setResultDialog({ open: false, title: '', data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{resultDialog.title}</DialogTitle>
        <DialogContent>
          {resultDialog.data && (
            <Box sx={{ mt: 1 }}>
              {resultDialog.data.processed !== undefined && (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary" variant="body2">Processed</Typography>
                        <Typography variant="h5" color="success.main">{resultDialog.data.processed}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary" variant="body2">Skipped</Typography>
                        <Typography variant="h5" color="warning.main">{resultDialog.data.skipped}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary" variant="body2">Errors</Typography>
                        <Typography variant="h5" color="error.main">{resultDialog.data.errors}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
              {resultDialog.data.carried !== undefined && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary" variant="body2">Carried Forward</Typography>
                        <Typography variant="h5" color="success.main">{resultDialog.data.carried}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="text.secondary" variant="body2">Reset</Typography>
                        <Typography variant="h5" color="warning.main">{resultDialog.data.reset}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setResultDialog({ open: false, title: '', data: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LeaveAccrualManagement;
