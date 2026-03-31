import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Badge,
  Avatar,
  Stack,
  InputAdornment,
  useTheme,
  alpha,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  EventBusy as EventBusyIcon
} from '@mui/icons-material';
import EmptyState from '../../shared/EmptyState';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { leaveService } from '../../../services';
import { useLeaveRequests, useLeaveTypes, useApproveLeaveRequest, useRejectLeaveRequest } from '../../../hooks/queries';

const ModernLeaveManagement = () => {
  const { showSuccess, showError } = useNotification(); // ✅ Already destructured
  const theme = useTheme();
  const navigate = useNavigate();
  const { isEmployee, isAdmin, isHR } = useAuth();
  
  // Hooks must be called first, before any conditional logic
  const [activeTab, setActiveTab] = useState(0);
  const [innerTab, setInnerTab] = useState(0);
  const tabs = ['All', 'Pending', 'Approved', 'Rejected'];
  
  // 🚀 React Query hooks for data fetching
  const { data: leaveRequestsData } = useLeaveRequests({ limit: 500 });
  const { data: leaveBalancesData } = useQuery({
    queryKey: ['leave-balances-all'],
    queryFn: () => leaveService.getAllBalances(),
    staleTime: 2 * 60 * 1000,
    enabled: isAdmin || isHR, // admin/hr only — managers use the leave-requests view
  });
  const { data: leaveTypesData } = useLeaveTypes();
  
  // 🚀 Mutations for approve/reject
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();
  
  // Derive data from queries — normaliseResponse can return an array directly,
  // { data: [] }, or { data: { data: [], pagination: {} } } depending on endpoint.
  const toArray = (v) =>
    Array.isArray(v) ? v
    : Array.isArray(v?.data) ? v.data
    : Array.isArray(v?.data?.data) ? v.data.data
    : [];

  const leaveRequests = toArray(leaveRequestsData);
  const leaveBalances = toArray(leaveBalancesData);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null); // { id, action: 'Approved'|'Rejected' }
  const [quickRejectComments, setQuickRejectComments] = useState('');

  // Balance tab filters
  const [balSearch, setBalSearch] = useState('');
  const [balTypeFilter, setBalTypeFilter] = useState('all');
  const [balPage, setBalPage] = useState(0);
  const [balRowsPerPage, setBalRowsPerPage] = useState(10);
  
  // -- Helpers --

  // CSV escape helper
  const escCsv = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  // Export leave requests to CSV
  const handleExportRequests = () => {
    if (!filteredRequests.length) {
      showError('No leave requests to export');
      return;
    }
    const header = 'Employee,Leave Type,Start Date,End Date,Days,Status,Reason';
    const rows = filteredRequests.map(r => [
      escCsv(r.employeeName || `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`),
      escCsv(r.leaveType?.name || r.leaveType || ''),
      escCsv(r.startDate),
      escCsv(r.endDate),
      escCsv(r.totalDays ?? ''),
      escCsv(r.status),
      escCsv(r.reason)
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Leave requests exported');
  };

  // Export leave balances to CSV
  const handleExportBalances = () => {
    if (!leaveBalances.length) {
      showError('No leave balances to export');
      return;
    }
    const header = 'Employee,Employee ID,Department,Leave Type,Allocated,Used,Remaining';
    const rows = leaveBalances.map(b => [
      escCsv(`${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`),
      escCsv(b.employee?.employeeId || ''),
      escCsv(b.employee?.department || ''),
      escCsv(b.leaveType?.name || ''),
      escCsv(b.totalAccrued ?? b.allocated ?? ''),
      escCsv(b.totalTaken ?? b.used ?? ''),
      escCsv(b.balance ?? b.remaining ?? '')
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-balances-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Leave balances exported');
  };
  
  // Redirect employees to their personal leave page
  if (isEmployee) {
    return <Navigate to="/leave-requests" replace />;
  }

  // Derive leave types from API (with color mapping fallback)
  const leaveTypeColorMap = {
    annual: 'primary', sick: 'error', personal: 'warning',
    maternity: 'secondary', emergency: 'info', paternity: 'secondary',
    unpaid: 'default', compassionate: 'info'
  };
  const leaveTypes = (leaveTypesData?.data || leaveTypesData || []).map(t => ({
    value: t.name?.toLowerCase() || t.id,
    label: t.name || 'Unknown',
    color: leaveTypeColorMap[t.name?.toLowerCase()] || 'default',
    id: t.id
  }));



  const getLeaveTypeInfo = (type) => {
    // Handle if type is an object (from API with associations)
    const typeName = typeof type === 'object' && type?.name 
      ? type.name.toLowerCase() 
      : typeof type === 'string' 
        ? type.toLowerCase() 
        : '';
    
    // Try to match with predefined types
    const matchedType = leaveTypes.find(lt => 
      lt.value === typeName || 
      lt.label.toLowerCase() === typeName
    );
    
    if (matchedType) {
      return matchedType;
    }
    
    // Fallback: return a safe object with the type name
    const displayName = typeof type === 'object' && type?.name 
      ? type.name 
      : typeof type === 'string' 
        ? type 
        : 'Unknown';
    
    return { label: displayName, color: 'default' };
  };

  const filteredRequests = leaveRequests.filter(request => {
    const matchesTab = innerTab === 0 || request.status === tabs[innerTab];

    const nestedName = `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`.trim().toLowerCase();
    const nestedEmpId = (request.employee?.employeeId || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (request.employeeName?.toLowerCase() || '').includes(term) ||
      (request.employeeId?.toLowerCase() || '').includes(term) ||
      nestedName.includes(term) ||
      nestedEmpId.includes(term);

    const matchesStatus = statusFilter === 'all' || request.status?.toLowerCase() === statusFilter?.toLowerCase();
    const matchesType = typeFilter === 'all' || request.leaveType?.name?.toLowerCase() === typeFilter || request.leaveType?.id?.toString() === typeFilter;

    return matchesTab && matchesSearch && matchesStatus && matchesType;
  });


  // ✅ ADD THIS FUNCTION - Calculate count by status
  const getCountByStatus = (status) => {
    if (status === 'All') {
      return leaveRequests.length;
    }
    return leaveRequests.filter(req => req.status === status).length;
  };

  // 🚀 Handle status update using mutations
  const handleStatusUpdate = async (leaveId, newStatus, comments = '') => {
    setActionLoading(true);
    
    const mutation = newStatus === 'Approved' ? approveMutation : rejectMutation;
    
    mutation.mutate(
      { id: leaveId, comments },
      {
        onSuccess: () => {
          showSuccess(`Leave request ${newStatus.toLowerCase()} successfully`);
          setActionLoading(false);
        },
        onError: (error) => {
          console.error(`Error updating leave status:`, error);
          showError(error.response?.data?.message || `Failed to ${newStatus.toLowerCase()} leave request`);
          setActionLoading(false);
        }
      }
    );
  };

  const LeaveRequestsTab = () => (
    <Box>
      {/* Header with Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Leave Requests Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportRequests}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/add-leave-request')}
          >
            New Request
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search employee"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                id="leaveMgmtSearch"
                inputProps={{ 'data-testid': 'leave-mgmt-search-input' }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  label="Status"
                  inputProps={{ 'data-testid': 'leave-mgmt-status-select' }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="cancellation requested">Cancellation Requested</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                  label="Leave Type"
                  inputProps={{ 'data-testid': 'leave-mgmt-type-select' }}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {leaveTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {filteredRequests.length} requests
                </Typography>
                <Badge badgeContent={leaveRequests.filter(r => r.status?.toLowerCase() === 'pending').length} color="warning">
                  <FilterIcon color="action" />
                </Badge>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs and Quick Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Tabs
          value={innerTab}
          onChange={(e, newValue) => { setInnerTab(newValue); setPage(0); }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 100
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab}
                  <Chip
                    label={getCountByStatus(tab)}
                    size="small"
                    variant="outlined"
                    color={tab === 'Pending' ? 'warning' : 'default'}
                    sx={{ height: 28, fontSize: '0.75rem' }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
        
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          disabled
          sx={{ borderRadius: 2 }}
          data-testid="leave-mgmt-filters-button"
        >
          Filters
        </Button>
      </Box>

      {/* Requests Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }} data-testid="leave-mgmt-requests-table">
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Leave Type</TableCell>
                <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Days</TableCell>
                <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Reason</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                    <EmptyState
                      icon={<EventBusyIcon sx={{ fontSize: 48 }} />}
                      title="No leave requests found"
                      description="Try adjusting your filters or search terms."
                    />
                  </TableCell>
                </TableRow>
              ) : filteredRequests
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((leave, index) => {
                  const leaveTypeInfo = getLeaveTypeInfo(leave.leaveType);
                  const employeeName = leave.employeeName || 
                                      (leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : '') ||
                                      'Unknown Employee';
                  const employeeId = leave.employeeId || leave.employee?.employeeId || 'N/A';
                  const isCancellation = leave.isCancellation; // Check for cancellation flag
                  
                  return (
                    <Fade in timeout={200 + index * 50} key={leave.id}>
                      <TableRow
                        hover
                        sx={{
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                          },
                          bgcolor: isCancellation ? alpha(theme.palette.warning.main, 0.05) : 'inherit' // Highlight cancellation rows
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={leave.employee?.photoUrl}
                              sx={{ width: 36, height: 36 }}
                            >
                              {leave.employee?.firstName?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="600">
                                {employeeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {employeeId}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={leaveTypeInfo.label}
                              color={leaveTypeInfo.color}
                              size="small"
                              variant="outlined"
                            />
                            {isCancellation && (
                              <Chip
                                label="Cancellation"
                                color="warning"
                                size="small"
                                variant="filled"
                                sx={{ fontWeight: 'bold', height: 28, fontSize: '0.75rem' }}
                              />
                            )}
                            {leave.isHalfDay && (
                              <Chip
                                label="Half Day"
                                color="info"
                                size="small"
                                variant="outlined"
                                sx={{ height: 28, fontSize: '0.75rem' }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' - '}
                            {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={`${leave.totalDays} ${leave.totalDays === 1 ? 'day' : 'days'}`}
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={leave.status}
                            size="small"
                            variant="outlined"
                            color={
                              leave.status === 'Approved' ? 'success' :
                              leave.status === 'Pending' ? 'warning' :
                              'error'
                            }
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Tooltip title={leave.reason}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {leave.reason}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        
                        <TableCell align="right">
                          {leave.status === 'Pending' && (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  aria-label="Approve leave request"
                                  data-testid="leave-approve-btn"
                                  onClick={() => setConfirmAction({ id: leave.id, action: 'Approved' })}
                                  sx={{
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2) }
                                  }}
                                >
                                  <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  aria-label="Reject leave request"
                                  data-testid="leave-reject-btn"
                                  onClick={() => setConfirmAction({ id: leave.id, action: 'Rejected' })}
                                  sx={{
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                                  }}
                                >
                                  <CancelIcon fontSize="small" sx={{ color: 'error.main' }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                          
                          {leave.status !== 'Pending' && (
                            <Typography variant="caption" color="text.secondary">
                              {leave.status === 'Approved' ? 'Approved' : 'Rejected'}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    </Fade>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredRequests.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Card>
    </Box>
  );

  const LeaveBalancesTab = () => {
    const filteredBalances = leaveBalances.filter(b => {
      const name = `${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`.toLowerCase();
      const empId = (b.employee?.employeeId || '').toLowerCase();
      const matchesSearch = !balSearch ||
        name.includes(balSearch.toLowerCase()) ||
        empId.includes(balSearch.toLowerCase());
      const matchesType = balTypeFilter === 'all' ||
        b.leaveType?.name?.toLowerCase() === balTypeFilter ||
        b.leaveType?.id?.toString() === balTypeFilter;
      return matchesSearch && matchesType;
    });

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            Leave Balances Overview
          </Typography>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportBalances}>
            Export Report
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Search employee"
                  value={balSearch}
                  onChange={(e) => { setBalSearch(e.target.value); setBalPage(0); }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Leave Type</InputLabel>
                  <Select
                    value={balTypeFilter}
                    label="Leave Type"
                    onChange={(e) => { setBalTypeFilter(e.target.value); setBalPage(0); }}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {leaveTypes.map(t => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  {filteredBalances.length} of {leaveBalances.length} records
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {!leaveBalances || leaveBalances.length === 0 ? (
          <Alert severity="info">
            No leave balance data available. Navigate to Admin → Leave Balances to manage employee leave allocations.
          </Alert>
        ) : (
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Leave Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Allocated</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Taken</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Pending</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, borderBottom: '2px solid', borderColor: 'divider' }}>Available</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No matching records</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBalances
                      .slice(balPage * balRowsPerPage, balPage * balRowsPerPage + balRowsPerPage)
                      .map((balance, index) => {
                        const employeeName = balance.employee
                          ? `${balance.employee.firstName} ${balance.employee.lastName}`
                          : 'Unknown Employee';
                        const allocated = Number(balance.totalAccrued || 0) + Number(balance.carryForward || 0);
                        const available = Number(balance.balance || 0);
                        return (
                          <TableRow key={balance.id || index} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
                                  {employeeName.split(' ').map(n => n[0]).join('')}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="600">{employeeName}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {balance.employee?.employeeId || 'N/A'} • {balance.employee?.department?.name || balance.employee?.department || ''}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={balance.leaveType?.name || 'Unknown'}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">{allocated.toFixed(1)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{balance.totalTaken || 0}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{balance.totalPending || 0}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${available} days`}
                                size="small"
                                color={available >= 10 ? 'success' : available >= 5 ? 'warning' : 'error'}
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredBalances.length}
              page={balPage}
              onPageChange={(e, newPage) => setBalPage(newPage)}
              rowsPerPage={balRowsPerPage}
              onRowsPerPageChange={(e) => { setBalRowsPerPage(parseInt(e.target.value, 10)); setBalPage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Card>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Fade in timeout={600}>
        <Box>
          {/* Header */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              bgcolor: 'white',
              color: 'text.primary',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Leave Management
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Manage employee leave requests and balances
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Tabs */}
          <Paper sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
            >
              <Tab
                label={
                  <Badge badgeContent={leaveRequests.filter(r => r.status?.toLowerCase() === 'pending').length} color="warning">
                    Leave Requests
                  </Badge>
                }
              />
              <Tab label="Leave Balances" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {activeTab === 0 && <LeaveRequestsTab />}
              {activeTab === 1 && <LeaveBalancesTab />}
            </Box>
          </Paper>

          {/* Quick Action Confirmation Dialog */}
          <Dialog
            open={!!confirmAction}
            onClose={() => setConfirmAction(null)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>
              Confirm {confirmAction?.action === 'Approved' ? 'Approval' : 'Rejection'}
            </DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to {confirmAction?.action === 'Approved' ? 'approve' : 'reject'} this leave request?
              </Typography>
              {confirmAction?.action === 'Rejected' && (
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Rejection Reason"
                  data-testid="quick-reject-comments"
                  value={quickRejectComments}
                  onChange={(e) => setQuickRejectComments(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  sx={{ mt: 2 }}
                  required
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setConfirmAction(null); setQuickRejectComments(''); }} variant="outlined">Cancel</Button>
              <Button
                variant="contained"
                color={confirmAction?.action === 'Approved' ? 'success' : 'error'}
                disabled={confirmAction?.action === 'Rejected' && !quickRejectComments.trim()}
                onClick={() => {
                  handleStatusUpdate(confirmAction.id, confirmAction.action, quickRejectComments);
                  setConfirmAction(null);
                  setQuickRejectComments('');
                }}
              >
                {confirmAction?.action === 'Approved' ? 'Approve' : 'Reject'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Fade>
    </Container>
  );
};

export default ModernLeaveManagement;
