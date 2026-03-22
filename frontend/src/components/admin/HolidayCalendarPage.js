import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
  Alert,
  Switch,
  FormControlLabel,
  Grid,
  Stack
} from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import http from '../../http-common';
import PropTypes from 'prop-types';

const HOLIDAY_TYPES = [
  { value: 'public', label: 'Public Holiday', color: 'error' },
  { value: 'restricted', label: 'Restricted Holiday', color: 'warning' },
  { value: 'company', label: 'Company Holiday', color: 'info' }
];

const typeColorMap = {
  public: 'error',
  restricted: 'warning',
  company: 'info'
};

const initialFormState = {
  name: '',
  date: dayjs().format('YYYY-MM-DD'),
  type: 'public',
  isRecurring: false,
  description: ''
};

export default function HolidayCalendarPage({ embedded } = {}) {
  const { enqueueSnackbar } = useSnackbar();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState(null);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [togglingHoliday, setTogglingHoliday] = useState(null);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year,
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        includeInactive: 'true'
      };
      if (typeFilter) params.type = typeFilter;

      const res = await http.get('/holidays', { params });
      setHolidays(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      enqueueSnackbar('Failed to fetch holidays', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [year, typeFilter, paginationModel, enqueueSnackbar]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleOpenAdd = () => {
    setEditMode(false);
    setForm({ ...initialFormState, date: `${year}-01-01` });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditMode(true);
    setForm({
      name: row.name,
      date: row.date,
      type: row.type,
      isRecurring: row.isRecurring,
      description: row.description || ''
    });
    setEditingId(row.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.date) {
      enqueueSnackbar('Name and date are required', { variant: 'warning' });
      return;
    }
    try {
      if (editMode) {
        await http.put(`/holidays/${editingId}`, form);
        enqueueSnackbar('Holiday updated', { variant: 'success' });
      } else {
        await http.post('/holidays', form);
        enqueueSnackbar('Holiday created', { variant: 'success' });
      }
      setDialogOpen(false);
      fetchHolidays();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save holiday';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await http.delete(`/holidays/${deletingHoliday.id}`);
      enqueueSnackbar('Holiday deleted', { variant: 'success' });
      setDeleteDialogOpen(false);
      setDeletingHoliday(null);
      fetchHolidays();
    } catch (err) {
      enqueueSnackbar('Failed to delete holiday', { variant: 'error' });
    }
  };

  const handleToggleActive = async () => {
    if (!togglingHoliday) return;
    try {
      await http.put(`/holidays/${togglingHoliday.id}`, { isActive: !togglingHoliday.isActive });
      enqueueSnackbar(`Holiday ${togglingHoliday.isActive ? 'deactivated' : 'activated'}`, { variant: 'success' });
      fetchHolidays();
    } catch {
      enqueueSnackbar('Failed to update holiday', { variant: 'error' });
    } finally {
      setToggleDialogOpen(false);
      setTogglingHoliday(null);
    }
  };

  const yearOptions = [];
  for (let y = new Date().getFullYear() - 2; y <= new Date().getFullYear() + 2; y++) {
    yearOptions.push(y);
  }

  const columns = [
    {
      field: 'date',
      headerName: 'Date',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2">
          {dayjs(params.value).format('MMM DD, YYYY')}
        </Typography>
      )
    },
    {
      field: 'dayOfWeek',
      headerName: 'Day',
      width: 100,
      valueGetter: (params) => dayjs(params.row.date).format('dddd')
    },
    { field: 'name', headerName: 'Holiday Name', flex: 1, minWidth: 200 },
    {
      field: 'type',
      headerName: 'Type',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          color={typeColorMap[params.value] || 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'isRecurring',
      headerName: 'Recurring',
      width: 100,
      renderCell: (params) => params.value ? (
        <Chip label="Yes" size="small" color="success" variant="outlined" />
      ) : (
        <Chip label="No" size="small" variant="outlined" />
      )
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 90,
      renderCell: (params) => (
        <Switch
          checked={params.value}
          onChange={() => {
            setTogglingHoliday(params.row);
            setToggleDialogOpen(true);
          }}
          size="small"
        />
      )
    },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setDeletingHoliday(params.row);
                setDeleteDialogOpen(true);
              }}
              data-testid="holiday-delete-btn"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
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
    <Box sx={{ p: embedded ? 0 : 3 }} data-testid="holiday-calendar-page">
      {!embedded ? (
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={600}>Holiday Calendar</Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          data-testid="holiday-add-btn"
        >
          Add Holiday
        </Button>
      </Stack>
      ) : (
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} data-testid="holiday-add-btn">
          Add Holiday
        </Button>
      </Box>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Year"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              data-testid="holiday-year-select"
            >
              {yearOptions.map(y => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {HOLIDAY_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Alert severity="info" variant="outlined" sx={{ py: 0 }}>
              Showing <strong>{totalCount}</strong> holidays for <strong>{year}</strong>
              {typeFilter && <> of type <strong>{typeFilter}</strong></>}
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={holidays}
          columns={columns}
          loading={loading}
          rowCount={totalCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          slots={{ toolbar: CustomToolbar }}
          sx={{
            '& .MuiDataGrid-cell': { py: 1 },
            border: 'none'
          }}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Holiday Name"
              fullWidth
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Date"
              type="date"
              fullWidth
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Type"
              fullWidth
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {HOLIDAY_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                />
              }
              label="Recurring annually"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} data-testid="holiday-save-btn">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Holiday</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deletingHoliday?.name}</strong> ({dayjs(deletingHoliday?.date).format('MMM DD, YYYY')})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle Active Confirmation Dialog */}
      <Dialog open={toggleDialogOpen} onClose={() => { setToggleDialogOpen(false); setTogglingHoliday(null); }}>
        <DialogTitle>{togglingHoliday?.isActive ? 'Deactivate' : 'Activate'} Holiday</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {togglingHoliday?.isActive ? 'deactivate' : 'activate'} <strong>{togglingHoliday?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setToggleDialogOpen(false); setTogglingHoliday(null); }}>Cancel</Button>
          <Button variant="contained" color={togglingHoliday?.isActive ? 'warning' : 'success'} onClick={handleToggleActive}>
            {togglingHoliday?.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

HolidayCalendarPage.propTypes = {
  embedded: PropTypes.bool,
};
