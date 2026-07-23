import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, TextField,
  Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Divider, Paper, Chip, IconButton,
  Tabs, Tab
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Save as SaveIcon, ContentCopy as DuplicateIcon, ArrowBack as BackIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import invoiceTemplateService from '../../services/invoiceTemplate.service';
import InvoicePreview from './InvoicePreview';

const defaultTemplateData = {
  title: 'Service Invoice',
  companySection: { showGstin: true, showAddress: true },
  clientSection: { showGstin: true, showAddress: true },
  lineColumns: ['description', 'amount'],
  termsAndConditions: 'Payment due within 15 days.',
  footerNote: 'System generated invoice.',
  taxPercent: 18,
  labels: {
    from: 'From',
    to: 'Bill To',
    invoiceNumber: 'Invoice #',
    date: 'Date',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total'
  }
};

const defaultTemplate = {
  name: 'New Template',
  description: '',
  isDefault: false,
  isActive: true,
  currency: 'INR',
  templateData: { ...defaultTemplateData }
};

const AVAILABLE_COLUMNS = [
  { id: 'employeeName', label: 'Employee Name' },
  { id: 'employmentType', label: 'Employment Type' },
  { id: 'hoursSupported', label: 'Hours Supported' },
  { id: 'hourlyRate', label: 'Hourly Rate' },
  { id: 'description', label: 'Description' },
  { id: 'amount', label: 'Amount' }
];

export default function EnhancedInvoiceTemplateConfiguration() {
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceTemplateService.getAll();
      setTemplates(res.data?.data || []);
    } catch (err) {
      enqueueSnackbar('Failed to load templates', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateNew = () => {
    setEditingTemplate(JSON.parse(JSON.stringify(defaultTemplate)));
    setActiveTab(0);
  };

  const handleEdit = (template) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
    setActiveTab(0);
  };

  const handleDelete = async (id, isDefault) => {
    if (isDefault) {
      enqueueSnackbar('Cannot delete the default template', { variant: 'error' });
      return;
    }
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await invoiceTemplateService.delete(id);
      enqueueSnackbar('Template deleted', { variant: 'success' });
      fetchTemplates();
    } catch (err) {
      enqueueSnackbar('Failed to delete template', { variant: 'error' });
    }
  };

  const handleDuplicate = (template) => {
    const duplicate = JSON.parse(JSON.stringify(template));
    delete duplicate.id;
    duplicate.name = `${template.name} (Copy)`;
    duplicate.isDefault = false;
    setEditingTemplate(duplicate);
    setActiveTab(0);
  };

  const handleSave = async () => {
    if (!editingTemplate.name) {
      enqueueSnackbar('Template name is required', { variant: 'warning' });
      return;
    }
    try {
      if (editingTemplate.id) {
        await invoiceTemplateService.update(editingTemplate.id, editingTemplate);
        enqueueSnackbar('Template updated', { variant: 'success' });
      } else {
        await invoiceTemplateService.create(editingTemplate);
        enqueueSnackbar('Template created', { variant: 'success' });
      }
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      enqueueSnackbar('Failed to save template', { variant: 'error' });
    }
  };

  const updateField = (field, value) => {
    setEditingTemplate(prev => ({ ...prev, [field]: value }));
  };

  const updateTemplateData = (field, value) => {
    setEditingTemplate(prev => ({
      ...prev,
      templateData: {
        ...prev.templateData,
        [field]: value
      }
    }));
  };

  const updateSection = (section, field, value) => {
    setEditingTemplate(prev => ({
      ...prev,
      templateData: {
        ...prev.templateData,
        [section]: {
          ...(prev.templateData[section] || {}),
          [field]: value
        }
      }
    }));
  };

  const toggleColumn = (colId) => {
    setEditingTemplate(prev => {
      const currentCols = prev.templateData.lineColumns || [];
      const newCols = currentCols.includes(colId)
        ? currentCols.filter(c => c !== colId)
        : [...currentCols, colId];
      return {
        ...prev,
        templateData: {
          ...prev.templateData,
          lineColumns: newCols
        }
      };
    });
  };

  if (editingTemplate) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
          <Button startIcon={<BackIcon />} onClick={() => setEditingTemplate(null)}>
            Back to Templates
          </Button>
          <Box>
            <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSave}>
              Save Template
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Editor Side */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ mb: 3 }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                <Tab label="Basic Info" />
                <Tab label="Columns & Sections" />
                <Tab label="Labels & Taxes" />
                <Tab label="Terms & Footer" />
              </Tabs>
              
              <Box sx={{ p: 3 }}>
                {activeTab === 0 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={8}>
                      <TextField fullWidth label="Template Name" value={editingTemplate.name} onChange={(e) => updateField('name', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Currency</InputLabel>
                        <Select value={editingTemplate.currency} onChange={(e) => updateField('currency', e.target.value)}>
                          <MenuItem value="USD">USD ($)</MenuItem>
                          <MenuItem value="INR">INR (₹)</MenuItem>
                          <MenuItem value="EUR">EUR (€)</MenuItem>
                          <MenuItem value="GBP">GBP (£)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Description" value={editingTemplate.description} onChange={(e) => updateField('description', e.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Invoice Document Title" value={editingTemplate.templateData.title} onChange={(e) => updateTemplateData('title', e.target.value)} helperText="e.g. TAX INVOICE, SERVICE INVOICE" />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControlLabel control={<Switch checked={editingTemplate.isDefault} onChange={(e) => updateField('isDefault', e.target.checked)} />} label="Set as Default" />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControlLabel control={<Switch checked={editingTemplate.isActive} onChange={(e) => updateField('isActive', e.target.checked)} />} label="Active" />
                    </Grid>
                  </Grid>
                )}

                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>Header Sections</Typography>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Company Details (From)</Typography>
                          <FormControlLabel control={<Switch checked={editingTemplate.templateData.companySection?.showAddress} onChange={(e) => updateSection('companySection', 'showAddress', e.target.checked)} />} label="Show Address" />
                          <br />
                          <FormControlLabel control={<Switch checked={editingTemplate.templateData.companySection?.showGstin} onChange={(e) => updateSection('companySection', 'showGstin', e.target.checked)} />} label="Show GSTIN / Tax ID" />
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Client Details (To)</Typography>
                          <FormControlLabel control={<Switch checked={editingTemplate.templateData.clientSection?.showAddress} onChange={(e) => updateSection('clientSection', 'showAddress', e.target.checked)} />} label="Show Address" />
                          <br />
                          <FormControlLabel control={<Switch checked={editingTemplate.templateData.clientSection?.showGstin} onChange={(e) => updateSection('clientSection', 'showGstin', e.target.checked)} />} label="Show GSTIN / Tax ID" />
                        </Paper>
                      </Grid>
                    </Grid>

                    <Typography variant="h6" sx={{ mb: 2 }}>Table Columns</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Select which columns to display in the invoice line items.</Typography>
                    <Grid container spacing={1}>
                      {AVAILABLE_COLUMNS.map(col => {
                        const isSelected = (editingTemplate.templateData.lineColumns || []).includes(col.id);
                        return (
                          <Grid item xs={6} sm={4} key={col.id}>
                            <Chip 
                              label={col.label} 
                              color={isSelected ? "primary" : "default"} 
                              variant={isSelected ? "filled" : "outlined"}
                              onClick={() => toggleColumn(col.id)}
                              sx={{ width: '100%', justifyContent: 'flex-start' }}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>Tax Configuration</Typography>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField 
                          fullWidth 
                          type="number" 
                          label="Tax Percentage (e.g. 18 for 18% GST)" 
                          value={editingTemplate.templateData.taxPercent ?? 18} 
                          onChange={(e) => updateTemplateData('taxPercent', parseFloat(e.target.value))} 
                        />
                      </Grid>
                    </Grid>

                    <Typography variant="h6" sx={{ mb: 2 }}>Custom Labels</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="'From' Label" value={editingTemplate.templateData.labels?.from || 'From'} onChange={(e) => updateSection('labels', 'from', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="'Bill To' Label" value={editingTemplate.templateData.labels?.to || 'Bill To'} onChange={(e) => updateSection('labels', 'to', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="'Invoice #' Label" value={editingTemplate.templateData.labels?.invoiceNumber || 'Invoice #'} onChange={(e) => updateSection('labels', 'invoiceNumber', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="'Date' Label" value={editingTemplate.templateData.labels?.date || 'Date'} onChange={(e) => updateSection('labels', 'date', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="'Subtotal' Label" value={editingTemplate.templateData.labels?.subtotal || 'Subtotal'} onChange={(e) => updateSection('labels', 'subtotal', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="'Tax' Label" value={editingTemplate.templateData.labels?.tax || 'Tax'} onChange={(e) => updateSection('labels', 'tax', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="'Total' Label" value={editingTemplate.templateData.labels?.total || 'Total'} onChange={(e) => updateSection('labels', 'total', e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {activeTab === 3 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField 
                        fullWidth 
                        multiline 
                        rows={6} 
                        label="Terms and Conditions" 
                        value={editingTemplate.templateData.termsAndConditions || ''} 
                        onChange={(e) => updateTemplateData('termsAndConditions', e.target.value)} 
                        placeholder="Payment due within 15 days...\nPlease remit payment to..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        fullWidth 
                        multiline 
                        rows={3} 
                        label="Footer Note" 
                        value={editingTemplate.templateData.footerNote || ''} 
                        onChange={(e) => updateTemplateData('footerNote', e.target.value)} 
                        placeholder="This is a system generated invoice."
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Preview Side */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'sticky', top: 24, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', p: 1, backgroundColor: '#f0f2f5', borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, textAlign: 'center', color: '#666' }}>
                Live Invoice Preview
              </Typography>
              <InvoicePreview template={editingTemplate} />
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Invoice Templates</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreateNew}>
          Create Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {templates.map(template => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" noWrap title={template.name}>{template.name}</Typography>
                  {template.isDefault && <Chip size="small" color="primary" label="Default" />}
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2, minHeight: 40 }}>
                  {template.description || 'No description provided.'}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" variant="outlined" label={`Currency: ${template.currency}`} />
                  {!template.isActive && <Chip size="small" color="error" label="Inactive" />}
                </Box>
              </CardContent>
              <Divider />
              <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Button size="small" startIcon={<DuplicateIcon />} onClick={() => handleDuplicate(template)}>Duplicate</Button>
                <Box>
                  <IconButton size="small" onClick={() => handleEdit(template)} color="primary"><EditIcon /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(template.id, template.isDefault)} color="error"><DeleteIcon /></IconButton>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
