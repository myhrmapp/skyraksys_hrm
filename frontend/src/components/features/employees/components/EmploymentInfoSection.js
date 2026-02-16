import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Business as BusinessIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import InfoField from './InfoField';

const EmploymentInfoSection = ({ 
  employee, 
  editing, 
  onChange, 
  formatDate,
  departments,
  positions,
  managers
}) => {
  return (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h6" fontWeight={600}>
            <BusinessIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#8b5cf6' }} />
            Employment Details
          </Typography>
          {editing && <Chip label="Editing" size="small" color="warning" icon={<EditIcon />} />}
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Employee ID"
              value={employee.employeeId}
              editing={editing}
              onChange={(val) => onChange('employeeId', val)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Hire Date"
              value={editing ? employee.hireDate : formatDate(employee.hireDate)}
              editing={editing}
              type="date"
              onChange={(val) => onChange('hireDate', val)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            {editing ? (
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={employee.departmentId || ''}
                  label="Department"
                  onChange={(e) => onChange('departmentId', e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" gutterBottom>
                  Department
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {employee.department?.name || '-'}
                </Typography>
              </Box>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            {editing ? (
              <FormControl fullWidth size="small">
                <InputLabel>Position</InputLabel>
                <Select
                  value={employee.positionId || ''}
                  label="Position"
                  onChange={(e) => onChange('positionId', e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {positions.map((pos) => (
                    <MenuItem key={pos.id} value={pos.id}>
                      {pos.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" gutterBottom>
                  Position
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {employee.position?.title || '-'}
                </Typography>
              </Box>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            {editing ? (
              <FormControl fullWidth size="small">
                <InputLabel>Employment Type</InputLabel>
                <Select
                  value={employee.employmentType || ''}
                  label="Employment Type"
                  onChange={(e) => onChange('employmentType', e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                >
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Intern">Intern</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" gutterBottom>
                  Employment Type
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {employee.employmentType || '-'}
                </Typography>
              </Box>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Work Location"
              value={employee.workLocation}
              editing={editing}
              onChange={(val) => onChange('workLocation', val)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            {editing ? (
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={employee.status || 'Active'}
                  label="Status"
                  onChange={(e) => onChange('status', e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="On Leave">On Leave</MenuItem>
                  <MenuItem value="Terminated">Terminated</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" gutterBottom>
                  Status
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {employee.status || 'Active'}
                </Typography>
              </Box>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Joining Date"
              value={editing ? employee.joiningDate : formatDate(employee.joiningDate)}
              editing={editing}
              type="date"
              onChange={(val) => onChange('joiningDate', val)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Confirmation Date"
              value={editing ? employee.confirmationDate : formatDate(employee.confirmationDate)}
              editing={editing}
              type="date"
              onChange={(val) => onChange('confirmationDate', val)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Probation Period (months)"
              value={employee.probationPeriod}
              editing={editing}
              type="number"
              onChange={(val) => onChange('probationPeriod', val)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Notice Period (days)"
              value={employee.noticePeriod}
              editing={editing}
              type="number"
              onChange={(val) => onChange('noticePeriod', val)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Resignation Date"
              value={editing ? employee.resignationDate : formatDate(employee.resignationDate)}
              editing={editing}
              type="date"
              onChange={(val) => onChange('resignationDate', val)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <InfoField
              label="Last Working Date"
              value={editing ? employee.lastWorkingDate : formatDate(employee.lastWorkingDate)}
              editing={editing}
              type="date"
              onChange={(val) => onChange('lastWorkingDate', val)}
            />
          </Grid>
          <Grid item xs={12}>
            {editing ? (
              <FormControl fullWidth size="small">
                <InputLabel>Manager</InputLabel>
                <Select
                  value={employee.managerId || ''}
                  label="Manager"
                  onChange={(e) => onChange('managerId', e.target.value)}
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {managers.map((mgr) => (
                    <MenuItem key={mgr.id} value={mgr.id}>
                      {mgr.firstName} {mgr.lastName} ({mgr.employeeId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" gutterBottom>
                  Manager
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '-'}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EmploymentInfoSection;
