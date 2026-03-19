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
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Work as WorkIcon,
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

const PositionManagement = ({ embedded } = {}) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { setLoading } = useLoading();
  const { dialogProps, confirm } = useConfirmDialog();
  
  // State
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    departmentId: '',
    level: '',
    requirements: '',
    responsibilities: '',
    minSalary: '',
    maxSalary: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});

  // Quick Create Department State
  const [openDeptDialog, setOpenDeptDialog] = useState(false);
  const [deptFormData, setDeptFormData] = useState({ name: '', description: '' });

  // Load data on component mount
  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await http.get('/positions');
      setPositions(response.data.data || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await http.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }, []);

  useEffect(() => {
    loadPositions();
    loadDepartments();
  }, [loadPositions, loadDepartments]);

  // Filter positions based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPositions(positions);
    } else {
      const filtered = positions.filter(position =>
        position.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.level?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPositions(filtered);
    }
  }, [positions, searchTerm]);

  const handleOpenDialog = (position = null) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        title: position.title || '',
        description: position.description || '',
        departmentId: position.departmentId || '',
        level: position.level || '',
        requirements: position.requirements || '',
        responsibilities: position.responsibilities || '',
        minSalary: position.minSalary || '',
        maxSalary: position.maxSalary || '',
        isActive: position.isActive !== undefined ? position.isActive : true
      });
    } else {
      setEditingPosition(null);
      setFormData({
        title: '',
        description: '',
        departmentId: '',
        level: '',
        requirements: '',
        responsibilities: '',
        minSalary: '',
        maxSalary: '',
        isActive: true
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPosition(null);
    setFormData({
      title: '',
      description: '',
      departmentId: '',
      level: '',
      requirements: '',
      responsibilities: '',
      minSalary: '',
      maxSalary: '',
      isActive: true
    });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Position title is required';
    }
    
    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required';
    }
    
    if (!formData.level) {
      newErrors.level = 'Level is required';
    }

    if (formData.minSalary && formData.maxSalary) {
      if (parseFloat(formData.minSalary) > parseFloat(formData.maxSalary)) {
        newErrors.maxSalary = 'Maximum salary must be greater than minimum salary';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenDeptDialog = () => {
    setDeptFormData({ name: '', description: '' });
    setOpenDeptDialog(true);
  };

  const handleCloseDeptDialog = () => {
    setOpenDeptDialog(false);
  };

  const handleCreateDepartment = async () => {
    if (!deptFormData.name) {
      enqueueSnackbar('Department name is required', { variant: 'error' });
      return;
    }
    try {
      setLoading(true);
      const response = await http.post('/departments', {
        ...deptFormData,
        isActive: true
      });
      enqueueSnackbar('Department created successfully', { variant: 'success' });
      
      // Refresh departments
      const deptResponse = await http.get('/departments');
      const newDepartments = deptResponse.data.data || [];
      setDepartments(newDepartments);
      
      // Select the new department if possible. 
      // Assuming the created department is in the response or we can find it by name.
      const createdDept = response.data.data || response.data;
      if (createdDept && createdDept.id) {
        handleInputChange('departmentId', createdDept.id);
      } else {
        // Fallback: find by name
        const found = newDepartments.find(d => d.name === deptFormData.name);
        if (found) handleInputChange('departmentId', found.id);
      }
      
      handleCloseDeptDialog();
    } catch (error) {
      console.error('Error creating department:', error);
      enqueueSnackbar('Failed to create department: ' + (error.response?.data?.message || error.message), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        minSalary: formData.minSalary ? parseFloat(formData.minSalary) : null,
        maxSalary: formData.maxSalary ? parseFloat(formData.maxSalary) : null
      };

      if (editingPosition) {
        await http.put(`/positions/${editingPosition.id}`, submitData);
      } else {
        await http.post('/positions', submitData);
      }
      
      handleCloseDialog();
      loadPositions();
    } catch (error) {
      console.error('Error saving position:', error);
      enqueueSnackbar(error.response?.data?.message || 'Failed to save position', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (position) => {
    confirm({
      title: 'Delete Position',
      message: `Are you sure you want to delete the position "${position.title}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          await http.delete(`/positions/${position.id}`);
          loadPositions();
        } catch (error) {
          console.error('Error deleting position:', error);
          enqueueSnackbar(error.response?.data?.message || 'Failed to delete position', { variant: 'error' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const levels = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director'];

  // Check if user has admin or HR role
  const canManagePositions = user?.role === 'admin' || user?.role === 'hr';

  if (!canManagePositions) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          You don't have permission to manage positions.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: embedded ? 0 : 4 }} data-testid="position-management-page">
      {/* Header */}
      {!embedded && (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon color="primary" />
          Position Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage organizational positions and job roles
        </Typography>
      </Box>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {positions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Positions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {positions.filter(p => p.isActive).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Positions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {positions.filter(p => !p.isActive).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive Positions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {departments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Departments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search positions..."
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
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            data-testid="position-add-btn"
          >
            Add Position
          </Button>
        </Box>
      </Paper>

      {/* Positions Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Position Title</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Salary Range</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPositions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {position.title}
                    </Typography>
                    {position.description && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {position.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {position.department?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={position.level || 'Not Set'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {position.minSalary && position.maxSalary ? (
                      `₹${position.minSalary?.toLocaleString()} - ₹${position.maxSalary?.toLocaleString()}`
                    ) : (
                      'Not Set'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={position.isActive ? 'Active' : 'Inactive'}
                      color={position.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(position)}
                      color="primary"
                      data-testid="position-edit-btn"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(position)}
                      color="error"
                      data-testid="position-delete-btn"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPositions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'No positions found matching your search.' : 'No positions found.'}
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
          {editingPosition ? 'Edit Position' : 'Add New Position'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="positionTitle"
                  label="Position Title (Required)"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <FormControl fullWidth error={!!errors.departmentId} required>
                    <InputLabel>Department (Required)</InputLabel>
                    <Select
                      id="positionDepartment"
                      value={formData.departmentId}
                      onChange={(e) => handleInputChange('departmentId', e.target.value)}
                      label="Department (Required)"
                      inputProps={{ 'data-testid': 'position-department-select' }}
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.departmentId && (
                      <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                        {errors.departmentId}
                      </Typography>
                    )}
                  </FormControl>
                  <IconButton 
                    color="primary" 
                    onClick={handleOpenDeptDialog}
                    sx={{ mt: 1 }}
                    title="Create New Department"
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.level} required>
                  <InputLabel>Level (Required)</InputLabel>
                  <Select
                    id="positionLevel"
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    label="Level (Required)"
                    inputProps={{ 'data-testid': 'position-level-select' }}
                  >
                    {levels.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.level && (
                    <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                      {errors.level}
                    </Typography>
                  )}
                </FormControl>
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
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Salary"
                  type="number"
                  value={formData.minSalary}
                  onChange={(e) => handleInputChange('minSalary', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maximum Salary"
                  type="number"
                  value={formData.maxSalary}
                  onChange={(e) => handleInputChange('maxSalary', e.target.value)}
                  error={!!errors.maxSalary}
                  helperText={errors.maxSalary}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Requirements"
                  value={formData.requirements}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Education, experience, skills, certifications..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Responsibilities"
                  value={formData.responsibilities}
                  onChange={(e) => handleInputChange('responsibilities', e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Key job responsibilities and duties..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<SaveIcon />} data-testid="position-save-btn">
            {editingPosition ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create New Department Dialog */}
      <Dialog open={openDeptDialog} onClose={handleCloseDeptDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Department</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              label="Department Name"
              fullWidth
              value={deptFormData.name}
              onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={deptFormData.description}
              onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeptDialog}>Cancel</Button>
          <Button onClick={handleCreateDepartment} variant="contained">Create</Button>
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

PositionManagement.propTypes = {
  embedded: PropTypes.bool,
};

export default PositionManagement;
