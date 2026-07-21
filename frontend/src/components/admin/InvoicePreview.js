import React from 'react';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableHead, TableRow, Divider } from '@mui/material';

const InvoicePreview = ({ template, isMobile = false }) => {
  const {
    name = 'Template Name',
    currency = 'USD',
    templateData = {}
  } = template || {};

  const {
    title = 'Service Invoice',
    companySection = { showGstin: true, showAddress: true },
    clientSection = { showGstin: true, showAddress: true },
    lineColumns = ['description', 'amount'],
    termsAndConditions = 'Payment due within 15 days.',
    footerNote = 'System generated invoice.',
    taxPercent = 18,
    labels = {
      from: 'From',
      to: 'Bill To',
      invoiceNumber: 'Invoice #',
      date: 'Date',
      subtotal: 'Subtotal',
      tax: 'Tax',
      total: 'Total'
    }
  } = templateData;

  // Mock data for preview
  const mockCompany = {
    name: 'SKYRAKSYS TECHNOLOGIES',
    address: '123 Tech Park, Silicon Valley, CA 94025',
    gstin: '29ABCDE1234F1Z5'
  };

  const mockClient = {
    name: 'Acme Corp',
    address: '456 Business Rd, New York, NY 10001',
    gstin: '07XYZAB5678C1Z9'
  };

  const mockItems = [
    {
      employeeName: 'Jane Doe',
      employmentType: 'Full-Time',
      hoursSupported: 160,
      hourlyRate: 50,
      description: 'Senior Frontend Development',
      amount: 8000
    },
    {
      employeeName: 'John Smith',
      employmentType: 'Contractor',
      hoursSupported: 40,
      hourlyRate: 75,
      description: 'Architecture Consulting',
      amount: 3000
    }
  ];

  const getCurrencySymbol = (code) => {
    switch (code) {
      case 'USD': return '$';
      case 'INR': return '₹';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return code;
    }
  };
  
  const symbol = getCurrencySymbol(currency);

  const columnHeaders = {
    employeeName: 'Employee',
    employmentType: 'Type',
    hoursSupported: 'Hours',
    hourlyRate: 'Rate',
    description: 'Description',
    amount: 'Amount'
  };

  const subtotalAmount = mockItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotalAmount * (taxPercent / 100);
  const totalAmount = subtotalAmount + taxAmount;

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 4 },
        backgroundColor: '#ffffff',
        minHeight: '297mm', // A4 relative height for realism
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        transform: isMobile ? 'scale(0.8)' : 'none',
        transformOrigin: 'top center',
        mb: isMobile ? -20 : 0
      }}
    >
      {/* Header */}
      <Box sx={{ borderBottom: '2px solid #1f4037', pb: 2, mb: 3 }}>
        <Grid container spacing={2} justifyContent="space-between" alignItems="center">
          <Grid item xs={6}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1f4037', textTransform: 'uppercase' }}>
              {title}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {labels.invoiceNumber}: INV-2026-001 <br />
              {labels.date}: {new Date().toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: 'right' }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Company Logo"
              sx={{ height: 50, objectFit: 'contain', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Addresses */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={6}>
          <Typography variant="subtitle2" color="textSecondary" sx={{ textTransform: 'uppercase', mb: 1 }}>
            {labels.from}
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {mockCompany.name}
          </Typography>
          {companySection.showAddress && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {mockCompany.address}
            </Typography>
          )}
          {companySection.showGstin && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              GSTIN: {mockCompany.gstin}
            </Typography>
          )}
        </Grid>
        
        <Grid item xs={6}>
          <Typography variant="subtitle2" color="textSecondary" sx={{ textTransform: 'uppercase', mb: 1 }}>
            {labels.to}
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {mockClient.name}
          </Typography>
          {clientSection.showAddress && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {mockClient.address}
            </Typography>
          )}
          {clientSection.showGstin && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              GSTIN: {mockClient.gstin}
            </Typography>
          )}
        </Grid>
      </Grid>

      {/* Line Items */}
      <Box sx={{ mb: 4, minHeight: 200 }}>
        <Table size="small" sx={{ border: '1px solid #e0e0e0' }}>
          <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
            <TableRow>
              {lineColumns.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 'bold', color: '#1f4037' }}>
                  {columnHeaders[col] || col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {mockItems.map((item, idx) => (
              <TableRow key={idx}>
                {lineColumns.map((col) => (
                  <TableCell key={col}>
                    {col === 'amount' || col === 'hourlyRate' 
                      ? `${symbol}${item[col].toLocaleString()}` 
                      : item[col]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Totals */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 6 }}>
        <Box sx={{ width: '300px' }}>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body1" color="textSecondary">{labels.subtotal}:</Typography>
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'right' }}>
              <Typography variant="body1">{symbol}{subtotalAmount.toLocaleString()}</Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body1" color="textSecondary">{labels.tax} ({taxPercent}%):</Typography>
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'right' }}>
              <Typography variant="body1">{symbol}{taxAmount.toLocaleString()}</Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="h6" fontWeight="bold" color="#1f4037">{labels.total}:</Typography>
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'right' }}>
              <Typography variant="h6" fontWeight="bold" color="#1f4037">
                {symbol}{totalAmount.toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Footer Notes & Terms */}
      <Box sx={{ mt: 'auto', pt: 4 }}>
        {termsAndConditions && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Terms & Conditions</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line' }}>
              {termsAndConditions}
            </Typography>
          </Box>
        )}
        
        {footerNote && (
          <Box sx={{ textAlign: 'center', mt: 4, pt: 2, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="caption" color="textSecondary">
              {footerNote}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default InvoicePreview;
