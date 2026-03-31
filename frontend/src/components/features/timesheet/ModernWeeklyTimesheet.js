import React, { useState, useEffect, useCallback } from 'react';
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
  Stack,
  MenuItem,
  FormControl,
  Select,
  LinearProgress,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { useBlocker } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useQuery } from '@tanstack/react-query';
import { timesheetService } from '../../../services/timesheet.service';
import ProjectDataService from '../../../services/ProjectService';
import TaskDataService from '../../../services/TaskService';
import logger from '../../../utils/logger';
import PropTypes from 'prop-types';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

// ---------------------------------------------------------------------------
// Module-level constants & pure helpers (not recreated on every render)
// ---------------------------------------------------------------------------

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const generateTempId = () =>
  `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const isValidUUID = (id) =>
  id &&
  typeof id === 'string' &&
  !id.startsWith('temp_') &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const emptyTask = () => ({
  id: generateTempId(),
  projectId: '',
  taskId: '',
  hours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' },
  notes: '',
});

const STATUS_CONFIG = {
  draft:     { color: 'default', label: 'Draft' },
  submitted: { color: 'warning', label: 'Pending Approval' },
  approved:  { color: 'success', label: 'Approved' },
  rejected:  { color: 'error',   label: 'Rejected' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ModernWeeklyTimesheet
 *
 * Displays the employee weekly time-entry grid.
 * All approval/history UI lives in TimesheetApproval.js and TimesheetHistory.js
 * and is wired together by TimesheetHub.js.
 */
const ModernWeeklyTimesheet = ({ embedded } = {}) => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  // Translates technical backend/network errors into plain-English user messages
  const friendlyError = (error) => {
    const raw =
      error?.response?.data?.message ||
      error?.response?.data?.errors?.[0]?.message ||
      error?.message ||
      '';
    if (/cannot modify a submitted/i.test(raw))
      return 'This timesheet has already been submitted for approval and cannot be edited.';
    if (/cannot modify a approved/i.test(raw))
      return 'This timesheet has already been approved and cannot be changed.';
    if (/cannot modify a rejected/i.test(raw))
      return 'This timesheet has been rejected. Please update your hours and resubmit.';
    if (/at least one day must have hours/i.test(raw))
      return 'Please enter hours for at least one working day.';
    if (/total hours.*does not match/i.test(raw))
      return 'The total hours do not add up correctly. Please review your entries.';
    if (/project not found/i.test(raw))
      return 'One of the selected projects is no longer available. Please refresh and try again.';
    if (/task not found/i.test(raw))
      return 'One of the selected tasks is no longer available. Please refresh and try again.';
    if (/task does not belong/i.test(raw))
      return 'The selected task does not belong to the chosen project. Please re-select.';
    if (/employee not found|employee record/i.test(raw))
      return 'Your employee record could not be found. Please contact HR.';
    if (/network error|failed to fetch|econnrefused/i.test(raw))
      return 'Unable to reach the server. Please check your connection and try again.';
    if (/validation error/i.test(raw))
      return 'One or more entries could not be saved. Please check your data and try again.';
    if (/sequelize|constraint|syntax error/i.test(raw))
      return 'Something went wrong while saving. Please try again, or contact support if this keeps happening.';
    // Return the backend message if it reads like plain English, otherwise a safe fallback
    return raw || 'Something went wrong. Please try again or contact support.';
  };

  // ---- State ----------------------------------------------------------------
  const [currentWeek, setCurrentWeek]         = useState(dayjs().startOf('isoWeek'));
  const [tasks, setTasks]                     = useState([emptyTask()]);
  const [saving, setSaving]                   = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [dataLoading, setDataLoading]         = useState(false);
  const [timesheetStatus, setTimesheetStatus] = useState('draft');
  const [isReadOnly, setIsReadOnly]           = useState(false);
  const [fieldErrors, setFieldErrors]         = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime]       = useState(null);
  // M-01: store rejection comments per week so employee sees why it was rejected
  const [approverComments, setApproverComments] = useState('');

  // M-02: Block navigation when there are unsaved changes (React Router v6 useBlocker)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  // ---- Reference data (React Query) ----------------------------------------

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => ProjectDataService.getAll(),
    select: (response) => {
      if (Array.isArray(response.data))            return response.data;
      if (Array.isArray(response.data?.data))      return response.data.data;
      if (Array.isArray(response.data?.projects))  return response.data.projects;
      return [];
    },
    onError: (error) => {
      logger.error('Error loading projects:', error);
      showError('Unable to load your project list. Please refresh the page.');
    },
  });

  const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => TaskDataService.getAll(),
    select: (response) => {
      if (Array.isArray(response.data))         return response.data;
      if (Array.isArray(response.data?.data))   return response.data.data;
      if (Array.isArray(response.data?.tasks))  return response.data.tasks;
      return [];
    },
    onError: (error) => {
      logger.error('Error loading tasks:', error);
      showError('Unable to load tasks. Please refresh the page.');
    },
  });

  const projects = projectsData || [];
  const allTasks = tasksData   || [];
  const loading  = isLoadingProjects || isLoadingTasks || dataLoading;

  // ---- Data loading --------------------------------------------------------

  // M-03: include user?.employee?.id in dep array so re-fetch occurs if auth refreshes
  const employeeId = user?.employee?.id;

  const loadWeekTimesheet = useCallback(async () => {
    try {
      setDataLoading(true);
      const weekStart = currentWeek.format('YYYY-MM-DD');
      // H-03: getByWeek now returns response.data (normalised in service)
      const responseData = await timesheetService.getByWeek(weekStart, employeeId);

      if (responseData?.data?.length > 0) {
        const weekTimesheets = responseData.data.filter(
          (ts) =>
            dayjs(ts.weekStartDate).format('YYYY-MM-DD') === weekStart &&
            ts.employeeId === employeeId,
        );

        if (weekTimesheets.length > 0) {
          setTasks(
            weekTimesheets.map((ts) => ({
              id:        ts.id,
              projectId: ts.projectId || '',
              taskId:    ts.taskId    || '',
              hours: {
                monday:    ts.mondayHours    || '',
                tuesday:   ts.tuesdayHours   || '',
                wednesday: ts.wednesdayHours || '',
                thursday:  ts.thursdayHours  || '',
                friday:    ts.fridayHours    || '',
                saturday:  ts.saturdayHours  || '',
                sunday:    ts.sundayHours    || '',
              },
              notes: ts.description || '',
            })),
          );
          const status = weekTimesheets[0]?.status?.toLowerCase() || 'draft';
          setTimesheetStatus(status);
          setIsReadOnly(status !== 'draft' && status !== 'rejected');
          // M-01: surface rejection comments so employee sees why it was rejected
          setApproverComments(
            status === 'rejected' ? (weekTimesheets[0]?.approverComments || '') : '',
          );
          setHasUnsavedChanges(false);
          return;
        }
      }
      resetTimesheet();
    } catch (error) {
      logger.error('Error loading timesheet:', error);
      showError('Unable to load your timesheet. Please refresh the page.');
      resetTimesheet();
    } finally {
      setDataLoading(false);
    }
  }, [currentWeek, employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadWeekTimesheet();
  }, [loadWeekTimesheet]);

  const resetTimesheet = () => {
    setTasks([emptyTask()]);
    setTimesheetStatus('draft');
    setIsReadOnly(false);
    setHasUnsavedChanges(false);
    setApproverComments('');
  };

  // ---- Task CRUD ----------------------------------------------------------

  const addTask = () => {
    setTasks((prev) => [...prev, emptyTask()]);
    setHasUnsavedChanges(true);
  };

  const deleteTask = (taskId) => {
    if (tasks.length === 1) {
      showWarning('You need at least one task row. Add more rows before deleting this one.');
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setHasUnsavedChanges(true);
  };

  const updateTask = (taskId, field, value) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        if (field.startsWith('hours.')) {
          const day = field.split('.')[1];
          return { ...task, hours: { ...task.hours, [day]: value } };
        }
        return { ...task, [field]: value };
      }),
    );
    setHasUnsavedChanges(true);
  };

  // ---- Validation ---------------------------------------------------------

  const validateTimesheet = () => {
    const errors = {};
    let isValid = true;

    // H-01: Cross-task daily total validation (sum across all tasks per day must be <= 24)
    const dailyTotals = {};
    DAYS.forEach((day) => {
      dailyTotals[day] = tasks.reduce((sum, t) => sum + (parseFloat(t.hours[day]) || 0), 0);
    });
    const overloadedDays = DAYS.filter((day) => dailyTotals[day] > 24);
    if (overloadedDays.length > 0) {
      overloadedDays.forEach((day) => {
        errors[`daily_${day}`] =
          `${day.charAt(0).toUpperCase() + day.slice(1)}: total ${dailyTotals[day].toFixed(2)}h across all tasks exceeds 24h`;
      });
      isValid = false;
    }

    tasks.forEach((task) => {
      if (!task.projectId) {
        errors[`${task.id}_project`] = 'Project is required';
        isValid = false;
      }
      if (!task.taskId) {
        errors[`${task.id}_task`] = 'Task is required';
        isValid = false;
      }
      const hasHours = Object.values(task.hours).some((h) => h && parseFloat(h) > 0);
      if (!hasHours) {
        errors[`${task.id}_hours`] = 'At least one day must have hours';
        isValid = false;
      }
      Object.entries(task.hours).forEach(([day, value]) => {
        if (value) {
          const hours = parseFloat(value);
          if (isNaN(hours))    { errors[`${task.id}_${day}`] = 'Invalid number';        isValid = false; }
          else if (hours < 0)  { errors[`${task.id}_${day}`] = 'Cannot be negative';    isValid = false; }
          else if (hours > 24) { errors[`${task.id}_${day}`] = 'Cannot exceed 24 hours'; isValid = false; }
        }
      });
    });

    setFieldErrors(errors);
    return isValid;
  };

  // ---- Payload builder ----------------------------------------------------

  const buildPayload = (task, weekStart) => {
    const weekEnd    = currentWeek.add(6, 'day').format('YYYY-MM-DD');
    const employeeId = user?.employee?.id || user?.employeeId || user?.id;
    const mon = parseFloat(task.hours.monday)    || 0;
    const tue = parseFloat(task.hours.tuesday)   || 0;
    const wed = parseFloat(task.hours.wednesday) || 0;
    const thu = parseFloat(task.hours.thursday)  || 0;
    const fri = parseFloat(task.hours.friday)    || 0;
    const sat = parseFloat(task.hours.saturday)  || 0;
    const sun = parseFloat(task.hours.sunday)    || 0;
    const isExisting = isValidUUID(task.id);

    // Base fields sent for both create and update
    const payload = {
      projectId:      task.projectId,
      taskId:         task.taskId,
      mondayHours:    mon,
      tuesdayHours:   tue,
      wednesdayHours: wed,
      thursdayHours:  thu,
      fridayHours:    fri,
      saturdayHours:  sat,
      sundayHours:    sun,
      totalHours:     mon + tue + wed + thu + fri + sat + sun,
      description:    task.notes || '',
    };

    if (isExisting) {
      // Update: include id, omit employeeId/status/week dates (server owns those)
      payload.id = task.id;
    } else {
      // Create: include ownership and week context
      payload.employeeId    = employeeId;
      payload.weekStartDate = weekStart;
      payload.weekEndDate   = weekEnd;
      payload.status        = 'Draft';
    }

    return payload;
  };

  // ---- Save / Submit ------------------------------------------------------

  const saveDraft = async (silent = false) => {
    try {
      setSaving(true);
      if (!validateTimesheet()) {
        showError('Please fix the errors highlighted in the form before saving.');
        return;
      }

      const weekStart  = currentWeek.format('YYYY-MM-DD');
      const allPayloads = tasks.map((t) => buildPayload(t, weekStart));
      const existing   = allPayloads.filter((p) => p.id);
      const newEntries = allPayloads.filter((p) => !p.id);

      if (existing.length > 0) {
        await timesheetService.bulkUpdate(existing);
      }

      if (newEntries.length > 0) {
        try {
          // H-03: createBatch now returns response.data (normalised in service)
          const responseData = await timesheetService.createBatch(newEntries);

          if (responseData?.errors?.length > 0) {
            const failedCount = responseData.errors.length;
            const savedCount  = responseData.data?.length || 0;
            if (!savedCount) {
              // All entries failed — surface a friendly message via the catch block
              throw new Error(responseData.errors[0]?.error || 'Failed to save timesheet entries');
            }
            // Partial failure: some saved, some didn't
            const firstMsg = responseData.errors[0]?.error || '';
            const friendlyMsg = (() => {
              if (/cannot modify a submitted/i.test(firstMsg))
                return `${failedCount} entr${failedCount === 1 ? 'y has' : 'ies have'} already been submitted for approval and cannot be changed.`;
              if (/cannot modify a approved/i.test(firstMsg))
                return `${failedCount} entr${failedCount === 1 ? 'y has' : 'ies have'} already been approved and cannot be changed.`;
              return `${failedCount} entr${failedCount === 1 ? 'y' : 'ies'} could not be saved. Please check your data or contact support.`;
            })();
            showWarning(friendlyMsg);
          }

          // Replace temp IDs with real UUIDs so future saves use PUT
          if (responseData?.data?.length > 0) {
            setTasks((prev) =>
              prev.map((task) => {
                const match = responseData.data.find(
                  (s) => s.projectId === task.projectId && s.taskId === task.taskId,
                );
                return match ? { ...task, id: match.id } : task;
              }),
            );
          }
        } catch (createError) {
          if (
            createError.response?.status === 400 &&
            createError.response?.data?.message?.includes('already exists')
          ) {
            showWarning('Your timesheet for this week already exists. Refreshing to show the latest data…');
            await loadWeekTimesheet();
            return;
          }
          throw createError;
        }
      }

      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      if (!silent) showSuccess('Draft saved. You can keep editing or submit for approval when ready.');
    } catch (error) {
      logger.error('Error saving timesheet:', error);
      showError(friendlyError(error));
    } finally {
      setSaving(false);
    }
  };

  const submitTimesheet = async () => {
    try {
      setSubmitting(true);
      if (!validateTimesheet()) {
        showError(
          'Please complete all required fields: select a project and task, and enter hours for at least one day.',
        );
        return;
      }
      if (tasks.every((t) => !t.projectId || !t.taskId)) {
        showError('Please add at least one task row with a project, task, and hours before submitting.');
        return;
      }

      // Persist any unsaved (temp-ID) entries before submitting
      if (tasks.some((t) => !isValidUUID(t.id))) {
        await saveDraft(true);
      }

      const timesheetIds = tasks.map((t) => t.id).filter(isValidUUID);
      if (timesheetIds.length === 0) {
        showError('Your timesheet entries need to be saved before submitting. Please click Save Draft first.');
        return;
      }

      await timesheetService.bulkSubmit(timesheetIds);
      setTimesheetStatus('submitted');
      setIsReadOnly(true);
      setHasUnsavedChanges(false);
      showSuccess('Timesheet submitted for approval. Your manager will review it shortly.');
      await loadWeekTimesheet();
    } catch (error) {
      logger.error('Error submitting timesheet:', error);
      showError(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Week navigation ----------------------------------------------------

  const maxAllowedWeek = dayjs().startOf('isoWeek').add(1, 'week');
  const isAtMaxWeek    = !currentWeek.isBefore(maxAllowedWeek);

  const goToPreviousWeek = () => setCurrentWeek((prev) => prev.subtract(1, 'week'));
  const goToNextWeek = () => {
    if (isAtMaxWeek) {
      showWarning('You can only enter timesheets up to one week ahead.');
      return;
    }
    setCurrentWeek((prev) => prev.add(1, 'week'));
  };
  const goToCurrentWeek = () => setCurrentWeek(dayjs().startOf('isoWeek'));

  // ---- Calculations -------------------------------------------------------

  const calcDayTotal  = (day)  => tasks.reduce((sum, t) => sum + (parseFloat(t.hours[day]) || 0), 0);
  const calcTaskTotal = (task) => Object.values(task.hours).reduce((s, h) => s + (parseFloat(h) || 0), 0);
  const calcWeekTotal = ()     => tasks.reduce((sum, t) => sum + calcTaskTotal(t), 0);

  // ---- Derived display helpers --------------------------------------------

  const weekDates = DAYS.map((day, idx) => ({
    day,
    shortLabel: day.substring(0, 3).toUpperCase(),
    date: currentWeek.add(idx, 'day'),
  }));

  const statusConfig  = STATUS_CONFIG[timesheetStatus] || STATUS_CONFIG.draft;
  const getTasksForProject = (projectId) =>
    projectId ? allTasks.filter((t) => t.projectId === projectId) : [];

  // ---- Render -------------------------------------------------------------

  return (
    <Box sx={{ p: embedded ? 0 : 3, maxWidth: 1600, mx: 'auto' }}>
      {/* M-02: Unsaved changes navigation guard */}
      {blocker.state === 'blocked' && (
        <Dialog open onClose={() => blocker.reset()}>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogContent>
            You have unsaved timesheet changes. Are you sure you want to leave without saving?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => blocker.reset()} variant="contained">Stay</Button>
            <Button onClick={() => blocker.proceed()} color="warning">Leave without saving</Button>
          </DialogActions>
        </Dialog>
      )}
      {/* Week navigator */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              size="small"
              onClick={goToPreviousWeek}
              disabled={loading}
              data-testid="timesheet-prev-week"
            >
              <PrevIcon />
            </IconButton>

            <Box sx={{ minWidth: 200, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={500}>
                Week {currentWeek.isoWeek()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentWeek.format('MMM DD')} &ndash;{' '}
                {currentWeek.endOf('isoWeek').format('MMM DD, YYYY')}
              </Typography>
            </Box>

            <Tooltip title={isAtMaxWeek ? 'Cannot navigate beyond next week' : 'Next week'}>
              <span>
                <IconButton
                  size="small"
                  onClick={goToNextWeek}
                  disabled={loading || isAtMaxWeek}
                  data-testid="timesheet-next-week"
                >
                  <NextIcon />
                </IconButton>
              </span>
            </Tooltip>

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
              label={statusConfig.label}
              color={statusConfig.color}
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

      {(isReadOnly || timesheetStatus === 'rejected') && (
        <Alert
          severity={timesheetStatus === 'rejected' ? 'error' : 'info'}
          sx={{ mb: 2 }}
        >
          This timesheet is <strong>{timesheetStatus}</strong>.
          {timesheetStatus === 'submitted' && ' It is awaiting approval.'}
          {timesheetStatus === 'approved'  && ' No further changes are allowed.'}
          {approverComments && (
            <Box sx={{ mt: 0.5 }}>
              <strong>Manager comment:</strong> {approverComments}
            </Box>
          )}
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* Entry grid */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
            data-testid="timesheet-entry-table"
          >
            <Table size="medium" sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.25' }}>
                  <TableCell width="200px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Project</TableCell>
                  <TableCell width="200px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Task</TableCell>
                  {weekDates.map(({ day, shortLabel }) => (
                    <TableCell key={day} align="center" width="100px" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      {shortLabel}
                    </TableCell>
                  ))}
                  <TableCell align="center" width="100px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Total</TableCell>
                  <TableCell width="200px" sx={{ fontWeight: 500, color: 'text.secondary' }}>Notes</TableCell>
                  <TableCell width="50px" />
                </TableRow>
              </TableHead>

              <TableBody>
                {tasks.map((task, index) => (
                  <TableRow key={task.id} hover>
                    {/* Project select */}
                    <TableCell>
                      <FormControl fullWidth size="small" error={!!fieldErrors[`${task.id}_project`]}>
                        <Select
                          value={projects.some((p) => p.id === task.projectId) ? task.projectId : ''}
                          onChange={(e) => updateTask(task.id, 'projectId', e.target.value)}
                          disabled={isReadOnly}
                          displayEmpty
                          inputProps={{ 'data-testid': `timesheet-project-select-${index}` }}
                        >
                          <MenuItem value=""><em>Select Project</em></MenuItem>
                          {projects.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* Task select */}
                    <TableCell>
                      <FormControl fullWidth size="small" error={!!fieldErrors[`${task.id}_task`]}>
                        <Select
                          value={
                            getTasksForProject(task.projectId).some((t) => t.id === task.taskId)
                              ? task.taskId
                              : ''
                          }
                          onChange={(e) => updateTask(task.id, 'taskId', e.target.value)}
                          disabled={isReadOnly || !task.projectId}
                          displayEmpty
                          inputProps={{ 'data-testid': `timesheet-task-select-${index}` }}
                        >
                          <MenuItem value=""><em>Select Task</em></MenuItem>
                          {getTasksForProject(task.projectId).map((t) => (
                            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* Hours per day */}
                    {weekDates.map(({ day }) => (
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
                            style: { textAlign: 'center', padding: '10px 8px', fontSize: '14px', width: '60px' },
                          }}
                          sx={{
                            width: '80px',
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1,
                              backgroundColor: isReadOnly ? 'grey.50' : 'white',
                              '& fieldset': { borderColor: 'grey.300', borderWidth: '1px' },
                              '&:hover fieldset': { borderColor: 'primary.main' },
                              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '2px' },
                            },
                            '& .MuiOutlinedInput-input': { padding: '10px 8px' },
                          }}
                        />
                      </TableCell>
                    ))}

                    {/* Row total */}
                    <TableCell align="center">
                      <Typography fontWeight={600} color="primary.main">
                        {calcTaskTotal(task).toFixed(2)}
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

                    {/* Delete row button */}
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

                {/* Daily totals row */}
                <TableRow sx={{ bgcolor: 'primary.50' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 600 }}>Daily Totals</TableCell>
                  {weekDates.map(({ day }) => (
                    <TableCell key={day} align="center" sx={{ fontWeight: 600 }}>
                      {calcDayTotal(day).toFixed(2)}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Typography fontWeight={700} color="primary.main" variant="h6">
                      {calcWeekTotal().toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add task */}
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

          {/* Save / Submit actions */}
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
                  '&:hover': { bgcolor: 'primary.dark', boxShadow: 1 },
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
};

ModernWeeklyTimesheet.propTypes = {
  embedded: PropTypes.bool,
};

export default ModernWeeklyTimesheet;
