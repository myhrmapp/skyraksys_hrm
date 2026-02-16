import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Grid,
  Stack,
  Fade,
  Link,
  Tooltip
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import PhotoUploadSimple from '../../../common/PhotoUploadSimple';

const EmployeeProfileCard = ({
  employee,
  editing,
  selectedPhoto,
  photoPreview,
  onPhotoSelect,
  onPhotoRemove
}) => {
  
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'on leave': return 'warning';
      case 'terminated': return 'error';
      default: return 'success'; // Default to success/active
    }
  };

  const statusColor = getStatusColor(employee.status || 'active');

  return (
    <Fade in={true}>
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'visible' }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={4} alignItems="center">
            {/* Avatar or Photo Upload */}
            <Grid item xs={12} sm="auto" sx={{ display: 'flex', justifyContent: 'center' }}>
              {editing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <PhotoUploadSimple
                    photo={selectedPhoto}
                    photoPreview={photoPreview}
                    onPhotoSelect={onPhotoSelect}
                    onPhotoRemove={onPhotoRemove}
                    size={140}
                  />
                </Box>
              ) : (
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={employee.photoUrl ? `${process.env.REACT_APP_BACKEND_URL || ''}${employee.photoUrl}` : undefined}
                    sx={{
                      width: 140,
                      height: 140,
                      bgcolor: '#1976d2',
                      fontSize: 56,
                      fontWeight: 600,
                      border: '4px solid white',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                    }}
                  >
                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                  </Avatar>
                  <Tooltip title={`Status: ${employee.status || 'Active'}`}>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 10,
                        right: 10,
                        width: 24,
                        height: 24,
                        bgcolor: `${statusColor}.main`,
                        border: '3px solid white',
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  </Tooltip>
                </Box>
              )}
            </Grid>

            {/* Basic Info */}
            <Grid item xs={12} sm>
              <Box sx={{ mb: 2, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, mb: 1 }}>
                  {employee.firstName} {employee.lastName}
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight={500}>
                  {employee.position?.title || employee.positionId || 'No Position Assigned'}
                </Typography>
              </Box>

              <Stack 
                direction="row" 
                spacing={1.5} 
                flexWrap="wrap" 
                sx={{ mb: 3, justifyContent: { xs: 'center', sm: 'flex-start' } }}
              >
                <Chip
                  label={employee.employeeId || 'No ID'}
                  icon={<BadgeIcon fontSize="small" />}
                  size="small"
                  sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 600, borderRadius: 1.5 }}
                />
                <Chip
                  label={employee.department?.name || employee.departmentId || 'No Department'}
                  icon={<BusinessIcon fontSize="small" />}
                  size="small"
                  sx={{ bgcolor: '#f3e5f5', color: '#9c27b0', fontWeight: 600, borderRadius: 1.5 }}
                />
                {employee.hireDate && (
                  <Chip
                    label={`Joined ${new Date(employee.hireDate).toLocaleDateString()}`}
                    icon={<CalendarIcon fontSize="small" />}
                    size="small"
                    sx={{ bgcolor: '#fff7ed', color: '#ea580c', fontWeight: 600, borderRadius: 1.5 }}
                  />
                )}
              </Stack>

              {/* Contact Row */}
              <Stack 
                direction="row" 
                spacing={3} 
                flexWrap="wrap"
                sx={{ 
                  justifyContent: { xs: 'center', sm: 'flex-start' },
                  gap: 2
                }}
              >
                {employee.email && (
                  <Link 
                    href={`mailto:${employee.email}`} 
                    underline="hover" 
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, '&:hover': { color: 'primary.main' } }}
                  >
                    <EmailIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {employee.email}
                    </Typography>
                  </Link>
                )}
                {employee.phone && (
                  <Link 
                    href={`tel:${employee.phone}`} 
                    underline="hover" 
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, '&:hover': { color: 'primary.main' } }}
                  >
                    <PhoneIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {employee.phone}
                    </Typography>
                  </Link>
                )}
                {employee.workLocation && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {employee.workLocation}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Fade>
  );
};

export default EmployeeProfileCard;
