/**
 * React Query Hooks for Employee Management
 * Provides caching, background updates, and optimistic updates
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../../services';
import { useSnackbar } from 'notistack';

// Query Keys
export const employeeKeys = {
  all: ['employees'],
  lists: () => [...employeeKeys.all, 'list'],
  list: (filters) => [...employeeKeys.lists(), filters],
  details: () => [...employeeKeys.all, 'detail'],
  detail: (id) => [...employeeKeys.details(), id],
};

/**
 * Fetch all employees with optional filters
 */
export const useEmployees = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeeService.getAll(filters),
    ...options,
  });
};

/**
 * Fetch single employee by ID
 */
export const useEmployee = (id, options = {}) => {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.getById(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Create employee mutation
 * Supports both regular create and create with photo
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, photo }) => {
      if (photo) {
        return employeeService.createWithPhoto(data, photo);
      }
      return employeeService.create(data);
    },
    onSuccess: (newEmployee) => {
      // Invalidate employee list queries
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      // Note: Success message handled in component for more detailed feedback
    },
    onError: (error) => {
      // Note: Error handling done in component for custom error formatting
      console.error('Create employee mutation error:', error);
    },
  });
};

/**
 * Update employee mutation
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => employeeService.update(id, data),
    onSuccess: (updatedEmployee, { id }) => {
      // Update cache for specific employee
      queryClient.setQueryData(
        employeeKeys.detail(id),
        updatedEmployee
      );
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      // Note: Success message handled in component for more detailed feedback
    },
    onError: (error) => {
      // Note: Error handling done in component for custom error formatting
      console.error('Update employee mutation error:', error);
    },
  });
};

/**
 * Delete employee mutation
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => employeeService.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: employeeKeys.detail(id) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      enqueueSnackbar('Employee deleted successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.message || 'Failed to delete employee', { 
        variant: 'error' 
      });
    },
  });
};
