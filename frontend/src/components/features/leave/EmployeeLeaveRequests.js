import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Stack,
  Divider,
  useTheme,
  Fade,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Pending as PendingIcon,
  Add as AddIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { leaveService } from '../../../services/leave.service';

const EmployeeLeaveRequests = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({});

  const statusColors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    cancelled: 'default'
  };

  const statusIcons = {
    approved: <ApprovedIcon color="success" />,
    rejected: <RejectedIcon color="error" />,
    pending: <PendingIcon color="warning" />
  };

  useEffect(() => {
    loadEmployeeLeaves();
  }, []);

  const loadEmployeeLeaves = async () => {
    try {
      setLoading(true);
      
      // Load leave requests from API
      const response = await leaveService.getAll();
      if (response?.data) {
        const leaves = Array.isArray(response.data) ? response.data : 
                      (response.data.data ? response.data.data : []);
        
        // Sort by applied date descending
        const sortedLeaves = leaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setLeaveRequests(sortedLeaves);
      } else {
        setLeaveRequests([]);
      }

      // Load leave balance from API
      try {
        const balanceResponse = await leaveService.getBalance(user?.employeeId || null);
        if (balanceResponse?.data) {
          const balanceData = Array.isArray(balanceResponse.data) ? balanceResponse.data : 
            (balanceResponse.data.data ? balanceResponse.data.data : []);
          // Transform API balance data into component format
          const balanceMap = {};
          balanceData.forEach(item => {
            const typeName = (item.leaveType?.name || item.leaveTypeName || 'other').toLowerCase().replace(/\s+leave$/, '');
            balanceMap[typeName] = {
              total: item.totalEntitled || item.total || 0,
              used: item.used || 0,
              remaining: item.remaining || item.balance || 0
            };
          });
          setLeaveBalance(balanceMap);
        } else {
          setLeaveBalance({});
        }
      } catch (balanceError) {
        console.error('Error loading leave balance:', balanceError);
        setLeaveBalance({});
      }
    } catch (error) {
      console.error('Error loading leave data:', error);
      setLeaveRequests([]);
      setLeaveBalance({});
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypeLabel = (type) => {
    // Handle both object (with name property) and string types
    const typeString = typeof type === 'object' ? type?.name?.toLowerCase() : type;
    
    const types = {
      annual: 'Annual Leave',
      'annual leave': 'Annual Leave',
      sick: 'Sick Leave',
      'sick leave': 'Sick Leave',
      personal: 'Personal Leave',
      'personal leave': 'Personal Leave',
      maternity: 'Maternity Leave',
      'maternity leave': 'Maternity Leave',
      emergency: 'Emergency Leave',
      'emergency leave': 'Emergency Leave'
    };
    return types[typeString] || (typeof type === 'object' ? type?.name : type) || typeString;
  };

  const getLeaveTypeColor = (type) => {
    const typeString = typeof type === 'object' ? type?.name?.toLowerCase() : type?.toLowerCase();
    if (typeString?.includes('annual')) return 'primary';
    if (typeString?.includes('sick')) return 'error';
    if (typeString?.includes('personal')) return 'warning';
    if (typeString?.includes('maternity') || typeString?.includes('paternity')) return 'secondary';
    if (typeString?.includes('emergency')) return 'error';
    return 'info';
  };

  const BALANCE_COLORS = ['primary.main', 'error.main', 'warning.main', 'secondary.main', 'info.main', 'success.main'];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Fade in timeout={600}>
        <Box>
          {/* Header */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              bgcolor: 'white',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="text.primary">
                    My Leave Requests
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Track your leave applications and balance
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/add-leave-request')}
                data-testid="leave-new-request-button"
              >
                New Request
              </Button>
            </Box>
          </Paper>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <Grid container spacing={4}>
            {/* Leave Balance Cards — dynamically rendered from API data */}
            <Grid item xs={12}>
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                Leave Balance Overview
              </Typography>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {Object.keys(leaveBalance).length === 0 && !loading ? (
                  <Grid item xs={12}>
                    <Alert severity="info">No leave balance data available. Contact HR to initialize your leave balances.</Alert>
                  </Grid>
                ) : (
                  Object.entries(leaveBalance).map(([typeName, balance], index) => {
                    const color = BALANCE_COLORS[index % BALANCE_COLORS.length];
                    const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1) + ' Leave';
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={typeName}>
                        <Card>
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color={color} fontWeight="bold">
                              {balance.remaining || 0}
                            </Typography>
                            <Typography variant="h6" gutterBottom>
                              {displayName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {balance.used || 0} used of {balance.total || 0} days
                            </Typography>
                            <Box sx={{ mt: 2, bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                              <Box
                                sx={{
                                  bgcolor: color,
                                  height: '100%',
                                  borderRadius: 1,
                                  width: `${Math.min(((balance.remaining || 0) / (balance.total || 1)) * 100, 100)}%`
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })
                )}
              </Grid>
            </Grid>

            {/* Leave Requests Table */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Recent Leave Requests
                    </Typography>
                  </Box>
                  
                  {leaveRequests.length === 0 ? (
                    <Alert severity="info">
                      You haven't submitted any leave requests yet. Click "New Request" to apply for leave.
                    </Alert>
                  ) : (
                    <TableContainer data-testid="employee-leave-requests-table">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Leave Type</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Days</TableCell>
                            <TableCell>Applied Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Comments</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {leaveRequests.map((request) => (
                            <TableRow key={request.id} hover>
                              <TableCell>
                                <Chip
                                  label={getLeaveTypeLabel(request.leaveType)}
                                  color={getLeaveTypeColor(request.leaveType)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2">
                                    {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {request.reason}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {request.totalDays || request.days} days
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {new Date(request.createdAt || request.appliedDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {statusIcons[request.status]}
                                  <Chip
                                    label={(request.status || 'Unknown').toUpperCase()}
                                    color={statusColors[request.status]}
                                    size="small"
                                    sx={{ ml: 1 }}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {request.approverComments || '-'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Container>
  );
};

export default EmployeeLeaveRequests;
