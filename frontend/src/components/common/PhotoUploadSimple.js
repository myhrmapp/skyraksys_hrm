import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Avatar,
  IconButton,
  Typography,
  Alert
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Person as PersonIcon
} from '@mui/icons-material';

/**
 * Simple Photo Upload Component for Forms (No API calls)
 * Used in EmployeeForm for new employee creation
 * Just handles file selection and preview
 */
const PhotoUploadSimple = ({ 
  photo,           // File object
  photoPreview,    // Base64 preview URL
  onPhotoSelect,   // (file) => void
  onPhotoRemove,   // () => void
  label = 'Upload Photo',
  size = 120,
  helperText = ''
}) => {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setError('');

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

    // Call parent handler
    if (onPhotoSelect) {
      onPhotoSelect(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    if (onPhotoRemove) {
      onPhotoRemove();
    }
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Photo Preview */}
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={photoPreview}
          sx={{
            width: size,
            height: size,
            fontSize: size * 0.4,
            cursor: 'pointer',
            border: '2px solid',
            borderColor: photo ? 'primary.main' : 'grey.300'
          }}
          onClick={triggerFileInput}
        >
          {!photoPreview && <PersonIcon sx={{ fontSize: size * 0.5 }} />}
        </Avatar>

        {/* Remove button */}
        {photo && (
          <IconButton
            size="small"
            onClick={handleRemove}
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark'
              },
              width: 28,
              height: 28
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Upload Button */}
      <Button
        variant="contained"
        startIcon={<PhotoCameraIcon />}
        onClick={triggerFileInput}
        size="small"
        data-testid="photo-upload-btn"
        sx={{
          borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          textTransform: 'none',
          boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.23)'
          }
        }}
      >
        {photo ? 'Change Photo' : label}
      </Button>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mt: 1, py: 0 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Helper Text */}
      {helperText && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {helperText}
        </Typography>
      )}

      {/* File Info */}
      {photo && (
        <Typography variant="caption" color="success.main">
          ✓ {photo.name} ({(photo.size / 1024).toFixed(1)} KB)
        </Typography>
      )}
    </Box>
  );
};

export default PhotoUploadSimple;
