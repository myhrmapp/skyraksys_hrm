import React, { useState } from 'react';
import { Box, Typography, TextField, IconButton, Tooltip, Fade } from '@mui/material';
import { ContentCopy as CopyIcon, Check as CheckIcon } from '@mui/icons-material';

const InfoField = ({ 
  label, 
  value, 
  displayValue, // Optional: formatted value for display mode
  editing, 
  onChange, 
  type = 'text', 
  required = false, 
  multiline = false, 
  sensitive = false,
  InputProps // Optional: props for the input element in edit mode
}) => {
  const [copied, setCopied] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Use displayValue if provided, otherwise use value
  const contentToDisplay = displayValue !== undefined ? displayValue : value;

  if (editing) {
    return (
      <TextField
        fullWidth
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        multiline={multiline}
        rows={multiline ? 3 : 1}
        variant="outlined"
        size="small"
        InputProps={InputProps}
        InputLabelProps={type === 'date' ? { shrink: true } : undefined}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'white',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: '#f8fafc'
            },
            '&.Mui-focused': {
              bgcolor: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }
          }
        }}
      />
    );
  }

  return (
    <Box 
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
      sx={{ 
        position: 'relative',
        p: 1.5,
        mx: -1.5, // Negative margin to offset padding so alignment stays same
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: 'rgba(0, 0, 0, 0.03)'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            fontWeight={600} 
            display="block" 
            gutterBottom
            sx={{ 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              fontSize: '0.7rem',
              opacity: 0.8
            }}
          >
            {label}
          </Typography>
          <Typography 
            variant="body1" 
            fontWeight={500} 
            sx={{ 
              wordBreak: 'break-word',
              color: contentToDisplay ? 'text.primary' : 'text.disabled',
              fontFamily: sensitive ? 'monospace' : 'inherit',
              fontSize: sensitive ? '1.1rem' : '1rem'
            }}
          >
            {sensitive && value ? '••••••••' : contentToDisplay || 'Not provided'}
          </Typography>
        </Box>
        
        {!sensitive && value && (
          <Fade in={showCopy}>
            <Tooltip title={copied ? "Copied!" : "Copy to clipboard"} placement="left">
              <IconButton 
                size="small" 
                onClick={handleCopy}
                sx={{ 
                  ml: 1, 
                  mt: -0.5,
                  opacity: showCopy ? 1 : 0,
                  bgcolor: copied ? 'success.light' : 'rgba(0,0,0,0.05)',
                  color: copied ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: copied ? 'success.main' : 'rgba(0,0,0,0.1)',
                  },
                  width: 28,
                  height: 28
                }}
              >
                {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <CopyIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          </Fade>
        )}
      </Box>
    </Box>
  );
};

export default InfoField;
