import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Stack,
  InputAdornment,
  Checkbox,
  TableSortLabel,
  LinearProgress,
  Divider,
  Avatar,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  PendingActions as PendingIcon,
  AccessTime as TimeIcon,
  CheckCircleOutline as ApprovedIcon,
  HighlightOff as RejectedIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetService } from '../../../services/timesheet.service';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import PropTypes from 'prop-types';

dayjs.extend(relativeTime);

const TimesheetApproval = ({ embedded } = {}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { dialogProps, confirm } = useConfirmDialog();
  
  // 🚀 React Query for pending timesheets (team-scoped via /approval/pending)
  const { data: timesheetsData, isLoading: loading, refetch } = useQuery({
    queryKey: ['timesheets', 'pending'],
    queryFn: () => timesheetService.getPendingApprovals(),
    select: (response) => {
      const allTimesheets = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return allTimesheets.sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    }
  });

  // 🚀 React Query for timesheet stats (approved/rejected counts)
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['timesheets', 'stats'],
    queryFn: () => timesheetService.getStats(),
    select: (response) => response?.data || response || {},
  });
  
  const timesheets = useMemo(() => timesheetsData || [], [timesheetsData]);
  
  // 🚀 Mutations for approve/reject
  const approveMutation = useMutation({
    mutationFn: ({ ids, comments }) => timesheetService.bulkApprove(ids, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      showAlert('success', 'Timesheets approved successfully');
    },
    onError: (error) => {
      showAlert('error', error.message || 'Failed to approve timesheets');
    }
  });
  
  const rejectMutation = useMutation({
    mutationFn: ({ ids, comments }) => timesheetService.bulkReject(ids, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      showAlert('success', 'Timesheets rejected successfully');
    },
    onError: (error) => {
      showAlert('error', error.message || 'Failed to reject timesheets');
    }
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [comments, setComments] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [orderBy, setOrderBy] = useState('weekStartDate');
  const [order, setOrder] = useState('desc');
  // M-04: compute derived data with useMemo — no intermediate state / no cascading effects
  const filteredTimesheets = useMemo(() => {
    let filtered = timesheets.filter((ts) => {
      if (statusFilter && ts.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = `${ts.employee?.firstName ?? ''} ${ts.employee?.lastName ?? ''}`.toLowerCase();
        if (!name.includes(q) && !(ts.employee?.employeeId ?? '').toLowerCase().includes(q)) return false;
      }
      if (projectFilter && ts.projectId !== projectFilter) return false;
      if (dateRange.start && dayjs(ts.weekStartDate).isBefore(dayjs(dateRange.start))) return false;
      if (dateRange.end   && dayjs(ts.weekStartDate).isAfter(dayjs(dateRange.end)))   return false;
      return true;
    });

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (orderBy) {
        case 'employee':
          aVal = `${a.employee?.firstName} ${a.employee?.lastName}`.toLowerCase();
          bVal = `${b.employee?.firstName} ${b.employee?.lastName}`.toLowerCase();
          break;
        case 'hours':
          aVal = parseFloat(a.totalHoursWorked || 0);
          bVal = parseFloat(b.totalHoursWorked || 0);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'submittedAt':
          aVal = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          bVal = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          break;
        default: // weekStartDate
          aVal = new Date(a.weekStartDate).getTime();
          bVal = new Date(b.weekStartDate).getTime();
      }
      return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return filtered;
  }, [timesheets, statusFilter, searchQuery, projectFilter, dateRange, orderBy, order]);

  const summary = useMemo(() => {
    const submitted = timesheets.filter((ts) => ts.status?.toLowerCase() === 'submitted');
    return {
      totalPending: submitted.length,
      totalHours: submitted.reduce((sum, ts) => sum + parseFloat(ts.totalHours ?? ts.totalHoursWorked ?? 0), 0),
      employees: new Set(submitted.map((ts) => ts.employeeId)).size,
      approved: statsData?.approved ?? 0,
      rejected: statsData?.rejected ?? 0,
      draft:    statsData?.draft    ?? 0,
    };
  }, [timesheets, statsData]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const handleApprovalClick = (timesheet, action) => {
    setSelectedTimesheet(timesheet);
    setApprovalAction(action);
    setComments('');
    setApprovalDialogOpen(true);
  };

  const handleApprovalSubmit = async () => {
    const mutation = approvalAction === 'approve' ? approveMutation : rejectMutation;
    const ids = selectedTimesheet ? [selectedTimesheet.id] : selectedIds;
    
    mutation.mutate({ ids, comments }, {
      onSuccess: () => {
        setApprovalDialogOpen(false);
        setSelectedIds([]);
      }
    });
  };

  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) {
      showAlert('warning', 'Please select at least one timesheet');
      return;
    }

    // H-02: reject MUST collect comments — open the approval dialog
    if (action === 'reject') {
      setSelectedTimesheet(null); // null signals handleApprovalSubmit to use selectedIds
      setApprovalAction('reject');
      setComments('');
      setApprovalDialogOpen(true);
      return;
    }

    confirm({
      title: 'Approve Timesheets',
      message: `Are you sure you want to approve ${selectedIds.length} timesheet(s)?`,
      variant: 'warning',
      confirmText: 'Approve',
      onConfirm: async () => {
        approveMutation.mutate({ ids: selectedIds, comments: '' }, {
          onSuccess: () => {
            setSelectedIds([]);
          }
        });
      }
    });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const submittedIds = paginatedTimesheets
        .filter(ts => ts.status === 'Submitted')
        .map(ts => ts.id);
      setSelectedIds(submittedIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const escCsv = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const csvContent = [
      ['Employee', 'Employee ID', 'Week Start', 'Week End', 'Project', 'Task', 'Hours', 'Status', 'Submitted Date'],
      ...filteredTimesheets.map(ts => [
        escCsv(`${ts.employee?.firstName} ${ts.employee?.lastName}`),
        escCsv(ts.employee?.employeeId),
        escCsv(formatDate(ts.weekStartDate)),
        escCsv(formatDate(ts.weekEndDate)),
        escCsv(ts.project?.name || 'N/A'),
        escCsv(ts.task?.name || 'N/A'),
        escCsv(ts.totalHoursWorked || calculateWeekTotal(ts)),
        escCsv(ts.status),
        escCsv(ts.submittedAt ? formatDate(ts.submittedAt) : '-')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showAlert('success', 'Timesheets exported successfully');
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setProjectFilter('');
    setDateRange({ start: '', end: '' });
    showAlert('info', 'Filters cleared');
  };

  const getUniqueProjects = () => {
    const projects = timesheets
      .filter(ts => ts.project)
      .map(ts => ts.project);
    return [...new Map(projects.map(p => [p.id, p])).values()];
  };

  const handleViewDetails = (timesheet) => {
    setSelectedTimesheet(timesheet);
    
    // Find all timesheets for this employee for this week
    const weekTimesheets = timesheets.filter(ts => 
      ts.employeeId === timesheet.employeeId &&
      ts.weekStartDate === timesheet.weekStartDate
    );
    
    // Store the week timesheets for display
    setSelectedTimesheet({
      ...timesheet,
      weekTimesheets: weekTimesheets
    });
    
    setViewDialogOpen(true);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'default',
      'Submitted': 'warning',
      'Approved': 'success',
      'Rejected': 'error'
    };
    return colors[status] || 'default';
  };

  const formatDate = (date) => {
    return dayjs(date).format('MMM DD, YYYY');
  };

  const calculateWeekTotal = (timesheet) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.reduce((total, day) => {
      return total + parseFloat(timesheet[`${day}Hours`] || 0);
    }, 0);
  };

  const getTotalHours = (timesheet) => {
    const hours = timesheet.totalHoursWorked || calculateWeekTotal(timesheet);
    return parseFloat(hours) || 0;
  };

  const paginatedTimesheets = filteredTimesheets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const renderSummaryCard = (title, value, icon, color, subtitle) => (
    <Card 
      sx={{ 
        height: '100%',
        bgcolor: 'white',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          <Typography variant="h3" sx={{ color, fontWeight: 'bold' }}>
            {value}
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" fontWeight={500}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: embedded ? 0 : 3, bgcolor: embedded ? 'transparent' : theme.palette.background.default, minHeight: embedded ? 'auto' : '100vh' }}>
      {/* Header */}
      {!embedded && (
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3,
          bgcolor: 'white',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom color="text.primary">
              Timesheet Approvals
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review and manage employee timesheet submissions
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => handleBulkAction('approve')}
                >
                  Approve ({selectedIds.length})
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => handleBulkAction('reject')}
                >
                  Reject ({selectedIds.length})
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => { refetch(); refetchStats(); }}
            >
              Refresh
            </Button>
          </Stack>
        </Box>
      </Paper>
      )}

      {/* Alert */}
      <Collapse in={alert.show}>
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2, borderRadius: 2 }} 
          onClose={() => setAlert({ ...alert, show: false })}
        >
          {alert.message}
        </Alert>
      </Collapse>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderSummaryCard(
            'Pending Approvals',
            summary.totalPending,
            <PendingIcon />,
            '#ff9800',
            `${summary.employees} employees`
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderSummaryCard(
            'Total Hours',
            summary.totalHours.toFixed(1),
            <TimeIcon />,
            '#2196f3',
            'Pending submission'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderSummaryCard(
            'Approved',
            summary.approved,
            <ApprovedIcon />,
            '#4caf50',
            'This period'
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {renderSummaryCard(
            'Rejected',
            summary.rejected,
            <RejectedIcon />,
            '#f44336',
            'Requires revision'
          )}
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search by employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1 }}
              size="small"
              id="tsApprovalSearch"
              inputProps={{ 'data-testid': 'ts-approval-search-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant={filterOpen ? 'outlined' : 'outlined'}
              startIcon={<FilterIcon />}
              onClick={() => setFilterOpen(!filterOpen)}
              sx={{ minWidth: 120 }}
              color={filterOpen ? 'primary' : 'inherit'}
            >
              {filterOpen ? 'Hide' : 'Show'} Filters
            </Button>
          </Box>

          <Collapse in={filterOpen}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    data-testid="ts-approval-status-select-wrapper"
                    inputProps={{ 'data-testid': 'ts-approval-status-select' }}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="Draft">Draft</MenuItem>
                    <MenuItem value="Submitted">Pending Approval</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={projectFilter}
                    label="Project"
                    onChange={(e) => setProjectFilter(e.target.value)}
                    data-testid="ts-approval-project-select-wrapper"
                    inputProps={{ 'data-testid': 'ts-approval-project-select' }}
                  >
                    <MenuItem value="">All Projects</MenuItem>
                    {getUniqueProjects().map(project => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Start Date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  id="tsApprovalStartDate"
                  inputProps={{ 'data-testid': 'ts-approval-start-date' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="End Date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  id="tsApprovalEndDate"
                  inputProps={{ 'data-testid': 'ts-approval-end-date' }}
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                variant="text" 
                onClick={clearFilters}
                disabled={!statusFilter && !searchQuery && !projectFilter && !dateRange.start && !dateRange.end}
              >
                Clear All Filters
              </Button>
            </Box>
          </Collapse>
        </Stack>
      </Paper>

      {/* Quick Stats */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          Showing <strong>{filteredTimesheets.length}</strong> of <strong>{timesheets.length}</strong> timesheets
          {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
        </Typography>
        <Stack direction="row" spacing={1}>
          {statusFilter && (
            <Chip 
              label={`Status: ${statusFilter}`} 
              onDelete={() => setStatusFilter('')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {searchQuery && (
            <Chip 
              label={`Search: ${searchQuery}`} 
              onDelete={() => setSearchQuery('')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {projectFilter && (
            <Chip 
              label="Project filtered" 
              onDelete={() => setProjectFilter('')}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>

      {/* Timesheets Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.50', borderBottom: '2px solid', borderColor: 'divider' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < paginatedTimesheets.filter(ts => ts.status === 'Submitted').length}
                  checked={paginatedTimesheets.filter(ts => ts.status === 'Submitted').length > 0 && selectedIds.length === paginatedTimesheets.filter(ts => ts.status === 'Submitted').length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'employee'}
                  direction={orderBy === 'employee' ? order : 'asc'}
                  onClick={() => handleSort('employee')}
                >
                  <strong>Employee</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'weekStartDate'}
                  direction={orderBy === 'weekStartDate' ? order : 'asc'}
                  onClick={() => handleSort('weekStartDate')}
                >
                  <strong>Week Period</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell><strong>Project / Task</strong></TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'hours'}
                  direction={orderBy === 'hours' ? order : 'asc'}
                  onClick={() => handleSort('hours')}
                >
                  <strong>Hours</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  <strong>Status</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'submittedAt'}
                  direction={orderBy === 'submittedAt' ? order : 'asc'}
                  onClick={() => handleSort('submittedAt')}
                >
                  <strong>Submitted</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from(new Array(5)).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={8}>
                    <Skeleton variant="rectangular" height={60} />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedTimesheets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <FilterIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      No timesheets found
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Try adjusting your filters or search criteria
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTimesheets.map((timesheet, index) => (
                <TableRow 
                  key={timesheet.id} 
                  hover
                  sx={{ 
                    bgcolor: index % 2 === 0 ? 'white' : alpha(theme.palette.background.default, 0.3),
                    '&:hover': { bgcolor: `${alpha(theme.palette.primary.main, 0.05)} !important` }
                  }}
                >
                  <TableCell padding="checkbox">
                    {timesheet.status === 'Submitted' && (
                      <Checkbox
                        checked={selectedIds.includes(timesheet.id)}
                        onChange={() => handleSelectOne(timesheet.id)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                        {timesheet.employee?.firstName?.[0]}{timesheet.employee?.lastName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {timesheet.employee?.firstName} {timesheet.employee?.lastName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {timesheet.employee?.employeeId}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(timesheet.weekStartDate)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Week {timesheet.weekNumber}, {timesheet.year}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {timesheet.project?.name || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {timesheet.task?.name || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {getTotalHours(timesheet).toFixed(1)}h
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(getTotalHours(timesheet) / 40 * 100, 100)}
                        sx={{ 
                          mt: 0.5, 
                          height: 4, 
                          borderRadius: 2,
                          bgcolor: theme.palette.action.hover
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={timesheet.status} 
                      color={getStatusColor(timesheet.status)} 
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 500, minWidth: 90 }}
                    />
                  </TableCell>
                  <TableCell>
                    {timesheet.submittedAt ? (
                      <>
                        <Typography variant="body2">
                          {formatDate(timesheet.submittedAt)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {dayjs(timesheet.submittedAt).fromNow()}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          aria-label="View details"
                          data-testid="ts-approval-view-btn"
                          onClick={() => handleViewDetails(timesheet)}
                          sx={{ 
                            color: 'primary.main',
                            border: '1px solid',
                            borderColor: 'primary.main',
                            '&:hover': { 
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              borderColor: 'primary.dark'
                            }
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {timesheet.status === 'Submitted' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton 
                              size="small" 
                              aria-label="Approve timesheet"
                              data-testid="ts-approval-approve-btn"
                              onClick={() => handleApprovalClick(timesheet, 'approve')}
                              sx={{ 
                                color: 'success.main',
                                border: '1px solid',
                                borderColor: 'success.main',
                                '&:hover': { 
                                  bgcolor: alpha(theme.palette.success.main, 0.1),
                                  borderColor: 'success.dark'
                                }
                              }}
                            >
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton 
                              size="small" 
                              aria-label="Reject timesheet"
                              data-testid="ts-approval-reject-btn"
                              onClick={() => handleApprovalClick(timesheet, 'reject')}
                              sx={{ 
                                color: 'error.main',
                                border: '1px solid',
                                borderColor: 'error.main',
                                '&:hover': { 
                                  bgcolor: alpha(theme.palette.error.main, 0.1),
                                  borderColor: 'error.dark'
                                }
                              }}
                            >
                              <RejectIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={filteredTimesheets.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: '1px solid #e0e0e0' }}
        />
      </TableContainer>

      {/* Approval Dialog */}
      <Dialog 
        open={approvalDialogOpen} 
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {approvalAction === 'approve' ? <ApproveIcon sx={{ color: 'success.main' }} /> : <RejectIcon sx={{ color: 'error.main' }} />}
          {approvalAction === 'approve' ? 'Approve' : 'Reject'} Timesheet
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTimesheet && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: alpha(theme.palette.background.default, 0.6) }} elevation={0}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Employee
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedTimesheet.employee?.firstName} {selectedTimesheet.employee?.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Week Period
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(selectedTimesheet.weekStartDate)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Project / Task
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedTimesheet.project?.name || 'N/A'}
                    {selectedTimesheet.task?.name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Total Hours
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {getTotalHours(selectedTimesheet).toFixed(1)}h
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
          <TextField
            autoFocus
            margin="dense"
            label={approvalAction === 'reject' ? 'Rejection Reason (Required)' : 'Comments (Optional)'}
            fullWidth
            multiline
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={approvalAction === 'reject' ? 'Please provide a reason for rejection...' : 'Add any comments about this timesheet...'}
            required={approvalAction === 'reject'}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setApprovalDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleApprovalSubmit}
            variant="outlined"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            startIcon={approvalAction === 'approve' ? <ApproveIcon /> : <RejectIcon />}
            disabled={approvalAction === 'reject' && !comments.trim()}
          >
            {approvalAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <ViewIcon sx={{ color: 'primary.main' }} />
          Timesheet Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTimesheet && (
            <Box>
              {/* Employee Info */}
              <Paper sx={{ p: 2.5, mb: 2, bgcolor: alpha(theme.palette.background.default, 0.6) }} elevation={0}>
                <Typography variant="overline" color="textSecondary" fontWeight={600}>
                  Employee Information
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {selectedTimesheet.employee?.firstName?.[0]}{selectedTimesheet.employee?.lastName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                          Full Name
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {selectedTimesheet.employee?.firstName} {selectedTimesheet.employee?.lastName}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                      Employee ID
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedTimesheet.employee?.employeeId}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                      Week Period
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {formatDate(selectedTimesheet.weekStartDate)} - {formatDate(selectedTimesheet.weekEndDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip 
                        label={selectedTimesheet.status} 
                        color={getStatusColor(selectedTimesheet.status)} 
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Project & Task */}
              <Paper sx={{ p: 2.5, mb: 2, bgcolor: alpha(theme.palette.background.default, 0.6) }} elevation={0}>
                <Typography variant="overline" color="textSecondary" fontWeight={600}>
                  Assignment Details
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                {selectedTimesheet.weekTimesheets && selectedTimesheet.weekTimesheets.length > 1 ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Multiple Projects/Tasks
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {selectedTimesheet.weekTimesheets.map((ts, index) => (
                        <Box key={ts.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={`#${index + 1}`} size="small" color="primary" variant="outlined" />
                          <Typography variant="body2" fontWeight={500}>
                            {ts.project?.name || 'N/A'} / {ts.task?.name || 'N/A'}
                          </Typography>
                          <Chip 
                            label={ts.status} 
                            color={getStatusColor(ts.status)} 
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                        Project
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {selectedTimesheet.project?.name || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                        Task
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {selectedTimesheet.task?.name || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </Paper>

              {/* Daily Hours - Always show as table */}
              <Paper sx={{ p: 2.5, mb: 2 }} elevation={1}>
                <Typography variant="overline" color="textSecondary" fontWeight={600}>
                  Hours Breakdown by Project/Task
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                
                {selectedTimesheet.weekTimesheets && selectedTimesheet.weekTimesheets.length > 1 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This employee has {selectedTimesheet.weekTimesheets.length} timesheet entries for this week
                  </Alert>
                )}
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.background.default, 0.6) }}>
                        <TableCell><strong>Project / Task</strong></TableCell>
                        <TableCell align="center"><strong>Mon</strong></TableCell>
                        <TableCell align="center"><strong>Tue</strong></TableCell>
                        <TableCell align="center"><strong>Wed</strong></TableCell>
                        <TableCell align="center"><strong>Thu</strong></TableCell>
                        <TableCell align="center"><strong>Fri</strong></TableCell>
                        <TableCell align="center"><strong>Sat</strong></TableCell>
                        <TableCell align="center"><strong>Sun</strong></TableCell>
                        <TableCell align="center"><strong>Total</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(selectedTimesheet.weekTimesheets || [selectedTimesheet]).map((ts) => (
                        <TableRow key={ts.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {ts.project?.name || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {ts.task?.name || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{parseFloat(ts.mondayHours || 0).toFixed(1)}</TableCell>
                          <TableCell align="center">{parseFloat(ts.tuesdayHours || 0).toFixed(1)}</TableCell>
                          <TableCell align="center">{parseFloat(ts.wednesdayHours || 0).toFixed(1)}</TableCell>
                          <TableCell align="center">{parseFloat(ts.thursdayHours || 0).toFixed(1)}</TableCell>
                          <TableCell align="center">{parseFloat(ts.fridayHours || 0).toFixed(1)}</TableCell>
                          <TableCell align="center">{parseFloat(ts.saturdayHours || 0).toFixed(1)}</TableCell>
                          <TableCell align="center">{parseFloat(ts.sundayHours || 0).toFixed(1)}</TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {getTotalHours(ts).toFixed(1)}h
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={ts.status} 
                              color={getStatusColor(ts.status)} 
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Weekly Total Row - Only show if multiple timesheets */}
                      {selectedTimesheet.weekTimesheets && selectedTimesheet.weekTimesheets.length > 1 && (
                        <TableRow sx={{ bgcolor: 'grey.50', borderTop: '2px solid', borderColor: 'divider' }}>
                          <TableCell><strong>Week Total</strong></TableCell>
                          <TableCell align="center">
                            <strong>
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.mondayHours || 0), 0).toFixed(1)}
                            </strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.tuesdayHours || 0), 0).toFixed(1)}
                            </strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.wednesdayHours || 0), 0).toFixed(1)}
                            </strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.thursdayHours || 0), 0).toFixed(1)}
                            </strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.fridayHours || 0), 0).toFixed(1)}
                            </strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.saturdayHours || 0), 0).toFixed(1)}
                            </strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + parseFloat(ts.sundayHours || 0), 0).toFixed(1)}
                            </strong>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="h6" fontWeight="bold" color="primary.dark">
                              {selectedTimesheet.weekTimesheets.reduce((sum, ts) => sum + getTotalHours(ts), 0).toFixed(1)}h
                            </Typography>
                          </TableCell>
                          <TableCell align="center">-</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Description */}
              {selectedTimesheet.description && (
                <Paper sx={{ p: 2.5, mb: 2, bgcolor: alpha(theme.palette.background.default, 0.6) }} elevation={0}>
                  <Typography variant="overline" color="textSecondary" fontWeight={600}>
                    Description
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTimesheet.description}
                  </Typography>
                </Paper>
              )}

              {/* Approval Info */}
              {(selectedTimesheet.status === 'Approved' || selectedTimesheet.status === 'Rejected') && (
                <Paper sx={{ 
                  p: 2.5, 
                  bgcolor: selectedTimesheet.status === 'Approved' ? 'success.light' : 'error.light',
                  border: 1,
                  borderColor: selectedTimesheet.status === 'Approved' ? 'success.main' : 'error.main'
                }} elevation={0}>
                  <Typography variant="overline" fontWeight={600} color={selectedTimesheet.status === 'Approved' ? 'success.dark' : 'error.dark'}>
                    {selectedTimesheet.status === 'Approved' ? 'Approval' : 'Rejection'} Information
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                    {selectedTimesheet.status === 'Approved' ? 'Approved' : 'Rejected'} At
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(selectedTimesheet.approvedAt || selectedTimesheet.rejectedAt)}
                  </Typography>
                  {selectedTimesheet.approverComments && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                        Comments
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                        {selectedTimesheet.approverComments}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {selectedTimesheet?.status === 'Submitted' && (
            <>
              <Button 
                onClick={() => {
                  setViewDialogOpen(false);
                  handleApprovalClick(selectedTimesheet, 'approve');
                }}
                variant="outlined"
                color="success"
                startIcon={<ApproveIcon />}
              >
                Approve
              </Button>
              <Button 
                onClick={() => {
                  setViewDialogOpen(false);
                  handleApprovalClick(selectedTimesheet, 'reject');
                }}
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setViewDialogOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
};

TimesheetApproval.propTypes = {
  embedded: PropTypes.bool,
};

export default TimesheetApproval;
