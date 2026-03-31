import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  alpha,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  People as PeopleIcon,
  EventNote as LeaveIcon,
  Schedule as TimesheetIcon,
  AccountBalance as PayrollIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Business as DepartmentIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import { employeeService } from '../../../services/employee.service';
import { leaveService } from '../../../services/leave.service';
import { timesheetService } from '../../../services/timesheet.service';
import { dashboardService } from '../../../services/dashboard.service';
import { formatCurrency } from '../../../utils/formatCurrency';

const ReportsModule = () => {
  const theme = useTheme();
  const { isAdmin, isHR } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [reportData, setReportData] = useState({
    employee: {},
    leave: {},
    timesheet: {},
    payroll: {}
  });
  const [filters, setFilters] = useState({
    dateRange: 'month',
    department: 'all',
    status: 'all',
    employee: 'all'
  });
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (isAdmin || isHR) {
      loadReportData();
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute date range boundaries from filter
  const getDateBounds = () => {
    const now = new Date();
    let start = new Date();
    switch (filters.dateRange) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setMonth(now.getMonth() - 1);
    }
    return { start, end: now };
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard statistics
      const dashboardResponse = await dashboardService.getStats();
      
      // Build server-side filter params to avoid fetching all records
      const employeeParams = { limit: 500 };
      if (filters.department !== 'all') {
        employeeParams.department = filters.department;
      }
      if (filters.status !== 'all') {
        employeeParams.status = filters.status === 'active' ? 'Active' : 'Inactive';
      }

      const leaveParams = { limit: 500 };
      if (filters.status !== 'all') {
        leaveParams.status = filters.status === 'active' ? 'Approved' : filters.status;
      }

      const timesheetParams = { limit: 100 };
      if (filters.status !== 'all') {
        timesheetParams.status = filters.status === 'active' ? 'Approved' : filters.status;
      }

      // Load additional report-specific data with server-side filters
      const [employeesResponse, leavesResponse, firstTimesheetPage] = await Promise.all([
        employeeService.getAll(employeeParams),
        leaveService.getAll(leaveParams),
        timesheetService.getAll({ ...timesheetParams, page: 1 })
      ]);

      // Paginate through all timesheet pages (backend max limit=100)
      let allTimesheets = [];
      const firstData = Array.isArray(firstTimesheetPage) ? firstTimesheetPage : (Array.isArray(firstTimesheetPage.data) ? firstTimesheetPage.data : (firstTimesheetPage.data?.data || []));
      allTimesheets.push(...firstData);
      const totalPages = firstTimesheetPage.message?.pagination?.totalPages || firstTimesheetPage.data?.pagination?.totalPages || firstTimesheetPage.pagination?.totalPages || 1;
      if (totalPages > 1) {
        const remaining = [];
        for (let p = 2; p <= totalPages; p++) {
          remaining.push(timesheetService.getAll({ ...timesheetParams, page: p }));
        }
        const pages = await Promise.all(remaining);
        for (const pg of pages) {
          const pgData = Array.isArray(pg) ? pg : (Array.isArray(pg.data) ? pg.data : (pg.data?.data || []));
          allTimesheets.push(...pgData);
        }
      }

      // Apply filters to the raw data
      const { start, end } = getDateBounds();
      const rawEmployees = Array.isArray(employeesResponse) ? employeesResponse : (Array.isArray(employeesResponse.data) ? employeesResponse.data : (employeesResponse.data?.data || []));
      const rawLeaves = Array.isArray(leavesResponse) ? leavesResponse : (Array.isArray(leavesResponse.data) ? leavesResponse.data : (leavesResponse.data?.data || []));
      const rawTimesheets = allTimesheets;

      // Filter employees by department and status
      let filteredEmployees = rawEmployees;
      if (filters.department !== 'all') {
        filteredEmployees = filteredEmployees.filter(e => (e.department?.name || 'Unassigned') === filters.department);
      }
      if (filters.status !== 'all') {
        filteredEmployees = filteredEmployees.filter(e => (filters.status === 'active' ? e.status === 'Active' : e.status !== 'Active'));
      }

      // Filter leaves by date range
      const filteredLeaves = rawLeaves.filter(l => {
        const d = new Date(l.createdAt || l.startDate);
        return d >= start && d <= end;
      });

      // Filter timesheets by date range
      const filteredTimesheets = rawTimesheets.filter(ts => {
        const d = new Date(ts.weekStartDate || ts.createdAt);
        return d >= start && d <= end;
      });

      // Process and structure the data for reports
      const processedData = {
        employee: processEmployeeData(filteredEmployees),
        leave: processLeaveData(filteredLeaves),
        timesheet: processTimesheetData(filteredTimesheets),
        payroll: dashboardResponse.data?.stats?.payroll || {}
      };

      setReportData(processedData);
    } catch (error) {
      console.error('Error loading report data:', error);
      enqueueSnackbar('Failed to load report data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const processEmployeeData = (employees) => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.status?.toLowerCase() === 'active').length;
    const byDepartment = employees.reduce((acc, emp) => {
      const dept = emp.department?.name || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    
    const byPosition = employees.reduce((acc, emp) => {
      const pos = emp.position?.title || 'Unassigned';
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(byDepartment).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / totalEmployees) * 100).toFixed(1)
    }));

    return {
      total: totalEmployees,
      active: activeEmployees,
      inactive: totalEmployees - activeEmployees,
      byDepartment,
      byPosition,
      chartData,
      employees
    };
  };

  const processLeaveData = (leaves) => {
    const totalRequests = leaves.length;
    const approved = leaves.filter(leave => leave.status === 'Approved').length;
    const pending = leaves.filter(leave => leave.status === 'Pending').length;
    const rejected = leaves.filter(leave => leave.status === 'Rejected').length;

    const byType = leaves.reduce((acc, leave) => {
      const type = leave.leaveType?.name || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const chartData = [
      { name: 'Approved', value: approved, color: theme.palette.success.main },
      { name: 'Pending', value: pending, color: theme.palette.warning.main },
      { name: 'Rejected', value: rejected, color: theme.palette.error.main }
    ];

    return {
      total: totalRequests,
      approved,
      pending,
      rejected,
      byType,
      chartData,
      leaves
    };
  };

  const processTimesheetData = (timesheets) => {
    const totalEntries = timesheets.length;
    const approved = timesheets.filter(ts => ts.status === 'Approved').length;
    const pending = timesheets.filter(ts => ts.status === 'Submitted').length;
    const draft = timesheets.filter(ts => ts.status === 'Draft').length;

    const totalHours = timesheets.reduce((acc, ts) => acc + (ts.totalHoursWorked || 0), 0);
    const avgHoursPerEntry = totalEntries > 0 ? (totalHours / totalEntries).toFixed(1) : 0;

    const chartData = [
      { name: 'Approved', value: approved, color: theme.palette.success.main },
      { name: 'Pending', value: pending, color: theme.palette.warning.main },
      { name: 'Draft', value: draft, color: theme.palette.info.main }
    ];

    return {
      total: totalEntries,
      approved,
      pending,
      draft,
      totalHours,
      avgHoursPerEntry,
      chartData,
      timesheets
    };
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const generateReport = async (reportType) => {
    setGeneratingReport(true);
    try {
      let csvRows = [];
      let filename = `${reportType.toLowerCase()}-report-${new Date().toISOString().slice(0,10)}.csv`;

      const escCsv = (val) => {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };

      if (reportType === 'Consolidated' || reportType === 'Employee') {
        csvRows.push('Name,Email,Department,Position,Status');
        (reportData.employee.employees || []).forEach(e => {
          csvRows.push([escCsv(`${e.firstName || ''} ${e.lastName || ''}`), escCsv(e.email), escCsv(e.department?.name), escCsv(e.position?.title), escCsv(e.status)].join(','));
        });
      }

      if (reportType === 'Consolidated' || reportType === 'Leave') {
        if (csvRows.length) csvRows.push(''); // separator
        csvRows.push('Employee,Leave Type,Start Date,End Date,Days,Status');
        (reportData.leave.leaves || []).forEach(l => {
          csvRows.push([escCsv(`${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`), escCsv(l.leaveType?.name), escCsv(l.startDate), escCsv(l.endDate), escCsv(l.totalDays), escCsv(l.status)].join(','));
        });
      }

      if (reportType === 'Consolidated' || reportType === 'Timesheet') {
        if (csvRows.length) csvRows.push('');
        csvRows.push('Employee,Project,Task,Week Start,Hours,Status');
        (reportData.timesheet.timesheets || []).forEach(ts => {
          csvRows.push([escCsv(`${ts.employee?.firstName || ''} ${ts.employee?.lastName || ''}`), escCsv(ts.project?.name), escCsv(ts.task?.name), escCsv(ts.weekStartDate), escCsv(ts.totalHoursWorked || ts.hoursWorked), escCsv(ts.status)].join(','));
        });
      }

      if (reportType === 'Payroll') {
        csvRows.push('Metric,Value');
        csvRows.push(`Processed,${reportData.payroll.processed || 0}`);
        csvRows.push(`Pending,${reportData.payroll.pending || 0}`);
        csvRows.push(`Total Amount,${reportData.payroll.total || 0}`);
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      enqueueSnackbar(`${reportType} report exported successfully!`, { variant: 'success' });
    } catch (error) {
      console.error('Error generating report:', error);
      enqueueSnackbar('Failed to generate report', { variant: 'error' });
    } finally {
      setGeneratingReport(false);
    }
  };

  const ReportCard = ({ title, value, subtitle, icon, color, onClick }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: 'all 0.3s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar sx={{ bgcolor: color, mr: 2, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h4" component="div" fontWeight="bold" color={color}>
              {value}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (!isAdmin && !isHR) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Access denied. Only administrators and HR personnel can access reports.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-testid="reports-page">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Consolidated Reports
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Comprehensive analytics and reports for HR management
        </Typography>
      </Box>

      {/* Filter Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Report Filters
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filters.dateRange}
                label="Date Range"
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                data-testid="reports-date-range-select"
              >
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={filters.department}
                label="Department"
                onChange={(e) => handleFilterChange('department', e.target.value)}
                data-testid="reports-department-select"
              >
                <MenuItem value="all">All Departments</MenuItem>
                {Object.keys(reportData.employee.byDepartment || {}).map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
                data-testid="reports-status-select"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              fullWidth
              startIcon={generatingReport ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={() => generateReport('Consolidated')}
              disabled={generatingReport}
              sx={{ height: '56px' }}
              data-testid="reports-export-btn"
            >
              {generatingReport ? 'Generating...' : 'Export Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            aria-label="report tabs"
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  Employee Reports
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LeaveIcon sx={{ mr: 1 }} />
                  Leave Reports
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TimesheetIcon sx={{ mr: 1 }} />
                  Timesheet Reports
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PayrollIcon sx={{ mr: 1 }} />
                  Payroll Reports
                </Box>
              } 
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Employee Reports Tab */}
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Total Employees"
                    value={reportData.employee.total}
                    icon={<PeopleIcon />}
                    color={theme.palette.primary.main}
                    subtitle="All employees in system"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Active Employees"
                    value={reportData.employee.active}
                    icon={<PersonIcon />}
                    color={theme.palette.success.main}
                    subtitle="Currently active"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Departments"
                    value={Object.keys(reportData.employee.byDepartment || {}).length}
                    icon={<DepartmentIcon />}
                    color={theme.palette.info.main}
                    subtitle="Total departments"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Positions"
                    value={Object.keys(reportData.employee.byPosition || {}).length}
                    icon={<DepartmentIcon />}
                    color={theme.palette.warning.main}
                    subtitle="Total positions"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Employee Distribution by Department
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.employee.chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({name, percentage}) => `${name}: ${percentage}%`}
                        >
                          {reportData.employee.chartData?.map((entry, index) => {
                            const CHART_COLORS = [
                              theme.palette.primary.main,
                              theme.palette.secondary.main,
                              theme.palette.success.main,
                              theme.palette.warning.main,
                              theme.palette.error.main,
                              theme.palette.info.main,
                              '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'
                            ];
                            return <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />;
                          })}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Department Breakdown
                    </Typography>
                    <List>
                      {Object.entries(reportData.employee.byDepartment || {}).map(([dept, count]) => (
                        <ListItem key={dept}>
                          <ListItemIcon>
                            <DepartmentIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={dept} 
                            secondary={`${count} employees`}
                          />
                          <Chip 
                            label={((count / reportData.employee.total) * 100).toFixed(1) + '%'} 
                            size="small" 
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Leave Reports Tab */}
          {activeTab === 1 && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Total Requests"
                    value={reportData.leave.total}
                    icon={<LeaveIcon />}
                    color={theme.palette.primary.main}
                    subtitle="All leave requests"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Approved"
                    value={reportData.leave.approved}
                    icon={<ApprovedIcon />}
                    color={theme.palette.success.main}
                    subtitle="Approved requests"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Pending"
                    value={reportData.leave.pending}
                    icon={<PendingIcon />}
                    color={theme.palette.warning.main}
                    subtitle="Awaiting approval"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Rejected"
                    value={reportData.leave.rejected}
                    icon={<RejectedIcon />}
                    color={theme.palette.error.main}
                    subtitle="Rejected requests"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Leave Request Status Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.leave.chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({name, value}) => `${name}: ${value}`}
                        >
                          {reportData.leave.chartData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Leave Types Breakdown
                    </Typography>
                    <List>
                      {Object.entries(reportData.leave.byType || {}).map(([type, count]) => (
                        <ListItem key={type}>
                          <ListItemIcon>
                            <CalendarIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={type} 
                            secondary={`${count} requests`}
                          />
                          <Chip 
                            label={((count / reportData.leave.total) * 100).toFixed(1) + '%'} 
                            size="small" 
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Timesheet Reports Tab */}
          {activeTab === 2 && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Total Entries"
                    value={reportData.timesheet.total}
                    icon={<TimesheetIcon />}
                    color={theme.palette.primary.main}
                    subtitle="All timesheet entries"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Total Hours"
                    value={reportData.timesheet.totalHours}
                    icon={<TimeIcon />}
                    color={theme.palette.info.main}
                    subtitle="Hours worked"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Approved"
                    value={reportData.timesheet.approved}
                    icon={<ApprovedIcon />}
                    color={theme.palette.success.main}
                    subtitle="Approved entries"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Avg Hours/Entry"
                    value={reportData.timesheet.avgHoursPerEntry}
                    icon={<TrendingUpIcon />}
                    color={theme.palette.warning.main}
                    subtitle="Average per entry"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Timesheet Status Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.timesheet.chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({name, value}) => `${name}: ${value}`}
                        >
                          {reportData.timesheet.chartData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Timesheet Summary
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <ApprovedIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Approved Entries" 
                          secondary={`${reportData.timesheet.approved} entries`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <PendingIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Pending Approval" 
                          secondary={`${reportData.timesheet.pending} entries`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <TimesheetIcon color="info" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Draft Entries" 
                          secondary={`${reportData.timesheet.draft} entries`}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Payroll Reports Tab */}
          {activeTab === 3 && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Processed"
                    value={reportData.payroll.processed || 0}
                    icon={<PayrollIcon />}
                    color={theme.palette.success.main}
                    subtitle="Payrolls processed"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Pending"
                    value={reportData.payroll.pending || 0}
                    icon={<PendingIcon />}
                    color={theme.palette.warning.main}
                    subtitle="Awaiting processing"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ReportCard
                    title="Total Amount"
                    value={formatCurrency(reportData.payroll.total || 0)}
                    icon={<PayrollIcon />}
                    color={theme.palette.primary.main}
                    subtitle="Total payroll amount"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<DownloadIcon />}
                    onClick={() => generateReport('Payroll')}
                    sx={{ height: '100%' }}
                  >
                    Export Payroll Report
                  </Button>
                </Grid>
              </Grid>

              <Alert severity="info">
                Detailed payroll reports with salary breakdowns, tax calculations, and compliance reports are available for download. Contact your system administrator for advanced payroll analytics.
              </Alert>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ReportsModule;
