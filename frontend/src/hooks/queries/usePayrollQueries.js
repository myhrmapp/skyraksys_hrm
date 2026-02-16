/**
 * React Query Hooks for Payroll Management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '../../services';
import { useSnackbar } from 'notistack';

// Query Keys
export const payrollKeys = {
  all: ['payroll'],
  payslips: () => [...payrollKeys.all, 'payslips'],
  payslipsList: (filters) => [...payrollKeys.payslips(), filters],
  payslipDetail: (id) => [...payrollKeys.payslips(), id],
  runs: () => [...payrollKeys.all, 'runs'],
  runsList: (filters) => [...payrollKeys.runs(), filters],
};

/**
 * Fetch all payslips
 */
export const usePayslips = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: payrollKeys.payslipsList(filters),
    queryFn: () => payrollService.getPayslips(filters),
    ...options,
  });
};

/**
 * Fetch single payslip
 */
export const usePayslip = (id, options = {}) => {
  return useQuery({
    queryKey: payrollKeys.payslipDetail(id),
    queryFn: () => payrollService.getPayslipById(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Fetch payroll runs
 */
export const usePayrollRuns = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: payrollKeys.runsList(filters),
    queryFn: () => payrollService.getPayrollRuns(filters),
    ...options,
  });
};

/**
 * Generate payslips mutation
 */
export const useGeneratePayslips = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (payrollData) => payrollService.generatePayslips(payrollData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.runs() });
      enqueueSnackbar(
        `Generated ${result.count || result.payslips?.length || 0} payslips`, 
        { variant: 'success' }
      );
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to generate payslips', { 
        variant: 'error' 
      });
    },
  });
};

/**
 * Update payslip mutation
 */
export const useUpdatePayslip = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => payrollService.updatePayslip(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslipDetail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips() });
      enqueueSnackbar('Payslip updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to update payslip', { 
        variant: 'error' 
      });
    },
  });
};

/**
 * Approve payslip mutation
 */
export const useApprovePayslip = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => payrollService.approvePayslip(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslipDetail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.payslips() });
      enqueueSnackbar('Payslip approved', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to approve payslip', { 
        variant: 'error' 
      });
    },
  });
};

/**
 * Download payslip mutation
 */
export const useDownloadPayslip = () => {
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => payrollService.downloadPayslip(id),
    onSuccess: () => {
      enqueueSnackbar('Payslip downloaded successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to download payslip', { 
        variant: 'error' 
      });
    },
  });
};
