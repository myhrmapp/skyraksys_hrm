import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
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
  Skeleton,
  Fade,
  Autocomplete,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CalendarMonth as CalendarIcon,
  Schedule as TimesheetIcon,
  EventNote as LeaveIcon,
  TrendingUp as StatsIcon,
  CheckCircle as ApprovedIcon,
  Pending as PendingIcon,
  Cancel as RejectedIcon,
  Search as SearchIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useEmployeeRecords } from './hooks/useEmployeeRecords';
import { useAuth } from '../../../contexts/AuthContext';
import { employeeService } from '../../../services/employee.service';

// --- Helper Components ---

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return <ApprovedIcon color="success" />;
    case 'rejected': return <RejectedIcon color="error" />;
    case 'pending': 
    case 'submitted': return <PendingIcon color="warning" />;
    default: return <PendingIcon />;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'success';
    case 'rejected': return 'error';
    case 'pending': 
    case 'submitted': return 'warning';
    default: return 'default';
  }
};

const LeaveHistoryTab = ({ loading, leaveHistory, showEmployeeName, employees = [] }) => {
  const [leavePage, setLeavePage] = useState(0);
  const [leaveRowsPerPage, setLeaveRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLeave = statusFilter === 'all'
    ? leaveHistory
    : leaveHistory.filter(l => (l.status || '').toLowerCase() === statusFilter);
  const paginatedLeave = filteredLeave.slice(leavePage * leaveRowsPerPage, leavePage * leaveRowsPerPage + leaveRowsPerPage);

  return (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Typography variant="h6">
        Leave Request History
      </Typography>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={statusFilter}
          label="Status"
          onChange={(e) => { setStatusFilter(e.target.value); setLeavePage(0); }}
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="submitted">Submitted</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Select>
      </FormControl>
    </Box>
    
    <Card variant="outlined">
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {showEmployeeName && <TableCell>Employee</TableCell>}
              <TableCell>Leave Type</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Days</TableCell>
              <TableCell>Applied Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Comments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: showEmployeeName ? 7 : 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton height={40} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLeave.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showEmployeeName ? 7 : 6} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">No leave history found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeave.map((leave) => {
                // Helper to find employee ID if missing
                const getEmployeeId = () => {
                  if (leave.employee?.employeeId) return leave.employee.employeeId;
                  if (leave.employeeId && leave.employeeId.length < 10) return leave.employeeId;
                  // Try to find in employees list by UUID
                  const found = employees.find(e => e.id === leave.employeeId);
                  return found?.employeeId || '';
                };

                return (
                <TableRow key={leave.id} hover>
                  {showEmployeeName && (
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getEmployeeId()}
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={
                        (leave.type && typeof leave.type === 'object' ? leave.type.name : leave.type) || 
                        (leave.leaveType && typeof leave.leaveType === 'object' ? leave.leaveType.name : leave.leaveType) || 
                        'Unknown'
                      }
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {leave.days || leave.duration || leave.numberOfDays || 
                       (Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1) || 0} days
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(leave.appliedDate || leave.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getStatusIcon(leave.status)}
                      <Chip
                        label={(leave.status || 'Unknown').toUpperCase()}
                        color={getStatusColor(leave.status)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {leave.approverComments || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredLeave.length}
        page={leavePage}
        onPageChange={(e, newPage) => setLeavePage(newPage)}
        rowsPerPage={leaveRowsPerPage}
        onRowsPerPageChange={(e) => { setLeaveRowsPerPage(parseInt(e.target.value, 10)); setLeavePage(0); }}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Card>
  </Box>
  );
};

const TimesheetHistoryTab = ({ loading, timesheetHistory, showEmployeeName, employees = [] }) => {
  const [tsPage, setTsPage] = useState(0);
  const [tsRowsPerPage, setTsRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTimesheets = statusFilter === 'all'
    ? timesheetHistory
    : timesheetHistory.filter(t => (t.status || '').toLowerCase() === statusFilter);
  const paginatedTimesheets = filteredTimesheets.slice(tsPage * tsRowsPerPage, tsPage * tsRowsPerPage + tsRowsPerPage);

  return (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Typography variant="h6">
        Timesheet Submission History
      </Typography>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={statusFilter}
          label="Status"
          onChange={(e) => { setStatusFilter(e.target.value); setTsPage(0); }}
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="submitted">Submitted</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Select>
      </FormControl>
    </Box>
    
    <Card variant="outlined">
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {showEmployeeName && <TableCell>Employee</TableCell>}
              <TableCell>Week Period</TableCell>
              <TableCell align="right">Regular Hours</TableCell>
              <TableCell align="right">Overtime Hours</TableCell>
              <TableCell align="right">Total Hours</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: showEmployeeName ? 7 : 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton height={40} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredTimesheets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showEmployeeName ? 7 : 6} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">No timesheet history found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTimesheets.map((timesheet) => {
                // Helper to find employee ID if missing
                const getEmployeeId = () => {
                  if (timesheet.employeeId && timesheet.employeeId.length < 10) return timesheet.employeeId;
                  // Try to find in employees list by UUID (assuming timesheet.employeeId is UUID if long)
                  const found = employees.find(e => e.id === timesheet.employeeId);
                  return found?.employeeId || '';
                };

                return (
                <TableRow key={timesheet.id} hover>
                  {showEmployeeName && (
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {timesheet.employeeName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getEmployeeId()}
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {timesheet.week}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {Number(timesheet.regularHours).toFixed(1).replace(/\.0$/, '')}h
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={timesheet.overtimeHours > 0 ? 'warning.main' : 'text.secondary'}>
                      {Number(timesheet.overtimeHours).toFixed(1).replace(/\.0$/, '')}h
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {Number(timesheet.totalHours).toFixed(1).replace(/\.0$/, '')}h
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getStatusIcon(timesheet.status)}
                      <Chip
                        label={(timesheet.status || 'Unknown').toUpperCase()}
                        color={getStatusColor(timesheet.status)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {timesheet.submittedDate}
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredTimesheets.length}
        page={tsPage}
        onPageChange={(e, newPage) => setTsPage(newPage)}
        rowsPerPage={tsRowsPerPage}
        onRowsPerPageChange={(e) => { setTsRowsPerPage(parseInt(e.target.value, 10)); setTsPage(0); }}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Card>
  </Box>
  );
};

const AttendanceHistoryTab = ({ loading, attendanceHistory }) => {
  const [attPage, setAttPage] = useState(0);
  const [attRowsPerPage, setAttRowsPerPage] = useState(10);
  const paginatedAttendance = attendanceHistory.slice(attPage * attRowsPerPage, attPage * attRowsPerPage + attRowsPerPage);

  return (
  <Box>
    <Typography variant="h6" gutterBottom>
      Monthly Attendance Summary
    </Typography>
    
    <Grid container spacing={3}>
      {loading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card variant="outlined">
              <CardContent>
                <Skeleton height={100} />
              </CardContent>
            </Card>
          </Grid>
        ))
      ) : attendanceHistory.length === 0 ? (
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No attendance data available</Typography>
          </Card>
        </Grid>
      ) : (
        paginatedAttendance.map((attendance, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {attendance.month}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {attendance.daysWorked}/{attendance.totalDays} days
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {attendance.percentage.toFixed(1)}%
                  </Typography>
                  <Chip
                    label={attendance.percentage >= 95 ? 'Excellent' : attendance.percentage >= 90 ? 'Good' : 'Average'}
                    color={attendance.percentage >= 95 ? 'success' : attendance.percentage >= 90 ? 'primary' : 'warning'}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
    <TablePagination
      component="div"
      count={attendanceHistory.length}
      page={attPage}
      onPageChange={(e, newPage) => setAttPage(newPage)}
      rowsPerPage={attRowsPerPage}
      onRowsPerPageChange={(e) => { setAttRowsPerPage(parseInt(e.target.value, 10)); setAttPage(0); }}
      rowsPerPageOptions={[5, 10, 25]}
    />
  </Box>
  );
};

const SummaryCard = ({ icon: Icon, count, label, color }) => (
  <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
    <CardContent sx={{ textAlign: 'center', py: 4 }}>
      <Icon sx={{ fontSize: 48, color: `${color}.main`, mb: 2 }} />
      <Typography variant="h3" color={`${color}.main`} fontWeight="bold" sx={{ mb: 1 }}>
        {count}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary">
        {label}
      </Typography>
    </CardContent>
  </Card>
);

// --- Main Component ---

const ALL_EMPLOYEES_OPTION = { id: 'ALL', firstName: 'All', lastName: 'Employees', employeeId: 'ALL', department: 'View All Records' };

const EmployeeRecords = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([ALL_EMPLOYEES_OPTION]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = React.useRef(null);
  
  // Check if user has permission to view other employees' records
  const canViewOthers = ['admin', 'hr', 'manager'].includes(user?.role);

  // Server-side search: query backend as user types
  const handleSearchInput = useCallback((event, inputValue) => {
    if (!canViewOthers) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const params = { limit: 20, ...(inputValue ? { search: inputValue } : {}) };
        const response = await employeeService.getAll(params);
        if (response.data) {
          setEmployees([ALL_EMPLOYEES_OPTION, ...response.data]);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [canViewOthers]);

  // Load initial employee list on mount; default admin/HR/manager to "All Employees"
  useEffect(() => {
    if (canViewOthers) {
      handleSearchInput(null, '');
      setSelectedEmployee(prev => prev === null ? ALL_EMPLOYEES_OPTION : prev);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [canViewOthers, handleSearchInput]);

  const { 
    loading, 
    leaveHistory, 
    timesheetHistory, 
    attendanceHistory 
  } = useEmployeeRecords(selectedEmployee?.id);

  const calculateAverageAttendance = () => {
    if (!attendanceHistory.length) return 0;
    return (attendanceHistory.reduce((sum, a) => sum + a.percentage, 0) / attendanceHistory.length).toFixed(1);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="employee-records-page">
      <Fade in timeout={600}>
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
              <BackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {selectedEmployee?.id === 'ALL'
                  ? 'All Employee Records'
                  : selectedEmployee
                    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}'s Records`
                    : 'My Records'}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                View historical attendance, leave, and timesheet data
              </Typography>
            </Box>

            {/* Employee Search for Admin/HR/Manager */}
            {canViewOthers && (
              <Box sx={{ minWidth: 300 }}>
                <Autocomplete
                  options={employees}
                  loading={searchLoading}
                  filterOptions={(x) => x}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.employeeId})`}
                  value={selectedEmployee}
                  onChange={(event, newValue) => setSelectedEmployee(newValue)}
                  onInputChange={handleSearchInput}
                  data-testid="employee-records-search"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Employee"
                      variant="outlined"
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <React.Fragment>
                            {searchLoading ? <Skeleton variant="circular" width={20} height={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key} {...otherProps}>
                        <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body1">
                            {option.firstName} {option.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.employeeId} • {option.department?.name || option.department || 'No Department'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <SummaryCard 
                icon={LeaveIcon} 
                count={loading ? '-' : leaveHistory.length} 
                label="Leave Requests" 
                color="primary" 
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SummaryCard 
                icon={TimesheetIcon} 
                count={loading ? '-' : timesheetHistory.length} 
                label="Timesheets Submitted" 
                color="success" 
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SummaryCard 
                icon={StatsIcon} 
                count={loading ? '-' : `${calculateAverageAttendance()}%`} 
                label="Average Attendance" 
                color="info" 
              />
            </Grid>
          </Grid>

          {/* Tabs */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }} elevation={0} variant="outlined">
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ px: 3 }}
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab 
                  icon={<LeaveIcon />} 
                  label="Leave History" 
                  iconPosition="start"
                  sx={{ minHeight: 64 }}
                  data-testid="records-tab-leave"
                />
                <Tab 
                  icon={<TimesheetIcon />} 
                  label="Timesheet History" 
                  iconPosition="start"
                  sx={{ minHeight: 64 }}
                  data-testid="records-tab-timesheet"
                />
                <Tab 
                  icon={<CalendarIcon />} 
                  label="Attendance Summary" 
                  iconPosition="start"
                  sx={{ minHeight: 64 }}
                  data-testid="records-tab-attendance"
                />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {activeTab === 0 && (
                <LeaveHistoryTab 
                  loading={loading} 
                  leaveHistory={leaveHistory} 
                  showEmployeeName={selectedEmployee?.id === 'ALL'}
                  employees={employees}
                />
              )}
              {activeTab === 1 && (
                <TimesheetHistoryTab 
                  loading={loading} 
                  timesheetHistory={timesheetHistory} 
                  showEmployeeName={selectedEmployee?.id === 'ALL'}
                  employees={employees}
                />
              )}
              {activeTab === 2 && (
                <AttendanceHistoryTab loading={loading} attendanceHistory={attendanceHistory} />
              )}
            </Box>
          </Paper>
        </Box>
      </Fade>
    </Container>
  );
};

export default EmployeeRecords;
