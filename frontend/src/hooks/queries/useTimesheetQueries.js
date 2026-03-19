/**
 * React Query Hooks for Timesheet Management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetService } from '../../services';
import { useSnackbar } from 'notistack';

// Query Keys
export const timesheetKeys = {
  all: ['timesheets'],
  lists: () => [...timesheetKeys.all, 'list'],
  list: (filters) => [...timesheetKeys.lists(), filters],
  details: () => [...timesheetKeys.all, 'detail'],
  detail: (id) => [...timesheetKeys.details(), id],
  pendingApprovals: () => [...timesheetKeys.all, 'pending-approvals'],
};

/**
 * Fetch all timesheets
 */
export const useTimesheets = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: timesheetKeys.list(filters),
    queryFn: () => timesheetService.getAll(filters),
    ...options,
  });
};

/**
 * Fetch single timesheet
 */
export const useTimesheet = (id, options = {}) => {
  return useQuery({
    queryKey: timesheetKeys.detail(id),
    queryFn: () => timesheetService.getById(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Fetch pending timesheet approvals
 */
export const usePendingTimesheetApprovals = (options = {}) => {
  return useQuery({
    queryKey: timesheetKeys.pendingApprovals(),
    queryFn: () => timesheetService.getPendingApprovals(),
    ...options,
  });
};

/**
 * Create timesheet mutation
 */
export const useCreateTimesheet = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (timesheetData) => timesheetService.create(timesheetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.lists() });
      enqueueSnackbar('Timesheet created successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to create timesheet', { 
        variant: 'error' 
      });
    },
  });
};

/**
 * Update timesheet mutation
 */
export const useUpdateTimesheet = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => timesheetService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.lists() });
      enqueueSnackbar('Timesheet updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to update timesheet', { 
        variant: 'error' 
      });
    },
  });
};

/**
 * Submit timesheet mutation
 */
export const useSubmitTimesheet = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => timesheetService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.pendingApprovals() });
      enqueueSnackbar('Timesheet submitted for approval', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to submit timesheet', { 
        variant: 'error' 
      });
    },
  });
};

/**
 * Approve timesheet mutation
 */
export const useApproveTimesheet = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, comments }) => timesheetService.approve(id, { comments }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.pendingApprovals() });
      enqueueSnackbar('Timesheet approved', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to approve timesheet', { 
        variant: 'error' 
      });
    },
  });
};

/**
 * Reject timesheet mutation
 */
export const useRejectTimesheet = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, comments }) => timesheetService.updateStatus(id, 'rejected', comments),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.pendingApprovals() });
      enqueueSnackbar('Timesheet rejected', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to reject timesheet', { 
        variant: 'error' 
      });
    },
  });
};
