/**
 * Employee Review Management Page
 * Full CRUD for employee performance reviews with status workflow
 * - Admin/HR: Full access to all reviews
 * - Manager: Create/manage reviews for their reports
 * - Employee: View own reviews, submit self-assessment
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  Container, Paper, Box, Typography, Button, IconButton, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Avatar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, MenuItem, Rating, Alert, CircularProgress, Tabs, Tab, Badge,
  Card, CardContent, LinearProgress, Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Send as SubmitIcon,
  FilterList as FilterIcon,
  Assessment as AssessmentIcon,
  Close as CloseIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useEmployeeReviews,
  useCreateEmployeeReview,
  useUpdateEmployeeReview,
  useUpdateReviewStatus,
  useDeleteEmployeeReview,
  useReviewDashboard,
  useEmployees
} from '../../../hooks/queries';

// Status color mapping
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'default' },
  pending_employee_input: { label: 'Pending Employee Input', color: 'info' },
  pending_approval: { label: 'Pending Approval', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  archived: { label: 'Archived', color: 'secondary' },
};

const REVIEW_TYPES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'performance_improvement', label: 'Performance Improvement' },
];

const RATING_FIELDS = [
  { key: 'overallRating', label: 'Overall Rating' },
  { key: 'technicalSkills', label: 'Technical Skills' },
  { key: 'communication', label: 'Communication' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'punctuality', label: 'Punctuality' },
];

const initialFormState = {
  employeeId: '',
  reviewPeriod: '',
  reviewType: 'quarterly',
  overallRating: null,
  technicalSkills: null,
  communication: null,
  teamwork: null,
  leadership: null,
  punctuality: null,
  achievements: '',
  areasForImprovement: '',
  goals: '',
  reviewerComments: '',
  reviewDate: new Date().toISOString().split('T')[0],
  nextReviewDate: '',
};

const EmployeeReviewManagement = () => {
  const { isAdmin, isHR, isManager, isEmployee } = useAuth();
  const canCreate = isAdmin || isHR || isManager;
  const canDelete = isAdmin || isHR;

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selfAssessDialogOpen, setSelfAssessDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [selectedReview, setSelectedReview] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [selfAssessment, setSelfAssessment] = useState('');
  const [statusAction, setStatusAction] = useState({ status: '', hrApproved: false });

  // Queries
  const filters = useMemo(() => ({
    page: page + 1,
    limit: rowsPerPage,
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { reviewType: typeFilter }),
  }), [page, rowsPerPage, statusFilter, typeFilter]);

  const { data: reviewsData, isLoading, isError, error: queryError } = useEmployeeReviews(filters);
  const { data: dashboardData } = useReviewDashboard();
  const { data: employeesData } = useEmployees({}, { enabled: canCreate });

  // Mutations
  const createMutation = useCreateEmployeeReview();
  const updateMutation = useUpdateEmployeeReview();
  const statusMutation = useUpdateReviewStatus();
  const deleteMutation = useDeleteEmployeeReview();

  const reviews = useMemo(() => reviewsData?.reviews || [], [reviewsData]);
  const totalCount = reviewsData?.totalCount || 0;
  const employees = employeesData?.data || employeesData || [];

  // Filtered reviews (client-side search on top of server-side filters)
  const filteredReviews = useMemo(() => {
    if (!searchTerm) return reviews;
    const term = searchTerm.toLowerCase();
    return reviews.filter((r) => {
      const empName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
      const empId = (r.employee?.employeeId || '').toLowerCase();
      const period = (r.reviewPeriod || '').toLowerCase();
      return empName.includes(term) || empId.includes(term) || period.includes(term);
    });
  }, [reviews, searchTerm]);

  // Handlers
  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCreate = useCallback(() => {
    const { employeeId, reviewPeriod, reviewType, ...rest } = formData;
    if (!employeeId || !reviewPeriod) return;
    
    const payload = { employeeId, reviewPeriod, reviewType };
    // Include rating fields if provided
    RATING_FIELDS.forEach(({ key }) => {
      if (rest[key]) payload[key] = Number.parseFloat(rest[key]);
    });
    ['achievements', 'areasForImprovement', 'goals', 'reviewerComments', 'reviewDate', 'nextReviewDate'].forEach((k) => {
      if (rest[k]) payload[k] = rest[k];
    });

    createMutation.mutate(payload, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setFormData(initialFormState);
      },
    });
  }, [formData, createMutation]);

  const handleUpdate = useCallback(() => {
    if (!selectedReview) return;
    const { employeeId, ...data } = formData;
    // Convert rating strings to numbers
    RATING_FIELDS.forEach(({ key }) => {
      if (data[key]) data[key] = Number.parseFloat(data[key]);
      else delete data[key];
    });
    // Remove empty fields
    Object.keys(data).forEach((k) => {
      if (data[k] === '' || data[k] === null) delete data[k];
    });

    updateMutation.mutate({ id: selectedReview.id, data }, {
      onSuccess: () => {
        setEditDialogOpen(false);
        setSelectedReview(null);
      },
    });
  }, [selectedReview, formData, updateMutation]);

  const handleStatusUpdate = useCallback(() => {
    if (!selectedReview) return;
    statusMutation.mutate({
      id: selectedReview.id,
      data: statusAction,
    }, {
      onSuccess: () => {
        setStatusDialogOpen(false);
        setSelectedReview(null);
        setStatusAction({ status: '', hrApproved: false });
      },
    });
  }, [selectedReview, statusAction, statusMutation]);

  const handleSelfAssessmentSubmit = useCallback(() => {
    if (!selectedReview || !selfAssessment.trim()) return;
    updateMutation.mutate({
      id: selectedReview.id,
      data: { employeeSelfAssessment: selfAssessment },
    }, {
      onSuccess: () => {
        setSelfAssessDialogOpen(false);
        setSelectedReview(null);
        setSelfAssessment('');
      },
    });
  }, [selectedReview, selfAssessment, updateMutation]);

  const handleDelete = useCallback(() => {
    if (!selectedReview) return;
    deleteMutation.mutate(selectedReview.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedReview(null);
      },
    });
  }, [selectedReview, deleteMutation]);

  const openEditDialog = useCallback((review) => {
    setSelectedReview(review);
    setFormData({
      employeeId: review.employeeId,
      reviewPeriod: review.reviewPeriod,
      reviewType: review.reviewType || 'quarterly',
      overallRating: review.overallRating || null,
      technicalSkills: review.technicalSkills || null,
      communication: review.communication || null,
      teamwork: review.teamwork || null,
      leadership: review.leadership || null,
      punctuality: review.punctuality || null,
      achievements: review.achievements || '',
      areasForImprovement: review.areasForImprovement || '',
      goals: review.goals || '',
      reviewerComments: review.reviewerComments || '',
      reviewDate: review.reviewDate ? review.reviewDate.split('T')[0] : '',
      nextReviewDate: review.nextReviewDate ? review.nextReviewDate.split('T')[0] : '',
    });
    setEditDialogOpen(true);
  }, []);

  const openStatusDialog = useCallback((review, status, hrApproved = false) => {
    setSelectedReview(review);
    setStatusAction({ status, hrApproved });
    setStatusDialogOpen(true);
  }, []);

  // Dashboard stats
  const stats = dashboardData || {};
  const statusCounts = useMemo(() => {
    const counts = { draft: 0, pending_employee_input: 0, pending_approval: 0, completed: 0, archived: 0 };
    (stats.reviewsByStatus || []).forEach((s) => {
      counts[s.status] = Number.parseInt(s.count, 10) || 0;
    });
    return counts;
  }, [stats.reviewsByStatus]);

  const avgRatings = stats.averageRatings || {};

  // Render helpers
  const getEmployeeName = (review) => {
    if (!review.employee) return 'N/A';
    return `${review.employee.firstName} ${review.employee.lastName}`;
  };

  const getReviewerName = (review) => {
    if (!review.reviewer) return 'N/A';
    return `${review.reviewer.firstName} ${review.reviewer.lastName}`;
  };

  const formatRating = (val) => {
    if (!val) return '—';
    return Number.parseFloat(val).toFixed(1);
  };

  // ========== RENDER ==========
  return (
    <Container maxWidth="xl" sx={{ py: 3 }} data-testid="reviews-page">
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <AssessmentIcon sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">Employee Reviews</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Performance reviews and assessments
              </Typography>
            </Box>
          </Box>
          {canCreate && (
            <Button
              data-testid="reviews-new-btn"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setFormData(initialFormState); setCreateDialogOpen(true); }}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } }}
            >
              New Review
            </Button>
          )}
        </Box>
      </Paper>

      {/* Dashboard Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Total Reviews</Typography>
              <Typography variant="h4" fontWeight="bold">{stats.totalReviews || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Pending Approval</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {statusCounts.pending_approval}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Completed</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {statusCounts.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Avg Overall Rating</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h4" fontWeight="bold">
                  {formatRating(avgRatings.avgOverallRating)}
                </Typography>
                {avgRatings.avgOverallRating && (
                  <Rating value={Number.parseFloat(avgRatings.avgOverallRating)} precision={0.1} readOnly size="small" />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setPage(0); }} variant="scrollable">
          <Tab label={<Badge badgeContent={totalCount} color="primary" max={999}>All Reviews</Badge>} />
          <Tab label={<Badge badgeContent={statusCounts.draft} color="default">Drafts</Badge>} />
          <Tab label={<Badge badgeContent={statusCounts.pending_approval} color="warning">Pending</Badge>} />
          <Tab label={<Badge badgeContent={statusCounts.completed} color="success">Completed</Badge>} />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              data-testid="reviews-search"
              fullWidth size="small"
              placeholder="Search by employee name, ID, or period..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              data-testid="reviews-status-filter"
              fullWidth size="small" select
              label="Status" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              data-testid="reviews-type-filter"
              fullWidth size="small" select
              label="Type" value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All Types</MenuItem>
              {REVIEW_TYPES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              size="small" startIcon={<FilterIcon />}
              onClick={() => { setStatusFilter(''); setTypeFilter(''); setSearchTerm(''); setPage(0); }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error state */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {queryError?.response?.data?.message || queryError?.message || 'Failed to load reviews'}
        </Alert>
      )}

      {/* Reviews Table */}
      <Paper>
        <TableContainer>
          {isLoading && <LinearProgress />}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Overall Rating</TableCell>
                <TableCell>Reviewer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>HR Approved</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {isLoading ? 'Loading reviews...' : 'No reviews found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => {
                  const statusConf = STATUS_CONFIG[review.status] || STATUS_CONFIG.draft;
                  return (
                    <TableRow key={review.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                            {(review.employee?.firstName?.[0] || '') + (review.employee?.lastName?.[0] || '')}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="500">{getEmployeeName(review)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {review.employee?.employeeId || ''}
                              {review.employee?.position?.title && ` · ${review.employee.position.title}`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{review.reviewPeriod}</TableCell>
                      <TableCell>
                        <Chip
                          label={REVIEW_TYPES.find((t) => t.value === review.reviewType)?.label || review.reviewType}
                          size="small" variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {review.overallRating ? (
                          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                            <Typography variant="body2" fontWeight="bold">
                              {formatRating(review.overallRating)}
                            </Typography>
                            <Rating value={Number.parseFloat(review.overallRating)} precision={0.5} readOnly size="small" />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{getReviewerName(review)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={statusConf.label} color={statusConf.color} size="small" />
                      </TableCell>
                      <TableCell>
                        {review.hrApproved ? (
                          <Chip label="Approved" color="success" size="small" icon={<ApproveIcon />} />
                        ) : (
                          <Chip label="Pending" color="default" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => { setSelectedReview(review); setViewDialogOpen(true); }}
                            aria-label={`View review for ${getEmployeeName(review)}`}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Employee: Self Assessment */}
                        {isEmployee && review.status === 'pending_employee_input' && (
                          <Tooltip title="Submit Self Assessment">
                            <IconButton
                              size="small" color="primary"
                              onClick={() => { setSelectedReview(review); setSelfAssessment(review.employeeSelfAssessment || ''); setSelfAssessDialogOpen(true); }}
                              aria-label={`Submit self assessment for ${review.reviewPeriod}`}
                            >
                              <SubmitIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Manager/Admin/HR: Edit */}
                        {canCreate && review.status !== 'completed' && review.status !== 'archived' && (
                          <Tooltip title="Edit Review">
                            <IconButton
                              size="small" color="primary"
                              onClick={() => openEditDialog(review)}
                              aria-label={`Edit review for ${getEmployeeName(review)}`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Admin/HR: Status management */}
                        {(isAdmin || isHR) && review.status !== 'completed' && (
                          <Tooltip title="Approve (HR)">
                            <IconButton
                              size="small" color="success"
                              onClick={() => openStatusDialog(review, 'completed', true)}
                              aria-label={`HR approve review for ${getEmployeeName(review)}`}
                            >
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Manager: Submit for approval */}
                        {isManager && review.status === 'draft' && (
                          <Tooltip title="Submit for Approval">
                            <IconButton
                              size="small" color="info"
                              onClick={() => openStatusDialog(review, 'pending_approval')}
                              aria-label={`Submit review for ${getEmployeeName(review)} for approval`}
                            >
                              <SubmitIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Admin/HR: Delete */}
                        {canDelete && (
                          <Tooltip title="Delete Review">
                            <IconButton
                              size="small" color="error"
                              onClick={() => { setSelectedReview(review); setDeleteDialogOpen(true); }}
                              aria-label={`Delete review for ${getEmployeeName(review)}`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(Number.parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>

      {/* ======== CREATE DIALOG ======== */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Create New Review
            <IconButton onClick={() => setCreateDialogOpen(false)} size="small" aria-label="Close dialog">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select required
                label="Employee"
                value={formData.employeeId}
                onChange={(e) => handleFormChange('employeeId', e.target.value)}
              >
                <MenuItem value="">Select Employee</MenuItem>
                {(Array.isArray(employees) ? employees : []).map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth required
                label="Review Period"
                placeholder="e.g., Q1 2025, Annual 2025"
                value={formData.reviewPeriod}
                onChange={(e) => handleFormChange('reviewPeriod', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select
                label="Review Type"
                value={formData.reviewType}
                onChange={(e) => handleFormChange('reviewType', e.target.value)}
              >
                {REVIEW_TYPES.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth type="date" label="Review Date"
                value={formData.reviewDate}
                onChange={(e) => handleFormChange('reviewDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth type="date" label="Next Review Date"
                value={formData.nextReviewDate}
                onChange={(e) => handleFormChange('nextReviewDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Ratings (1-5)
              </Typography>
            </Grid>
            {RATING_FIELDS.map(({ key, label }) => (
              <Grid item xs={12} sm={4} key={key}>
                <Box>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Rating
                    value={formData[key] ? Number.parseFloat(formData[key]) : 0}
                    onChange={(_, newVal) => handleFormChange(key, newVal)}
                    precision={0.5} size="large"
                  />
                </Box>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3}
                label="Achievements"
                value={formData.achievements}
                onChange={(e) => handleFormChange('achievements', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3}
                label="Areas for Improvement"
                value={formData.areasForImprovement}
                onChange={(e) => handleFormChange('areasForImprovement', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3}
                label="Goals"
                value={formData.goals}
                onChange={(e) => handleFormChange('goals', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3}
                label="Reviewer Comments"
                value={formData.reviewerComments}
                onChange={(e) => handleFormChange('reviewerComments', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            data-testid="reviews-create-submit-btn"
            variant="contained" onClick={handleCreate}
            disabled={!formData.employeeId || !formData.reviewPeriod || createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Review'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======== VIEW DIALOG ======== */}
      <Dialog open={viewDialogOpen} onClose={() => { setViewDialogOpen(false); setSelectedReview(null); }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Review Details
            <IconButton onClick={() => { setViewDialogOpen(false); setSelectedReview(null); }} size="small" aria-label="Close dialog">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        {selectedReview && (
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Employee</Typography>
                <Typography variant="body1" fontWeight="500">{getEmployeeName(selectedReview)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedReview.employee?.employeeId}
                  {selectedReview.employee?.position?.title && ` · ${selectedReview.employee.position.title}`}
                  {selectedReview.employee?.department?.name && ` · ${selectedReview.employee.department.name}`}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Reviewer</Typography>
                <Typography variant="body1">{getReviewerName(selectedReview)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Period</Typography>
                <Typography variant="body1">{selectedReview.reviewPeriod}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Type</Typography>
                <Chip
                  label={REVIEW_TYPES.find((t) => t.value === selectedReview.reviewType)?.label || selectedReview.reviewType}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label={STATUS_CONFIG[selectedReview.status]?.label || selectedReview.status}
                  color={STATUS_CONFIG[selectedReview.status]?.color || 'default'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">HR Approved</Typography>
                <Typography variant="body1">{selectedReview.hrApproved ? 'Yes' : 'No'}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Ratings</Typography>
              </Grid>
              {RATING_FIELDS.map(({ key, label }) => (
                <Grid item xs={6} sm={4} key={key}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="body1" fontWeight="500">{formatRating(selectedReview[key])}</Typography>
                    {selectedReview[key] && <Rating value={Number.parseFloat(selectedReview[key])} precision={0.5} readOnly size="small" />}
                  </Box>
                </Grid>
              ))}

              {selectedReview.achievements && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">Achievements</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedReview.achievements}</Typography>
                </Grid>
              )}
              {selectedReview.areasForImprovement && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Areas for Improvement</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedReview.areasForImprovement}</Typography>
                </Grid>
              )}
              {selectedReview.goals && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Goals</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedReview.goals}</Typography>
                </Grid>
              )}
              {selectedReview.reviewerComments && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Reviewer Comments</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedReview.reviewerComments}</Typography>
                </Grid>
              )}
              {selectedReview.employeeSelfAssessment && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">Employee Self Assessment</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedReview.employeeSelfAssessment}</Typography>
                </Grid>
              )}

              {selectedReview.reviewDate && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Review Date</Typography>
                  <Typography variant="body1">{new Date(selectedReview.reviewDate).toLocaleDateString()}</Typography>
                </Grid>
              )}
              {selectedReview.nextReviewDate && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Next Review Date</Typography>
                  <Typography variant="body1">{new Date(selectedReview.nextReviewDate).toLocaleDateString()}</Typography>
                </Grid>
              )}
            </Grid>
          </DialogContent>
        )}
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setViewDialogOpen(false); setSelectedReview(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ======== EDIT DIALOG ======== */}
      <Dialog open={editDialogOpen} onClose={() => { setEditDialogOpen(false); setSelectedReview(null); }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Edit Review — {selectedReview && getEmployeeName(selectedReview)}
            <IconButton onClick={() => { setEditDialogOpen(false); setSelectedReview(null); }} size="small" aria-label="Close dialog">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Review Period"
                value={formData.reviewPeriod}
                onChange={(e) => handleFormChange('reviewPeriod', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select label="Review Type"
                value={formData.reviewType}
                onChange={(e) => handleFormChange('reviewType', e.target.value)}
              >
                {REVIEW_TYPES.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth type="date" label="Review Date"
                value={formData.reviewDate}
                onChange={(e) => handleFormChange('reviewDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth type="date" label="Next Review Date"
                value={formData.nextReviewDate}
                onChange={(e) => handleFormChange('nextReviewDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Ratings (1-5)</Typography>
            </Grid>
            {RATING_FIELDS.map(({ key, label }) => (
              <Grid item xs={12} sm={4} key={key}>
                <Box>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Rating
                    value={formData[key] ? Number.parseFloat(formData[key]) : 0}
                    onChange={(_, newVal) => handleFormChange(key, newVal)}
                    precision={0.5} size="large"
                  />
                </Box>
              </Grid>
            ))}

            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3} label="Achievements"
                value={formData.achievements}
                onChange={(e) => handleFormChange('achievements', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3} label="Areas for Improvement"
                value={formData.areasForImprovement}
                onChange={(e) => handleFormChange('areasForImprovement', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3} label="Goals"
                value={formData.goals}
                onChange={(e) => handleFormChange('goals', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3} label="Reviewer Comments"
                value={formData.reviewerComments}
                onChange={(e) => handleFormChange('reviewerComments', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setEditDialogOpen(false); setSelectedReview(null); }}>Cancel</Button>
          <Button
            data-testid="reviews-edit-save-btn"
            variant="contained" onClick={handleUpdate}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======== SELF ASSESSMENT DIALOG (Employee) ======== */}
      <Dialog open={selfAssessDialogOpen} onClose={() => { setSelfAssessDialogOpen(false); setSelectedReview(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Self Assessment</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Review Period: {selectedReview.reviewPeriod}
              </Typography>
              <TextField
                fullWidth multiline rows={6}
                label="Your Self Assessment"
                placeholder="Describe your achievements, challenges, and goals..."
                value={selfAssessment}
                onChange={(e) => setSelfAssessment(e.target.value)}
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setSelfAssessDialogOpen(false); setSelectedReview(null); }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSelfAssessmentSubmit}
            disabled={!selfAssessment.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? <CircularProgress size={20} /> : 'Submit Assessment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======== STATUS UPDATE DIALOG ======== */}
      <Dialog open={statusDialogOpen} onClose={() => { setStatusDialogOpen(false); setSelectedReview(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          {statusAction.hrApproved ? 'HR Approve Review' : 'Update Review Status'}
        </DialogTitle>
        <DialogContent>
          {(() => {
            const empName = selectedReview ? getEmployeeName(selectedReview) : '';
            return (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {statusAction.hrApproved
                  ? `Are you sure you want to approve the review for ${empName}? This will mark the review as completed.`
                  : `Change status to "${STATUS_CONFIG[statusAction.status]?.label || statusAction.status}" for ${empName}?`
                }
              </Typography>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setStatusDialogOpen(false); setSelectedReview(null); }}>Cancel</Button>
          <Button
            variant="contained"
            color={statusAction.hrApproved ? 'success' : 'primary'}
            onClick={handleStatusUpdate}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======== DELETE DIALOG ======== */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setSelectedReview(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Review</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Are you sure you want to delete the review for{' '}
            <strong>{selectedReview ? getEmployeeName(selectedReview) : ''}</strong>
            {' '}({selectedReview?.reviewPeriod})? This action can be undone by administrators.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDeleteDialogOpen(false); setSelectedReview(null); }}>Cancel</Button>
          <Button
            data-testid="reviews-delete-confirm-btn"
            variant="contained" color="error" onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeeReviewManagement;
