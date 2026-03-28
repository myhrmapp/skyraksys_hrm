import React from 'react';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const PayslipPreview = ({ template, sampleData }) => {
  if (!template) return null;

  const { styling } = template;
  const { companyInfo, watermark } = styling;

  // Default sample data if not provided
  const data = sampleData || {
    employee: {
      name: 'John Doe',
      id: 'EMP001',
      department: 'Engineering',
      designation: 'Senior Developer',
      joinDate: '2023-01-01',
      bankAccount: 'XXXXXXXX1234',
      pan: 'ABCDE1234F'
    },
    period: 'October 2023',
    payslipNo: 'PS-2023-10-001',
    earnings: {
      basicSalary: 50000,
      hra: 25000,
      special: 15000,
      conveyance: 1600
    },
    deductions: {
      pf: 1800,
      tax: 2500,
      pt: 200
    },
    attendance: {
      workingDays: 22,
      presentDays: 22,
      lop: 0
    }
  };

  // Calculate totals
  const totalEarnings = Object.values(data.earnings).reduce((a, b) => a + b, 0);
  const totalDeductions = Object.values(data.deductions).reduce((a, b) => a + b, 0);
  const netPay = totalEarnings - totalDeductions;

  const styles = {
    container: {
      fontFamily: styling.fontFamily,
      fontSize: styling.fontSize,
      color: styling.textColor,
      position: 'relative',
      overflow: 'hidden',
      p: 4,
      minHeight: '800px',
      backgroundColor: '#fff'
    },
    header: {
      backgroundColor: styling.headerBackgroundColor,
      p: 2,
      mb: 3,
      borderBottom: `${styling.borderWidth} ${styling.borderStyle} ${styling.borderColor}`
    },
    footer: {
      backgroundColor: styling.footerBackgroundColor,
      p: 2,
      mt: 3,
      borderTop: `${styling.borderWidth} ${styling.borderStyle} ${styling.borderColor}`
    },
    tableHeader: {
      backgroundColor: styling.primaryColor,
      color: '#fff',
      fontWeight: 'bold'
    },
    watermark: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
      fontSize: watermark.fontSize,
      color: watermark.color,
      opacity: watermark.opacity,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: 0
    }
  };

  return (
    <Paper elevation={3} sx={styles.container}>
      {/* Watermark */}
      {watermark.enabled && (
        <Typography sx={styles.watermark}>
          {watermark.text}
        </Typography>
      )}

      {/* Header Section */}
      <Box sx={styles.header}>
        <Grid container spacing={2} alignItems="center">
          {companyInfo.logo && companyInfo.logoPosition === 'left' && (
            <Grid item xs={2}>
              <img src={companyInfo.logo} alt="Logo" style={{ width: '100%', maxWidth: '100px' }} />
            </Grid>
          )}
          
          <Grid item xs={companyInfo.logo ? 8 : 12} sx={{ textAlign: companyInfo.logoPosition === 'center' ? 'center' : 'left' }}>
            <Typography variant="h5" sx={{ color: styling.primaryColor, fontWeight: 'bold', mb: 1 }}>
              {companyInfo.name}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {companyInfo.address}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {companyInfo.email} | {companyInfo.phone}
            </Typography>
          </Grid>

          {companyInfo.logo && companyInfo.logoPosition === 'right' && (
            <Grid item xs={2}>
              <img src={companyInfo.logo} alt="Logo" style={{ width: '100%', maxWidth: '100px' }} />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Title */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ textTransform: 'uppercase', letterSpacing: 1, borderBottom: `2px solid ${styling.primaryColor}`, display: 'inline-block', pb: 0.5 }}>
          Payslip for {data.period}
        </Typography>
      </Box>

      {/* Employee Details */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ border: 'none', fontWeight: 'bold', width: '40%' }}>Employee Name</TableCell>
                <TableCell sx={{ border: 'none' }}>: {data.employee.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ border: 'none', fontWeight: 'bold' }}>Employee ID</TableCell>
                <TableCell sx={{ border: 'none' }}>: {data.employee.id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ border: 'none', fontWeight: 'bold' }}>Designation</TableCell>
                <TableCell sx={{ border: 'none' }}>: {data.employee.designation}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Grid>
        <Grid item xs={6}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ border: 'none', fontWeight: 'bold', width: '40%' }}>Payslip No</TableCell>
                <TableCell sx={{ border: 'none' }}>: {data.payslipNo}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ border: 'none', fontWeight: 'bold' }}>Department</TableCell>
                <TableCell sx={{ border: 'none' }}>: {data.employee.department}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ border: 'none', fontWeight: 'bold' }}>Bank Account</TableCell>
                <TableCell sx={{ border: 'none' }}>: {data.employee.bankAccount}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Grid>
      </Grid>

      {/* Earnings & Deductions Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={styles.tableHeader}>
              <TableCell sx={{ color: '#fff', width: '35%' }}>Earnings</TableCell>
              <TableCell align="right" sx={{ color: '#fff', width: '15%' }}>Amount</TableCell>
              <TableCell sx={{ color: '#fff', width: '35%' }}>Deductions</TableCell>
              <TableCell align="right" sx={{ color: '#fff', width: '15%' }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* We need to map earnings and deductions side by side */}
            {Array.from({ length: Math.max(Object.keys(data.earnings).length, Object.keys(data.deductions).length) }).map((_, index) => {
              const earningKeys = Object.keys(data.earnings);
              const deductionKeys = Object.keys(data.deductions);
              const earningKey = earningKeys[index];
              const deductionKey = deductionKeys[index];

              return (
                <TableRow key={index}>
                  <TableCell sx={{ borderBottom: '1px solid #eee' }}>
                    {earningKey ? earningKey.charAt(0).toUpperCase() + earningKey.slice(1) : ''}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: '1px solid #eee' }}>
                    {earningKey ? `₹${data.earnings[earningKey].toLocaleString()}` : ''}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #eee', borderLeft: '1px solid #eee' }}>
                    {deductionKey ? deductionKey.charAt(0).toUpperCase() + deductionKey.slice(1) : ''}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: '1px solid #eee' }}>
                    {deductionKey ? `₹${data.deductions[deductionKey].toLocaleString()}` : ''}
                  </TableCell>
                </TableRow>
              );
            })}
            
            {/* Totals Row */}
            <TableRow sx={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Total Earnings</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>₹{totalEarnings.toLocaleString()}</TableCell>
              <TableCell sx={{ fontWeight: 'bold', borderLeft: '1px solid #eee' }}>Total Deductions</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>₹{totalDeductions.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Net Pay Section */}
      <Box sx={{ 
        backgroundColor: styling.primaryColor, 
        color: '#fff', 
        p: 2, 
        borderRadius: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Box>
          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>NET PAY</Typography>
          <Typography variant="h5" fontWeight="bold">₹{netPay.toLocaleString()}</Typography>
        </Box>
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          (Rupees Seventy One Thousand One Hundred Only)
        </Typography>
      </Box>

      {/* Footer */}
      <Box sx={styles.footer}>
        <Grid container spacing={2}>
          <Grid item xs={12} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              {styling.htmlTemplates.disclaimer || 'This is a computer-generated payslip and does not require a signature.'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default PayslipPreview;
