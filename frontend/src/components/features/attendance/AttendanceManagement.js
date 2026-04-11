import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport
} from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Groups as TeamIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { employeeService } from '../../../services';
import { attendanceService } from '../../../services/attendance.service';
import Autocomplete from '@mui/material/Autocomplete';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'success' },
  { value: 'absent', label: 'Absent', color: 'error' },
  { value: 'late', label: 'Late', color: 'warning' },
  { value: 'half-day', label: 'Half Day', color: 'info' },
  { value: 'on-leave', label: 'On Leave', color: 'secondary' },
  { value: 'holiday', label: 'Holiday', color: 'default' },
  { value: 'weekend', label: 'Weekend', color: 'default' }
];

const statusColorMap = {};
STATUS_OPTIONS.forEach(s => { statusColorMap[s.value] = s.color; });

export default function AttendanceManagement() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [totalCount, setTotalCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });

  // Summary stats
  const [summary, setSummary] = useState({});

  // Employee list for autocomplete
  const [employeeList, setEmployeeList] = useState([]);

  // Manual mark dialog
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [markForm, setMarkForm] = useState({
    employeeId: '',
    date: dayjs().format('YYYY-MM-DD'),
    status: 'present',
    checkIn: '',
    checkOut: '',
    notes: ''
  });

  const fetchDailyAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getDailyReport({
        date, page: paginationModel.page + 1, limit: paginationModel.pageSize
      });
      setRecords(res.data || []);
      setTotalCount(res.totalCount || 0);
    } catch (error) {
      enqueueSnackbar('Failed to fetch attendance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [date, paginationModel, enqueueSnackbar]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await attendanceService.getSummary({ startDate: date, endDate: date });
      setSummary(res.data || {});
    } catch (error) {
      console.warn('Failed to load attendance summary:', error.message);
    }
  }, [date]);

  useEffect(() => {
    fetchDailyAttendance();
    fetchSummary();
  }, [fetchDailyAttendance, fetchSummary]);

  // Load employees for the autocomplete
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await employeeService.getAll();
        const data = response?.data || response || [];
        setEmployeeList(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn('Failed to load employee list:', error.message);
      }
    };
    loadEmployees();
  }, []);

  // Role guard — only admin, hr, manager can access
  if (!['admin', 'hr', 'manager'].includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleMarkAttendance = async () => {
    if (!markForm.employeeId || !markForm.date || !markForm.status) {
      enqueueSnackbar('Employee, date, and status are required', { variant: 'warning' });
      return;
    }
    try {
      // Convert datetime-local strings to ISO format so the backend receives
      // timezone-aware timestamps regardless of server locale
      const payload = {
        ...markForm,
        checkIn: markForm.checkIn ? new Date(markForm.checkIn).toISOString() : markForm.checkIn,
        checkOut: markForm.checkOut ? new Date(markForm.checkOut).toISOString() : markForm.checkOut,
      };
      await attendanceService.markAttendance(payload);
      enqueueSnackbar('Attendance marked successfully', { variant: 'success' });
      setMarkDialogOpen(false);
      fetchDailyAttendance();
      fetchSummary();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to mark attendance', { variant: 'error' });
    }
  };

  const handleEditRow = (row) => {
    setMarkForm({
      employeeId: row.employeeId,
      date: row.date,
      status: row.status,
      checkIn: row.checkIn ? dayjs(row.checkIn).format('YYYY-MM-DDTHH:mm') : '',
      checkOut: row.checkOut ? dayjs(row.checkOut).format('YYYY-MM-DDTHH:mm') : '',
      notes: row.notes || ''
    });
    setMarkDialogOpen(true);
  };

  const columns = [
    {
      field: 'employeeName',
      headerName: 'Employee',
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => {
        const emp = params.row.employee;
        return emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeId})` : params.row.employeeId;
      }
    },
    {
      field: 'department',
      headerName: 'Department',
      width: 150,
      valueGetter: (params) => params.row.employee?.department?.name || '—'
    },
    {
      field: 'checkIn',
      headerName: 'Check-In',
      width: 110,
      renderCell: (params) => params.value ? dayjs(params.value).format('hh:mm A') : '—'
    },
    {
      field: 'checkOut',
      headerName: 'Check-Out',
      width: 110,
      renderCell: (params) => params.value ? dayjs(params.value).format('hh:mm A') : '—'
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value?.replace('-', ' ').toUpperCase()}
          color={statusColorMap[params.value] || 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'hoursWorked',
      headerName: 'Hours',
      width: 80,
      renderCell: (params) => params.value ? `${params.value}h` : '—'
    },
    {
      field: 'overtimeHours',
      headerName: 'OT',
      width: 70,
      renderCell: (params) => params.value > 0 ? (
        <Chip label={`${params.value}h`} color="warning" size="small" variant="outlined" />
      ) : '—'
    },
    {
      field: 'lateMinutes',
      headerName: 'Late',
      width: 80,
      renderCell: (params) => params.value > 0 ? (
        <Typography variant="body2" color="warning.main">{params.value} min</Typography>
      ) : '—'
    },
    { field: 'source', headerName: 'Source', width: 90 },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Edit/Correct">
          <IconButton size="small" onClick={() => handleEditRow(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbarFilterButton />
        <GridToolbarExport />
      </GridToolbarContainer>
    );
  }

  return (
    <Box sx={{ p: 3 }} data-testid="attendance-management-page">
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TeamIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={600}>Attendance Management</Typography>
        </Stack>
        <Button
          data-testid="attendance-mark-btn"
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => {
            setMarkForm({
              employeeId: '',
              date: date,
              status: 'present',
              checkIn: '',
              checkOut: '',
              notes: ''
            });
            setMarkDialogOpen(true);
          }}
        >
          Mark Attendance
        </Button>
      </Stack>

      {/* Date & Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              data-testid="attendance-date-filter"
              type="date"
              fullWidth
              size="small"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={9}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {Object.entries(summary).map(([status, count]) => (
                <Chip
                  key={status}
                  label={`${status.replace('-', ' ')}: ${count}`}
                  color={statusColorMap[status] || 'default'}
                  variant="outlined"
                  size="small"
                />
              ))}
              <Chip
                label={`Total: ${totalCount}`}
                color="primary"
                variant="filled"
                size="small"
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600 }} data-testid="attendance-data-grid">
        <DataGrid
          rows={records}
          columns={columns}
          loading={loading}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          slots={{ toolbar: CustomToolbar }}
          sx={{ border: 'none' }}
        />
      </Paper>

      {/* Mark Attendance Dialog */}
      <Dialog open={markDialogOpen} onClose={() => setMarkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark / Correct Attendance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={employeeList}
              getOptionLabel={(option) =>
                typeof option === 'string'
                  ? option
                  : `${option.firstName} ${option.lastName} (${option.employeeId})`
              }
              value={employeeList.find(e => e.id === markForm.employeeId) || null}
              onChange={(_, newVal) => {
                setMarkForm({ ...markForm, employeeId: newVal?.id || '' });
              }}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee"
                  required
                  fullWidth
                  placeholder="Search by name or ID..."
                />
              )}
              freeSolo={false}
              noOptionsText="No employees found"
            />
            <TextField
              label="Date"
              type="date"
              fullWidth
              required
              value={markForm.date}
              onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Status"
              fullWidth
              required
              value={markForm.status}
              onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}
            >
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Check-In Time"
              type="datetime-local"
              fullWidth
              value={markForm.checkIn}
              onChange={(e) => setMarkForm({ ...markForm, checkIn: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Check-Out Time"
              type="datetime-local"
              fullWidth
              value={markForm.checkOut}
              onChange={(e) => setMarkForm({ ...markForm, checkOut: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={markForm.notes}
              onChange={(e) => setMarkForm({ ...markForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkDialogOpen(false)}>Cancel</Button>
          <Button data-testid="attendance-mark-save-btn" variant="contained" onClick={handleMarkAttendance}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
