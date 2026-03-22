import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Avatar,
  Stack,
  Divider,
  Tooltip,
  Grow,
  Paper,
  Button,
  alpha,
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  CalendarToday as CalendarTodayIcon,
  Visibility as VisibilityIcon,
  People as PeopleIcon,
  VpnKey as VpnKeyIcon,
  Add as AddIcon
} from '@mui/icons-material';

const EmployeeCardView = ({ 
  employees, 
  searchTerm, 
  onView, 
  onEdit, 
  onDelete, 
  onCreateUserAccount, 
  onManageUserAccount,
  onAddEmployee
}) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3}>
      {employees.map((employee, index) => (
        <Grow in timeout={300 + index * 50} key={employee.id}>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  borderColor: 'primary.main'
                }
              }}
              onClick={() => onView(employee.id)}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  {/* Avatar & Name */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={employee.photoUrl ? `${process.env.REACT_APP_BACKEND_URL || ''}${employee.photoUrl}` : undefined}
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'primary.main'
                      }}
                    >
                      {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="700">
                        {employee.firstName} {employee.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {employee.employeeId}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                      <Chip
                        label={employee.status}
                        size="small"
                        color={employee.status === 'Active' ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      {employee.user && (
                        <Chip
                          label={employee.user.isActive ? 'Login: On' : 'Login: Off'}
                          size="small"
                          color={employee.user.isActive ? 'success' : 'error'}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <Divider />
                  
                  {/* Details */}
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WorkIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {employee.position?.title || 'No Position'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {employee.department?.name || 'No Department'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" noWrap>
                        {employee.email}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarTodayIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        Joined {new Date(employee.hireDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                  
                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                    {!employee.userId ? (
                      <Tooltip title="Create User Account">
                        <IconButton
                          size="small"
                          data-testid="employee-card-create-login-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateUserAccount(employee);
                          }}
                          sx={{
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2) }
                          }}
                        >
                          <VpnKeyIcon fontSize="small" color="success" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Manage User Account">
                        <IconButton
                          size="small"
                          data-testid="employee-card-manage-login-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onManageUserAccount(employee);
                          }}
                          sx={{
                            bgcolor: alpha(
                              employee.user?.isActive 
                                ? theme.palette.primary.main 
                                : theme.palette.warning.main, 
                              0.1
                            ),
                            '&:hover': { 
                              bgcolor: alpha(
                                employee.user?.isActive 
                                  ? theme.palette.primary.main 
                                  : theme.palette.warning.main, 
                                0.2
                              ) 
                            }
                          }}
                        >
                          <VpnKeyIcon 
                            fontSize="small" 
                            sx={{ 
                              color: employee.user?.isActive 
                                ? 'primary.main' 
                                : 'warning.main' 
                            }} 
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="View Profile">
                      <IconButton
                        size="small"
                        data-testid="employee-card-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(employee.id);
                        }}
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2) }
                        }}
                      >
                        <VisibilityIcon fontSize="small" color="info" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Edit Employee">
                      <IconButton
                        size="small"
                        data-testid="employee-card-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(employee);
                        }}
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                        }}
                      >
                        <EditIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Terminate Employee">
                      <IconButton
                        size="small"
                        data-testid="employee-card-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(employee);
                        }}
                        sx={{
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                        }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grow>
      ))}
      
      {/* Empty State */}
      {employees.length === 0 && (
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 8,
              textAlign: 'center',
              bgcolor: 'white',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2
            }}
          >
            <PeopleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="text.secondary">
              No employees found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first employee'}
            </Typography>
            {!searchTerm && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onAddEmployee}
              >
                Add Employee
              </Button>
            )}
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default EmployeeCardView;
