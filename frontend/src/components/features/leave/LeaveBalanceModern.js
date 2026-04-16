import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  Stack,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Fade,
  Zoom
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  EventNote as EventNoteIcon,
  GroupAdd as GroupAddIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { leaveBalanceAdminService } from '../../../services/leave-balance-admin.service';

const LeaveBalanceModern = () => {
  // State management
  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  // Bulk initialization
  const [showBulkInit, setShowBulkInit] = useState(false);
  const [bulkInitData, setBulkInitData] = useState({});

  // Individual creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({
    employeeId: '',
    leaveTypeId: '',
    year: new Date().getFullYear(),
    totalAccrued: 0,
    carryForward: 0
  });

  // Edit mode
  const [editingBalance, setEditingBalance] = useState(null);
  const [editData, setEditData] = useState({});

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [balanceToDelete, setBalanceToDelete] = useState(null);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when server-side filters change (including employeeStatus)
  useEffect(() => {
    loadData(1);
  }, [selectedEmployee, selectedLeaveType, selectedYear, employeeStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    try {
      const [employeesRes, leaveTypesRes] = await Promise.all([
        leaveBalanceAdminService.getEmployees(),
        leaveBalanceAdminService.getLeaveTypes()
      ]);

      setEmployees(employeesRes.data || []);
      setLeaveTypes(leaveTypesRes.data || []);
    } catch (err) {
      setError('Failed to load initial data: ' + err.message);
    }
  };

  const loadData = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        limit: 10,
        year: selectedYear
      };

      if (selectedEmployee) params.employeeId = selectedEmployee;
      if (selectedLeaveType) params.leaveTypeId = selectedLeaveType;
      if (employeeStatus !== 'all') params.employeeStatus = employeeStatus;

      const response = await leaveBalanceAdminService.getAll(params);

      setBalances(response.data.balances || []);
      setCurrentPage(response.data.pagination.currentPage);
      setTotalPages(response.data.pagination.pages);
      setTotalRecords(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load leave balances: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkInit = async () => {
    if (Object.keys(bulkInitData).length === 0) {
      setError('Please set allocations for at least one leave type');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await leaveBalanceAdminService.bulkInitialize({
        year: selectedYear,
        leaveAllocations: bulkInitData
      });

      const { created = 0, updated = 0 } = response.data || {};
      let message = 'Leave balances initialized successfully!';
      
      if (created > 0 && updated > 0) {
        message = `Created ${created} new balances and updated ${updated} existing balances`;
      } else if (created > 0) {
        message = `Created ${created} new leave balances`;
      } else if (updated > 0) {
        message = `Updated ${updated} existing leave balances (allocations added to current balances)`;
      }

      setSuccess(message);
      setShowBulkInit(false);
      setBulkInitData({});
      await loadData();
    } catch (err) {
      setError('Failed to initialize leave balances: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');

    if (!createData.employeeId || !createData.leaveTypeId) {
      setError('Please select both an employee and a leave type before creating a balance.');
      return;
    }

    setLoading(true);
    try {
      await leaveBalanceAdminService.create(createData);

      setSuccess('Leave balance created successfully!');
      setShowCreateForm(false);
      setCreateData({
        employeeId: '',
        leaveTypeId: '',
        year: new Date().getFullYear(),
        totalAccrued: 0,
        carryForward: 0
      });
      await loadData();
    } catch (err) {
      setError('Failed to create leave balance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (balanceId) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await leaveBalanceAdminService.update(balanceId, editData);

      setSuccess('Leave balance updated successfully!');
      setEditingBalance(null);
      setEditData({});
      await loadData();
    } catch (err) {
      setError('Failed to update leave balance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (balanceId) => {
    setBalanceToDelete(balanceId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!balanceToDelete) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setDeleteConfirmOpen(false);

    try {
      await leaveBalanceAdminService.delete(balanceToDelete);

      setSuccess('Leave balance deleted successfully!');
      setBalanceToDelete(null);
      await loadData();
    } catch (err) {
      setError('Failed to delete leave balance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (balance) => {
    setEditingBalance(balance.id);
    setEditData({
      totalAccrued: balance.totalAccrued,
      totalTaken: balance.totalTaken,
      totalPending: balance.totalPending,
      carryForward: balance.carryForward
    });
  };

  const cancelEdit = () => {
    setEditingBalance(null);
    setEditData({});
  };

  const handleResetFilters = () => {
    setSelectedEmployee('');
    setSelectedLeaveType('');
    setSelectedYear(new Date().getFullYear());
    setSearchQuery('');
    setEmployeeStatus('all');
    setSuccess('Filters cleared');
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Employee ID', 'Employee Name', 'Leave Type', 'Year', 'Total Allocated', 'Carry Forward', 'Taken', 'Pending', 'Balance'],
      ...filteredBalances.map(b => [
        b.employee?.employeeId || '',
        `${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`,
        b.leaveType?.name || 'Unknown',
        selectedYear,
        b.totalAccrued || 0,
        b.carryForward || 0,
        b.totalTaken || 0,
        b.totalPending || 0,
        b.balance || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_balances_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSuccess('Leave balances exported successfully');
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1
    ];
  };

  const getBalanceColor = (balance) => {
    if (balance > 10) return 'success';
    if (balance > 5) return 'warning';
    return 'error';
  };

  // Client-side filter: search only (within current page)
  // employeeStatus is handled server-side for correct pagination
  const filteredBalances = balances.filter(balance => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const employeeName = `${balance.employee?.firstName || ''} ${balance.employee?.lastName || ''}`.toLowerCase();
    const employeeId = (balance.employee?.employeeId || '').toLowerCase();
    return employeeName.includes(searchLower) || employeeId.includes(searchLower);
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Fade in timeout={500}>
        <Card sx={{ mb: 3, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EventNoteIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="text.primary">
                    Leave Balance Administration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Manage employee leave allocations and balances
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Bulk Initialize Leave Balances">
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<GroupAddIcon />}
                    onClick={() => setShowBulkInit(true)}
                    disabled={loading}
                    data-testid="leave-balance-init-btn"
                  >
                    Bulk Initialize
                  </Button>
                </Tooltip>
                <Tooltip title="Add Individual Leave Balance">
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setShowCreateForm(true)}
                    disabled={loading}
                  >
                    Add Balance
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Fade>

      {/* Alerts */}
      {error && (
        <Zoom in>
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        </Zoom>
      )}

      {success && (
        <Zoom in>
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
            {success}
          </Alert>
        </Zoom>
      )}

      {/* Filters Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Filters & Search
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => loadData(currentPage)}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleResetFilters}
                disabled={!selectedEmployee && !selectedLeaveType && !searchQuery && employeeStatus === 'all' && selectedYear === new Date().getFullYear()}
              >
                Clear Filters
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
                disabled={balances.length === 0}
              >
                Export CSV
              </Button>
            </Stack>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search Employee"
                placeholder="Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="leaveSearchQuery"
                inputProps={{ 'data-testid': 'leave-search-input' }}
                InputProps={{
                  startAdornment: <FilterListIcon sx={{ mr: 1, color: 'action.disabled' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Year"
                  onChange={(e) => setSelectedYear(e.target.value)}
                  inputProps={{ 'data-testid': 'leave-year-select' }}
                >
                  {getYearOptions().map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={selectedEmployee}
                  label="Employee"
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  inputProps={{ 'data-testid': 'leave-employee-select' }}
                >
                  <MenuItem value="">All Employees</MenuItem>
                  {employees.map(emp => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={selectedLeaveType}
                  label="Leave Type"
                  onChange={(e) => setSelectedLeaveType(e.target.value)}
                  inputProps={{ 'data-testid': 'leave-type-filter-select' }}
                >
                  <MenuItem value="">All Leave Types</MenuItem>
                  {leaveTypes.map(type => (
                    <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Employee Status</InputLabel>
                <Select
                  value={employeeStatus}
                  label="Employee Status"
                  onChange={(e) => setEmployeeStatus(e.target.value)}
                  inputProps={{ 'data-testid': 'leave-employee-status-select' }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive / Deleted</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetFilters}
                sx={{ height: '56px' }}
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredBalances.length} of {totalRecords} leave balances for year {selectedYear}
            </Typography>
            {employeeStatus !== 'all' && (
              <Chip
                label={employeeStatus === 'active' ? 'Active employees only' : 'Inactive / Deleted employees only'}
                size="small"
                onDelete={() => setEmployeeStatus('all')}
                color={employeeStatus === 'active' ? 'success' : 'default'}
                variant="outlined"
                sx={{ height: 28, fontSize: '0.75rem' }}
              />
            )}
            {searchQuery && (
              <Chip
                label={`Search: "${searchQuery}"`}
                size="small"
                onDelete={() => setSearchQuery('')}
                variant="outlined"
                sx={{ height: 28, fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Leave Balances Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50', borderBottom: '2px solid', borderColor: 'divider' }}>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>Employee</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>Leave Type</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>Total Allocated</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>Taken</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>Pending</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>Available</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2 }}>Loading...</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredBalances.length === 0 && balances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <EventNoteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Leave Balances Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Get started by initializing leave balances for all employees or adding individual balances
                      </Typography>
                      <Stack direction="row" spacing={2} justifyContent="center">
                        <Button
                          variant="outlined"
                          color="success"
                          startIcon={<GroupAddIcon />}
                          onClick={() => setShowBulkInit(true)}
                        >
                          Bulk Initialize
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => setShowCreateForm(true)}
                        >
                          Add Balance
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredBalances.length === 0 && balances.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <FilterListIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No results match your search or filters
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your filters or search query
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredBalances.length > 0 && (
                  filteredBalances.map((balance, index) => (
                    <Fade in key={balance.id} timeout={300} style={{ transitionDelay: `${index * 50}ms` }}>
                      <TableRow hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {balance.employee
                                  ? `${balance.employee.firstName} ${balance.employee.lastName}`
                                  : 'Unknown Employee'}
                              </Typography>
                              {balance.employee?.deletedAt && (
                                <Chip
                                  label="Inactive"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    bgcolor: 'grey.200',
                                    color: 'text.secondary',
                                    borderRadius: '4px',
                                    '& .MuiChip-label': { px: 0.75 }
                                  }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {balance.employee?.employeeId || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={balance.leaveType?.name || 'Unknown'}
                            variant="outlined"
                            color="primary"
                            size="small"
                            sx={{ fontWeight: '500' }}
                          />
                        </TableCell>
                        <TableCell>
                          {editingBalance === balance.id ? (
                            <Box>
                              <TextField
                                size="small"
                                type="number"
                                label="Allocated"
                                inputProps={{ step: 0.5 }}
                                value={editData.totalAccrued}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  totalAccrued: Number.parseFloat(e.target.value)
                                })}
                                sx={{ width: '100px', mb: 1 }}
                              />
                              <TextField
                                size="small"
                                type="number"
                                label="Carry Fwd"
                                inputProps={{ step: 0.5 }}
                                value={editData.carryForward}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  carryForward: Number.parseFloat(e.target.value)
                                })}
                                sx={{ width: '100px' }}
                              />
                            </Box>
                          ) : (
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {(Number(balance.totalAccrued || 0) + Number(balance.carryForward || 0)).toFixed(1)} days
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({balance.totalAccrued || 0} + {balance.carryForward || 0} CF)
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingBalance === balance.id ? (
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ step: 0.5 }}
                              value={editData.totalTaken}
                              onChange={(e) => setEditData({
                                ...editData,
                                totalTaken: Number.parseFloat(e.target.value)
                              })}
                              sx={{ width: '100px' }}
                            />
                          ) : (
                            <Typography variant="body2" color="warning.main" fontWeight="500">
                              {balance.totalTaken} days
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingBalance === balance.id ? (
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ step: 0.5 }}
                              value={editData.totalPending}
                              onChange={(e) => setEditData({
                                ...editData,
                                totalPending: Number.parseFloat(e.target.value)
                              })}
                              sx={{ width: '100px' }}
                            />
                          ) : (
                            <Typography variant="body2" color="info.main" fontWeight="500">
                              {balance.totalPending} days
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${balance.balance} days`}
                            variant="outlined"
                            color={getBalanceColor(balance.balance)}
                            size="small"
                            sx={{ fontWeight: '500' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {editingBalance === balance.id ? (
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="Save">
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleEdit(balance.id)}
                                  disabled={loading}
                                >
                                  <SaveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton
                                  color="default"
                                  size="small"
                                  onClick={cancelEdit}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="Edit">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => startEdit(balance)}
                                  disabled={loading}
                                  data-testid="leave-balance-edit-btn"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleDelete(balance.id)}
                                  disabled={loading}
                                  data-testid="leave-balance-delete-btn"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    </Fade>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(e, page) => loadData(page)}
                color="primary"
                size="large"
                disabled={loading}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Bulk Initialize Dialog */}
      <Dialog
        open={showBulkInit}
        onClose={() => {
          setShowBulkInit(false);
          setBulkInitData({});
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupAddIcon sx={{ mr: 1, color: 'success.main' }} />
            Bulk Initialize Leave Balances
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Add leave allocation for all active employees for year {selectedYear}.</strong>
            <br />
            • For <strong>new employees</strong>: Creates new leave balance records
            <br />
            • For <strong>existing employees</strong>: Adds the days to their current "Total Accrued" balance
            <br />
            <em>Example: If an employee has 10 days accrued and you allocate 5 more days, they will have 15 days total.</em>
          </Alert>

          <Grid container spacing={2}>
            {leaveTypes.map(type => (
              <Grid item xs={12} sm={6} key={type.id}>
                <TextField
                  fullWidth
                  label={`${type.name} - Days to Add`}
                  type="number"
                  value={bulkInitData[type.id] || ''}
                  onChange={(e) => setBulkInitData({
                    ...bulkInitData,
                    [type.id]: e.target.value
                  })}
                  id={`bulkAllocation-${type.id}`}
                  inputProps={{ step: 0.5, min: 0, 'data-testid': `leave-bulk-allocation-${type.id}` }}
                  helperText={`Will be added to existing balances (e.g., ${type.maxDaysPerYear || 20} days)`}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setShowBulkInit(false);
              setBulkInitData({});
            }}
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={handleBulkInit}
            disabled={loading || Object.keys(bulkInitData).length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <GroupAddIcon />}
            data-testid="leave-balance-bulk-submit-btn"
          >
            {loading ? 'Initializing...' : 'Initialize Balances'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Balance Dialog */}
      <Dialog
        open={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setCreateData({
            employeeId: '',
            leaveTypeId: '',
            year: new Date().getFullYear(),
            totalAccrued: 0,
            carryForward: 0
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AddIcon sx={{ mr: 1, color: 'primary.main' }} />
            Create Leave Balance
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Employee (Required)</InputLabel>
              <Select
                value={createData.employeeId}
                label="Employee (Required)"
                onChange={(e) => setCreateData({ ...createData, employeeId: e.target.value })}
                inputProps={{ 'data-testid': 'create-leave-employee-select' }}
              >
                <MenuItem value="">Select Employee</MenuItem>
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Leave Type (Required)</InputLabel>
              <Select
                value={createData.leaveTypeId}
                label="Leave Type (Required)"
                onChange={(e) => setCreateData({ ...createData, leaveTypeId: e.target.value })}
                inputProps={{ 'data-testid': 'create-leave-type-select' }}
              >
                <MenuItem value="">Select Leave Type</MenuItem>
                {leaveTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={createData.year}
                  onChange={(e) => {
                    const val = e.target.value === '' ? new Date().getFullYear() : Number.parseInt(e.target.value, 10);
                    setCreateData({ ...createData, year: val });
                  }}
                  id="createLeaveYear"
                  inputProps={{ 
                    'data-testid': 'create-leave-year-input',
                    min: 2020, 
                    max: 2030 
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Accrued Days (Current Year)"
                  type="number"
                  value={createData.totalAccrued}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                    setCreateData({ ...createData, totalAccrued: val });
                  }}
                  helperText="Days allocated for this year"
                  id="createLeaveAccrued"
                  inputProps={{ step: 0.5, min: 0, 'data-testid': 'create-leave-accrued-input' }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Carry Forward Days (From Previous Year)"
              type="number"
              value={createData.carryForward}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                setCreateData({ ...createData, carryForward: val });
              }}
              helperText="Unused days from previous year"
              id="createLeaveCarryForward"
              inputProps={{ step: 0.5, min: 0, 'data-testid': 'create-leave-carryforward-input' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setShowCreateForm(false);
              setCreateData({
                employeeId: '',
                leaveTypeId: '',
                year: new Date().getFullYear(),
                totalAccrued: 0,
                carryForward: 0
              });
            }}
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleCreate}
            disabled={loading || !createData.employeeId || !createData.leaveTypeId}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            data-testid="leave-balance-create-submit-btn"
          >
            {loading ? 'Creating...' : 'Create Balance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon sx={{ color: 'error.main' }} />
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to delete this leave balance record? This will permanently remove the balance information for this employee and leave type.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setDeleteConfirmOpen(false);
              setBalanceToDelete(null);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete}
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveBalanceModern;
