import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import formatCurrency from '../../../utils/formatCurrency';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { payslipService } from '../../../services/payslip/payslipService';
import PayslipViewer from '../../payslip/PayslipViewer';

const EmployeePayslips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [yearFilter, setYearFilter] = useState('all');

  // Fetch employee payslips using React Query
  const { data: payslips = [], isLoading: loading, isError, error: queryError } = useQuery({
    queryKey: ['employee-payslips', user?.employeeId || user?.id],
    queryFn: async () => {
      const history = await payslipService.getPayslipHistory(user.employeeId || user.id);
      return Array.isArray(history) ? history : [];
    },
    enabled: !!user // Only run when user is available
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'success';
      case 'approved': return 'info';
      case 'calculated': return 'warning';
      case 'draft': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const filteredPayslips = payslips.filter(payslip => {
    if (yearFilter === 'all') return true;
    return payslip.year?.toString() === yearFilter;
  });

  const paginatedPayslips = filteredPayslips.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const yearlyEarnings = filteredPayslips.reduce((sum, p) => sum + (Number(p.netPay) || 0), 0);
  const averageMonthlyPay = filteredPayslips.length > 0 ? yearlyEarnings / filteredPayslips.length : 0;

  const handleViewPayslip = (payslip) => {
    // Create a date object from month/year for the viewer
    const date = new Date(payslip.year, payslip.month - 1, 1);
    setSelectedPayslip({
       ...payslip,
       monthDate: date
    });
    setViewerOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="employee-payslips-page">
      <Fade in timeout={600}>
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton aria-label="Back to dashboard" data-testid="payslips-back-btn" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
              <BackIcon />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight="bold">
                My Payslips
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                View and download your salary statements
              </Typography>
            </Box>
          </Box>

          {isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Failed to load payslips: {queryError?.message || 'Unknown error'}
            </Alert>
          )}

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <ReceiptIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {payslips.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Payslips
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {formatCurrency(yearlyEarnings)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Earnings (YTD)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CalendarIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {formatCurrency(averageMonthlyPay)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Monthly Pay
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Filter by Year</InputLabel>
                    <Select
                      data-testid="payslips-year-filter"
                      value={yearFilter}
                      onChange={(e) => { setYearFilter(e.target.value); setPage(0); }}
                      label="Filter by Year"
                    >
                      <MenuItem value="all">All Years</MenuItem>
                      {[...new Set(payslips.map(p => p.year?.toString()).filter(Boolean))].sort((a, b) => b - a).map(year => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {filteredPayslips.length} payslips
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Payslips Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pay Period</TableCell>
                    <TableCell align="right">Gross Pay</TableCell>
                    <TableCell align="right">Deductions</TableCell>
                    <TableCell align="right">Net Pay</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 6 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton height={40} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    paginatedPayslips.map((payslip) => (
                      <TableRow key={payslip.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {payslip.payslipNumber}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(payslip.grossEarnings)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="error.main">
                            {formatCurrency(payslip.totalDeductions)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {formatCurrency(payslip.netPay)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(payslip.status || 'Draft').toUpperCase()}
                            color={getStatusColor(payslip.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton
                              size="small"
                              aria-label="View payslip"
                              data-testid="payslip-view-btn"
                              onClick={() => handleViewPayslip(payslip)}
                            >
                              <ViewIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label="Download payslip"
                              data-testid="payslip-download-btn"
                              onClick={async () => {
                                try {
                                  await payslipService.downloadPayslipByIdPDF(payslip.id);
                                } catch (err) {
                                  console.error('Download failed:', err);
                                }
                              }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {!loading && paginatedPayslips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No payslips found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredPayslips.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            />
          </Card>

          {/* Payslip Viewer Dialog */}
          {selectedPayslip && (
            <PayslipViewer
              open={viewerOpen}
              onClose={() => setViewerOpen(false)}
              employee={{ ...user, id: user.employeeId || user.id }} // Ensure ID is correct
              initialMonth={selectedPayslip.monthDate}
              mode="view"
            />
          )}
        </Box>
      </Fade>
    </Container>
  );
};

export default EmployeePayslips;
