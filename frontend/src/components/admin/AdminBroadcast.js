import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Container,
  Paper,
  Grid
} from '@mui/material';
import { Campaign as CampaignIcon, Image as ImageIcon, Send as SendIcon } from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';
import http from '../../http-common';
import { useLoading } from '../../contexts/LoadingContext';

const AdminBroadcast = ({ embedded } = {}) => {
  const { showSuccess, showError } = useNotifications();
  const { setLoading } = useLoading();
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    isPopup: false,
    imageUrl: ''
  });
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result });
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      showError('Title and message are required.');
      return;
    }
    
    setLoading('broadcast', true);
    try {
      // POST to /notifications/broadcast (Assuming you have configured it in notification.routes.js)
      await http.post('/notifications/broadcast', {
        title: formData.title,
        message: formData.message,
        type: 'broadcast',
        isPopup: formData.isPopup,
        imageUrl: formData.imageUrl
      });
      
      showSuccess('Broadcast sent successfully!');
      
      // Reset form
      setFormData({ title: '', message: '', isPopup: false, imageUrl: '' });
      setImagePreview(null);
      // Reset file input
      const fileInput = document.getElementById('image-upload');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error(error);
      showError(error.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setLoading('broadcast', false);
    }
  };

  return (
    <Container maxWidth={embedded ? false : "md"} sx={{ py: embedded ? 0 : 4, px: embedded ? 0 : 2, mt: embedded ? -3 : 0 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.50' }}>
          <CampaignIcon color="primary" sx={{ fontSize: 32 }} />
        </Paper>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary', letterSpacing: '-0.02em' }}>
            New Announcement
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Send a rich broadcast message to all employees.
          </Typography>
        </Box>
      </Box>

      <Card sx={{ 
        borderRadius: 3, 
        border: '1px solid', 
        borderColor: 'divider',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)' 
      }}>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Upcoming Holiday Schedule"
                  InputProps={{
                    sx: { borderRadius: 2 }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Enter your announcement details here..."
                  InputProps={{
                    sx: { borderRadius: 2 }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ 
                  p: 3, 
                  border: '1px dashed', 
                  borderColor: 'divider', 
                  borderRadius: 2,
                  bgcolor: 'grey.50',
                  textAlign: 'center'
                }}>
                  {imagePreview ? (
                    <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                      <Box 
                        sx={{ 
                          width: '100%', 
                          height: 200, 
                          backgroundImage: `url(${imagePreview})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: 2,
                          mb: 2
                        }}
                      />
                      <Button color="error" onClick={() => { setImagePreview(null); setFormData({...formData, imageUrl: ''}) }}>
                        Remove Image
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        Upload a banner image (Optional)
                      </Typography>
                      <Button variant="outlined" component="label" sx={{ borderRadius: 2 }}>
                        Choose File
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          hidden
                          onChange={handleImageChange}
                        />
                      </Button>
                      <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 1 }}>
                        Recommended size: 800x400px. Max size: 2MB.
                      </Typography>
                    </>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.100' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isPopup}
                        onChange={handleChange}
                        name="isPopup"
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="600" color="primary.900">
                          Show as Popup Alert
                        </Typography>
                        <Typography variant="body2" color="primary.700">
                          Force this announcement to appear as a dialog immediately when employees log in.
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<SendIcon />}
                    sx={{ 
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)',
                      '&:hover': {
                        boxShadow: '0 12px 20px rgba(99, 102, 241, 0.3)',
                      }
                    }}
                  >
                    Send Broadcast
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AdminBroadcast;
