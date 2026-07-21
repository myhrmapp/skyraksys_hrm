import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Container,
  Fade,
  Slide,
  useTheme,
  alpha
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    // Email format validation (matching backend loginSchema)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0A2540 0%, #0D3D6E 40%, #006FA3 75%, #0099D4 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-30%',
          right: '-15%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(0,153,212,0.25) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 20s ease-in-out infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-25%',
          left: '-10%',
          width: '480px',
          height: '480px',
          background: 'radial-gradient(circle, rgba(155,48,255,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 15s ease-in-out infinite reverse',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '33%':      { transform: 'translate(30px, -50px) rotate(120deg)' },
          '66%':      { transform: 'translate(-20px, 20px) rotate(240deg)' }
        }
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
              boxShadow: `0 8px 32px 0 ${alpha(theme.palette.primary.main, 0.37)}`,
              position: 'relative',
              zIndex: 1,
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: 'linear-gradient(90deg, #FF8C00, #FF3399, #9B30FF, #0099D4, #FF8C00)',
                backgroundSize: '300% 100%',
                animation: 'shimmer 4s linear infinite',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
              },
              '@keyframes shimmer': {
                '0%':   { backgroundPosition: '0% 0' },
                '100%': { backgroundPosition: '300% 0' }
              }
            }}
          >
            {/* Logo & Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Slide direction="down" in timeout={600}>
                <Box sx={{ mb: 3 }}>
                  <img
                    src="/logo-full.png"
                    alt="SKYRAKSYS Technologies"
                    style={{
                      maxWidth: '240px',
                      width: '100%',
                      height: 'auto',
                      filter: 'drop-shadow(0 4px 12px rgba(0,153,212,0.3))'
                    }}
                  />
                </Box>
              </Slide>

              <Box
                sx={{
                  width: '80%',
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent, #FF8C00, #FF3399, #9B30FF, transparent)',
                  margin: '0 auto 16px',
                  borderRadius: 2
                }}
              />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#0A2540',
                  letterSpacing: '0.08em',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  mb: 0.5
                }}
              >
                Human Resource Management
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500, mt: 1 }}
              >
                Welcome back! Please sign in to continue
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert
                  data-testid="login-error-alert"
                  severity="error"
                  onClose={() => setError('')}
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: 24
                    }
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }} data-testid="login-form">
              <TextField
                fullWidth
                required
                label="Email Address"
                name="email"
                data-testid="login-email-input"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoComplete="email"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.25)}`
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                required
                label="Password"
                name="password"
                data-testid="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                        aria-label="toggle password visibility"
                        data-testid="login-toggle-password"
                        sx={{
                          color: theme.palette.primary.main,
                          '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.1)
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.25)}`
                    }
                  }
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                data-testid="login-submit-button"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.6)}`,
                    transform: 'translateY(-2px)'
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  },
                  '&.Mui-disabled': {
                    background: theme.palette.action.disabledBackground,
                    color: theme.palette.action.disabled
                  }
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography
                  component={Link}
                  to="/forgot-password"
                  variant="body2"
                  color="primary"
                  data-testid="login-forgot-password-link"
                  sx={{
                    textDecoration: 'none',
                    fontWeight: 500,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Forgot Password?
                </Typography>
              </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                © {new Date().getFullYear()} SKYRAKSYS Technologies • All Rights Reserved
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;
