import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import { Campaign as CampaignIcon } from '@mui/icons-material';
import { useNotifications } from '../../../contexts/NotificationContext';

const BroadcastPopup = () => {
  const { notifications, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [currentBroadcast, setCurrentBroadcast] = useState(null);

  useEffect(() => {
    // Only show unread notifications that are explicitly marked as popups
    const announcement = notifications.find(n => !n.isRead && n.isPopup);
    if (announcement) {
      setCurrentBroadcast(announcement);
      setOpen(true);
    }
  }, [notifications]);

  const handleClose = () => {
    setOpen(false);
    // You could mark just this notification as read, but marking all is fine if that's the existing behavior
    // For a better UX, we might want a specific markAsRead for this ID.
    // We will stick to the existing behavior or call markAllAsRead.
    markAllAsRead();
  };

  if (!currentBroadcast) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.12)',
          bgcolor: 'background.paper',
        }
      }}
    >
      {currentBroadcast.imageUrl && (
        <Box 
          sx={{ 
            width: '100%', 
            height: 200, 
            backgroundImage: `url(${currentBroadcast.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative'
          }}
        >
          {/* Subtle gradient overlay to make text pop if we wanted to overlay text */}
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
        </Box>
      )}
      
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5, 
        color: 'primary.main',
        pt: currentBroadcast.imageUrl ? 3 : 4,
        px: 4
      }}>
        <Box sx={{ 
          p: 1, 
          borderRadius: 2, 
          bgcolor: 'primary.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CampaignIcon color="primary" />
        </Box>
        <Typography variant="h5" fontWeight="700" component="span" sx={{ letterSpacing: '-0.02em' }}>
          {currentBroadcast.title || 'New Announcement'}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ px: 4, pb: 2 }}>
        <Typography 
          variant="body1"
          sx={{ 
            whiteSpace: 'pre-line', 
            color: 'text.secondary',
            lineHeight: 1.7,
            fontSize: '1.05rem'
          }}
        >
          {currentBroadcast.message}
        </Typography>
        <Box sx={{ 
          mt: 4, 
          pt: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          typography: 'caption', 
          color: 'text.disabled' 
        }}>
          <span>Posted on {new Date(currentBroadcast.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>SKYRAKSYS Internal</span>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, px: 4, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          variant="contained" 
          color="primary"
          size="large"
          fullWidth
          sx={{ 
            borderRadius: 2,
            py: 1.2,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)',
            '&:hover': {
              boxShadow: '0 12px 20px rgba(99, 102, 241, 0.3)',
            }
          }}
        >
          Acknowledge
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BroadcastPopup;
