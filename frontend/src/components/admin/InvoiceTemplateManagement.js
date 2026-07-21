import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, TextField,
  Switch, FormControlLabel, Paper, List, ListItem, ListItemText,
  ListItemSecondaryAction, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, IconButton
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import invoiceTemplateService from '../../services/invoiceTemplate.service';

const defaultTemplate = {
  name: '',
  description: '',
  isDefault: false,
  currency: 'USD',
  templateData: {
    title: 'Service Invoice',
    companySection: { showGstin: true, showAddress: true },
    clientSection: { showGstin: true, showAddress: true },
    termsAndConditions: 'Payment due within 15 days.',
    footerNote: 'System generated invoice.'
  }
};

export default function InvoiceTemplateManagement() {
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultTemplate);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await invoiceTemplateService.getAll();
      setTemplates(res.data?.data || []);
    } catch (err) {
      enqueueSnackbar('Failed to load templates', { variant: 'error' });
    }
    setLoading(false);
  };

  const handleOpen = (template = null) => {
    if (template) {
      setForm(template);
    } else {
      setForm(defaultTemplate);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(defaultTemplate);
  };

  const handleSave = async () => {
    if (!form.name) {
      enqueueSnackbar('Template name is required', { variant: 'warning' });
      return;
    }
    try {
      if (form.id) {
        await invoiceTemplateService.update(form.id, form);
        enqueueSnackbar('Template updated', { variant: 'success' });
      } else {
        await invoiceTemplateService.create(form);
        enqueueSnackbar('Template created', { variant: 'success' });
      }
      handleClose();
      fetchTemplates();
    } catch (err) {
      enqueueSnackbar('Failed to save template', { variant: 'error' });
    }
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h6">Invoice Templates</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          New Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Saved Templates</Typography>
            <List>
              {templates.map(t => (
                <ListItem key={t.id} button onClick={() => handleOpen(t)} sx={{ border: '1px solid #eee', mb: 1, borderRadius: 1 }}>
                  <ListItemText 
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {t.name}
                        {t.isDefault && <Chip size="small" label="Default" color="primary" />}
                      </Box>
                    }
                    secondary={t.description}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleDelete(t.id, t.isDefault)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {templates.length === 0 && <Typography variant="body2" color="text.secondary">No templates found.</Typography>}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          {form.id ? (
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" mb={3}>Edit Template: {form.name}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Template Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Currency" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel control={<Switch checked={form.isDefault} onChange={e => setForm({...form, isDefault: e.target.checked})} />} label="Set as Default Template" />
                  </Grid>
                  
                  <Grid item xs={12}><Typography variant="subtitle2" mt={2} mb={1}>Invoice Details</Typography></Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Invoice Title" value={form.templateData.title} onChange={e => setForm({...form, templateData: {...form.templateData, title: e.target.value}})} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Footer Note" value={form.templateData.footerNote} onChange={e => setForm({...form, templateData: {...form.templateData, footerNote: e.target.value}})} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={3} label="Terms and Conditions" value={form.templateData.termsAndConditions} onChange={e => setForm({...form, templateData: {...form.templateData, termsAndConditions: e.target.value}})} />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={form.templateData.companySection?.showAddress} onChange={e => setForm({...form, templateData: {...form.templateData, companySection: {...form.templateData.companySection, showAddress: e.target.checked}}})} />} label="Show Company Address" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel control={<Switch checked={form.templateData.clientSection?.showAddress} onChange={e => setForm({...form, templateData: {...form.templateData, clientSection: {...form.templateData.clientSection, showAddress: e.target.checked}}})} />} label="Show Client Address" />
                  </Grid>

                  <Grid item xs={12} display="flex" justifyContent="flex-end" mt={2}>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>Save Changes</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ) : (
            <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
              <Typography color="text.secondary">Select a template to edit or create a new one.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      <Dialog open={open && !form.id} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>New Invoice Template</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="Template Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} margin="normal" />
          <TextField fullWidth label="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} margin="normal" />
          <FormControlLabel control={<Switch checked={form.isDefault} onChange={e => setForm({...form, isDefault: e.target.checked})} />} label="Set as Default Template" />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Create Template</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
