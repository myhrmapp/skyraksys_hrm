import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Switch, FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import clientService from '../../../services/client.service';
import { useLoading } from '../../../contexts/LoadingContext';

const defaultForm = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  gstin: '',
  isActive: true,
  notes: ''
};

export default function ClientManagement() {
  const { enqueueSnackbar } = useSnackbar();
  const { setLoading } = useLoading();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientService.getAll();
      setClients(res.data?.data || []);
    } catch (err) {
      enqueueSnackbar('Failed to load clients', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar, setLoading]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpen = (client = null) => {
    if (client) setForm(client);
    else setForm(defaultForm);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(defaultForm);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    if (!form.companyName) {
      enqueueSnackbar('Company Name is required', { variant: 'warning' });
      return;
    }
    try {
      if (form.id) {
        await clientService.update(form.id, form);
        enqueueSnackbar('Client updated', { variant: 'success' });
      } else {
        await clientService.create(form);
        enqueueSnackbar('Client created', { variant: 'success' });
      }
      handleClose();
      fetchClients();
    } catch (err) {
      enqueueSnackbar('Failed to save client', { variant: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await clientService.delete(id);
      enqueueSnackbar('Client deleted', { variant: 'success' });
      fetchClients();
    } catch (err) {
      enqueueSnackbar('Failed to delete client', { variant: 'error' });
    }
  };

  const filteredClients = clients.filter(c => 
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)', color: 'white' }}>
        <Typography variant="h5" fontWeight="bold">Client Management</Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Manage your organization's clients for billing and invoicing purposes.
        </Typography>
      </Paper>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
            sx={{ width: 300 }}
          />
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Client
          </Button>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Company Name</strong></TableCell>
              <TableCell><strong>Contact Person</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>GSTIN</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id} hover>
                <TableCell>{client.companyName}</TableCell>
                <TableCell>{client.contactPerson || '-'}</TableCell>
                <TableCell>{client.email || '-'}</TableCell>
                <TableCell>{client.phone || '-'}</TableCell>
                <TableCell>{client.gstin || '-'}</TableCell>
                <TableCell>
                  <Chip size="small" label={client.isActive ? 'Active' : 'Inactive'} color={client.isActive ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleOpen(client)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(client.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>No clients found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="GSTIN / Tax ID" name="gstin" value={form.gstin} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" name="phone" value={form.phone} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" name="address" multiline rows={3} value={form.address} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" name="notes" multiline rows={2} value={form.notes} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={form.isActive} onChange={handleChange} name="isActive" />} label="Active Status" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Save Client</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
