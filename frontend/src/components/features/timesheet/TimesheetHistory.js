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
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Tooltip,
  CircularProgress,
  Alert,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Drafts as DraftIcon,
  Send as SubmittedIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { timesheetService } from '../../../services/timesheet.service';
import { useAuth } from '../../../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PropTypes from 'prop-types';

dayjs.extend(relativeTime);

const TimesheetHistory = ({ embedded } = {}) => {
  const theme = useTheme();
  const { user, hasRole } = useAuth();
  const myEmployeeId = user?.employee?.id || user?.employeeId;
  const canViewAll = hasRole(['admin', 'hr']);

  // Determine the employeeId to query for.
  // If the user is an admin/HR, we don't filter by employeeId unless one is specified (which it isn't in this component).
  // For other roles, it's always their own ID.
  const queryEmployeeId = canViewAll ? undefined : myEmployeeId;
  
  // eslint-disable-next-line no-unused-vars
  const [apiPage, setApiPage] = useState(1);
  const pageSize = 100; // Backend max limit is 100
  
  // React Query for timesheets — paginated
  const { data: timesheetsData, isLoading: loading } = useQuery({
    queryKey: ['timesheets', 'history', queryEmployeeId, apiPage],
    queryFn: () => timesheetService.getAll({ limit: pageSize, page: apiPage, employeeId: queryEmployeeId }),
    enabled: !!myEmployeeId || canViewAll, // Enable if user has an ID or is an admin
    select: (response) => {
      const allTimesheets = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      // Admin/HR see all, others see only their own
      const myTimesheets = canViewAll 
        ? allTimesheets
        : allTimesheets.filter(ts => ts.employeeId === myEmployeeId || ts.employee?.id === myEmployeeId);
      return myTimesheets.sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    }
  });
  
  const timesheets = useMemo(() => timesheetsData || [], [timesheetsData]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // M-05: derive filtered + grouped data with useMemo instead of state + cascading effect
  const filteredTimesheets = useMemo(() => {
    let filtered = timesheets.filter((ts) => {
      if (statusFilter && ts.status !== statusFilter) return false;
      if (dateRange.start && dayjs(ts.weekStartDate).isBefore(dayjs(dateRange.start))) return false;
      if (dateRange.end   && dayjs(ts.weekStartDate).isAfter(dayjs(dateRange.end)))   return false;
      return true;
    });

    const groupedByWeek = filtered.reduce((groups, timesheet) => {
      const weekKey = timesheet.weekStartDate;
      if (!groups[weekKey]) {
        groups[weekKey] = {
          weekStartDate: timesheet.weekStartDate,
          weekEndDate:   timesheet.weekEndDate,
          weekNumber:    timesheet.weekNumber,
          year:          timesheet.year,
          timesheets:    [],
          totalWeekHours: 0,
          overallStatus:  timesheet.status,
          latestSubmitted: timesheet.submittedAt,
          latestResponse:  timesheet.approvedAt || timesheet.rejectedAt,
        };
      }
      groups[weekKey].timesheets.push(timesheet);
      groups[weekKey].totalWeekHours += Number(timesheet.totalHoursWorked || 0);

      const statusPriority = { Rejected: 4, Submitted: 3, Approved: 2, Draft: 1 };
      if ((statusPriority[timesheet.status] ?? 0) > (statusPriority[groups[weekKey].overallStatus] ?? 0)) {
        groups[weekKey].overallStatus = timesheet.status;
      }

      if (timesheet.submittedAt && (!groups[weekKey].latestSubmitted ||
          new Date(timesheet.submittedAt) > new Date(groups[weekKey].latestSubmitted))) {
        groups[weekKey].latestSubmitted = timesheet.submittedAt;
      }
      const responseDate = timesheet.approvedAt || timesheet.rejectedAt;
      if (responseDate && (!groups[weekKey].latestResponse ||
          new Date(responseDate) > new Date(groups[weekKey].latestResponse))) {
        groups[weekKey].latestResponse = responseDate;
      }
      return groups;
    }, {});

    return Object.values(groupedByWeek)
      .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime());
  }, [timesheets, statusFilter, dateRange]);

  // Reset to first page whenever filters change
  useEffect(() => { setPage(0); }, [statusFilter, dateRange]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const handleViewDetails = (timesheet) => {
    // Find all timesheets for this week
    const weekTimesheets = timesheets.filter(ts => 
      ts.employeeId === timesheet.employeeId &&
      ts.weekStartDate === timesheet.weekStartDate
    );
    
    setSelectedTimesheet({
      ...timesheet,
      weekTimesheets: weekTimesheets
    });
    setViewDialogOpen(true);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // M-06: advance API page when all local data is displayed and more may exist server-side
    const totalLocalPages = Math.ceil(filteredTimesheets.length / rowsPerPage);
    if (newPage >= totalLocalPages - 1 && timesheets.length === pageSize) {
      setApiPage((prev) => prev + 1);
    }
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

  const getStatusIcon = (status) => {
    const icons = {
      'Draft': <DraftIcon />,
      'Submitted': <SubmittedIcon />,
      'Approved': <ApprovedIcon />,
      'Rejected': <RejectedIcon />
    };
    return icons[status] || <DraftIcon />;
  };

  const formatDate = (date) => {
    return dayjs(date).format('MMM DD, YYYY');
  };

  const getTotalHours = (timesheet) => {
    const hours = timesheet.totalHoursWorked || calculateWeekTotal(timesheet);
    return parseFloat(hours) || 0;
  };

  const calculateWeekTotal = (timesheet) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.reduce((total, day) => {
      return total + parseFloat(timesheet[`${day}Hours`] || 0);
    }, 0);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateRange({ start: '', end: '' });
    showAlert('info', 'Filters cleared');
  };

  const exportToCSV = () => {
    const escCsv = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    // Flatten grouped data for CSV export
    const csvRows = [];
    csvRows.push(['Week Start', 'Week End', 'Projects/Tasks', 'Total Hours', 'Status', 'Submitted Date', 'Response Date']);
    
    filteredTimesheets.forEach(weekData => {
      const tasksList = weekData.timesheets.map(ts => 
        `${ts.project?.name || 'N/A'} - ${ts.task?.name || 'N/A'} (${ts.totalHoursWorked || 0}h)`
      ).join('; ');
      
      csvRows.push([
        escCsv(formatDate(weekData.weekStartDate)),
        escCsv(formatDate(weekData.weekEndDate)),
        escCsv(tasksList),
        escCsv(weekData.totalWeekHours.toFixed(1)),
        escCsv(weekData.overallStatus),
        escCsv(weekData.latestSubmitted ? formatDate(weekData.latestSubmitted) : '-'),
        escCsv(weekData.latestResponse ? formatDate(weekData.latestResponse) : '-')
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_timesheets_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showAlert('success', 'Timesheets exported successfully');
  };

  const getSummaryStats = () => {
    return {
      total: filteredTimesheets.length,
      draft: filteredTimesheets.filter(week => week.overallStatus === 'Draft').length,
      submitted: filteredTimesheets.filter(week => week.overallStatus === 'Submitted').length,
      approved: filteredTimesheets.filter(week => week.overallStatus === 'Approved').length,
      rejected: filteredTimesheets.filter(week => week.overallStatus === 'Rejected').length,
      totalHours: filteredTimesheets.reduce((sum, week) => sum + week.totalWeekHours, 0)
    };
  };

  const paginatedTimesheets = filteredTimesheets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const stats = getSummaryStats();

  return (
    <Box sx={{ p: embedded ? 0 : 2, maxWidth: 1400, mx: 'auto', minHeight: embedded ? 'auto' : '100vh' }}>
      {/* Minimal Header */}
      {!embedded && (
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={600} color="text.primary">
            Timesheet History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredTimesheets.length} weeks • {stats.totalHours.toFixed(0)}h total
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant={filterOpen ? 'contained' : 'outlined'}
            startIcon={<FilterIcon />}
            onClick={() => setFilterOpen(!filterOpen)}
            size="small"
            sx={{ minWidth: 80 }}
            data-testid="ts-history-filter-toggle"
          >
            Filter
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
            size="small"
            disabled={filteredTimesheets.length === 0}
            sx={{ minWidth: 80 }}
            data-testid="ts-history-export"
          >
            Export
          </Button>
        </Stack>
      </Box>
      )}

      {/* Alert */}
      <Collapse in={alert.show}>
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert({ ...alert, show: false })}
        >
          {alert.message}
        </Alert>
      </Collapse>

      {/* Compact Filters */}
      <Collapse in={filterOpen}>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                inputProps={{ 'data-testid': 'ts-history-status-select' }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Submitted">Submitted</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="From"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
              id="tsHistoryFrom"
              inputProps={{ 'data-testid': 'ts-history-start-date' }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
              id="tsHistoryTo"
              inputProps={{ 'data-testid': 'ts-history-end-date' }}
            />
            <Button 
              variant="text" 
              onClick={clearFilters}
              disabled={!statusFilter && !dateRange.start && !dateRange.end}
              size="small"
            >
              Clear
            </Button>
          </Stack>
        </Box>
      </Collapse>

      {/* Minimalistic Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Week</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Tasks</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Hours</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', width: 60 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : paginatedTimesheets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      No timesheets found
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {statusFilter || dateRange.start || dateRange.end 
                        ? 'Try adjusting your filters' 
                        : 'Start by submitting your first timesheet'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTimesheets.map((weekData, index) => (
                <TableRow 
                  key={weekData.weekStartDate} 
                  hover
                  sx={{ 
                    bgcolor: index % 2 === 0 ? 'white' : alpha(theme.palette.background.default, 0.3),
                    '&:hover': { bgcolor: `${alpha(theme.palette.primary.main, 0.05)} !important` }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {formatDate(weekData.weekStartDate)} - {formatDate(weekData.weekEndDate)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Week {weekData.weekNumber}, {weekData.year}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ minWidth: 350 }}>
                      {weekData.timesheets.map((timesheet, taskIndex) => (
                        <Box 
                          key={timesheet.id} 
                          sx={{ 
                            mb: taskIndex < weekData.timesheets.length - 1 ? 1 : 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {timesheet.project?.name || 'N/A'} 
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {timesheet.task?.name || 'N/A'}
                            </Typography>
                          </Box>
                          <Chip 
                            label={`${timesheet.totalHoursWorked || 0}h`}
                            size="small" 
                            variant="outlined" 
                            sx={{ ml: 1, fontSize: '0.75rem', minWidth: 45 }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {weekData.totalWeekHours.toFixed(1)}h
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {weekData.timesheets.length} task{weekData.timesheets.length !== 1 ? 's' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={getStatusIcon(weekData.overallStatus)}
                      label={weekData.overallStatus} 
                      color={getStatusColor(weekData.overallStatus)} 
                      size="small"
                      sx={{ fontWeight: 500, minWidth: 100 }}
                    />
                  </TableCell>
                  <TableCell>
                    {weekData.latestSubmitted ? (
                      <>
                        <Typography variant="body2">
                          {formatDate(weekData.latestSubmitted)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {dayjs(weekData.latestSubmitted).fromNow()}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="textSecondary">Not submitted</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {weekData.overallStatus === 'Approved' && weekData.latestResponse && (
                      <>
                        <Typography variant="body2" color="success.main">
                          Approved
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {dayjs(weekData.latestResponse).fromNow()}
                        </Typography>
                      </>
                    )}
                    {weekData.overallStatus === 'Rejected' && weekData.latestResponse && (
                      <>
                        <Typography variant="body2" color="error.main">
                          Rejected
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {dayjs(weekData.latestResponse).fromNow()}
                        </Typography>
                      </>
                    )}
                    {(weekData.overallStatus === 'Draft' || weekData.overallStatus === 'Submitted') && (
                      <Typography variant="body2" color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Week Details">
                      <IconButton 
                        size="small" 
                        aria-label="View week details"
                        onClick={() => handleViewDetails(weekData.timesheets[0])} // Pass first timesheet for backward compatibility
                        sx={{ 
                          bgcolor: 'action.hover',
                          '&:hover': { bgcolor: 'info.light', color: 'info.main' }
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredTimesheets.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: '1px solid #e0e0e0' }}
        />
      </TableContainer>

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.light',
          color: 'primary.dark',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <ViewIcon />
          Timesheet Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTimesheet && (
            <Box>
              {/* Week & Status Info */}
              <Paper sx={{ p: 2.5, mb: 2, bgcolor: alpha(theme.palette.background.default, 0.6) }} elevation={0}>
                <Typography variant="overline" color="textSecondary" fontWeight={600}>
                  Week Information
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
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
                        icon={getStatusIcon(selectedTimesheet.status)}
                        label={selectedTimesheet.status} 
                        color={getStatusColor(selectedTimesheet.status)} 
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                  </Grid>
                  {selectedTimesheet.approverComments && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                        Comments from Approver
                      </Typography>
                      <Alert severity={selectedTimesheet.status === 'Rejected' ? 'error' : 'info'} sx={{ mt: 1 }}>
                        {selectedTimesheet.approverComments}
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Hours Breakdown Table */}
              <Paper sx={{ p: 2.5, mb: 2 }} elevation={1}>
                <Typography variant="overline" color="textSecondary" fontWeight={600}>
                  Hours Breakdown
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Description */}
              {selectedTimesheet.description && (
                <Paper sx={{ p: 2.5, bgcolor: alpha(theme.palette.background.default, 0.6) }} elevation={0}>
                  <Typography variant="overline" color="textSecondary" fontWeight={600}>
                    Description
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTimesheet.description}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

TimesheetHistory.propTypes = {
  embedded: PropTypes.bool,
};

export default TimesheetHistory;
