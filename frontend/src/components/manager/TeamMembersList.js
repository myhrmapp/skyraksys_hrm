import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

const TeamMembersList = ({ teamMembers, onRefresh }) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);

  const openMemberDetails = (member) => {
    setSelectedMember(member);
    setDetailsDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'success',
      'Inactive': 'default',
      'On Leave': 'warning',
      'Terminated': 'error'
    };
    return colors[status] || 'default';
  };

  if (!teamMembers || teamMembers.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="info">
          No team members assigned to you at this time.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Your Team ({teamMembers.length} members)
      </Typography>
      
      <Grid container spacing={3}>
        {teamMembers.map((member) => (
          <Grid item xs={12} sm={6} md={4} key={member.id}>
            <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => openMemberDetails(member)}>
              <CardContent>
                {/* Member Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {member.firstName?.[0]}{member.lastName?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" noWrap>
                      {member.firstName} {member.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {member.employeeId}
                    </Typography>
                  </Box>
                  <Chip
                    label={member.status}
                    color={getStatusColor(member.status)}
                    size="small"
                  />
                </Box>

                {/* Member Details */}
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WorkIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" noWrap>
                      {member.position?.title || 'No position assigned'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" noWrap>
                      {member.email}
                    </Typography>
                  </Box>
                  
                  {member.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {member.phone}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      Joined: {member.hireDate ? dayjs(member.hireDate).format('MMM YYYY') : 'Unknown'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Member Details Dialog */}
      <Dialog 
        open={detailsDialog} 
        onClose={() => setDetailsDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Team Member Details
        </DialogTitle>
        <DialogContent>
          {selectedMember && (
            <Box>
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ mr: 3, width: 64, height: 64, bgcolor: 'primary.main' }}>
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {selectedMember.employeeId} • {selectedMember.department?.name}
                  </Typography>
                  <Chip
                    label={selectedMember.status}
                    color={getStatusColor(selectedMember.status)}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Details Grid */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {selectedMember.email}
                      </Typography>
                    </Box>
                    
                    {selectedMember.phone && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body1">
                          {selectedMember.phone}
                        </Typography>
                      </Box>
                    )}
                    
                    {selectedMember.dateOfBirth && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Date of Birth
                        </Typography>
                        <Typography variant="body1">
                          {dayjs(selectedMember.dateOfBirth).format('MMM DD, YYYY')}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Employment Details
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Position
                      </Typography>
                      <Typography variant="body1">
                        {selectedMember.position?.title || 'Not assigned'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Department
                      </Typography>
                      <Typography variant="body1">
                        {selectedMember.department?.name || 'Not assigned'}
                      </Typography>
                    </Box>
                    
                    {selectedMember.hireDate && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Hire Date
                        </Typography>
                        <Typography variant="body1">
                          {dayjs(selectedMember.hireDate).format('MMM DD, YYYY')}
                        </Typography>
                      </Box>
                    )}
                    
                    {selectedMember.workLocation && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Work Location
                        </Typography>
                        <Typography variant="body1">
                          {selectedMember.workLocation}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              {/* Address Information */}
              {(selectedMember.address || selectedMember.city || selectedMember.state) && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Address Information
                  </Typography>
                  <Stack spacing={1}>
                    {selectedMember.address && (
                      <Typography variant="body1">
                        {selectedMember.address}
                      </Typography>
                    )}
                    <Typography variant="body1">
                      {[selectedMember.city, selectedMember.state, selectedMember.pinCode]
                        .filter(Boolean)
                        .join(', ')
                      }
                    </Typography>
                  </Stack>
                </>
              )}

              {/* Emergency Contact */}
              {(selectedMember.emergencyContactName || selectedMember.emergencyContactPhone) && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Emergency Contact
                  </Typography>
                  <Stack spacing={1}>
                    {selectedMember.emergencyContactName && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1">
                          {selectedMember.emergencyContactName}
                        </Typography>
                      </Box>
                    )}
                    {selectedMember.emergencyContactPhone && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body1">
                          {selectedMember.emergencyContactPhone}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default React.memo(TeamMembersList);
