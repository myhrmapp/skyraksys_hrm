/**
 * React Query Hooks for Leave Management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '../../services';
import { useSnackbar } from 'notistack';

// Query Keys
export const leaveKeys = {
  all: ['leaves'],
  lists: () => [...leaveKeys.all, 'list'],
  list: (filters) => [...leaveKeys.lists(), filters],
  details: () => [...leaveKeys.all, 'detail'],
  detail: (id) => [...leaveKeys.details(), id],
  balances: (employeeId) => [...leaveKeys.all, 'balances', employeeId],
  pendingApprovals: () => [...leaveKeys.all, 'pending-approvals'],
  types: () => [...leaveKeys.all, 'types'],
};

/**
 * Fetch all leave requests
 */
export const useLeaveRequests = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: leaveKeys.list(filters),
    queryFn: () => leaveService.getAll(filters),
    ...options,
  });
};

/**
 * Fetch single leave request
 */
export const useLeaveRequest = (id, options = {}) => {
  return useQuery({
    queryKey: leaveKeys.detail(id),
    queryFn: () => leaveService.getById(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Fetch leave balances for an employee
 */
export const useLeaveBalances = (employeeId, options = {}) => {
  return useQuery({
    queryKey: leaveKeys.balances(employeeId),
    queryFn: () => leaveService.getBalances(employeeId),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Fetch pending leave approvals
 */
export const usePendingLeaveApprovals = (options = {}) => {
  return useQuery({
    queryKey: leaveKeys.pendingApprovals(),
    queryFn: () => leaveService.getPendingApprovals(),
    ...options,
  });
};

/**
 * Fetch leave types from API
 */
export const useLeaveTypes = (options = {}) => {
  return useQuery({
    queryKey: leaveKeys.types(),
    queryFn: () => leaveService.getLeaveTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes - types rarely change
    ...options,
  });
};

/**
 * Create leave request mutation
 * Toasts are handled by the call-site (LeaveRequest.js) to avoid duplicates.
 */
export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leaveData) => leaveService.create(leaveData),
    onSuccess: (newLeave) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: leaveKeys.balances(newLeave.employeeId) 
      });
    },
  });
};

/**
 * Approve leave request mutation
 * Toasts are handled by the call-site (LeaveManagement.js) to avoid duplicates.
 */
export const useApproveLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comments }) => leaveService.approve(id, comments),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leaveKeys.pendingApprovals() });
    },
  });
};

/**
 * Reject leave request mutation
 * Toasts are handled by the call-site (LeaveManagement.js) to avoid duplicates.
 */
export const useRejectLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comments }) => leaveService.reject(id, comments),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leaveKeys.pendingApprovals() });
    },
  });
};

/**
 * Cancel leave request mutation
 */
export const useCancelLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => leaveService.cancel(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.detail(id) });
      if (data?.employeeId) {
        queryClient.invalidateQueries({ queryKey: leaveKeys.balances(data.employeeId) });
      } else {
        queryClient.invalidateQueries({ queryKey: [...leaveKeys.all, 'balances'] });
      }
      queryClient.invalidateQueries({ queryKey: leaveKeys.pendingApprovals() });
      enqueueSnackbar('Leave request cancelled', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to cancel leave request', { 
        variant: 'error' 
      });
    },
  });
};
