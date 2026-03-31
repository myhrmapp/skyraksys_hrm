import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Alert,
  Grid
} from '@mui/material';
import TaskService from '../../services/TaskService';
import ProjectService from '../../services/ProjectService';
import { employeeService as EmployeeService } from '../../services/employee.service';

const TaskForm = ({ task, projectId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: projectId || '',
    assignedTo: '',
    availableToAll: false,
    status: 'Not Started',
    priority: 'Medium',
    estimatedHours: ''
  });
  
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        description: task.description || '',
        projectId: task.projectId || projectId || '',
        assignedTo: task.assignedTo || '',
        availableToAll: task.availableToAll || false,
        status: task.status || 'Not Started',
        priority: task.priority || 'Medium',
        estimatedHours: task.estimatedHours || ''
      });
    }
    
    if (!projectId) {
      loadProjects();
    }
    loadEmployees();
  }, [task, projectId]);

  const loadProjects = async () => {
    try {
      // Fetch all projects regardless of status so the user can assign tasks to any project
      const response = await ProjectService.getAll();
      const list = Array.isArray(response?.data?.data) ? response.data.data
        : Array.isArray(response?.data) ? response.data
        : [];
      setProjects(list);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

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
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Task name is required');
      }
      if (!formData.projectId) {
        throw new Error('Project is required');
      }

      const payload = {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        assignedTo: formData.availableToAll ? null : (formData.assignedTo || null)
      };

      if (task?.id) {
        await TaskService.update(task.id, payload);
      } else {
        await TaskService.create(payload);
      }

      onSave();
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to save task');
      console.error('Error saving task:', error);
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
            label="Task Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
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
          />
        </Grid>

        {!projectId && (
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Project</InputLabel>
              <Select
                name="projectId"
                value={projects.some(p => p.id === formData.projectId) ? formData.projectId : ""}
                onChange={handleChange}
                label="Project"
              >
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                name="availableToAll"
                checked={formData.availableToAll}
                onChange={handleChange}
              />
            }
            label="Available to all employees"
          />
        </Grid>

        {!formData.availableToAll && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select
                name="assignedTo"
                value={employees.some(e => e.id === formData.assignedTo) ? formData.assignedTo : ""}
                onChange={handleChange}
                label="Assign To"
              >
                <MenuItem value="">None</MenuItem>
                {employees.map(employee => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={["Not Started","In Progress","Completed","On Hold"].includes(formData.status) ? formData.status : ""}
              onChange={handleChange}
              label="Status"
            >
              <MenuItem value="Not Started">Not Started</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="On Hold">On Hold</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              name="priority"
              value={["Low","Medium","High","Critical"].includes(formData.priority) ? formData.priority : ""}
              onChange={handleChange}
              label="Priority"
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Estimated Hours"
            name="estimatedHours"
            type="number"
            value={formData.estimatedHours}
            onChange={handleChange}
            inputProps={{ min: 0, step: 0.5 }}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          fullWidth
        >
          {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          fullWidth
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default TaskForm;
