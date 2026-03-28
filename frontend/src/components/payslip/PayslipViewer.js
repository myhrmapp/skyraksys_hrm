import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import PayslipTemplate from './PayslipTemplate';
import payslipService from '../../services/payslip/payslipService';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const PayslipViewer = ({ 
  open, 
  onClose, 
  employee,
  initialMonth = null,
  mode = 'view' // 'view', 'generate'
}) => {
  const { showNotification } = useNotifications();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payslipData, setPayslipData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || new Date());
  const [editMode, setEditMode] = useState(mode === 'generate');

  // Load payslip data when component mounts or month changes
  useEffect(() => {
    if (employee && selectedMonth && mode === 'view') {
      loadPayslipData();
    }
  }, [employee, selectedMonth, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPayslipData = async () => {
    setLoading(true);
    setError('');
    setPayslipData(null);
    try {
      // Fetch payslip history and find the one for the selected month
      const history = await payslipService.getPayslipHistory(employee.id);
      
      const targetMonth = selectedMonth.getMonth() + 1;
      const targetYear = selectedMonth.getFullYear();
      
      const foundPayslip = history.find(p => 
        p.month === targetMonth && p.year === targetYear
      );

      if (foundPayslip) {
        setPayslipData(foundPayslip);
      }
    } catch (err) {
      setError('Failed to load payslip data. Please try again.');
      console.error('Error loading payslip:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await payslipService.generatePayslip(employee.id, month, year);
      
      showNotification('Payslip generated successfully', 'success');
      setEditMode(false);
      
      // If we have the data directly, set it, otherwise reload
      if (response.data && response.data.payslips && response.data.payslips.length > 0) {
         setPayslipData(response.data.payslips[0]);
      } else {
         await loadPayslipData();
      }
      
    } catch (err) {
      setError(err.message || 'Failed to generate payslip.');
      console.error('Error generating payslip:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!payslipData?.id) return;
    
    setLoading(true);
    try {
      await payslipService.finalizePayslip(payslipData.id);
      showNotification('Payslip finalized successfully', 'success');
      // Reload to get updated status
      await loadPayslipData();
    } catch (err) {
      showNotification(err.message || 'Failed to finalize payslip', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    try {
      payslipService.printPayslip('payslip-content');
    } catch (err) {
      showNotification('Failed to print payslip', 'error');
    }
  };

  const handleDownload = async () => {
    if (!payslipData?.id) {
      showNotification('No payslip data available to download', 'error');
      return;
    }
    try {
      setLoading(true);
      // Uses working GET /payslips/:id/pdf endpoint
      await payslipService.downloadPayslipByIdPDF(payslipData.id);
      showNotification('Payslip downloaded successfully', 'success');
    } catch (err) {
      showNotification('Failed to download payslip', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'hr';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {mode === 'generate' ? 'Generate Payslip' : 'Employee Payslip'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {payslipData && (
              <>
                <Tooltip title="Print Payslip">
                  <IconButton onClick={handlePrint} size="small">
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton onClick={handleDownload} size="small" disabled={loading}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                {canEdit && !payslipData.isLocked && (
                   <Tooltip title="Finalize Payslip">
                    <IconButton onClick={handleFinalize} size="small" color="warning">
                      <LockIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {canEdit && (
                  <Tooltip title={editMode ? "View Mode" : "Generate New"}>
                    <IconButton 
                      onClick={() => setEditMode(!editMode)} 
                      size="small"
                      color={editMode ? "primary" : "default"}
                    >
                      {editMode ? <ViewIcon /> : <EditIcon />}
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Controls Panel */}
        {(editMode || mode === 'generate') && (
          <Paper sx={{ p: 3, m: 3, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Payslip Generation
            </Typography>
            
            <Grid container spacing={3} alignItems="center">
              {/* Month Selection */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Select Month"
                  type="month"
                  value={selectedMonth ? selectedMonth.toISOString().slice(0, 7) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [year, month] = value.split('-');
                      setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
                    } else {
                      setSelectedMonth(null);
                    }
                  }}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={loading}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Generate Payslip'}
                </Button>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2 }}>
               <Typography variant="body2" color="textSecondary">
                  Note: Payslip generation uses the employee's active Salary Structure and approved Timesheets for the selected month.
               </Typography>
            </Box>

            {editMode && payslipData && (
               <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setEditMode(false)}
                >
                  Cancel / View Existing
                </Button>
               </Box>
            )}
          </Paper>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ m: 3, mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && !payslipData && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Payslip Display */}
        {payslipData && !editMode && (
          <Box sx={{ p: 3 }}>
            <PayslipTemplate
              employee={employee}
              payslipData={payslipData}
              companyInfo={payslipData.companyInfo}
            />
          </Box>
        )}
        
        {/* Empty State */}
        {!loading && !payslipData && !editMode && !error && (
           <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                 No payslip found for this month.
              </Typography>
              {canEdit && (
                 <Button variant="contained" onClick={() => setEditMode(true)}>
                    Generate Payslip
                 </Button>
              )}
           </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayslipViewer;