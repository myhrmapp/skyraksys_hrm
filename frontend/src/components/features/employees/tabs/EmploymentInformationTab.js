import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

const EmploymentInformationTab = ({ formData, errors, touchedFields = {}, onChange, onBlur, departments, positions, managers, loadingRefData }) => {
  // Filter positions by selected department (Cascading dropdown)
  const filteredPositions = React.useMemo(() => {
    if (!formData.departmentId) {
      return positions; // Show all positions if no department selected
    }
    return positions.filter(pos => pos.departmentId === formData.departmentId);
  }, [positions, formData.departmentId]);

  return (
  <Grid container spacing={3}>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="hireDate"
        name="hireDate"
        label="Hire Date (Required)"
        type="date"
        data-testid="field-hireDate"
        value={formData.hireDate}
        onChange={(e) => onChange('hireDate', e.target.value)}
        onBlur={() => onBlur && onBlur('hireDate')}
        error={touchedFields.hireDate && !!errors.hireDate}
        helperText={touchedFields.hireDate && errors.hireDate ? errors.hireDate : 'Date when employee was hired'}
        InputLabelProps={{ shrink: true }}
        required
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={touchedFields.departmentId && !!errors.departmentId} required>
        <InputLabel>Department (Required)</InputLabel>
        <Select
          id="departmentId"
          name="departmentId"
          inputProps={{ 'data-testid': 'department-select' }}
          value={formData.departmentId}
          onChange={(e) => {
            onChange('departmentId', e.target.value);
            // Clear position when department changes (cascading effect)
            if (formData.positionId) {
              const selectedPosition = positions.find(p => p.id === formData.positionId);
              if (selectedPosition && selectedPosition.departmentId !== e.target.value) {
                onChange('positionId', '');
              }
            }
          }}
          onBlur={() => onBlur && onBlur('departmentId')}
          label="Department"
          disabled={loadingRefData || departments.length === 0}
        >
          {departments.length === 0 ? (
            <MenuItem value="" disabled>
              {loadingRefData ? 'Loading departments...' : 'No departments available'}
            </MenuItem>
          ) : (
            departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))
          )}
        </Select>
        <FormHelperText>
          {touchedFields.departmentId && errors.departmentId ? errors.departmentId : 'Select the department this employee belongs to'}
        </FormHelperText>
      </FormControl>
    </Grid>
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={touchedFields.positionId && !!errors.positionId} required>
        <InputLabel>Position (Required)</InputLabel>
        <Select
          id="positionId"
          name="positionId"
          inputProps={{ 'data-testid': 'position-select' }}
          value={formData.positionId}
          onChange={(e) => onChange('positionId', e.target.value)}
          onBlur={() => onBlur && onBlur('positionId')}
          label="Position"
          disabled={loadingRefData || filteredPositions.length === 0 || !formData.departmentId}
        >
          {filteredPositions.length === 0 ? (
            <MenuItem value="" disabled>
              {loadingRefData ? 'Loading positions...' : 
               !formData.departmentId ? 'Please select a department first' : 
               'No positions available for this department'}
            </MenuItem>
          ) : (
            filteredPositions.map((pos) => (
              <MenuItem key={pos.id} value={pos.id}>
                {pos.title}{pos.level ? ` (${pos.level})` : ''}
              </MenuItem>
            ))
          )}
        </Select>
        <FormHelperText>
          {touchedFields.positionId && errors.positionId ? errors.positionId :
           (formData.departmentId 
             ? `${filteredPositions.length} position(s) available in selected department` 
             : 'Select department first to see available positions')}
        </FormHelperText>
      </FormControl>
    </Grid>
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth>
        <InputLabel>Manager</InputLabel>
        <Select
          id="managerId"
          name="managerId"
          inputProps={{ 'data-testid': 'manager-select' }}
          value={formData.managerId}
          onChange={(e) => onChange('managerId', e.target.value)}
          onBlur={() => onBlur && onBlur('managerId')}
          label="Manager"
          disabled={loadingRefData || managers.length === 0}
        >
          <MenuItem value="">None</MenuItem>
          {managers.map((mgr) => (
            <MenuItem key={mgr.id} value={mgr.id}>
              {mgr.firstName} {mgr.lastName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth>
        <InputLabel>Employment Type</InputLabel>
        <Select
          id="employmentType"
          name="employmentType"
          value={formData.employmentType}
          onChange={(e) => onChange('employmentType', e.target.value)}
          onBlur={() => onBlur && onBlur('employmentType')}
          label="Employment Type"
          inputProps={{ 'data-testid': 'field-employmentType' }}
        >
          <MenuItem value="Full-time">Full-time</MenuItem>
          <MenuItem value="Part-time">Part-time</MenuItem>
          <MenuItem value="Contract">Contract</MenuItem>
          <MenuItem value="Intern">Intern</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    {/* Employee Status Dropdown */}
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth>
        <InputLabel>Status</InputLabel>
        <Select
          id="status"
          name="status"
          value={formData.status || 'Active'}
          onChange={(e) => onChange('status', e.target.value)}
          label="Status"
          inputProps={{ 'data-testid': 'field-status' }}
        >
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
          <MenuItem value="On Leave">On Leave</MenuItem>
          <MenuItem value="Terminated">Terminated</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="workLocation"
        name="workLocation"
        label="Work Location"
        data-testid="field-workLocation"
        value={formData.workLocation}
        onChange={(e) => onChange('workLocation', e.target.value)}
        onBlur={() => onBlur && onBlur('workLocation')}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="probationPeriod"
        name="probationPeriod"
        label="Probation Period (months)"
        type="number"
        data-testid="field-probationPeriod"
        value={formData.probationPeriod}
        onChange={(e) => {
          const value = parseInt(e.target.value) || 0;
          if (value >= 0 && value <= 24) {
            onChange('probationPeriod', value);
          }
        }}
        onBlur={() => onBlur && onBlur('probationPeriod')}
        error={touchedFields.probationPeriod && !!errors.probationPeriod}
        helperText={touchedFields.probationPeriod && errors.probationPeriod ? errors.probationPeriod : "Number of months (0-24)"}
        inputProps={{ min: 0, max: 24 }}
        placeholder="6"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="noticePeriod"
        name="noticePeriod"
        label="Notice Period (days)"
        type="number"
        data-testid="field-noticePeriod"
        value={formData.noticePeriod}
        onChange={(e) => {
          const value = parseInt(e.target.value) || 0;
          if (value >= 0 && value <= 365) {
            onChange('noticePeriod', value);
          }
        }}
        onBlur={() => onBlur && onBlur('noticePeriod')}
        error={touchedFields.noticePeriod && !!errors.noticePeriod}
        helperText={errors.noticePeriod || "Number of days (0-365)"}
        inputProps={{ min: 0, max: 365 }}
        placeholder="30"
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="joiningDate"
        label="Joining Date"
        type="date"
        value={formData.joiningDate}
        onChange={(e) => onChange('joiningDate', e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="confirmationDate"
        label="Confirmation Date"
        type="date"
        value={formData.confirmationDate}
        onChange={(e) => onChange('confirmationDate', e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="resignationDate"
        label="Resignation Date"
        type="date"
        value={formData.resignationDate}
        onChange={(e) => onChange('resignationDate', e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        id="lastWorkingDate"
        label="Last Working Date"
        type="date"
        value={formData.lastWorkingDate}
        onChange={(e) => onChange('lastWorkingDate', e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    </Grid>
  </Grid>
);
};

export default EmploymentInformationTab;
