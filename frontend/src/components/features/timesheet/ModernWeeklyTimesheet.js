import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  MenuItem,
  FormControl,
  Select,
  LinearProgress,
  Tabs,
  Tab,
  Grid,
  Avatar,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Today as TodayIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useQuery } from '@tanstack/react-query';
import { timesheetService } from '../../../services/timesheet.service';
import ProjectDataService from '../../../services/ProjectService';
import TaskDataService from '../../../services/TaskService';
import logger from '../../../utils/logger';
import PropTypes from 'prop-types';

// Enable dayjs plugins
dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

/**
 * Modern Weekly Timesheet Component
 * 
 * A consolidated, modern timesheet component that handles:
 * - Weekly timesheet entry for employees
 * - Submission workflow
 * - Manager/Admin approval interface
 * - Timesheet history view
 * 
 * Features:
 * - Clean, intuitive UI
 * - Real-time validation
 * - Auto-save functionality
 * - Week navigation
 * - Role-based views (Employee, Manager, Admin)
 */
const ModernWeeklyTimesheet = ({ embedded } = {}) => {
  const { user, isAdmin, isHR, isManager } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();


  // Helper function to safely calculate total hours from timesheet object
  const calculateTimesheetTotal = (timesheet) => {
    if (!timesheet) return 0;
    return (
      Number(timesheet.mondayHours || 0) +
      Number(timesheet.tuesdayHours || 0) +
      Number(timesheet.wednesdayHours || 0) +
      Number(timesheet.thursdayHours || 0) +
      Number(timesheet.fridayHours || 0) +
      Number(timesheet.saturdayHours || 0) +
      Number(timesheet.sundayHours || 0)
    );
  };
  
  // Tab management (Employee vs Manager/Admin view)
  const [activeTab, setActiveTab] = useState(0); // 0: My Timesheet, 1: Pending Approvals, 2: History
  
  // Week navigation
  const [currentWeek, setCurrentWeek] = useState(dayjs().startOf('isoWeek'));
  
  // Generate temporary UUID-like ID for frontend state
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Timesheet entries
  const [tasks, setTasks] = useState([
    {
      id: generateTempId(),
      projectId: '',
      taskId: '',
      hours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' },
      notes: ''
    }
  ]);
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  // 🚀 React Query for projects and tasks
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => ProjectDataService.getAll(),
    select: (response) => {
      // Handle multiple response formats
      if (Array.isArray(response.data)) return response.data;
      if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
      if (response.data?.projects && Array.isArray(response.data.projects)) return response.data.projects;
      return [];
    },
    onError: (error) => {
      logger.error('Error loading projects:', error);
      showError('Failed to load projects: ' + (error.response?.data?.message || error.message));
    }
  });
  
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => TaskDataService.getAll(),
    select: (response) => {
      // Handle multiple response formats
      if (Array.isArray(response.data)) return response.data;
      if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
      if (response.data?.tasks && Array.isArray(response.data.tasks)) return response.data.tasks;
      return [];
    },
    onError: (error) => {
      logger.error('Error loading tasks:', error);
      showError('Failed to load tasks: ' + (error.response?.data?.message || error.message));
    }
  });
  
  const projects = projectsData || [];
  const allTasks = tasksData || [];
  const loading = isLoadingProjects || isLoadingTasks || dataLoading;
  
  // Timesheet metadata
  const [timesheetStatus, setTimesheetStatus] = useState('draft');
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // For Manager/Admin: Pending approvals
  const [pendingTimesheets, setPendingTimesheets] = useState([]);
  const [historyTimesheets, setHistoryTimesheets] = useState([]);
  
  // Dialogs
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [selectedTimesheets, setSelectedTimesheets] = useState([]); // For bulk actions
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [viewDialog, setViewDialog] = useState(false);
  
  // Validation
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Auto-save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // ========== DATA LOADING ==========
  
  // Load timesheet for current week
  useEffect(() => {
    if (activeTab === 0) {
      loadWeekTimesheet();
    } else if (activeTab === 1 && (isManager || isAdmin || isHR)) {
      loadPendingApprovals();
    } else if (activeTab === 2) {
      loadHistory();
    }
  }, [currentWeek, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const loadWeekTimesheet = async () => {
    try {
      setDataLoading(true);
      const weekStart = currentWeek.format('YYYY-MM-DD');
      // eslint-disable-next-line no-unused-vars
      const weekEnd = currentWeek.clone().endOf('isoWeek').format('YYYY-MM-DD');
      // eslint-disable-next-line no-unused-vars
      const weekNumber = currentWeek.isoWeek();
      // eslint-disable-next-line no-unused-vars
      const year = currentWeek.year();
      
      // Use getByWeek instead of getByDateRange for more precise filtering
      // Pass employee ID to get timesheets for current user specifically
      const response = await timesheetService.getByWeek(weekStart, user?.employee?.id);
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        // Filter to ensure we only get timesheets for the selected week AND current user
        const weekTimesheets = response.data.data.filter(ts => {
          const tsWeekStart = dayjs(ts.weekStartDate).format('YYYY-MM-DD');
          const matchesWeek = tsWeekStart === weekStart;
          // user.employee.id is the UUID from employees table, ts.employeeId is also UUID
          const matchesEmployee = ts.employeeId === user?.employee?.id;
          return matchesWeek && matchesEmployee;
        });
        
        if (weekTimesheets.length > 0) {
          
          // Transform backend data to UI format
          const transformedTasks = weekTimesheets.map(ts => ({
            id: ts.id,
            projectId: ts.projectId || '',
            taskId: ts.taskId || '',
            hours: {
              monday: ts.mondayHours || '',
              tuesday: ts.tuesdayHours || '',
              wednesday: ts.wednesdayHours || '',
              thursday: ts.thursdayHours || '',
              friday: ts.fridayHours || '',
              saturday: ts.saturdayHours || '',
              sunday: ts.sundayHours || ''
            },
            notes: ts.description || ''
          }));
          
          setTasks(transformedTasks);
          
          // Set status and determine if timesheet is editable
          const firstTimesheetStatus = weekTimesheets[0]?.status?.toLowerCase() || 'draft';
          setTimesheetStatus(firstTimesheetStatus);
          
          // Editable Logic:
          // - Draft: Editable (can modify and submit)
          // - Rejected: Editable (can modify and resubmit) 
          // - Submitted: Read-only (cannot edit, awaiting approval)
          // - Approved: Read-only (cannot edit, finalized)
          const isEditable = firstTimesheetStatus === 'draft' || firstTimesheetStatus === 'rejected';
          setIsReadOnly(!isEditable);

          // Show specific message for submitted/approved timesheets
          if (firstTimesheetStatus === 'submitted') {
            showInfo('This timesheet has been submitted and is pending approval. You cannot make changes.');
          } else if (firstTimesheetStatus === 'approved') {
            showSuccess('This timesheet has been approved. It is now read-only.');
          }
          
        } else {
          // No timesheet for this specific week
          resetTimesheet();
        }
      } else {
        // No timesheet exists, start fresh
        resetTimesheet();
      }
    } catch (error) {
      logger.error('💥 ERROR LOADING TIMESHEET:', error);
      logger.error('   Error details:', error.response?.data || error.message);
      logger.error('   Week being loaded:', currentWeek.format('YYYY-MM-DD'));
      logger.error('   Employee ID:', user?.employee?.id);
      showError('Failed to load timesheet: ' + (error.response?.data?.message || error.message));
      resetTimesheet();
    } finally {
      setDataLoading(false);
    }
  };
  
  const loadPendingApprovals = async () => {
    try {
      setDataLoading(true);
      // Use getPendingApprovals which correctly filters by manager's team via /approval/pending
      const response = await timesheetService.getPendingApprovals();
      
      // Handle response format: response.data.data
      let pendingData = [];
      if (Array.isArray(response.data)) {
        pendingData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        pendingData = response.data.data;
      }
      
      setPendingTimesheets(pendingData);
    } catch (error) {
      logger.error('Error loading pending approvals:', error);
      showError('Failed to load pending timesheets');
    } finally {
      setDataLoading(false);
    }
  };
  
  const loadHistory = async () => {
    try {
      setDataLoading(true);
      const response = await timesheetService.getAll();
      
      // Handle response format: response.data or response.data.data
      let historyData = [];
      if (Array.isArray(response)) {
        historyData = response;
      } else if (Array.isArray(response.data)) {
        historyData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        historyData = response.data.data;
      }
      
      setHistoryTimesheets(historyData);
    } catch (error) {
      logger.error('Error loading history:', error);
      showError('Failed to load timesheet history');
    } finally {
      setDataLoading(false);
    }
  };
  
  const resetTimesheet = () => {
    setTasks([
      {
        id: generateTempId(),
        projectId: '',
        taskId: '',
        hours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' },
        notes: ''
      }
    ]);
    setTimesheetStatus('draft');
    setIsReadOnly(false);
  };

  // ========== TIMESHEET OPERATIONS ==========
  
  const addTask = () => {
    setTasks([
      ...tasks,
      {
        id: generateTempId(),
        projectId: '',
        taskId: '',
        hours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' },
        notes: ''
      }
    ]);
    setHasUnsavedChanges(true);
  };
  
  const deleteTask = (taskId) => {
    if (tasks.length === 1) {
      showWarning('At least one task entry is required');
      return;
    }
    setTasks(tasks.filter(task => task.id !== taskId));
    setHasUnsavedChanges(true);
  };
  
  const updateTask = (taskId, field, value) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        if (field.startsWith('hours.')) {
          const day = field.split('.')[1];
          return {
            ...task,
            hours: { ...task.hours, [day]: value }
          };
        }
        return { ...task, [field]: value };
      }
      return task;
    }));
    setHasUnsavedChanges(true);
  };
  
  const saveDraft = async (silent = false) => {
    try {
      setSaving(true);
      
      // Validate
      if (!validateTimesheet()) {
        showError('Please fix validation errors before saving');
        return;
      }
      
      // Transform to backend format
      const weekStart = currentWeek.format('YYYY-MM-DD');
      const weekEnd = currentWeek.add(6, 'day').format('YYYY-MM-DD'); // Sunday = Monday + 6 days
      const currentEmployeeId = user?.employee?.id || user?.employeeId || user?.id;
      
      const timesheetData = tasks.map(task => {
        // Validate ID format - only accept proper UUIDs, not temporary or numeric IDs
        const isValidUUID = task.id && typeof task.id === 'string' && 
                          !task.id.startsWith('temp_') && 
                          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(task.id);
        
        const mondayHrs = parseFloat(task.hours.monday) || 0;
        const tuesdayHrs = parseFloat(task.hours.tuesday) || 0;
        const wednesdayHrs = parseFloat(task.hours.wednesday) || 0;
        const thursdayHrs = parseFloat(task.hours.thursday) || 0;
        const fridayHrs = parseFloat(task.hours.friday) || 0;
        const saturdayHrs = parseFloat(task.hours.saturday) || 0;
        const sundayHrs = parseFloat(task.hours.sunday) || 0;
        
        return {
          id: isValidUUID ? task.id : undefined, // Include only valid UUID timesheet IDs
          employeeId: currentEmployeeId, // Required by backend validator
          projectId: task.projectId,
          taskId: task.taskId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd, // Required by backend validator (must be Sunday)
          mondayHours: mondayHrs,
          tuesdayHours: tuesdayHrs,
          wednesdayHours: wednesdayHrs,
          thursdayHours: thursdayHrs,
          fridayHours: fridayHrs,
          saturdayHours: saturdayHrs,
          sundayHours: sundayHrs,
          totalHours: mondayHrs + tuesdayHrs + wednesdayHrs + thursdayHrs + fridayHrs + saturdayHrs + sundayHrs,
          description: task.notes || '',
          status: 'Draft' // Backend expects PascalCase
        };
      });
      
      // Check if any timesheets have existing IDs (updates) vs new ones (creates)
      const existingTimesheets = timesheetData.filter(t => t.id);
      const newTimesheets = timesheetData.filter(t => !t.id);
      
      // Handle updates and creates separately to avoid conflicts
      if (existingTimesheets.length > 0) {
        await timesheetService.bulkUpdate(existingTimesheets);
      }
      
      if (newTimesheets.length > 0) {
        try {
          await timesheetService.createBatch(newTimesheets);
        } catch (createError) {
          // If creation fails due to existing records, show helpful message
          if (createError.response?.status === 400 && createError.response?.data?.message?.includes('already exists')) {
            showWarning('Some timesheets already exist for this week. Please refresh and try again.');
            // Reload timesheets to get current state
            loadWeekTimesheet();
            return;
          }
          throw createError;
        }
      }
      
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      if (!silent) showSuccess('Timesheet saved as draft');
    } catch (error) {
      logger.error('Error saving timesheet:', error);
      showError('Failed to save timesheet. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const submitTimesheet = async () => {
    try {
      setSubmitting(true);
      
      // Validate
      if (!validateTimesheet()) {
        showError('Please complete all required fields: select project and task, and enter hours for at least one day');
        return;
      }
      
      // Check if there are any tasks to submit
      if (tasks.length === 0 || tasks.every(task => !task.projectId || !task.taskId)) {
        showError('Please add at least one task with project and task selection before submitting');
        return;
      }
      
      const weekStart = currentWeek.format('YYYY-MM-DD');
      const currentEmployeeId = user?.employee?.id || user?.employeeId || user?.id;

      // Save as draft first (silently — no toast), then submit
      await saveDraft(true);
      
      // Fetch this employee's timesheets for the week (server-side filtered by employeeId for admins too)
      const response = await timesheetService.getByWeek(weekStart, currentEmployeeId);
      const weekTimesheets = response.data?.data || [];
      
      if (weekTimesheets.length === 0) {
        showError('No timesheets found to submit. Please ensure your timesheet is saved first.');
        return;
      }
      
      // Filter only draft or rejected timesheets
      const draftTimesheets = weekTimesheets.filter(ts => {
        const status = ts.status?.toLowerCase();
        return status === 'draft' || status === 'rejected';
      });
      
      if (draftTimesheets.length === 0) {
        showError('No draft or rejected timesheets found to submit. All timesheets may already be submitted.');
        return;
      }
      
      // Use bulk submit to submit all timesheets for the week
      const timesheetIds = draftTimesheets.map(ts => ts.id);
      await timesheetService.bulkSubmit(timesheetIds);
      
      setTimesheetStatus('submitted');
      setIsReadOnly(true);
      setHasUnsavedChanges(false);
      showSuccess(`${draftTimesheets.length} timesheet(s) submitted successfully for approval`);
      
      // Reload to get updated data
      loadWeekTimesheet();
    } catch (error) {
      logger.error('Error submitting timesheet:', error);
      logger.error('Error response:', error.response?.data);
      showError('Failed to submit timesheet: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };
  
  const validateTimesheet = () => {
    const errors = {};
    let isValid = true;
    
    tasks.forEach(task => {
      // Validate project selection
      if (!task.projectId) {
        errors[`${task.id}_project`] = 'Project is required';
        isValid = false;
      }
      
      // Validate task selection
      if (!task.taskId) {
        errors[`${task.id}_task`] = 'Task is required';
        isValid = false;
      }
      
      // Validate at least one day has hours
      const hasHours = Object.values(task.hours).some(h => h && parseFloat(h) > 0);
      if (!hasHours) {
        errors[`${task.id}_hours`] = 'At least one day must have hours';
        isValid = false;
      }
      
      // Validate hour values
      Object.entries(task.hours).forEach(([day, value]) => {
        if (value) {
          const hours = parseFloat(value);
          if (isNaN(hours)) {
            errors[`${task.id}_${day}`] = 'Invalid number';
            isValid = false;
          } else if (hours < 0) {
            errors[`${task.id}_${day}`] = 'Cannot be negative';
            isValid = false;
          } else if (hours > 24) {
            errors[`${task.id}_${day}`] = 'Cannot exceed 24 hours';
            isValid = false;
          }
        }
      });
    });
    
    setFieldErrors(errors);
    return isValid;
  };

  // ========== MANAGER/ADMIN APPROVAL ==========
  
  const handleApprovalClick = (timesheets, action) => {
    // Handle both single timesheet and array of timesheets
    const timesheetList = Array.isArray(timesheets) ? timesheets : [timesheets];
    
    setSelectedTimesheets(timesheetList);
    // For display purposes in dialog, use the first one if available
    setSelectedTimesheet(timesheetList[0]);
    
    setApprovalAction(action);
    setApprovalComments('');
    setApprovalDialog(true);
  };
  
  const processApproval = async () => {
    try {
      if (selectedTimesheets.length === 0) return;
      
      const timesheetIds = selectedTimesheets.map(t => t.id);
      
      if (approvalAction === 'approve') {
        await timesheetService.bulkApprove(timesheetIds, approvalComments);
      } else {
        await timesheetService.bulkReject(timesheetIds, approvalComments);
      }
      
      showSuccess(`Timesheets ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`);
      setApprovalDialog(false);
      loadPendingApprovals(); // Reload pending list
    } catch (error) {
      logger.error('Error processing approval:', error);
      showError('Failed to process approval');
    }
  };
  
  const handleViewTimesheet = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setViewDialog(true);
  };

  // ========== WEEK NAVIGATION ==========
  
  const goToPreviousWeek = () => {
    setCurrentWeek(currentWeek.subtract(1, 'week'));
  };
  
  const goToNextWeek = () => {
    setCurrentWeek(currentWeek.add(1, 'week'));
  };
  
  const goToCurrentWeek = () => {
    setCurrentWeek(dayjs().startOf('isoWeek'));
  };

  // ========== CALCULATIONS ==========
  
  const calculateDayTotal = (day) => {
    return tasks.reduce((sum, task) => {
      const hours = parseFloat(task.hours[day]) || 0;
      return sum + hours;
    }, 0);
  };
  
  const calculateTaskTotal = (task) => {
    return Object.values(task.hours).reduce((sum, hours) => {
      return sum + (parseFloat(hours) || 0);
    }, 0);
  };
  
  const calculateWeekTotal = () => {
    return tasks.reduce((sum, task) => sum + calculateTaskTotal(task), 0);
  };

  // ========== HELPER FUNCTIONS ==========
  
  const getWeekDates = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.map((day, index) => ({
      day,
      label: day.charAt(0).toUpperCase() + day.slice(1),
      date: currentWeek.add(index, 'day'),
      shortLabel: day.substring(0, 3).toUpperCase()
    }));
  };
  
  const getStatusConfig = (status) => {
    const configs = {
      'draft': { color: 'default', label: 'Draft', icon: <SaveIcon fontSize="small" /> },
      'submitted': { color: 'warning', label: 'Pending', icon: <SendIcon fontSize="small" /> },
      'approved': { color: 'success', label: 'Approved', icon: <ApproveIcon fontSize="small" /> },
      'rejected': { color: 'error', label: 'Rejected', icon: <RejectIcon fontSize="small" /> }
    };
    return configs[status?.toLowerCase()] || configs.draft;
  };
  
  const getTasksForProject = (projectId) => {
    if (!projectId || !allTasks) return [];
    return allTasks.filter(task => task.projectId === projectId);
  };

  // ========== RENDER HELPERS ==========
  
  const renderStatusChip = (status) => {
    const config = getStatusConfig(status);
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  // ========== RENDER SECTIONS ==========
  
  // Employee Timesheet Entry Tab
  const renderTimesheetEntry = () => (
    <Box>
      {/* Week Navigation */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small" onClick={goToPreviousWeek} disabled={loading} data-testid="timesheet-prev-week">
              <PrevIcon />
            </IconButton>
            <Box sx={{ minWidth: 200, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={500}>
                Week {currentWeek.isoWeek()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentWeek.format('MMM DD')} - {currentWeek.endOf('isoWeek').format('MMM DD, YYYY')}
              </Typography>
            </Box>
            <IconButton size="small" onClick={goToNextWeek} disabled={loading} data-testid="timesheet-next-week">
              <NextIcon />
            </IconButton>
            <Button
              size="small"
              startIcon={<TodayIcon />}
              onClick={goToCurrentWeek}
              disabled={loading}
              variant="text"
              sx={{ ml: 2 }}
              data-testid="timesheet-today-button"
            >
              Today
            </Button>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={getStatusConfig(timesheetStatus).label}
              color={getStatusConfig(timesheetStatus).color}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            {lastSaveTime && (
              <Typography variant="caption" color="text.secondary">
                Last saved: {dayjs(lastSaveTime).format('HH:mm')}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Status Alert */}
      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This timesheet has been {timesheetStatus}. To make changes, please contact your manager.
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* Timesheet Table */}
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }} data-testid="timesheet-entry-table">
            <Table size="medium" sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.25' }}>
                  <TableCell width="200px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Project</TableCell>
                  <TableCell width="200px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Task</TableCell>
                  {getWeekDates().map(({ day, shortLabel }) => (
                    <TableCell key={day} align="center" width="100px" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      {shortLabel}
                    </TableCell>
                  ))}
                  <TableCell align="center" width="100px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Total</TableCell>
                  <TableCell width="200px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Notes</TableCell>
                  <TableCell width="50px"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task, index) => (
                  <TableRow key={task.id} hover>
                    {/* Project Select */}
                    <TableCell>
                      <FormControl fullWidth size="small" error={!!fieldErrors[`${task.id}_project`]}>
                        <Select
                          value={task.projectId}
                          onChange={(e) => updateTask(task.id, 'projectId', e.target.value)}
                          disabled={isReadOnly}
                          displayEmpty
                          inputProps={{ 'data-testid': `timesheet-project-select-${index}` }}
                        >
                          <MenuItem value="">
                            <em>Select Project</em>
                          </MenuItem>
                          {(projects || []).map((project) => (
                            <MenuItem key={project.id} value={project.id}>
                              {project.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    
                    {/* Task Select */}
                    <TableCell>
                      <FormControl fullWidth size="small" error={!!fieldErrors[`${task.id}_task`]}>
                        <Select
                          value={task.taskId}
                          onChange={(e) => updateTask(task.id, 'taskId', e.target.value)}
                          disabled={isReadOnly || !task.projectId}
                          displayEmpty
                          inputProps={{ 'data-testid': `timesheet-task-select-${index}` }}
                        >
                          <MenuItem value="">
                            <em>Select Task</em>
                          </MenuItem>
                          {getTasksForProject(task.projectId).map((taskItem) => (
                            <MenuItem key={taskItem.id} value={taskItem.id}>
                              {taskItem.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    
                    {/* Hours for each day */}
                    {getWeekDates().map(({ day }) => (
                      <TableCell key={day} align="center" sx={{ px: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={task.hours[day]}
                          onChange={(e) => updateTask(task.id, `hours.${day}`, e.target.value)}
                          disabled={isReadOnly}
                          error={!!fieldErrors[`${task.id}_${day}`]}
                          placeholder="0"
                          id={`timesheet-hours-${index}-${day}`}
                          inputProps={{ 
                            'data-testid': `timesheet-hours-${index}-${day}`,
                            min: 0, 
                            max: 24, 
                            step: 0.25,
                            style: { 
                              textAlign: 'center', 
                              padding: '10px 8px',
                              fontSize: '14px',
                              width: '60px'
                            }
                          }}
                          sx={{ 
                            width: '80px',
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 1,
                              backgroundColor: isReadOnly ? 'grey.50' : 'white',
                              '& fieldset': { 
                                borderColor: 'grey.300',
                                borderWidth: '1px'
                              },
                              '&:hover fieldset': {
                                borderColor: 'primary.main'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: 'primary.main',
                                borderWidth: '2px'
                              }
                            },
                            '& .MuiOutlinedInput-input': {
                              padding: '10px 8px'
                            }
                          }}
                        />
                      </TableCell>
                    ))}
                    
                    {/* Total */}
                    <TableCell align="center">
                      <Typography fontWeight={600} color="primary.main">
                        {calculateTaskTotal(task).toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    {/* Notes */}
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={task.notes}
                        onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
                        disabled={isReadOnly}
                        placeholder="Add notes..."
                        id={`timesheet-notes-${index}`}
                        inputProps={{ 'data-testid': `timesheet-notes-${index}` }}
                      />
                    </TableCell>
                    
                    {/* Delete Button */}
                    <TableCell>
                      {!isReadOnly && tasks.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => deleteTask(task.id)}
                          color="error"
                          data-testid={`timesheet-delete-task-${index}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Totals Row */}
                <TableRow sx={{ bgcolor: 'primary.50' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                    Daily Totals
                  </TableCell>
                  {getWeekDates().map(({ day }) => (
                    <TableCell key={day} align="center" sx={{ fontWeight: 600 }}>
                      {calculateDayTotal(day).toFixed(2)}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Typography fontWeight={700} color="primary.main" variant="h6">
                      {calculateWeekTotal().toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add Task Button */}
          {!isReadOnly && (
            <Button
              startIcon={<AddIcon />}
              onClick={addTask}
              sx={{ mt: 2, color: 'primary.main' }}
              variant="text"
              data-testid="timesheet-add-task"
            >
              Add Task
            </Button>
          )}

          {/* Action Buttons */}
          {!isReadOnly && (
            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button
                variant="text"
                startIcon={<SaveIcon />}
                onClick={saveDraft}
                disabled={saving || submitting || !hasUnsavedChanges}
                sx={{ color: 'text.secondary' }}
                data-testid="timesheet-save-draft"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={submitTimesheet}
                disabled={saving || submitting}
                sx={{ 
                  bgcolor: 'primary.main',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: 'primary.dark', boxShadow: 1 }
                }}
                data-testid="timesheet-submit"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </Stack>
          )}
        </>
      )}
    </Box>
  );

  // Pending Approvals Tab (Manager/Admin)
  const renderPendingApprovals = () => {
    // Group timesheets by employee and week for minimalistic display
    const groupedPendingTimesheets = pendingTimesheets.reduce((groups, timesheet) => {
      const employeeKey = `${timesheet.employeeId}-${timesheet.weekStartDate}`;
      if (!groups[employeeKey]) {
        groups[employeeKey] = {
          employeeId: timesheet.employeeId,
          employee: timesheet.employee,
          weekStartDate: timesheet.weekStartDate,
          weekEndDate: timesheet.weekEndDate,
          timesheets: [],
          totalWeekHours: 0,
          latestSubmitted: timesheet.submittedAt || timesheet.createdAt
        };
      }
      groups[employeeKey].timesheets.push(timesheet);
      groups[employeeKey].totalWeekHours += Number(timesheet.totalHoursWorked || 0);
      
      // Get latest submitted date
      const submissionDate = timesheet.submittedAt || timesheet.createdAt;
      if (submissionDate && (!groups[employeeKey].latestSubmitted || 
          new Date(submissionDate) > new Date(groups[employeeKey].latestSubmitted))) {
        groups[employeeKey].latestSubmitted = submissionDate;
      }
      
      return groups;
    }, {});

    const sortedWeeks = Object.values(groupedPendingTimesheets)
      .sort((a, b) => new Date(b.latestSubmitted) - new Date(a.latestSubmitted));

    // Check if current user can approve timesheets
    const canApprove = isAdmin || isHR || isManager;

    return (
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Pending Approvals
        </Typography>
        
        {loading ? (
          <LinearProgress />
        ) : pendingTimesheets.length === 0 ? (
          <Alert severity="info" sx={{ py: 2 }}>No pending timesheets for approval</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Employee</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Week</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Tasks</TableCell>
                  <TableCell align="center" sx={{ py: 0.5, width: 110 }}>Hours</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Submitted</TableCell>
                  <TableCell align="center" sx={{ py: 0.5, width: 120 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedWeeks.map((weekData) => {
                  // Check if this is the current user's own timesheet (managers can't approve their own)
                  const isOwnTimesheet = weekData.employeeId === user?.employee?.id;
                  const showApprovalActions = canApprove && !isOwnTimesheet;
                  
                  return (
                    <TableRow key={`${weekData.employeeId}-${weekData.weekStartDate}`} hover>
                      <TableCell sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28 }}>
                            {weekData.employee?.firstName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {weekData.employee?.firstName} {weekData.employee?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {weekData.employee?.employeeId}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {dayjs(weekData.weekStartDate).format('MMM DD')} - {dayjs(weekData.weekEndDate).format('MMM DD')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          W{dayjs(weekData.weekStartDate).isoWeek()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Box sx={{ minWidth: 200 }}>
                          {weekData.timesheets.map((timesheet, index) => (
                            <Box key={timesheet.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: index < weekData.timesheets.length - 1 ? 0.5 : 0 }}>
                              <Typography variant="caption" sx={{ flex: 1 }}>
                                {timesheet.project?.name || 'N/A'} — {timesheet.task?.name || 'N/A'}
                              </Typography>
                              <Chip label={`${timesheet.totalHoursWorked || 0}h`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            </Box>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {weekData.totalWeekHours.toFixed(1)}h
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Typography variant="caption">
                          {dayjs(weekData.latestSubmitted).format('MMM DD')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewTimesheet(weekData.timesheets[0])}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {showApprovalActions && (
                            <>
                              <Tooltip title="Approve Week">
                                <IconButton 
                                  size="small" 
                                  color="success"
                                  onClick={() => handleApprovalClick(weekData.timesheets, 'approve')}
                                >
                                  <ApproveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject Week">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleApprovalClick(weekData.timesheets, 'reject')}
                                >
                                  <RejectIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  // History Tab - Show timesheet history grouped by week
  const renderHistory = () => {
    // Group timesheets by week for minimalistic display
    const groupedTimesheets = historyTimesheets.reduce((groups, timesheet) => {
      const weekKey = timesheet.weekStartDate;
      if (!groups[weekKey]) {
        groups[weekKey] = {
          weekStartDate: timesheet.weekStartDate,
          weekEndDate: timesheet.weekEndDate,
          timesheets: [],
          totalWeekHours: 0,
          overallStatus: timesheet.status,
          latestSubmitted: timesheet.submittedAt
        };
      }
      groups[weekKey].timesheets.push(timesheet);
      groups[weekKey].totalWeekHours += Number(timesheet.totalHoursWorked || 0);
      
      // Determine overall status (prioritize: Rejected > Submitted > Approved > Draft)
      const statusPriority = { 'Rejected': 4, 'Submitted': 3, 'Approved': 2, 'Draft': 1 };
      if (statusPriority[timesheet.status] > statusPriority[groups[weekKey].overallStatus]) {
        groups[weekKey].overallStatus = timesheet.status;
      }
      
      // Get latest submitted date
      if (timesheet.submittedAt && (!groups[weekKey].latestSubmitted || 
          new Date(timesheet.submittedAt) > new Date(groups[weekKey].latestSubmitted))) {
        groups[weekKey].latestSubmitted = timesheet.submittedAt;
      }
      
      return groups;
    }, {});

    const sortedWeeks = Object.values(groupedTimesheets)
      .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
      .slice(0, 20); // Show last 20 weeks

    return (
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Timesheet History
        </Typography>

        {loading ? (
          <LinearProgress />
        ) : historyTimesheets.length === 0 ? (
          <Alert severity="info" sx={{ py: 2 }}>No timesheet history found</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Week</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Tasks</TableCell>
                  <TableCell align="center" sx={{ py: 0.5, width: 110 }}>Hours</TableCell>
                  <TableCell align="center" sx={{ py: 0.5, width: 120 }}>Status</TableCell>
                  <TableCell sx={{ py: 0.5 }}>Submitted</TableCell>
                  <TableCell align="center" sx={{ py: 0.5, width: 90 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedWeeks.map((weekData) => (
                  <TableRow key={weekData.weekStartDate} hover>
                    <TableCell sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {dayjs(weekData.weekStartDate).format('MMM DD')} - {dayjs(weekData.weekEndDate).format('MMM DD')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        W{dayjs(weekData.weekStartDate).isoWeek()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Box sx={{ minWidth: 260 }}>
                        {weekData.timesheets.map((timesheet, index) => (
                          <Box key={timesheet.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: index < weekData.timesheets.length - 1 ? 0.5 : 0 }}>
                            <Typography variant="caption" sx={{ flex: 1 }}>
                              {timesheet.project?.name || 'N/A'} — {timesheet.task?.name || 'N/A'}
                            </Typography>
                            <Chip label={`${timesheet.totalHoursWorked || 0}h`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          </Box>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {weekData.totalWeekHours.toFixed(1)}h
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      {renderStatusChip(weekData.overallStatus)}
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        {weekData.latestSubmitted ? dayjs(weekData.latestSubmitted).format('MMM DD') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      <Tooltip title="View Week">
                        <IconButton size="small" onClick={() => { setCurrentWeek(dayjs(weekData.weekStartDate).startOf('isoWeek')); setActiveTab(0); }}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  // ========== MAIN RENDER ==========
  
  return (
    <Box sx={{ p: embedded ? 0 : 3, maxWidth: 1600, mx: 'auto' }}>
      {/* Header */}
      {!embedded && (
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={400} gutterBottom>
            Timesheet
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            if (activeTab === 0) loadWeekTimesheet();
            else if (activeTab === 1) loadPendingApprovals();
            else loadHistory();
          }}
          variant="text"
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          Refresh
        </Button>
      </Stack>
      )}

      {/* Tabs — only show when NOT embedded (Hub provides its own tabs) */}
      {embedded ? (
        <Box sx={{ mb: 3 }}>
          {renderTimesheetEntry()}
        </Box>
      ) : (
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            // Load data for the selected tab
            if (newValue === 0) loadWeekTimesheet();
            else if (newValue === 1) loadPendingApprovals();
            else if (newValue === 2) loadHistory();
          }}
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            mb: 3,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500
            }
          }}
        >
          <Tab label="My Timesheet" />
          {(isManager || isAdmin || isHR) && (
            <Tab label="Pending Approvals" />
          )}
          <Tab label="History" />
        </Tabs>
        
        <Box>
          {activeTab === 0 && renderTimesheetEntry()}
          {activeTab === 1 && (isManager || isAdmin || isHR) && renderPendingApprovals()}
          {activeTab === 2 && renderHistory()}
        </Box>
      </Box>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comments"
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            placeholder="Add optional comments..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            onClick={processApproval}
          >
            {approvalAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Timesheet Details
        </DialogTitle>
        <DialogContent>
          {selectedTimesheet && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Employee</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedTimesheet.employee?.firstName} {selectedTimesheet.employee?.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Week</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {dayjs(selectedTimesheet.weekStartDate).format('MMM DD')} - 
                    {dayjs(selectedTimesheet.weekStartDate).endOf('isoWeek').format('MMM DD, YYYY')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  {renderStatusChip(selectedTimesheet.status)}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {calculateTimesheetTotal(selectedTimesheet).toFixed(2)}h
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Daily Breakdown
              </Typography>
              <Grid container spacing={1}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const dayKey = day.toLowerCase() + 'Hours';
                  return (
                    <Grid item xs={12} sm={6} md={3} key={day}>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{day}</Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {selectedTimesheet[dayKey] || 0}h
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              
              {selectedTimesheet.description && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTimesheet.description}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

ModernWeeklyTimesheet.propTypes = {
  embedded: PropTypes.bool,
};

export default ModernWeeklyTimesheet;
