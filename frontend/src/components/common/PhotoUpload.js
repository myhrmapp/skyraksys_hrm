import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Avatar,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import http from '../../http-common';

const PhotoUpload = ({ 
  employeeId, 
  currentPhotoUrl, 
  onUploadSuccess, 
  onUploadError, 
  disabled = false,
  size = 150,
  showUploadButton = true,
  allowDelete = true 
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentPhotoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  // Update previewUrl when currentPhotoUrl changes
  useEffect(() => {
    if (currentPhotoUrl) {
      // If currentPhotoUrl is a relative path, convert to full URL
      const isRelativePath = currentPhotoUrl.startsWith('/');
      if (isRelativePath) {
        const serverBaseUrl = process.env.REACT_APP_BACKEND_URL || '';
        setPreviewUrl(`${serverBaseUrl}${currentPhotoUrl}`);
      } else {
        setPreviewUrl(currentPhotoUrl);
      }
    }
  }, [currentPhotoUrl]);

  // Check if user has permission to upload photos
  const canUpload = user && (user.role === 'admin' || user.role === 'hr') && !disabled;

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB.');
      return;
    }

    setSelectedFile(file);
    setError('');
    setSuccess('');

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !employeeId) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await http.post(`/employees/${employeeId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = response.data;

      setSuccess('Photo uploaded successfully!');
      setSelectedFile(null);
      
      // Update the preview URL with the server URL
      // Note: Uploads are served from /uploads (not /api/uploads)
      const serverBaseUrl = process.env.REACT_APP_BACKEND_URL || '';
      const serverPhotoUrl = `${serverBaseUrl}${data.data.photoUrl}`;
      setPreviewUrl(serverPhotoUrl);

      if (onUploadSuccess) {
        onUploadSuccess(data.data);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload photo');
      
      // Reset preview to original photo
      setPreviewUrl(currentPhotoUrl || '');
      setSelectedFile(null);

      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    setConfirmDialog(false);
    
    if (!employeeId) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await http.put(`/employees/${employeeId}`, { photoUrl: null });
      const data = response.data;

      setSuccess('Photo removed successfully!');
      setPreviewUrl('');
      setSelectedFile(null);

      if (onUploadSuccess) {
        onUploadSuccess({ photoUrl: null });
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to remove photo');

      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (canUpload && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(currentPhotoUrl || '');
    setError('');
    setSuccess('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Photo Display */}
      <Paper
        elevation={3}
        sx={{
          padding: 2,
          borderRadius: 2,
          position: 'relative',
          '&:hover .photo-overlay': {
            opacity: canUpload ? 1 : 0
          }
        }}
      >
        <Avatar
          src={previewUrl}
          sx={{
            width: size,
            height: size,
            fontSize: size * 0.4,
            cursor: canUpload ? 'pointer' : 'default'
          }}
          onClick={canUpload ? triggerFileInput : undefined}
        >
          {!previewUrl && <PersonIcon sx={{ fontSize: size * 0.5 }} />}
        </Avatar>

        {/* Overlay for upload hint */}
        {canUpload && (
          <Box
            className="photo-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              borderRadius: 2,
              cursor: 'pointer'
            }}
            onClick={triggerFileInput}
          >
            <PhotoCameraIcon sx={{ color: 'white', fontSize: size * 0.3 }} />
          </Box>
        )}

        {/* Loading indicator */}
        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2
            }}
          >
            <CircularProgress size={size * 0.3} />
          </Box>
        )}
      </Paper>

      {/* File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        disabled={!canUpload}
      />

      {/* Action Buttons */}
      {canUpload && showUploadButton && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!selectedFile && (
            <>
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={triggerFileInput}
                disabled={uploading}
                size="small"
              >
                Select Photo
              </Button>
              
              {previewUrl && allowDelete && (
                <Tooltip title="Remove current photo">
                  <IconButton
                    color="error"
                    onClick={() => setConfirmDialog(true)}
                    disabled={uploading}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}

          {selectedFile && (
            <>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={handleUpload}
                disabled={uploading}
                size="small"
                color="primary"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={cancelSelection}
                disabled={uploading}
                size="small"
              >
                Cancel
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Selected file info */}
      {selectedFile && (
        <Typography variant="caption" color="textSecondary" align="center">
          Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
        </Typography>
      )}

      {/* Permission info */}
      {!canUpload && user && (
        <Typography variant="caption" color="textSecondary" align="center">
          Only admins and HR users can upload photos
        </Typography>
      )}

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ width: '100%', maxWidth: 300 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ width: '100%', maxWidth: 300 }}>
          {success}
        </Alert>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove Photo</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this employee's photo? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeletePhoto} 
            color="error" 
            variant="contained"
            disabled={uploading}
          >
            Remove Photo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoUpload;