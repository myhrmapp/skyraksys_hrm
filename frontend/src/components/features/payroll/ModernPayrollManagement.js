/* eslint-disable unicode-bom */
/**
 * Modern Payroll Management System - Admin/HR Interface
 * Workflow-driven payslip generation, approval, and payment processing
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  LinearProgress,
  InputAdornment,
  Avatar,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Assessment as AssessmentIcon,
  Payment as PaymentIcon,
  PlayArrow as GenerateIcon,
  Lock as LockIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ArrowForward as ArrowIcon,
  People as PeopleIcon,
  MonetizationOn as PaidIcon,
  HourglassEmpty as DraftIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../contexts/AuthContext';
import http from '../../../http-common';
import EditPayslipDialog from './EditPayslipDialog';
import ConfirmDialog from '../../common/ConfirmDialog';
import SectionError from '../../shared/SectionError';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { formatCurrency } from '../../../utils/formatCurrency';

// ── Shared constants ───────────────────────────────
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
}));
const YEARS = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

const ModernPayrollManagement = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin, isHR } = useAuth();
  const { dialogProps, confirm } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState(0);
  const [paymentMethod] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);

  // Pagination (payslips table)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Search — payslips table
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchTimerRef = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearchQuery(val), 300);
  };
  // Search/filter — employee picker (Generate tab)
  const [empSearch, setEmpSearch] = useState('');
  const [empDept, setEmpDept] = useState('');
  // Search — employee status tab (reserved for future use)
  // eslint-disable-next-line no-unused-vars
  const [statusSearch, setStatusSearch] = useState('');

  // Navigate to Generate tab (used by Overview quick-start)
  const goToGenerateTab = () => setActiveTab(1);
  
  // Filters state
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    departmentId: '',
    status: '',
    templateId: ''
  });
  
  // 🚀 React Query for payslips
  const { data: payslipsData, isLoading: isLoadingPayslips, isError: isErrorPayslips, refetch: refetchPayslips } = useQuery({
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
  
  // 🚀 React Query for employees
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
  
  // 🚀 React Query for departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await http.get('/departments');
      return response.data;
    },
    onError: (error) => console.error('Load departments error:', error)
  });
  
  // 🚀 React Query for templates
  const { data: templatesData } = useQuery({
    queryKey: ['payslip-templates', 'active'],
    queryFn: async () => {
      const response = await http.get('/payslip-templates/active');
      return response.data;
    },
    onError: (error) => console.error('Load templates error:', error)
  });
  
  // Derived data
  const payslips = useMemo(
    () => payslipsData?.success ? (payslipsData.data?.payslips || []) : [],
    [payslipsData]
  );
  const totalRecords = payslipsData?.data?.pagination?.totalRecords || 0;
  const employees = useMemo(
    () => employeesData?.success ? employeesData.data : [],
    [employeesData]
  );
  const departments = departmentsData?.success ? departmentsData.data : [];
  const templates = templatesData?.success
    ? (Array.isArray(templatesData.data?.templates) ? templatesData.data.templates
      : Array.isArray(templatesData.data) ? templatesData.data
      : [])
    : [];
  const loading = isLoadingPayslips;

  // Current period label
  const periodLabel = `${MONTHS.find(m => m.value === filters.month)?.label} ${filters.year}`;

  // Stats derived from payslips (replaces useState+useEffect pattern)
  const stats = useMemo(() => {
    const s = { total: payslips.length, draft: 0, finalized: 0, paid: 0, totalAmount: 0 };
    payslips.forEach(p => {
      const key = p.status?.toLowerCase();
      if (key && key in s) s[key]++;
      s.totalAmount += parseFloat(p.netPay) || 0;
    });
    return s;
  }, [payslips]);

  // employeeId → payslip map (for Employee Status tab cross-reference)
  const employeePayslipMap = useMemo(() => {
    const map = {};
    payslips.forEach(p => { if (p.employeeId) map[p.employeeId] = p; });
    return map;
  }, [payslips]);

  // Employees filtered by search + department (for Generate tab picker)
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const nameMatch = !empSearch ||
        `${emp.firstName} ${emp.lastName} ${emp.employeeId}`.toLowerCase().includes(empSearch.toLowerCase());
      const deptMatch = !empDept || emp.departmentId === empDept;
      return nameMatch && deptMatch;
    });
  }, [employees, empSearch, empDept]);
  
  // Dialog state
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [overtimeOverrides, setOvertimeOverrides] = useState({});
  const [editDialog, setEditDialog] = useState(false);
  const [payslipToEdit, setPayslipToEdit] = useState(null);
  
  // Validation
  const [validationDialog, setValidationDialog] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  
  // Bulk operations
  const [selectedPayslipIds, setSelectedPayslipIds] = useState([]);

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
        setValidationResults(response.data.data);
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

      // Include overtime overrides for employees that have OT hours set
      const activeOT = {};
      idsToUse.forEach(id => {
        const hrs = parseFloat(overtimeOverrides[id]);
        if (hrs > 0) activeOT[id] = hrs;
      });
      if (Object.keys(activeOT).length > 0) {
        payload.options = { ...payload.options, overtimeOverrides: activeOT };
      }
      
      const response = await http.post('/payslips/generate', payload);
      
      if (response.data.success) {
        enqueueSnackbar(
          response.data.message || 'Payslips generated successfully',
          { variant: 'success' }
        );
        setActiveTab(0); // Return to Overview after generation
        setSelectedEmployees([]);
        setOvertimeOverrides({});
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

  // eslint-disable-next-line no-unused-vars
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
            const successCount = response.data.data?.successful?.length || 0;
            const failedCount = response.data.data?.failed?.length || 0;
            enqueueSnackbar(
              `${successCount} payslip(s) finalized successfully`,
              { variant: 'success' }
            );
            if (failedCount > 0) {
              enqueueSnackbar(
                `${failedCount} payslip(s) failed (only drafts can be finalized)`,
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
            const successCount = response.data.data?.successful?.length || 0;
            const failedCount = response.data.data?.failed?.length || 0;
            enqueueSnackbar(
              `${successCount} payslip(s) marked as paid`,
              { variant: 'success' }
            );
            if (failedCount > 0) {
              enqueueSnackbar(
                `${failedCount} payslip(s) failed (only finalized can be marked paid)`,
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
            const successCount = response.data.data?.successful?.length || 0;
            const failedCount = response.data.data?.failed?.length || 0;
            enqueueSnackbar(
              `${successCount} payslip(s) deleted`,
              { variant: 'success' }
            );
            if (failedCount > 0) {
              enqueueSnackbar(
                `${failedCount} payslip(s) could not be deleted (only drafts can be deleted)`,
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
        attendance: editData.attendance,
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

  // ── Shared period selector ─────────────────────────────
  const PeriodSelector = ({ size = 'small' }) => (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <FormControl size={size} sx={{ minWidth: 130 }}>
        <InputLabel>Month</InputLabel>
        <Select
          value={filters.month}
          onChange={(e) => { setFilters(f => ({ ...f, month: e.target.value })); setPage(0); }}
          label="Month"
        >
          {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size={size} sx={{ minWidth: 90 }}>
        <InputLabel>Year</InputLabel>
        <Select
          value={filters.year}
          onChange={(e) => { setFilters(f => ({ ...f, year: e.target.value })); setPage(0); }}
          label="Year"
        >
          {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
  );

  // ── TAB 0: OVERVIEW ────────────────────────────────────
  // Workflow pipeline + summary stats + quick start
  const OverviewTab = () => {
    const noPayslip = employees.length - payslips.length;
    const stages = [
      {
        label: 'Active Employees',
        count: employees.length,
        color: theme.palette.grey[600],
        bgColor: alpha(theme.palette.grey[500], 0.07),
        icon: <PeopleIcon />,
        action: null,
      },
      {
        label: 'Draft',
        count: stats.draft,
        color: theme.palette.warning.dark,
        bgColor: alpha(theme.palette.warning.main, 0.08),
        icon: <DraftIcon />,
        action: stats.draft > 0
          ? { label: 'View Drafts', onClick: () => { setFilters(f => ({ ...f, status: 'draft' })); setActiveTab(2); } }
          : null,
      },
      {
        label: 'Finalized',
        count: stats.finalized,
        color: theme.palette.info.dark,
        bgColor: alpha(theme.palette.info.main, 0.08),
        icon: <LockIcon />,
        action: stats.finalized > 0
          ? { label: 'Process Payments', onClick: () => setActiveTab(4) }
          : null,
      },
      {
        label: 'Paid',
        count: stats.paid,
        color: theme.palette.success.dark,
        bgColor: alpha(theme.palette.success.main, 0.08),
        icon: <PaidIcon />,
        action: null,
      },
    ];

    return (
      <Box>
        {/* Period selector + actions row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <PeriodSelector />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={handleExportExcel}>
              Export Excel
            </Button>
            <Tooltip title="Refresh">
              <span>
                <IconButton size="small" onClick={refetchPayslips} disabled={loading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Workflow Pipeline */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
            Payroll Workflow — {periodLabel}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'stretch', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: { xs: 1, md: 0 } }}>
            {stages.map((stage, idx) => (
              <React.Fragment key={stage.label}>
                <Box
                  onClick={stage.action?.onClick}
                  sx={{
                    flex: 1,
                    minWidth: { xs: 'calc(50% - 4px)', md: 0 },
                    bgcolor: stage.bgColor,
                    border: `1px solid ${alpha(stage.color, 0.25)}`,
                    borderRadius: 2,
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: stage.action ? 'pointer' : 'default',
                    transition: 'box-shadow 0.15s',
                    ...(stage.action && { '&:hover': { boxShadow: 4 } }),
                  }}
                >
                  <Box sx={{ color: stage.color }}>
                    {React.cloneElement(stage.icon, { sx: { fontSize: 30 } })}
                  </Box>
                  <Typography variant="h3" fontWeight={700} sx={{ color: stage.color, lineHeight: 1.1 }}>
                    {stage.count}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" align="center" fontWeight={500}>
                    {stage.label}
                  </Typography>
                  {stage.action && (
                    <Typography variant="caption" sx={{ color: stage.color, fontWeight: 600 }}>
                      {stage.action.label} →
                    </Typography>
                  )}
                </Box>
                {idx < stages.length - 1 && (
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', px: 0.5 }}>
                    <ArrowIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </Box>
                )}
              </React.Fragment>
            ))}
          </Box>
          {!loading && noPayslip > 0 && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
              action={
                <Button size="small" color="warning" onClick={() => setActiveTab(1)}>
                  Generate Now
                </Button>
              }
            >
              {noPayslip} employee{noPayslip !== 1 ? 's' : ''} have no payslip for {periodLabel}
            </Alert>
          )}
        </Paper>

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="textSecondary">Total Payslips</Typography>
                <Typography variant="h5" fontWeight={600}>{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="textSecondary">Gross Payout</Typography>
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  {formatCurrency(stats.totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="textSecondary">Ready to Pay</Typography>
                <Typography variant="h5" fontWeight={600} color="info.dark">{stats.finalized}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="textSecondary">Completed (Paid)</Typography>
                <Typography variant="h5" fontWeight={600} color="success.dark">{stats.paid}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Button
          data-testid="payroll-generate-btn"
          variant="contained"
          size="large"
          startIcon={<GenerateIcon />}
          onClick={goToGenerateTab}
        >
          Generate Payslips for {periodLabel}
        </Button>
      </Box>
    );
  };

  // ── TAB 1: GENERATE ────────────────────────────────────
  // Step 1: period + template  |  Step 2: select employees  |  Step 3: validate & generate
  const GenerateTab = () => {
    const allFilteredSelected =
      filteredEmployees.length > 0 &&
      filteredEmployees.every(emp => selectedEmployees.includes(emp.id));
    const someFilteredSelected = filteredEmployees.some(emp => selectedEmployees.includes(emp.id));

    const toggleFiltered = (checked) => {
      const ids = filteredEmployees.map(e => e.id);
      setSelectedEmployees(prev =>
        checked ? [...new Set([...prev, ...ids])] : prev.filter(id => !ids.includes(id))
      );
    };

    return (
      <Grid container spacing={3} alignItems="flex-start">
        {/* LEFT — Config panel */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              1 · Pay Period &amp; Template
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <PeriodSelector size="medium" />
              <FormControl fullWidth>
                <InputLabel>Template (Optional)</InputLabel>
                <Select
                  value={filters.templateId}
                  onChange={(e) => setFilters(f => ({ ...f, templateId: e.target.value }))}
                  label="Template (Optional)"
                >
                  <MenuItem value=""><em>Default Template</em></MenuItem>
                  {templates.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}{t.isDefault ? ' (Default)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              2 · Selection Summary
            </Typography>
            <Box sx={{
              p: 2,
              bgcolor: selectedEmployees.length > 0
                ? alpha(theme.palette.primary.main, 0.06)
                : alpha(theme.palette.grey[500], 0.06),
              borderRadius: 2,
              mb: 2,
              textAlign: 'center',
            }}>
              <Typography variant="h3" fontWeight={700} color={selectedEmployees.length > 0 ? 'primary.main' : 'text.disabled'}>
                {selectedEmployees.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                of {employees.length} employees selected
              </Typography>
            </Box>

            <Button
              data-testid="payroll-validate-generate-btn"
              variant="contained"
              size="large"
              fullWidth
              startIcon={operationLoading ? <CircularProgress size={18} color="inherit" /> : <GenerateIcon />}
              onClick={handleValidateAndGenerate}
              disabled={operationLoading || selectedEmployees.length === 0}
            >
              Validate &amp; Generate
            </Button>
            {selectedEmployees.length > 0 && (
              <Button
                size="small"
                color="inherit"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => setSelectedEmployees([])}
              >
                Clear selection
              </Button>
            )}
          </Paper>
        </Grid>

        {/* RIGHT — Employee picker */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {/* Header + search */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                3 · Select Employees
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  size="small"
                  placeholder="Search name or ID..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  sx={{ flex: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: empSearch && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setEmpSearch('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    label="Department"
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    {departments.map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* Select all row */}
            <Box sx={{
              px: 2, py: 1,
              borderBottom: 1, borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={someFilteredSelected && !allFilteredSelected}
                    onChange={(e) => toggleFiltered(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {(empSearch || empDept)
                      ? `Select all filtered (${filteredEmployees.length})`
                      : `Select all (${employees.length})`}
                  </Typography>
                }
              />
              <Typography variant="caption" color="textSecondary">
                {filteredEmployees.length} of {employees.length} shown
              </Typography>
            </Box>

            {/* Employee rows */}
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              {filteredEmployees.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="textSecondary" variant="body2">No employees match the filter</Typography>
                </Box>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployees.includes(emp.id);
                  const payslip = employeePayslipMap[emp.id];
                  return (
                    <Box
                      key={emp.id}
                      onClick={() =>
                        setSelectedEmployees(prev =>
                          isSelected ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                        )
                      }
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 2, py: 1,
                        gap: 1.5,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        cursor: 'pointer',
                        bgcolor: isSelected
                          ? alpha(theme.palette.primary.main, 0.06)
                          : 'transparent',
                        '&:hover': {
                          bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.10)
                            : alpha(theme.palette.action.hover, 0.5),
                        },
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Checkbox checked={isSelected} size="small" readOnly tabIndex={-1} />
                      <Avatar sx={{
                        width: 32, height: 32, fontSize: 13,
                        bgcolor: theme.palette.primary.light,
                        color: theme.palette.primary.contrastText,
                      }}>
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {emp.firstName} {emp.lastName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" noWrap>
                          {emp.employeeId}
                          {emp.department?.name ? ` · ${emp.department.name}` : ''}
                        </Typography>
                      </Box>
                      {isSelected && (
                        <TextField
                          size="small"
                          type="number"
                          placeholder="OT hrs"
                          value={overtimeOverrides[emp.id] || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOvertimeOverrides(prev => ({
                              ...prev,
                              [emp.id]: val === '' ? '' : Math.max(0, parseFloat(val) || 0)
                            }));
                          }}
                          inputProps={{ min: 0, step: 0.5, style: { textAlign: 'center' } }}
                          sx={{ width: 80 }}
                          InputProps={{
                            sx: { fontSize: '0.75rem', height: 30 }
                          }}
                        />
                      )}
                      {payslip && (
                        <Chip
                          label={payslip.status}
                          size="small"
                          color={getStatusColor(payslip.status)}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

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
          onChange={handleSearchChange}
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                🔍
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
        
        {!statusFilter && (
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
        )}
        
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

      {isErrorPayslips ? (
        <SectionError
          message="Failed to load payslips. Please try again."
          onRetry={refetchPayslips}
        />
      ) : (
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
            {(() => {
              const filteredPayslips = payslips
                .filter(p => statusFilter ? p.status === statusFilter : true)
                .filter(p => {
                  if (!debouncedSearchQuery) return true;
                  const query = debouncedSearchQuery.toLowerCase();
                  const empId = (p.employee?.employeeId || '').toLowerCase();
                  const firstName = (p.employee?.firstName || '').toLowerCase();
                  const lastName = (p.employee?.lastName || '').toLowerCase();
                  const fullName = `${firstName} ${lastName}`;
                  return empId.includes(query) || fullName.includes(query) || 
                         firstName.includes(query) || lastName.includes(query);
                });
              if (filteredPayslips.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      {payslips.length === 0 ? 'No payslips found' : `No ${statusFilter || ''} payslips found`.trim()}
                    </TableCell>
                  </TableRow>
                );
              }
              return filteredPayslips.map((payslip) => (
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
              ));
            })()}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {!isErrorPayslips && <TablePagination
        component="div"
        count={totalRecords}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />}
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
                  <Typography variant="body2">₹{parseFloat(value).toFixed(2)}</Typography>
                </Box>
              ))}
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="body1" fontWeight="bold">Gross Earnings</Typography>
                <Typography variant="body1" fontWeight="bold">
                  ₹{parseFloat(selectedPayslip.grossEarnings).toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="textSecondary">Deductions</Typography>
              {Object.entries(selectedPayslip.deductions || {}).map(([key, value]) => (
                <Box key={key} display="flex" justifyContent="space-between">
                  <Typography variant="body2">{formatLabel(key)}</Typography>
                  <Typography variant="body2">₹{parseFloat(value).toFixed(2)}</Typography>
                </Box>
              ))}
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="body1" fontWeight="bold">Total Deductions</Typography>
                <Typography variant="body1" fontWeight="bold">
                  ₹{parseFloat(selectedPayslip.totalDeductions).toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" color="primary">Net Pay</Typography>
                <Typography variant="h6" color="primary">
                  ₹{parseFloat(selectedPayslip.netPay).toFixed(2)}
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
                      ✅ Valid Employees ({validationResults.validEmployees.length})
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
                      ❌ Invalid Employees ({validationResults.invalidEmployees.length})
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
        </Tabs>
      </Paper>
      
      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && <OverviewTab />}
        {activeTab === 1 && <GenerateTab />}
        {activeTab === 2 && (
          <PayslipsTable 
            title="Payslips — Payment Processing"
          />
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
