/**
 * React Query Hooks for Employee Review Management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeReviewService } from '../../services/employeeReview.service';
import { useSnackbar } from 'notistack';

// Query Keys
export const employeeReviewKeys = {
  all: ['employee-reviews'],
  lists: () => [...employeeReviewKeys.all, 'list'],
  list: (filters) => [...employeeReviewKeys.lists(), filters],
  details: () => [...employeeReviewKeys.all, 'detail'],
  detail: (id) => [...employeeReviewKeys.details(), id],
  dashboard: () => [...employeeReviewKeys.all, 'dashboard'],
};

/**
 * Fetch all employee reviews (paginated, filtered)
 */
export const useEmployeeReviews = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: employeeReviewKeys.list(filters),
    queryFn: () => employeeReviewService.getAll(filters),
    ...options,
  });
};

/**
 * Fetch a single employee review
 */
export const useEmployeeReview = (id, options = {}) => {
  return useQuery({
    queryKey: employeeReviewKeys.detail(id),
    queryFn: () => employeeReviewService.getById(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Fetch review dashboard stats
 */
export const useReviewDashboard = (options = {}) => {
  return useQuery({
    queryKey: employeeReviewKeys.dashboard(),
    queryFn: () => employeeReviewService.getDashboardStats(),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Create employee review mutation
 */
export const useCreateEmployeeReview = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => employeeReviewService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.dashboard() });
      enqueueSnackbar('Review created successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || error.message || 'Failed to create review', {
        variant: 'error',
      });
    },
  });
};

/**
 * Update employee review mutation
 */
export const useUpdateEmployeeReview = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => employeeReviewService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.dashboard() });
      enqueueSnackbar('Review updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || error.message || 'Failed to update review', {
        variant: 'error',
      });
    },
  });
};

/**
 * Update review status mutation
 */
export const useUpdateReviewStatus = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => employeeReviewService.updateStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.dashboard() });
      enqueueSnackbar('Review status updated', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || error.message || 'Failed to update status', {
        variant: 'error',
      });
    },
  });
};

/**
 * Delete employee review mutation
 */
export const useDeleteEmployeeReview = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => employeeReviewService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeReviewKeys.dashboard() });
      enqueueSnackbar('Review deleted successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error?.response?.data?.message || error.message || 'Failed to delete review', {
        variant: 'error',
      });
    },
  });
};
