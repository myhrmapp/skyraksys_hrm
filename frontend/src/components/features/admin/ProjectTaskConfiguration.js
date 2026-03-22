import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Grid,
  Card,
  CardContent,
  Tooltip,
  ToggleButtonGroup, // ✅ ADD
  ToggleButton, // ✅ ADD
  Stack,
  Divider,
  Avatar,
  useTheme,
  alpha,
  Grow,
  Fade,
  InputAdornment, // ✅ ADD
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  ViewModule as CardViewIcon, // ✅ ADD - Card view icon
  ViewList as TableViewIcon, // ✅ ADD - Table view icon
  CalendarToday as CalendarTodayIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Folder as ProjectIcon, // ✅ ADD
  Close as CloseIcon, // ✅ ADD
  Search as SearchIcon // ✅ ADD
} from '@mui/icons-material';
import ProjectService from '../../../services/ProjectService';
import TaskService from '../../../services/TaskService';
import ConfirmDialog from '../../common/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import ProjectForm from '../../../pages/Projects/ProjectForm';
import TaskForm from '../../../pages/Tasks/TaskForm';

const ProjectTaskConfiguration = () => {
  const theme = useTheme();
  const { dialogProps, confirm } = useConfirmDialog();
  
  useEffect(() => {
    // Component loaded
  }, []);

  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialogs
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [projectStats, setProjectStats] = useState(null);
  
  // ✅ ADD VIEW STATE
  const [projectView, setProjectView] = useState('cards'); // 'cards' or 'table'
  const [taskView, setTaskView] = useState('table'); // 'cards' or 'table'
  const [searchTerm, setSearchTerm] = useState(''); // Search state

  // Pagination state
  const [projectPage, setProjectPage] = useState(0);
  const [projectRowsPerPage, setProjectRowsPerPage] = useState(10);
  const [taskPage, setTaskPage] = useState(0);
  const [taskRowsPerPage, setTaskRowsPerPage] = useState(10);

  // Reset pagination when search changes
  useEffect(() => {
    setProjectPage(0);
    setTaskPage(0);
  }, [searchTerm]);

  useEffect(() => {
    loadProjects();
    loadTasks();
  }, []);

  // Filter logic
  const filteredProjects = projects.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTasks = tasks.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ProjectService.getAll();
      
      // More robust check: accept if success is true OR if data is an array
      if (response.data && (response.data.success || Array.isArray(response.data.data))) {
        setProjects(response.data.data || []);
      } else {
        console.warn('Unexpected response format:', response);
        // Fallback: if response.data is the array itself
        if (Array.isArray(response.data)) {
           setProjects(response.data);
        } else {
           setProjects([]);
           setError('Invalid response format from server');
        }
      }
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      setError(error.response?.data?.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await TaskService.getAll();
      
      if (response.data && (response.data.success || Array.isArray(response.data.data))) {
        setTasks(response.data.data || []);
      } else {
        console.warn('Unexpected response format:', response);
        if (Array.isArray(response.data)) {
           setTasks(response.data);
        } else {
           setTasks([]);
           setError('Invalid response format from server');
        }
      }
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      setError(error.response?.data?.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectDelete = (projectId) => {
    confirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project and all its tasks?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          await ProjectService.delete(projectId);
          setSuccess('Project deleted successfully');
          loadProjects();
          loadTasks();
        } catch (error) {
          console.error('Error deleting project:', error);
          setError(error.response?.data?.message || 'Failed to delete project');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleTaskDelete = (taskId) => {
    confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          await TaskService.delete(taskId);
          setSuccess('Task deleted successfully');
          loadTasks();
        } catch (error) {
          console.error('Error deleting task:', error);
          setError(error.response?.data?.message || 'Failed to delete task');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleViewStats = async (projectId) => {
    try {
      setLoading(true);
      const response = await ProjectService.getStats(projectId);
      setProjectStats(response.data.data);
      setStatsDialogOpen(true);
    } catch (error) {
      console.error('Error loading project stats:', error);
      setError('Failed to load project statistics');
    } finally {
      setLoading(false);
    }
  };

  const openProjectDialog = (project = null) => {
    setSelectedProject(project);
    setProjectDialogOpen(true);
  };

  const openTaskDialog = (task = null) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Planning': 'default',
      'Active': 'primary',
      'On Hold': 'warning',
      'Completed': 'success',
      'Cancelled': 'error',
      'Not Started': 'default',
      'In Progress': 'info'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'success',
      'Medium': 'info',
      'High': 'warning',
      'Critical': 'error'
    };
    return colors[priority] || 'default';
  };

  return (
    <Box sx={{ p: 3 }} data-testid="project-task-config-page">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Project & Task Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Projects" data-testid="ptc-tab-projects" />
          <Tab label="Tasks" data-testid="ptc-tab-tasks" />
        </Tabs>
        <TextField
          size="small"
          placeholder={`Search ${activeTab === 0 ? 'Projects' : 'Tasks'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="ptc-search-input"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
          sx={{ width: 300 }}
        />
      </Paper>

      {/* ======== PROJECTS TAB ======== */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          {/* ✅ HEADER WITH VIEW TOGGLE */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" fontWeight="700">
                Projects ({projects.length})
              </Typography>
              
              {/* View Toggle */}
              <ToggleButtonGroup
                value={projectView}
                exclusive
                onChange={(e, newView) => newView && setProjectView(newView)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 2,
                    py: 0.5,
                    textTransform: 'none',
                    fontWeight: 500
                  }
                }}
              >
                <ToggleButton value="cards">
                  <CardViewIcon sx={{ fontSize: 18, mr: 0.5 }} />
                  Cards
                </ToggleButton>
                <ToggleButton value="table">
                  <TableViewIcon sx={{ fontSize: 18, mr: 0.5 }} />
                  Table
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openProjectDialog()}
              data-testid="ptc-add-project-btn"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.5)}`
                }
              }}
            >
              Add Project
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress size={48} />
            </Box>
          ) : (
            <>
              {/* ✅ CARD VIEW */}
              {projectView === 'cards' && (
                <Grid container spacing={3}>
                  {filteredProjects.map((project, index) => (
                    <Grow in timeout={300 + index * 100} key={project.id}>
                      <Grid item xs={12} md={6} lg={4}>
                        <Card
                          sx={{
                            height: '100%',
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'visible',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '4px',
                              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                              borderRadius: '12px 12px 0 0'
                            },
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.15)}`
                            }
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Stack spacing={2}>
                              {/* Header */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" fontWeight="700" gutterBottom>
                                    {project.name}
                                  </Typography>
                                  <Chip
                                    label={project.status}
                                    size="small"
                                    color={getStatusColor(project.status)}
                                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                  />
                                </Box>
                                <Chip 
                                  label={`${project.tasks?.length || 0} tasks`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              </Box>

                              {/* Description */}
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  minHeight: 40
                                }}
                              >
                                {project.description || 'No description provided'}
                              </Typography>

                              <Divider />

                              {/* Metadata */}
                              <Stack spacing={1}>
                                {project.clientName && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BusinessIcon fontSize="small" color="action" />
                                    <Typography variant="body2">{project.clientName}</Typography>
                                  </Box>
                                )}
                                {project.startDate && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarTodayIcon fontSize="small" color="action" />
                                    <Typography variant="body2">
                                      {new Date(project.startDate).toLocaleDateString()}
                                      {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                                    </Typography>
                                  </Box>
                                )}
                                {project.manager && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PersonIcon fontSize="small" color="action" />
                                    <Typography variant="body2">
                                      {project.manager.firstName} {project.manager.lastName}
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>

                              {/* Actions */}
                              <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                                <Tooltip title="View Statistics">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewStats(project.id)}
                                    sx={{
                                      bgcolor: alpha(theme.palette.info.main, 0.1),
                                      '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2) }
                                    }}
                                  >
                                    <InfoIcon fontSize="small" color="info" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Project">
                                  <IconButton
                                    size="small"
                                    onClick={() => openProjectDialog(project)}
                                    sx={{
                                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                    }}
                                  >
                                    <EditIcon fontSize="small" color="primary" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Project">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleProjectDelete(project.id)}
                                    sx={{
                                      bgcolor: alpha(theme.palette.error.main, 0.1),
                                      '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" color="error" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grow>
                  ))}

                  {projects.length === 0 && (
                    <Grid item xs={12}>
                      <Paper
                        sx={{
                          p: 8,
                          textAlign: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.02),
                          border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                          borderRadius: 3
                        }}
                      >
                        <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" gutterBottom color="text.secondary">
                          No projects yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Get started by creating your first project
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => openProjectDialog()}
                        >
                          Create Project
                        </Button>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              )}

              {/* ✅ TABLE VIEW (Existing) */}
              {projectView === 'table' && (
                <>
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Project Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>End Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Manager</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Tasks</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredProjects
                        .slice(projectPage * projectRowsPerPage, projectPage * projectRowsPerPage + projectRowsPerPage)
                        .map((project) => (
                        <TableRow key={project.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {project.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {project.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{project.clientName || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={project.status}
                              color={getStatusColor(project.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            {project.manager 
                              ? `${project.manager.firstName} ${project.manager.lastName}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={project.tasks?.length || 0}
                              size="small"
                              color={project.tasks?.length > 0 ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Statistics">
                              <IconButton size="small" onClick={() => handleViewStats(project.id)}>
                                <InfoIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Project">
                              <IconButton size="small" onClick={() => openProjectDialog(project)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Project">
                              <IconButton size="small" color="error" onClick={() => handleProjectDelete(project.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {projects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Box sx={{ py: 3 }}>
                              <Typography variant="body1" color="text.secondary" gutterBottom>
                                No projects found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Click "Add Project" to create your first project
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredProjects.length}
                  page={projectPage}
                  onPageChange={(e, newPage) => setProjectPage(newPage)}
                  rowsPerPage={projectRowsPerPage}
                  onRowsPerPageChange={(e) => { setProjectRowsPerPage(parseInt(e.target.value, 10)); setProjectPage(0); }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
                </>
              )}
            </>
          )}
        </Paper>
      )}

      {/* ======== TASKS TAB ======== */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          {/* ✅ HEADER WITH VIEW TOGGLE */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" fontWeight="700">
                Tasks ({tasks.length})
              </Typography>
              
              {/* View Toggle */}
              <ToggleButtonGroup
                value={taskView}
                exclusive
                onChange={(e, newView) => newView && setTaskView(newView)}
                size="small"
              >
                <ToggleButton value="cards">
                  <CardViewIcon sx={{ fontSize: 18, mr: 0.5 }} />
                  Cards
                </ToggleButton>
                <ToggleButton value="table">
                  <TableViewIcon sx={{ fontSize: 18, mr: 0.5 }} />
                  Table
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openTaskDialog()}
              data-testid="ptc-add-task-btn"
              sx={{
                borderRadius: 2,
                px: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
              }}
            >
              Add Task
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* ✅ CARD VIEW FOR TASKS */}
              {taskView === 'cards' && (
                <Grid container spacing={3}>
                  {filteredTasks.map((task, index) => (
                    <Grow in timeout={300 + index * 50} key={task.id}>
                      <Grid item xs={12} md={6} lg={4}>
                        <Card
                          sx={{
                            height: '100%',
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`
                            }
                          }}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Stack spacing={2}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <Typography variant="h6" fontWeight="600" sx={{ flex: 1 }}>
                                  {task.name}
                                </Typography>
                                <Chip
                                  label={task.priority}
                                  size="small"
                                  color={getPriorityColor(task.priority)}
                                  sx={{ ml: 1 }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                  label={task.status}
                                  size="small"
                                  color={getStatusColor(task.status)}
                                />
                                <Chip
                                  label={task.project?.name || 'No Project'}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>

                              {task.assignee ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                                    {task.assignee.firstName?.charAt(0)}
                                  </Avatar>
                                  <Typography variant="body2">
                                    {task.assignee.firstName} {task.assignee.lastName}
                                  </Typography>
                                </Box>
                              ) : (() => {
                                if (task.availableToAll) return <Chip label="Available to All" size="small" color="info" />;
                                return <Typography variant="body2" color="text.secondary">Unassigned</Typography>;
                              })()}

                              {task.estimatedHours && (
                                <Typography variant="caption" color="text.secondary">
                                  Est: {task.estimatedHours}h
                                </Typography>
                              )}

                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Edit Task">
                                  <IconButton
                                    size="small"
                                    onClick={() => openTaskDialog(task)}
                                    sx={{
                                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                    }}
                                  >
                                    <EditIcon fontSize="small" color="primary" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Task">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleTaskDelete(task.id)}
                                    sx={{
                                      bgcolor: alpha(theme.palette.error.main, 0.1),
                                      '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" color="error" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grow>
                  ))}
                  {tasks.length === 0 && (
                    <Grid item xs={12}>
                      <Paper
                        sx={{
                          p: 8,
                          textAlign: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.02),
                          border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                          borderRadius: 3
                        }}
                      >
                        <Typography variant="h6" gutterBottom color="text.secondary">
                          No tasks found
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => openTaskDialog()}
                        >
                          Create Task
                        </Button>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              )}

              {/* ✅ TABLE VIEW FOR TASKS (Existing) */}
              {taskView === 'table' && (
                <>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Task Name</strong></TableCell>
                        <TableCell><strong>Project</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Priority</strong></TableCell>
                        <TableCell><strong>Assigned To</strong></TableCell>
                        <TableCell><strong>Est. Hours</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTasks
                        .slice(taskPage * taskRowsPerPage, taskPage * taskRowsPerPage + taskRowsPerPage)
                        .map((task) => (
                        <TableRow key={task.id} hover>
                          <TableCell>{task.name}</TableCell>
                          <TableCell>{task.project?.name || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={task.status}
                              color={getStatusColor(task.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.priority}
                              color={getPriorityColor(task.priority)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {task.availableToAll ? (
                              <Chip label="All Employees" size="small" color="info" />
                            ) : (() => {
                              if (task.assignee) return `${task.assignee.firstName} ${task.assignee.lastName}`;
                              return '-';
                            })()}
                          </TableCell>
                          <TableCell>{task.estimatedHours || '-'}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit Task">
                              <IconButton
                                size="small"
                                onClick={() => openTaskDialog(task)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Task">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleTaskDelete(task.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {tasks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Box sx={{ py: 3 }}>
                              <Typography variant="body1" color="text.secondary" gutterBottom>
                                No tasks found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Click "Add Task" to create one
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredTasks.length}
                  page={taskPage}
                  onPageChange={(e, newPage) => setTaskPage(newPage)}
                  rowsPerPage={taskRowsPerPage}
                  onRowsPerPageChange={(e) => { setTaskRowsPerPage(parseInt(e.target.value, 10)); setTaskPage(0); }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
                </>
              )}
            </>
          )}
        </Paper>
      )}

      {/* Enhanced Project Dialog */}
      <Dialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.primary.main, 0.15)}`,
            overflow: 'visible',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              borderRadius: '12px 12px 0 0'
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.2)})`
              }}
            >
              <ProjectIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight="700">
              {selectedProject ? 'Edit Project' : 'Create New Project'}
            </Typography>
          </Stack>
          <IconButton
            onClick={() => setProjectDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <ProjectForm
            project={selectedProject || null}
            onSave={() => {
              loadProjects();
              setProjectDialogOpen(false);
              setSelectedProject(null);
            }}
            onCancel={() => {
              setProjectDialogOpen(false);
              setSelectedProject(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <TaskForm
            task={selectedTask || null}
            projectId={null}
            onSave={() => {
              loadTasks();
              setTaskDialogOpen(false);
              setSelectedTask(null);
            }}
            onCancel={() => {
              setTaskDialogOpen(false);
              setSelectedTask(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Project Statistics Dialog */}
      <Dialog
        open={statsDialogOpen}
        onClose={() => setStatsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Project Statistics</DialogTitle>
        <DialogContent>
          {projectStats && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {projectStats.projectName}
              </Typography>
              <Chip
                label={projectStats.projectStatus}
                color={getStatusColor(projectStats.projectStatus)}
                sx={{ mb: 2 }}
              />
              <Typography variant="body1" gutterBottom>
                Total Tasks: {projectStats.totalTasks}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {projectStats.tasksByStatus?.map((stat) => (
                  <Box key={stat.status} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {stat.status}: {stat.count} tasks
                      {stat.totalEstimated > 0 && ` (${stat.totalEstimated}h estimated)`}
                      {stat.totalActual > 0 && ` / ${stat.totalActual}h actual`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
};

export default ProjectTaskConfiguration;
