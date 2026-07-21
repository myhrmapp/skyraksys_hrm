import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import notificationService from '../../../services/notification.service';
import { useNotifications } from '../../../contexts/NotificationContext';

const BroadcastManager = () => {
  const { showSuccess, showError } = useNotifications();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [imageUrl, setImageUrl] = useState('');
  const [isPopup, setIsPopup] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title || !message) {
      showError('Title and message are required.');
      return;
    }

    setLoading(true);
    try {
      await notificationService.broadcast({ title, message, type, imageUrl, isPopup });
      showSuccess('Broadcast sent successfully to all employees!');
      setTitle('');
      setMessage('');
      setType('info');
      setImageUrl('');
    } catch (error) {
      showError('Failed to send broadcast.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mt: 3, mb: 3 }}>
      <CardHeader 
        title="Send Global Broadcast" 
        subheader="Send an announcement to all employees (e.g., Holidays, Birthdays)"
      />
      <Divider />
      <CardContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Global broadcasts will pop up on every employee's screen in real-time.
        </Alert>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Announcement Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Upcoming Public Holiday"
          />
          <TextField
            label="Message Details"
            fullWidth
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Provide the details here..."
          />
          <TextField
            label="Image URL (Optional)"
            fullWidth
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="e.g., https://example.com/holiday.jpg"
          />
          <FormControl fullWidth>
            <InputLabel>Notification Type</InputLabel>
            <Select
              value={type}
              label="Notification Type"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="info">Info (Blue)</MenuItem>
              <MenuItem value="success">Success (Green)</MenuItem>
              <MenuItem value="warning">Warning (Orange)</MenuItem>
              <MenuItem value="error">Critical (Red)</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Checkbox checked={isPopup} onChange={(e) => setIsPopup(e.target.checked)} />}
            label="Show as Center Popup (instead of side notification)"
          />
          
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={handleSend}
            disabled={loading || !title || !message}
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          >
            {loading ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BroadcastManager;
