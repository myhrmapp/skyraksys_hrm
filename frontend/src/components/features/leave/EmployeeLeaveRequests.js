import React from 'react';
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
  Fade,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Pending as PendingIcon,
  Add as AddIcon,
  Block as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useLeaveRequests, useLeaveBalances, useCancelLeaveRequest } from '../../../hooks/queries/useLeaveQueries';

const EmployeeLeaveRequests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: leaveRequestsData, isLoading: loadingRequests } = useLeaveRequests({});
  const { data: leaveBalanceData, isLoading: loadingBalance } = useLeaveBalances(user?.employeeId);
  const { mutate: cancelLeave, isPending: isCancelling } = useCancelLeaveRequest();

  const loading = loadingRequests || loadingBalance;

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

  // Normalise leave requests
  const leaveRequests = React.useMemo(() => {
    const raw = Array.isArray(leaveRequestsData) ? leaveRequestsData : (leaveRequestsData?.data ?? leaveRequestsData);
    const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [leaveRequestsData]);

  // Normalise leave balances into { [typeName]: { total, used, remaining } }
  const leaveBalance = React.useMemo(() => {
    const raw = Array.isArray(leaveBalanceData) ? leaveBalanceData : (leaveBalanceData?.data ?? leaveBalanceData);
    const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
    const map = {};
    arr.forEach(item => {
      const typeName = (item.leaveType?.name || item.leaveTypeName || 'other')
        .toLowerCase().replace(/\s+leave$/, '');
      map[typeName] = {
        total: item.totalAccrued || item.totalEntitled || item.total || 0,
        used: item.totalTaken || item.used || 0,
        remaining: item.remaining || item.balance || 0
      };
    });
    return map;
  }, [leaveBalanceData]);

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
                        <Card sx={{
                          borderRadius: 4,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                          background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
                          border: '1px solid rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(20px)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                            '& .progress-bar': {
                              filter: 'brightness(1.1)'
                            }
                          }
                        }}>
                          {/* Decorative blur blob */}
                          <Box sx={{
                            position: 'absolute',
                            top: -30,
                            right: -30,
                            width: 100,
                            height: 100,
                            bgcolor: color,
                            opacity: 0.08,
                            borderRadius: '50%',
                            filter: 'blur(30px)',
                            pointerEvents: 'none'
                          }} />
                          <CardContent sx={{ textAlign: 'center', position: 'relative', zIndex: 1, p: 3 }}>
                            <Typography variant="h2" color={color} fontWeight="800" sx={{ mb: 1 }}>
                              {balance.remaining || 0}
                            </Typography>
                            <Typography variant="subtitle1" fontWeight="700" color="text.primary" gutterBottom>
                              {displayName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight="500">
                              {balance.used || 0} used of {balance.total || 0} days
                            </Typography>
                            <Box sx={{ mt: 3, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 2, height: 8, overflow: 'hidden' }}>
                              <Box
                                className="progress-bar"
                                sx={{
                                  bgcolor: color,
                                  height: '100%',
                                  borderRadius: 2,
                                  width: `${Math.min(((balance.remaining || 0) / (balance.total || 1)) * 100, 100)}%`,
                                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease',
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
              <Card sx={{
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.01)' }}>
                    <Typography variant="h6" fontWeight="bold">
                      Recent Leave Requests
                    </Typography>
                  </Box>
                  
                  {leaveRequests.length === 0 ? (
                    <Box sx={{ p: 4 }}>
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        You haven't submitted any leave requests yet. Click "New Request" to apply for leave.
                      </Alert>
                    </Box>
                  ) : (
                    <TableContainer data-testid="employee-leave-requests-table">
                      <Table sx={{ minWidth: 700, '& .MuiTableCell-root': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' } }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>Leave Type</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>Duration</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>Days</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>Applied Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2 }}>Comments</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 2, textAlign: 'right' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {leaveRequests.map((request) => (
                            <TableRow key={request.id} sx={{ transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                              <TableCell sx={{ py: 2 }}>
                                <Chip
                                  label={getLeaveTypeLabel(request.leaveType)}
                                  color={getLeaveTypeColor(request.leaveType)}
                                  size="small"
                                  sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Box>
                                  <Typography variant="body2" fontWeight="500">
                                    {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {request.reason}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {request.totalDays || request.days} days
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(request.createdAt || request.appliedDate).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {statusIcons[request.status?.toLowerCase()]}
                                  <Chip
                                    label={(request.status || 'Unknown').toUpperCase()}
                                    color={statusColors[request.status?.toLowerCase()]}
                                    size="small"
                                    variant="outlined"
                                    sx={{ ml: 1, fontWeight: 600, borderWidth: 2 }}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {request.approverComments || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 2, textAlign: 'right' }}>
                                {(['pending', 'approved'].includes(request.status?.toLowerCase())) && (
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    startIcon={<CancelIcon />}
                                    disabled={isCancelling}
                                    onClick={() => cancelLeave(request.id)}
                                    data-testid={`cancel-leave-${request.id}`}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                  >
                                    {request.status?.toLowerCase() === 'approved' ? 'Request Cancel' : 'Cancel'}
                                  </Button>
                                )}
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
