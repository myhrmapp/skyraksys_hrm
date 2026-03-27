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
  MenuItem,
  useTheme
} from '@mui/material';
import {
  PersonOutline as PersonIcon,
  Edit as EditIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import InfoField from './InfoField';

const PersonalInfoSection = ({ employee, editing, onChange, formatDate }) => {
  const theme = useTheme();
  return (
    <>
      {/* Personal Information */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              <PersonIcon sx={{ verticalAlign: 'middle', mr: 1, color: theme.palette.primary.main }} />
              Personal Information
            </Typography>
            {editing && <Chip label="Editing" size="small" color="warning" icon={<EditIcon />} />}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={6}>
              <InfoField
                label="First Name"
                value={employee.firstName}
                editing={editing}
                onChange={(val) => onChange('firstName', val)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <InfoField
                label="Last Name"
                value={employee.lastName}
                editing={editing}
                onChange={(val) => onChange('lastName', val)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Date of Birth"
                value={editing ? employee.dateOfBirth : formatDate(employee.dateOfBirth)}
                editing={editing}
                type="date"
                onChange={(val) => onChange('dateOfBirth', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {editing ? (
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={employee.gender || ''}
                    label="Gender"
                    onChange={(e) => onChange('gender', e.target.value)}
                    sx={{ bgcolor: 'white', borderRadius: 2 }}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" gutterBottom>
                    Gender
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employee.gender || '-'}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
              <InfoField
                label="Email"
                value={employee.email}
                editing={editing}
                onChange={(val) => onChange('email', val)}
                type="email"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Phone"
                value={employee.phone}
                editing={editing}
                onChange={(val) => onChange('phone', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {editing ? (
                <FormControl fullWidth size="small">
                  <InputLabel>Marital Status</InputLabel>
                  <Select
                    value={employee.maritalStatus || ''}
                    label="Marital Status"
                    onChange={(e) => onChange('maritalStatus', e.target.value)}
                    sx={{ bgcolor: 'white', borderRadius: 2 }}
                  >
                    <MenuItem value="Single">Single</MenuItem>
                    <MenuItem value="Married">Married</MenuItem>
                    <MenuItem value="Divorced">Divorced</MenuItem>
                    <MenuItem value="Widowed">Widowed</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500} display="block" gutterBottom>
                    Marital Status
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {employee.maritalStatus || '-'}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Nationality"
                value={employee.nationality}
                editing={editing}
                onChange={(val) => onChange('nationality', val)}
              />
            </Grid>
            <Grid item xs={12}>
              <InfoField
                label="Address"
                value={employee.address}
                editing={editing}
                onChange={(val) => onChange('address', val)}
                multiline
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoField
                label="City"
                value={employee.city}
                editing={editing}
                onChange={(val) => onChange('city', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoField
                label="State"
                value={employee.state}
                editing={editing}
                onChange={(val) => onChange('state', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <InfoField
                label="Pin Code"
                value={employee.pinCode}
                editing={editing}
                onChange={(val) => onChange('pinCode', val)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              <PhoneIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#ef4444' }} />
              Emergency Contact
            </Typography>
            {editing && <Chip label="Editing" size="small" color="warning" icon={<EditIcon />} />}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <InfoField
                label="Contact Name"
                value={employee.emergencyContactName}
                editing={editing}
                onChange={(val) => onChange('emergencyContactName', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Contact Phone"
                value={employee.emergencyContactPhone}
                editing={editing}
                onChange={(val) => onChange('emergencyContactPhone', val)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoField
                label="Relationship"
                value={employee.emergencyContactRelation}
                editing={editing}
                onChange={(val) => onChange('emergencyContactRelation', val)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </>
  );
};

export default PersonalInfoSection;
