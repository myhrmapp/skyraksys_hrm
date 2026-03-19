import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  Fab,
  InputAdornment,
  Avatar,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../contexts/AuthContext';
import { useLoading } from '../../../contexts/LoadingContext';
import http from '../../../http-common';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import PropTypes from 'prop-types';

const DepartmentManagement = ({ embedded } = {}) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { setLoading } = useLoading();
  const { dialogProps, confirm } = useConfirmDialog();
  
  // State
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});

  // Load data on component mount
  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await http.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await http.get('/employees');
      // Filter only active employees
      const activeEmployees = (response.data.data || []).filter(e => e.status === 'Active');
      setEmployees(activeEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
    loadEmployees();
  }, [loadDepartments, loadEmployees]);

  // Filter departments based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(dept =>
        dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.manager && `${dept.manager.firstName} ${dept.manager.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDepartments(filtered);
    }
  }, [departments, searchTerm]);

  const handleOpenDialog = (department = null) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name || '',
        description: department.description || '',
        managerId: department.managerId || '',
        isActive: department.isActive !== undefined ? department.isActive : true
      });
    } else {
      setEditingDepartment(null);
      setFormData({
        name: '',
        description: '',
        managerId: '',
        isActive: true
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDepartment(null);
    setFormData({
      name: '',
      description: '',
      managerId: '',
      isActive: true
    });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        managerId: formData.managerId || null
      };

      if (editingDepartment) {
        await http.put(`/departments/${editingDepartment.id}`, submitData);
        enqueueSnackbar('Department updated successfully', { variant: 'success' });
      } else {
        await http.post('/departments', submitData);
        enqueueSnackbar('Department created successfully', { variant: 'success' });
      }
      
      handleCloseDialog();
      loadDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to save department', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (department) => {
    confirm({
      title: 'Delete Department',
      message: `Are you sure you want to delete the department "${department.name}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          await http.delete(`/departments/${department.id}`);
          enqueueSnackbar('Department deleted successfully', { variant: 'success' });
          loadDepartments();
        } catch (error) {
          console.error('Error deleting department:', error);
          enqueueSnackbar(error.response?.data?.message || 'Failed to delete department', { variant: 'error' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Check if user has admin or HR role
  const canManageDepartments = user?.role === 'admin' || user?.role === 'hr';

  if (!canManageDepartments) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          You don't have permission to manage departments.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: embedded ? 0 : 4 }} data-testid="department-management-page">
      {/* Header */}
      {!embedded && (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" />
          Department Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage organizational departments and assign department heads
        </Typography>
      </Box>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {departments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Departments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {departments.filter(d => d.managerId).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Departments with Managers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {employees.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Active Employees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 300 }}
            data-testid="dept-search"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            data-testid="dept-add-btn"
          >
            Add Department
          </Button>
        </Box>
      </Paper>

      {/* Departments Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Department Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Department Head</TableCell>
                <TableCell>Employees</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {department.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                      {department.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {department.manager ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          src={department.manager.photoUrl} 
                          alt={department.manager.firstName}
                          sx={{ width: 24, height: 24 }}
                        />
                        <Typography variant="body2">
                          {department.manager.firstName} {department.manager.lastName}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={department.employees?.length || 0} 
                      size="small" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={department.isActive ? 'Active' : 'Inactive'}
                      color={department.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(department)}
                      color="primary"
                      data-testid="dept-edit-btn"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(department)}
                      color="error"
                      data-testid="dept-delete-btn"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDepartments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'No departments found matching your search.' : 'No departments found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDepartment ? 'Edit Department' : 'Add New Department'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="departmentName"
                  label="Department Name (Required)"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value={true}>Active</MenuItem>
                    <MenuItem value={false}>Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  id="departmentManager"
                  options={employees}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.employeeId})`}
                  value={employees.find(e => e.id === formData.managerId) || null}
                  onChange={(event, newValue) => {
                    handleInputChange('managerId', newValue ? newValue.id : '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Department Head / Manager"
                      placeholder="Search employee..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          src={option.photoUrl} 
                          alt={option.firstName}
                          sx={{ width: 24, height: 24 }}
                        />
                        <Box>
                          <Typography variant="body2">
                            {option.firstName} {option.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.employeeId} • {option.email}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Department description and responsibilities..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<SaveIcon />} data-testid="dept-save-btn">
            {editingDepartment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => handleOpenDialog()}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' }
        }}
      >
        <AddIcon />
      </Fab>
      <ConfirmDialog {...dialogProps} />
    </Container>
  );
};

DepartmentManagement.propTypes = {
  embedded: PropTypes.bool,
};

export default DepartmentManagement;
