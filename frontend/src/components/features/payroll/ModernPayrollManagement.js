/**
 * Modern Payroll Management System - Admin/HR Interface
 * Comprehensive payslip generation, approval, payment processing, and reporting
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
  Stack,
  Tooltip,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Check as ApproveIcon,
  Clear as RejectIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Assessment as ReportIcon,
  Assessment as AssessmentIcon,
  Payment as PaymentIcon,
  PlayArrow as GenerateIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../contexts/AuthContext';
import http from '../../../http-common';
import EditPayslipDialog from './EditPayslipDialog';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { formatCurrency } from '../../../utils/formatCurrency';

const ModernPayrollManagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin, isHR } = useAuth();
  const queryClient = useQueryClient();
  const { dialogProps, confirm } = useConfirmDialog();
  
  const [activeTab, setActiveTab] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Loading state for non-query operations
  const [operationLoading, setOperationLoading] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters state
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    departmentId: '',
    status: '',
    templateId: ''
  });
  
  // ðŸš€ React Query for payslips
  const { data: payslipsData, isLoading: isLoadingPayslips, refetch: refetchPayslips } = useQuery({
    queryKey: ['payslips', filters, page, rowsPerPage],
    queryFn: async () => {
      const params = {
        month: filters.month,
        year: filters.year,
        page: page + 1,
        limit: rowsPerPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.departmentId && { departmentId: filters.departmentId })
      };
      const response = await http.get('/payslips', { params });
      return response.data;
    },
    onError: (error) => {
      console.error('Load payslips error:', error);
      enqueueSnackbar('Failed to load payslips', { variant: 'error' });
    }
  });
  
  // ðŸš€ React Query for employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: async () => {
      const response = await http.get('/employees', {
        params: { status: 'Active', limit: 1000 }
      });
      return response.data;
    },
    onError: (error) => console.error('Load employees error:', error)
  });
  
  // ðŸš€ React Query for departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await http.get('/departments');
      return response.data;
    },
    onError: (error) => console.error('Load departments error:', error)
  });
  
  // ðŸš€ React Query for templates
  const { data: templatesData } = useQuery({
    queryKey: ['payslip-templates', 'active'],
    queryFn: async () => {
      const response = await http.get('/payslip-templates/active');
      return response.data;
    },
    onError: (error) => console.error('Load templates error:', error)
  });
  
  // Derive data from queries
  const payslips = payslipsData?.success ? payslipsData.data : [];
  const totalRecords = payslipsData?.pagination?.totalRecords || 0;
  const employees = employeesData?.success ? employeesData.data : [];
  const departments = departmentsData?.success ? departmentsData.data : [];
  const templates = templatesData?.success ? templatesData.data || [] : [];
  const loading = isLoadingPayslips;
  
  // Dialogs
  const [generateDialog, setGenerateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [editDialog, setEditDialog] = useState(false);
  const [payslipToEdit, setPayslipToEdit] = useState(null);
  
  // Validation
  const [validationDialog, setValidationDialog] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  
  // Bulk operations
  const [selectedPayslipIds, setSelectedPayslipIds] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    finalized: 0,
    paid: 0,
    totalAmount: 0
  });

  // Calculate stats when payslips change
  useEffect(() => {
    if (payslips.length > 0) {
      calculateStats(payslips);
    }
  }, [payslips]);

  const calculateStats = (payslipList) => {
    const newStats = {
      total: payslipList.length,
      draft: 0,
      finalized: 0,
      paid: 0,
      totalAmount: 0
    };
    
    payslipList.forEach(p => {
      newStats[p.status]++;
      newStats.totalAmount += parseFloat(p.netPay) || 0;
    });
    
    setStats(newStats);
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const handleValidateAndGenerate = async () => {
    if (selectedEmployees.length === 0) {
      enqueueSnackbar('Please select at least one employee', { variant: 'warning' });
      return;
    }

    try {
      setOperationLoading(true);
      const response = await http.post('/payslips/validate', {
        employeeIds: selectedEmployees,
        month: filters.month,
        year: filters.year
      });

      if (response.data.success) {
        setValidationResults(response.data.validation);
        setValidationDialog(true);
      }
    } catch (error) {
      console.error('Validation error:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Validation failed',
        { variant: 'error' }
      );
    } finally {
      setOperationLoading(false);
    }
  };

  const handleProceedWithValidEmployees = () => {
    if (!validationResults || validationResults.validEmployees.length === 0) {
      enqueueSnackbar('No valid employees to generate payslips', { variant: 'warning' });
      return;
    }

    // Update selected employees to only valid ones
    const validIds = validationResults.validEmployees.map(emp => emp.id);
    setSelectedEmployees(validIds);
    setValidationDialog(false);
    
    // Proceed with generation
    handleGeneratePayslips(validIds);
  };

  // =====================================================
  // PAYSLIP GENERATION
  // =====================================================

  const handleGeneratePayslips = async (employeeIdsToGenerate = null) => {
    const idsToUse = employeeIdsToGenerate || selectedEmployees;
    
    if (idsToUse.length === 0) {
      enqueueSnackbar('Please select at least one employee', { variant: 'warning' });
      return;
    }
    
    try {
      setOperationLoading(true);
      
      const payload = {
        employeeIds: idsToUse,
        month: filters.month,
        year: filters.year
      };
      
      // Include templateId if selected
      if (filters.templateId) {
        payload.templateId = filters.templateId;
      }
      
      const response = await http.post('/payslips/generate', payload);
      
      if (response.data.success) {
        enqueueSnackbar(
          response.data.message || 'Payslips generated successfully',
          { variant: 'success' }
        );
        setGenerateDialog(false);
        setSelectedEmployees([]);
        setValidationResults(null);
        refetchPayslips();
      } else {
        enqueueSnackbar(response.data.message || 'Generation failed', { variant: 'error' });
      }
    } catch (error) {
      console.error('Generate payslips error:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to generate payslips',
        { variant: 'error' }
      );
    } finally {
      setOperationLoading(false);
    }
  };

  const handleGenerateAll = () => {
    confirm({
      title: 'Generate All Payslips',
      message: 'Generate payslips for ALL active employees? This may take a moment.',
      variant: 'warning',
      confirmText: 'Generate All',
      onConfirm: async () => {
        try {
          setOperationLoading(true);
          const response = await http.post('/payslips/generate-all', {
            month: filters.month,
            year: filters.year,
            departmentId: filters.departmentId || undefined
          });
          if (response.data.success) {
            enqueueSnackbar('Payslips generated for all employees', { variant: 'success' });
            refetchPayslips();
          }
        } catch (error) {
          console.error('Generate all error:', error);
          enqueueSnackbar('Failed to generate payslips', { variant: 'error' });
        } finally {
          setOperationLoading(false);
        }
      }
    });
  };

  const handleFinalizePayslip = async (payslipId) => {
    try {
      setOperationLoading(true);
      const response = await http.put(`/payslips/${payslipId}/finalize`);
      
      if (response.data.success) {
        enqueueSnackbar('Payslip finalized successfully', { variant: 'success' });
        refetchPayslips();
      }
    } catch (error) {
      console.error('Finalize error:', error);
      enqueueSnackbar('Failed to finalize payslip', { variant: 'error' });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleMarkAsPaid = async (payslipId) => {
    try {
      setOperationLoading(true);
      const response = await http.put(`/payslips/${payslipId}/mark-paid`);
      
      if (response.data.success) {
        enqueueSnackbar('Payslip marked as paid', { variant: 'success' });
        refetchPayslips();
      }
    } catch (error) {
      console.error('Mark paid error:', error);
      enqueueSnackbar('Failed to mark as paid', { variant: 'error' });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDownloadPDF = async (payslipId, payslipNumber) => {
    try {
      const response = await http.get(`/payslips/${payslipId}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${payslipNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      enqueueSnackbar('PDF downloaded successfully', { variant: 'success' });
    } catch (error) {
      console.error('Download PDF error:', error);
      enqueueSnackbar('Failed to download PDF', { variant: 'error' });
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await http.get('/payslips/reports/export', {
        params: {
          month: filters.month,
          year: filters.year,
          format: 'xlsx'
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslips-${filters.month}-${filters.year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      enqueueSnackbar('Excel exported successfully', { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar('Failed to export Excel', { variant: 'error' });
    }
  };

  const handleViewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setViewDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',
      finalized: 'info',
      paid: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  // =====================================================
  // BULK OPERATIONS
  // =====================================================

  const handleSelectPayslip = (payslipId, checked) => {
    if (checked) {
      setSelectedPayslipIds([...selectedPayslipIds, payslipId]);
    } else {
      setSelectedPayslipIds(selectedPayslipIds.filter(id => id !== payslipId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPayslipIds(payslips.map(p => p.id));
    } else {
      setSelectedPayslipIds([]);
    }
  };

  const handleBulkFinalize = async () => {
    if (selectedPayslipIds.length === 0) {
      enqueueSnackbar('Please select payslips to finalize', { variant: 'warning' });
      return;
    }

    confirm({
      title: 'Finalize Payslips',
      message: `Finalize ${selectedPayslipIds.length} payslip(s)? This action cannot be undone.`,
      variant: 'warning',
      confirmText: 'Finalize',
      onConfirm: async () => {
        try {
          setOperationLoading(true);
          const response = await http.post('/payslips/bulk-finalize', {
            payslipIds: selectedPayslipIds
          });
          if (response.data.success) {
            enqueueSnackbar(
              `${response.data.successCount} payslip(s) finalized successfully`,
              { variant: 'success' }
            );
            if (response.data.failedCount > 0) {
              enqueueSnackbar(
                `${response.data.failedCount} payslip(s) failed (only drafts can be finalized)`,
                { variant: 'warning' }
              );
            }
            setSelectedPayslipIds([]);
            refetchPayslips();
          }
        } catch (error) {
          console.error('Bulk finalize error:', error);
          enqueueSnackbar(
            error.response?.data?.message || 'Failed to finalize payslips',
            { variant: 'error' }
          );
        } finally {
          setOperationLoading(false);
        }
      }
    });
  };

  const handleBulkMarkPaid = async () => {
    if (selectedPayslipIds.length === 0) {
      enqueueSnackbar('Please select payslips to mark as paid', { variant: 'warning' });
      return;
    }

    confirm({
      title: 'Mark as Paid',
      message: `Mark ${selectedPayslipIds.length} payslip(s) as paid?`,
      variant: 'success',
      confirmText: 'Mark Paid',
      onConfirm: async () => {
        try {
          setOperationLoading(true);
          const response = await http.post('/payslips/bulk-paid', {
            payslipIds: selectedPayslipIds,
            paymentDate: new Date().toISOString(),
            paymentMethod
          });
          if (response.data.success) {
            enqueueSnackbar(
              `${response.data.successCount} payslip(s) marked as paid`,
              { variant: 'success' }
            );
            if (response.data.failedCount > 0) {
              enqueueSnackbar(
                `${response.data.failedCount} payslip(s) failed (only finalized can be marked paid)`,
                { variant: 'warning' }
              );
            }
            setSelectedPayslipIds([]);
            refetchPayslips();
          }
        } catch (error) {
          console.error('Bulk mark paid error:', error);
          enqueueSnackbar(
            error.response?.data?.message || 'Failed to mark payslips as paid',
            { variant: 'error' }
          );
        } finally {
          setOperationLoading(false);
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedPayslipIds.length === 0) {
      enqueueSnackbar('Please select payslips to delete', { variant: 'warning' });
      return;
    }

    confirm({
      title: 'Delete Payslips',
      message: `Delete ${selectedPayslipIds.length} payslip(s)? This action cannot be undone. Only draft payslips will be deleted.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setOperationLoading(true);
          const response = await http.delete('/payslips/bulk', {
            data: { payslipIds: selectedPayslipIds }
          });
          if (response.data.success) {
            enqueueSnackbar(
              `${response.data.successCount} payslip(s) deleted`,
              { variant: 'success' }
            );
            if (response.data.failedCount > 0) {
              enqueueSnackbar(
                `${response.data.failedCount} payslip(s) could not be deleted (only drafts can be deleted)`,
                { variant: 'warning' }
              );
            }
            setSelectedPayslipIds([]);
            refetchPayslips();
          }
        } catch (error) {
          console.error('Error deleting payslips:', error);
          enqueueSnackbar('Failed to delete payslips', { variant: 'error' });
        } finally {
          setOperationLoading(false);
        }
      }
    });
  };

  const handleEditPayslip = (payslip) => {
    if (payslip.status !== 'draft') {
      enqueueSnackbar('Only draft payslips can be edited', { variant: 'warning' });
      return;
    }
    setPayslipToEdit(payslip);
    setEditDialog(true);
  };

  const handleSaveEdit = async (editData) => {
    try {
      setOperationLoading(true);
      const response = await http.put(`/payslips/${editData.payslipId}`, {
        earnings: editData.earnings,
        deductions: editData.deductions,
        reason: editData.reason
      });

      if (response.data.success) {
        enqueueSnackbar('Payslip updated successfully', { variant: 'success' });
        setEditDialog(false);
        setPayslipToEdit(null);
        refetchPayslips();
      }
    } catch (error) {
      console.error('Error updating payslip:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to update payslip',
        { variant: 'error' }
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // =====================================================
  // TAB: OVERVIEW / DASHBOARD
  // =====================================================

  const OverviewTab = () => (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Payslips
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Draft
              </Typography>
              <Typography variant="h4" color="warning.main">{stats.draft}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Finalized
              </Typography>
              <Typography variant="h4" color="info.main">{stats.finalized}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Paid
              </Typography>
              <Typography variant="h4" color="success.main">{stats.paid}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Payout Amount
              </Typography>
              <Typography variant="h4">
                {formatCurrency(stats.totalAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            data-testid="payroll-generate-btn"
            variant="contained"
            startIcon={<GenerateIcon />}
            onClick={() => setGenerateDialog(true)}
          >
            Generate Payslips
          </Button>
          <Button
            data-testid="payroll-export-btn"
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
          <Button
            data-testid="payroll-refresh-btn"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refetchPayslips}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>
      
      {/* Payslips List */}
      <PayslipsTable />
    </Box>
  );

  // =====================================================
  // TAB: GENERATE PAYSLIPS
  // =====================================================

  const GenerateTab = () => (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate Payslips
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Month</InputLabel>
              <Select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                label="Month"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                label="Year"
              >
                {Array.from({ length: 11 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return <MenuItem key={year} value={year}>{year}</MenuItem>;
                })}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Payslip Template (Optional)</InputLabel>
              <Select
                value={filters.templateId}
                onChange={(e) => setFilters({ ...filters, templateId: e.target.value })}
                label="Payslip Template (Optional)"
              >
                <MenuItem value="">
                  <em>Use Default Template</em>
                </MenuItem>
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} {template.isDefault && '(Default)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Select a custom template or leave blank to use the default Indian payslip template
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Select Employees
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedEmployees.length === employees.length && employees.length > 0}
                  indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < employees.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmployees(employees.map(emp => emp.id));
                    } else {
                      setSelectedEmployees([]);
                    }
                  }}
                />
              }
              label="Select All"
            />
            
            <Box sx={{ maxHeight: 400, overflow: 'auto', mt: 2 }}>
              {employees.map((employee) => (
                <FormControlLabel
                  key={employee.id}
                  control={
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees([...selectedEmployees, employee.id]);
                        } else {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                        }
                      }}
                    />
                  }
                  label={`${employee.employeeId} - ${employee.firstName} ${employee.lastName}`}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              data-testid="payroll-validate-generate-btn"
              variant="contained"
              size="large"
              startIcon={<GenerateIcon />}
              onClick={handleValidateAndGenerate}
              disabled={loading || selectedEmployees.length === 0}
              fullWidth
            >
              Validate & Generate {selectedEmployees.length} Payslip(s)
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // =====================================================
  // PAYSLIPS TABLE
  // =====================================================

  const PayslipsTable = ({ statusFilter = null, title = null }) => (
    <Paper>
      {title && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">{title}</Typography>
        </Box>
      )}
      <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          data-testid="payroll-search"
          placeholder="Search employee name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                ðŸ”
              </Box>
            )
          }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Month</InputLabel>
          <Select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            label="Month"
            size="small"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            label="Year"
            size="small"
          >
            {Array.from({ length: 11 }, (_, i) => {
              const year = new Date().getFullYear() - 5 + i;
              return <MenuItem key={year} value={year}>{year}</MenuItem>;
            })}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            label="Status"
            size="small"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="finalized">Finalized</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Department</InputLabel>
          <Select
            value={filters.departmentId}
            onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
            label="Department"
            size="small"
          >
            <MenuItem value="">All Departments</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* Bulk Actions Toolbar */}
      {selectedPayslipIds.length > 0 && (
        <Paper sx={{ p: 2, m: 2, bgcolor: 'primary.light' }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Typography variant="body1" fontWeight="bold">
              {selectedPayslipIds.length} payslip(s) selected
            </Typography>
            <Button
              data-testid="payroll-bulk-finalize-btn"
              variant="contained"
              size="small"
              startIcon={<LockIcon />}
              onClick={handleBulkFinalize}
              disabled={loading}
            >
              Bulk Finalize
            </Button>
            <Button
              data-testid="payroll-bulk-paid-btn"
              variant="contained"
              color="success"
              size="small"
              startIcon={<PaymentIcon />}
              onClick={handleBulkMarkPaid}
              disabled={loading}
            >
              Bulk Mark Paid
            </Button>
            <Button
              data-testid="payroll-bulk-delete-btn"
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
              disabled={loading}
            >
              Bulk Delete
            </Button>
            <Button 
              size="small" 
              onClick={() => setSelectedPayslipIds([])}
            >
              Clear Selection
            </Button>
          </Stack>
        </Paper>
      )}
      
      {loading && <LinearProgress />}
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={payslips.length > 0 && selectedPayslipIds.length === payslips.length}
                  indeterminate={selectedPayslipIds.length > 0 && selectedPayslipIds.length < payslips.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Pay Period</TableCell>
              <TableCell align="right">Gross Earnings</TableCell>
              <TableCell align="right">Deductions</TableCell>
              <TableCell align="right">Net Pay</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No payslips found
                </TableCell>
              </TableRow>
            ) : (
              payslips
                .filter(p => statusFilter ? p.status === statusFilter : true)
                .filter(p => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  const empId = (p.employee?.employeeId || '').toLowerCase();
                  const firstName = (p.employee?.firstName || '').toLowerCase();
                  const lastName = (p.employee?.lastName || '').toLowerCase();
                  const fullName = `${firstName} ${lastName}`;
                  return empId.includes(query) || fullName.includes(query) || 
                         firstName.includes(query) || lastName.includes(query);
                })
                .map((payslip) => (
                <TableRow key={payslip.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedPayslipIds.includes(payslip.id)}
                      onChange={(e) => handleSelectPayslip(payslip.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {payslip.employee?.employeeId}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {payslip.employee?.firstName} {payslip.employee?.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>{payslip.payPeriod}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(parseFloat(payslip.grossEarnings || 0))}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(parseFloat(payslip.totalDeductions || 0))}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(parseFloat(payslip.netPay || 0))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payslip.status}
                      color={getStatusColor(payslip.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton size="small" aria-label="View details" onClick={() => handleViewPayslip(payslip)}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download PDF">
                      <IconButton
                        size="small"
                        aria-label="Download PDF"
                        onClick={() => handleDownloadPDF(payslip.id, payslip.payslipNumber)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {payslip.status === 'draft' && (
                      <Tooltip title="Finalize">
                        <IconButton
                          size="small"
                          aria-label="Finalize payslip"
                          color="primary"
                          onClick={() => handleFinalizePayslip(payslip.id)}
                        >
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {payslip.status === 'draft' && (
                      <Tooltip title="Edit Payslip">
                        <IconButton
                          size="small"
                          aria-label="Edit payslip"
                          color="warning"
                          onClick={() => handleEditPayslip(payslip)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {payslip.status === 'finalized' && (
                      <Tooltip title="Mark as Paid">
                        <IconButton
                          size="small"
                          aria-label="Mark as paid"
                          color="success"
                          onClick={() => handleMarkAsPaid(payslip.id)}
                        >
                          <PaymentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={totalRecords}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );

  // =====================================================
  // VIEW DIALOG
  // =====================================================

  const ViewPayslipDialog = () => (
    <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        Payslip Details - {selectedPayslip?.payslipNumber}
      </DialogTitle>
      <DialogContent dividers>
        {selectedPayslip && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">Employee Information</Typography>
              <Typography variant="body1">
                {selectedPayslip.employeeInfo?.name} ({selectedPayslip.employeeInfo?.employeeId})
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedPayslip.employeeInfo?.designation || 'N/A'} | {selectedPayslip.employeeInfo?.department?.name || selectedPayslip.employeeInfo?.department || 'N/A'}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">Pay Period</Typography>
              <Typography variant="body1">{selectedPayslip.payPeriod}</Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">Status</Typography>
              <Chip label={selectedPayslip.status} color={getStatusColor(selectedPayslip.status)} size="small" />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">Earnings</Typography>
              {Object.entries(selectedPayslip.earnings || {}).map(([key, value]) => (
                <Box key={key} display="flex" justifyContent="space-between">
                  <Typography variant="body2">{formatLabel(key)}</Typography>
                  <Typography variant="body2">â‚¹{parseFloat(value).toFixed(2)}</Typography>
                </Box>
              ))}
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="body1" fontWeight="bold">Gross Earnings</Typography>
                <Typography variant="body1" fontWeight="bold">
                  â‚¹{parseFloat(selectedPayslip.grossEarnings).toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">Deductions</Typography>
              {Object.entries(selectedPayslip.deductions || {}).map(([key, value]) => (
                <Box key={key} display="flex" justifyContent="space-between">
                  <Typography variant="body2">{formatLabel(key)}</Typography>
                  <Typography variant="body2">â‚¹{parseFloat(value).toFixed(2)}</Typography>
                </Box>
              ))}
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="body1" fontWeight="bold">Total Deductions</Typography>
                <Typography variant="body1" fontWeight="bold">
                  â‚¹{parseFloat(selectedPayslip.totalDeductions).toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" color="primary">Net Pay</Typography>
                <Typography variant="h6" color="primary">
                  â‚¹{parseFloat(selectedPayslip.netPay).toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                {selectedPayslip.netPayInWords}
              </Typography>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setViewDialog(false)}>Close</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => {
            handleDownloadPDF(selectedPayslip.id, selectedPayslip.payslipNumber);
            setViewDialog(false);
          }}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );

  const formatLabel = (key) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  };

  // =====================================================
  // VALIDATION DIALOG
  // =====================================================

  const ValidationDialog = () => (
    <Dialog open={validationDialog} onClose={() => setValidationDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        Pre-Generation Validation Results
      </DialogTitle>
      <DialogContent dividers>
        {validationResults && (
          <>
            <Alert 
              severity={validationResults.canProceed ? 'success' : 'error'} 
              sx={{ mb: 3 }}
            >
              <Typography variant="body1" fontWeight="bold">
                {validationResults.message}
              </Typography>
              <Typography variant="body2">
                Success Rate: {validationResults.successRate}%
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              {/* Valid Employees */}
              {validationResults.validEmployees.length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h6" gutterBottom>
                      âœ… Valid Employees ({validationResults.validEmployees.length})
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      These employees are ready for payslip generation
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Employee ID</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Department</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {validationResults.validEmployees.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell>{emp.employeeId}</TableCell>
                                <TableCell>{emp.name}</TableCell>
                                <TableCell>{emp.department?.name || emp.department || 'N/A'}</TableCell>
                                <TableCell>
                                  <Chip label={emp.status} color="success" size="small" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* Invalid Employees */}
              {validationResults.invalidEmployees.length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h6" gutterBottom>
                      âŒ Invalid Employees ({validationResults.invalidEmployees.length})
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      These employees have issues that prevent payslip generation
                    </Typography>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Employee ID</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Issues</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {validationResults.invalidEmployees.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell>{emp.employeeId}</TableCell>
                                <TableCell>{emp.name}</TableCell>
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    {emp.issues.map((issue, idx) => (
                                      <Chip 
                                        key={idx} 
                                        label={issue} 
                                        color="error" 
                                        size="small" 
                                        sx={{ fontSize: '0.75rem' }}
                                      />
                                    ))}
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setValidationDialog(false)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleProceedWithValidEmployees}
          disabled={!validationResults?.canProceed || loading}
          startIcon={<GenerateIcon />}
        >
          Generate {validationResults?.validEmployees.length || 0} Payslip(s)
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Main Render
  if (!isAdmin && !isHR) {
    return (
      <Container>
        <Alert severity="error">Access denied. Admin/HR privileges required.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="payroll-management-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Payroll Management System
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Comprehensive payslip generation, approval, and payment processing
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs data-testid="payroll-tabs" value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="Generate" icon={<GenerateIcon />} iconPosition="start" />
          <Tab label="Process Payments" icon={<PaymentIcon />} iconPosition="start" />
          <Tab label="Reports" icon={<ReportIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && <OverviewTab />}
        {activeTab === 1 && <GenerateTab />}
        {activeTab === 2 && (
          <PayslipsTable 
            statusFilter="finalized" 
            title="Finalized Payslips - Ready for Payment Processing"
          />
        )}
        {activeTab === 3 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Reports & Analytics</Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Comprehensive reporting features coming soon. For now, use the Export Excel button in the Overview tab.
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Department Summary
                    </Typography>
                    <Typography variant="body2">
                      View payroll breakdown by department
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Month-over-Month Variance
                    </Typography>
                    <Typography variant="body2">
                      Compare payroll costs across months
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Statutory Deductions
                    </Typography>
                    <Typography variant="body2">
                      PF, ESI, PT, TDS summary reports
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
      
      <ViewPayslipDialog />
      <ValidationDialog />
      <EditPayslipDialog 
        open={editDialog}
        payslip={payslipToEdit}
        onClose={() => {
          setEditDialog(false);
          setPayslipToEdit(null);
        }}
        onSave={handleSaveEdit}
        loading={loading}
      />
      <ConfirmDialog {...dialogProps} />
    </Container>
  );
};

export default ModernPayrollManagement;
