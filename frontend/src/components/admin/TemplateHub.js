import React, { useState } from 'react';
import { Box, Tabs, Tab, Container, Typography, Paper } from '@mui/material';
import EnhancedPayslipTemplateConfiguration from './EnhancedPayslipTemplateConfiguration';
import EnhancedInvoiceTemplateConfiguration from './EnhancedInvoiceTemplateConfiguration';
import { Description as InvoiceIcon, Receipt as PayslipIcon } from '@mui/icons-material';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`template-tabpanel-${index}`} {...other}>
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function TemplateHub() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)', color: 'white' }}>
        <Typography variant="h5" fontWeight="bold">Template Hub</Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Manage your system templates for documents, payslips, and invoices.
        </Typography>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="template tabs">
          <Tab icon={<PayslipIcon />} iconPosition="start" label="Payslip Templates" />
          <Tab icon={<InvoiceIcon />} iconPosition="start" label="Invoice Templates" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <EnhancedPayslipTemplateConfiguration />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <EnhancedInvoiceTemplateConfiguration />
      </TabPanel>
    </Container>
  );
}
