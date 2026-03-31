import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
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
  Stack,
  Tooltip,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  EventNote as EventNoteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import leaveTypeAdminService from '../../../services/leave-type-admin.service';

const INITIAL_FORM = {
  name: '',
  description: '',
  maxDaysPerYear: 20,
  carryForward: false,
  maxCarryForwardDays: 0,
  isActive: true,
  isPaid: true
};

const LeaveTypeManagement = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchLeaveTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await leaveTypeAdminService.getAll();
      setLeaveTypes(response?.data || []);
    } catch (error) {
      enqueueSnackbar('Failed to load leave types', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  const handleOpenCreate = () => {
    setSelectedType(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (leaveType) => {
    setSelectedType(leaveType);
    setFormData({
      name: leaveType.name || '',
      description: leaveType.description || '',
      maxDaysPerYear: leaveType.maxDaysPerYear ?? 20,
      carryForward: leaveType.carryForward ?? false,
      maxCarryForwardDays: leaveType.maxCarryForwardDays ?? 0,
      isActive: leaveType.isActive ?? true,
      isPaid: leaveType.isPaid ?? true
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenDelete = (leaveType) => {
    setSelectedType(leaveType);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedType(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name?.trim()) {
      errors.name = 'Leave type name is required';
    }
    if (formData.maxDaysPerYear < 0 || formData.maxDaysPerYear > 365) {
      errors.maxDaysPerYear = 'Must be between 0 and 365';
    }
    if (formData.carryForward && formData.maxCarryForwardDays < 0) {
      errors.maxCarryForwardDays = 'Cannot be negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (selectedType) {
        await leaveTypeAdminService.update(selectedType.id, formData);
        enqueueSnackbar('Leave type updated successfully', { variant: 'success' });
      } else {
        await leaveTypeAdminService.create(formData);
        enqueueSnackbar('Leave type created successfully', { variant: 'success' });
      }
      handleCloseDialog();
      fetchLeaveTypes();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to save leave type';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedType) return;
    setSaving(true);
    try {
      const response = await leaveTypeAdminService.remove(selectedType.id);
      enqueueSnackbar(response?.message || 'Leave type removed', { variant: 'success' });
      setDeleteDialogOpen(false);
      setSelectedType(null);
      fetchLeaveTypes();
    } catch (error) {
      enqueueSnackbar('Failed to delete leave type', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = leaveTypes.filter(t => t.isActive).length;
  const inactiveCount = leaveTypes.length - activeCount;

  return (
    <Box data-testid="leave-type-page" sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventNoteIcon color="primary" />
            Leave Type Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure leave types available to employees
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLeaveTypes}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            data-testid="leave-type-add-btn"
          >
            Add Leave Type
          </Button>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary">{leaveTypes.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total Leave Types</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: alpha(theme.palette.success.main, 0.08) }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="success.main">{activeCount}</Typography>
              <Typography variant="body2" color="text.secondary">Active</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="warning.main">{inactiveCount}</Typography>
              <Typography variant="body2" color="text.secondary">Inactive</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Table */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : leaveTypes.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <EventNoteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No leave types configured</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add your first leave type to get started
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Add Leave Type
              </Button>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Days/Year</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Carry Forward</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Max Carry</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Paid Leave</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveTypes.map((lt) => (
                  <TableRow
                    key={lt.id}
                    hover
                    sx={{ opacity: lt.isActive ? 1 : 0.6 }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {lt.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>
                        {lt.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${lt.maxDaysPerYear} days`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {lt.carryForward ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <CancelIcon fontSize="small" color="disabled" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {lt.carryForward ? `${lt.maxCarryForwardDays} days` : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={lt.isPaid === false ? 'LOP' : 'Paid'}
                        size="small"
                        color={lt.isPaid === false ? 'error' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={lt.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={lt.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEdit(lt)} color="primary" data-testid="leave-type-edit-btn">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleOpenDelete(lt)} color="error" data-testid="leave-type-delete-btn">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            {selectedType ? 'Edit Leave Type' : 'Add New Leave Type'}
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Leave Type Name"
                placeholder="e.g., Annual Leave, Sick Leave"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                placeholder="Brief description of this leave type"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Days Per Year"
                type="number"
                value={formData.maxDaysPerYear}
                onChange={(e) => handleChange('maxDaysPerYear', parseInt(e.target.value) || 0)}
                error={!!formErrors.maxDaysPerYear}
                helperText={formErrors.maxDaysPerYear || 'Maximum days an employee can take per year'}
                inputProps={{ min: 0, max: 365 }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    color="success"
                  />
                }
                label="Active"
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPaid}
                    onChange={(e) => handleChange('isPaid', e.target.checked)}
                    color="primary"
                  />
                }
                label={formData.isPaid ? 'Paid Leave' : 'Unpaid (LOP)'}
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Carry Forward Settings
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.carryForward}
                    onChange={(e) => handleChange('carryForward', e.target.checked)}
                    color="primary"
                  />
                }
                label="Allow Carry Forward"
              />
            </Grid>
            {formData.carryForward && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Carry Forward Days"
                  type="number"
                  value={formData.maxCarryForwardDays}
                  onChange={(e) => handleChange('maxCarryForwardDays', parseInt(e.target.value) || 0)}
                  error={!!formErrors.maxCarryForwardDays}
                  helperText={formErrors.maxCarryForwardDays || 'Maximum days that can be carried over'}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} disabled={saving} data-testid="leave-type-cancel-btn">
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            data-testid="leave-type-save-btn"
          >
            {selectedType ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Leave Type</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {selectedType?.name ? (
              <>
                Are you sure you want to delete <strong>{selectedType.name}</strong>?
                If employees have existing balances, the type will be deactivated instead.
              </>
            ) : (
              'Are you sure you want to delete this leave type?'
            )}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={saving ? <CircularProgress size={18} /> : <DeleteIcon />}
            onClick={handleDelete}
            disabled={saving}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveTypeManagement;
