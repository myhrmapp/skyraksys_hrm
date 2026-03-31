import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Grid
} from '@mui/material';
import ProjectService from '../../services/ProjectService';
import { employeeService as EmployeeService } from '../../services/employee.service';

const ProjectForm = ({ project, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'Planning',
    clientName: '',
    managerId: ''
  });
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        status: project.status || 'Planning',
        clientName: project.clientName || '',
        managerId: project.managerId || ''
      });
    }
    
    loadEmployees();
  }, [project]);

  const loadEmployees = async () => {
    try {
      const response = await EmployeeService.getAll({ limit: 500 });
      // normalizeResponse returns { data: [...], pagination: {} } for paginated, or plain array
      const list = Array.isArray(response) ? response
        : Array.isArray(response?.data) ? response.data
        : [];
      setEmployees(list);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Project name is required');
      }

      if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        throw new Error('End date must be after start date');
      }

      const payload = {
        ...formData,
        managerId: formData.managerId && formData.managerId.trim() ? formData.managerId : null
      };

      if (project?.id) {
        await ProjectService.update(project.id, payload);
      } else {
        await ProjectService.create(payload);
      }

      onSave();
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to save project');
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Project Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            id="projectName"
            inputProps={{ 'data-testid': 'project-name-input' }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={3}
            id="projectDescription"
            inputProps={{ 'data-testid': 'project-description-input' }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            id="projectStartDate"
            inputProps={{ 'data-testid': 'project-start-date' }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="End Date"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            id="projectEndDate"
            inputProps={{ 'data-testid': 'project-end-date', min: formData.startDate || undefined }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={["Planning","Active","On Hold","Completed","Cancelled"].includes(formData.status) ? formData.status : ""}
              onChange={handleChange}
              label="Status"
              inputProps={{ 'data-testid': 'project-status-select' }}
            >
              <MenuItem value="Planning">Planning</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="On Hold">On Hold</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Client Name"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            id="projectClientName"
            inputProps={{ 'data-testid': 'project-client-name-input' }}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Project Manager</InputLabel>
            <Select
              name="managerId"
              value={employees.some(emp => emp.id === formData.managerId) ? formData.managerId : ""}
              onChange={handleChange}
              label="Project Manager"
              inputProps={{ 'data-testid': 'project-manager-select' }}
            >
              <MenuItem value="">None</MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          data-testid="project-cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          data-testid="project-save-button"
        >
          {loading ? 'Saving...' : (project ? 'Update' : 'Create')}
        </Button>
      </Box>
    </Box>
  );
};

export default ProjectForm;
