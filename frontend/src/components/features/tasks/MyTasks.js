/**
 * MyTasks – Employee-facing read-only view of tasks assigned to the logged-in user.
 * Unlike ProjectTaskConfiguration (admin CRUD), this only shows tasks
 * where assignedTo matches the current employee and allows status updates.
 */
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import taskService from '../../../services/TaskService';
import dayjs from 'dayjs';

// eslint-disable-next-line no-unused-vars
const STATUS_COLORS = {
  'Not Started': 'default',
  'In Progress': 'info',
  'Completed': 'success',
  'On Hold': 'warning',
};

const PRIORITY_COLORS = {
  Low: 'success',
  Medium: 'info',
  High: 'warning',
  Critical: 'error',
};

const MyTasks = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const myEmployeeId = user?.employee?.id || user?.employeeId;

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Fetch tasks assigned to the current employee
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-tasks', myEmployeeId],
    queryFn: () => taskService.getAll({ assignedTo: myEmployeeId }),
    enabled: !!myEmployeeId,
    select: (response) => {
      const tasks = response.data?.data || response.data || [];
      return Array.isArray(tasks) ? tasks : [];
    },
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => taskService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      showSuccess('Task status updated');
    },
    onError: (error) => {
      showError(error.response?.data?.message || 'Failed to update task status');
    },
  });

  const tasks = useMemo(() => tasksData || [], [tasksData]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.project?.name?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    return result;
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const pending = tasks.filter((t) => t.status === 'Not Started').length;
    return { total, completed, inProgress, pending };
  }, [tasks]);

  const handleStatusChange = (taskId, newStatus) => {
    statusMutation.mutate({ id: taskId, status: newStatus });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading your tasks...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50' }} data-testid="my-tasks-page">
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 3,
          borderRadius: 0,
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            <TaskIcon />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              My Tasks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and update tasks assigned to you
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ p: 3 }}>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats.total, color: 'primary' },
            { label: 'In Progress', value: stats.inProgress, color: 'info' },
            { label: 'Not Started', value: stats.pending, color: 'warning' },
            { label: 'Completed', value: stats.completed, color: 'success' },
          ].map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={`${stat.color}.main`}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Overall Progress
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {Math.round((stats.completed / stats.total) * 100)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(stats.completed / stats.total) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  data-testid="tasks-search"
                  fullWidth
                  size="small"
                  label="Search tasks"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    data-testid="tasks-status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="Not Started">Not Started</MenuItem>
                    <MenuItem value="In Progress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="On Hold">On Hold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    data-testid="tasks-priority-filter"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    label="Priority"
                  >
                    <MenuItem value="all">All Priorities</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        {filteredTasks.length === 0 ? (
          <Alert severity="info">
            {tasks.length === 0
              ? 'No tasks have been assigned to you yet.'
              : 'No tasks match your current filters.'}
          </Alert>
        ) : (
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Est. Hours</TableCell>
                    <TableCell>Due Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTasks
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((task) => (
                      <TableRow key={task.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {task.name}
                          </Typography>
                          {task.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {task.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {task.project?.name || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={task.priority || 'Medium'}
                            size="small"
                            color={PRIORITY_COLORS[task.priority] || 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 130 }}>
                            <Select
                              value={task.status || 'Not Started'}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              variant="outlined"
                              sx={{ fontSize: '0.875rem' }}
                            >
                              <MenuItem value="Not Started">Not Started</MenuItem>
                              <MenuItem value="In Progress">In Progress</MenuItem>
                              <MenuItem value="Completed">Completed</MenuItem>
                              <MenuItem value="On Hold">On Hold</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          {task.estimatedHours ? `${task.estimatedHours}h` : '-'}
                        </TableCell>
                        <TableCell>
                          {task.dueDate
                            ? dayjs(task.dueDate).format('MMM D, YYYY')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredTasks.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number.parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default MyTasks;
