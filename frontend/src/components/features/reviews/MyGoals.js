import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Box, Typography, Button, IconButton, TextField,
  Grid, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Card, CardContent, CardActions, Chip, Divider,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrackChanges as GoalIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import goalService from '../../../services/goal.service';
import { useAuth } from '../../../contexts/AuthContext';

export default function MyGoals() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [openGoalDialog, setOpenGoalDialog] = useState(false);
  const [goalForm, setGoalForm] = useState({ id: null, title: '', description: '', period: 'Q3 2025', status: 'not_started' });
  
  const [openKrDialog, setOpenKrDialog] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [krForm, setKrForm] = useState({ id: null, title: '', targetValue: 100, currentValue: 0, metric: '%' });

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await goalService.getMyGoals();
      setGoals(res.data || []);
    } catch (err) {
      enqueueSnackbar('Failed to fetch goals', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSaveGoal = async () => {
    if (!goalForm.title || !goalForm.period) {
      enqueueSnackbar('Title and period are required', { variant: 'warning' });
      return;
    }
    
    try {
      if (goalForm.id) {
        await goalService.updateGoal(goalForm.id, goalForm);
        enqueueSnackbar('Goal updated successfully', { variant: 'success' });
      } else {
        await goalService.createGoal({ ...goalForm, employeeId: user?.employeeId });
        enqueueSnackbar('Goal created successfully', { variant: 'success' });
      }
      setOpenGoalDialog(false);
      fetchGoals();
    } catch (err) {
      console.error('Save Goal Error:', err);
      enqueueSnackbar(err.message || 'Failed to save goal', { variant: 'error' });
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalService.deleteGoal(id);
      enqueueSnackbar('Goal deleted', { variant: 'success' });
      fetchGoals();
    } catch (err) {
      enqueueSnackbar('Failed to delete goal', { variant: 'error' });
    }
  };

  const handleSaveKr = async () => {
    if (!krForm.title || krForm.targetValue === '') {
      enqueueSnackbar('Title and target value are required', { variant: 'warning' });
      return;
    }
    try {
      if (krForm.id) {
        await goalService.updateKeyResult(activeGoalId, krForm.id, krForm);
        enqueueSnackbar('Key Result updated', { variant: 'success' });
      } else {
        await goalService.addKeyResult(activeGoalId, krForm);
        enqueueSnackbar('Key Result added', { variant: 'success' });
      }
      setOpenKrDialog(false);
      fetchGoals();
    } catch (err) {
      enqueueSnackbar('Failed to save Key Result', { variant: 'error' });
    }
  };

  const handleDeleteKr = async (goalId, krId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await goalService.deleteKeyResult(goalId, krId);
      enqueueSnackbar('Key Result deleted', { variant: 'success' });
      fetchGoals();
    } catch (err) {
      enqueueSnackbar('Failed to delete Key Result', { variant: 'error' });
    }
  };

  const openNewGoal = () => {
    setGoalForm({ id: null, title: '', description: '', period: 'Q3 2025', status: 'not_started' });
    setOpenGoalDialog(true);
  };

  const openNewKr = (goalId) => {
    setActiveGoalId(goalId);
    setKrForm({ id: null, title: '', targetValue: 100, currentValue: 0, metric: '%' });
    setOpenKrDialog(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <GoalIcon sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">My Goals & OKRs</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Track your objectives and measurable key results
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNewGoal}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } }}
          >
            New Goal
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {goals.map(goal => (
            <Grid item xs={12} md={6} lg={4} key={goal.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', 
                          background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(16px)' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" fontWeight="bold">{goal.title}</Typography>
                    <Chip label={goal.period} size="small" color="primary" variant="outlined" />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {goal.description || 'No description provided.'}
                  </Typography>

                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" fontWeight="bold">Overall Progress</Typography>
                    <Typography variant="caption" fontWeight="bold">{Number(goal.progress).toFixed(0)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Number(goal.progress)} sx={{ mb: 2, height: 8, borderRadius: 4 }} />

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" mb={1}>Key Results</Typography>
                  
                  {goal.keyResults && goal.keyResults.length > 0 ? (
                    goal.keyResults.map(kr => {
                      const krPercent = Math.min(100, (kr.currentValue / kr.targetValue) * 100);
                      return (
                        <Box key={kr.id} sx={{ mb: 1.5, p: 1, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" fontWeight="500">{kr.title}</Typography>
                            <Box>
                              <IconButton size="small" onClick={() => { setActiveGoalId(goal.id); setKrForm(kr); setOpenKrDialog(true); }}>
                                <EditIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteKr(goal.id, kr.id)}>
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mt={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              {kr.currentValue} / {kr.targetValue} {kr.metric}
                            </Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={krPercent} color="secondary" sx={{ mt: 0.5, height: 4 }} />
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">No key results yet.</Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => openNewKr(goal.id)}>
                    Add Key Result
                  </Button>
                  <Box>
                    <IconButton size="small" onClick={() => { setGoalForm(goal); setOpenGoalDialog(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteGoal(goal.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
          
          {goals.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">No goals found</Typography>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={openNewGoal}>Create your first goal</Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Goal Dialog */}
      <Dialog open={openGoalDialog} onClose={() => setOpenGoalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{goalForm.id ? 'Edit Goal' : 'New Goal'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Objective Title" value={goalForm.title} onChange={e => setGoalForm({...goalForm, title: e.target.value})} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Period" value={goalForm.period} onChange={e => setGoalForm({...goalForm, period: e.target.value})} placeholder="e.g. Q3 2025" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Status" value={goalForm.status} onChange={e => setGoalForm({...goalForm, status: e.target.value})}>
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="on_track">On Track</MenuItem>
                <MenuItem value="at_risk">At Risk</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={goalForm.dueDate || ''} onChange={e => setGoalForm({...goalForm, dueDate: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Description" value={goalForm.description || ''} onChange={e => setGoalForm({...goalForm, description: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGoalDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGoal}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* KR Dialog */}
      <Dialog open={openKrDialog} onClose={() => setOpenKrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{krForm.id ? 'Edit Key Result' : 'Add Key Result'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Key Result" value={krForm.title} onChange={e => setKrForm({...krForm, title: e.target.value})} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Target Value" value={krForm.targetValue} onChange={e => setKrForm({...krForm, targetValue: e.target.value})} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Current Value" value={krForm.currentValue} onChange={e => setKrForm({...krForm, currentValue: e.target.value})} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Metric" value={krForm.metric} onChange={e => setKrForm({...krForm, metric: e.target.value})} placeholder="% or $" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenKrDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveKr}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
