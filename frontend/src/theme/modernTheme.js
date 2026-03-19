// Enhanced Material-UI Theme Configuration
// Modern, Minimalistic, Professional Design System

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // Color Palette - Modern & Professional
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1', // Indigo
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', // Purple gradient
    },
    secondary: {
      main: '#8b5cf6', // Purple
      light: '#a78bfa',
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    info: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
      subtle: '#f1f5f9',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      disabled: '#cbd5e1',
    },
    divider: '#e2e8f0',
  },

  // Typography - Clean & Modern
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: '#475569',
    },
  },

  // Shape - Rounded & Friendly
  shape: {
    borderRadius: 12,
  },

  // Shadows - Subtle & Elevated
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0 1px 3px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
    '0 2px 4px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)',
    '0 2px 6px rgba(0,0,0,0.12), 0 10px 20px rgba(0,0,0,0.10)',
    '0 4px 8px rgba(0,0,0,0.12), 0 12px 24px rgba(0,0,0,0.10)',
    '0 4px 10px rgba(0,0,0,0.12), 0 14px 28px rgba(0,0,0,0.12)',
    '0 6px 12px rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.12)',
    '0 6px 14px rgba(0,0,0,0.12), 0 18px 36px rgba(0,0,0,0.14)',
    '0 8px 16px rgba(0,0,0,0.12), 0 20px 40px rgba(0,0,0,0.14)',
    '0 8px 18px rgba(0,0,0,0.12), 0 22px 44px rgba(0,0,0,0.15)',
    '0 10px 20px rgba(0,0,0,0.12), 0 24px 48px rgba(0,0,0,0.15)',
    '0 10px 22px rgba(0,0,0,0.12), 0 26px 52px rgba(0,0,0,0.16)',
    '0 12px 24px rgba(0,0,0,0.14), 0 28px 56px rgba(0,0,0,0.16)',
    '0 12px 26px rgba(0,0,0,0.14), 0 30px 60px rgba(0,0,0,0.18)',
    '0 14px 28px rgba(0,0,0,0.14), 0 32px 64px rgba(0,0,0,0.18)',
    '0 14px 30px rgba(0,0,0,0.16), 0 34px 68px rgba(0,0,0,0.20)',
    '0 16px 32px rgba(0,0,0,0.16), 0 36px 72px rgba(0,0,0,0.20)',
    '0 16px 34px rgba(0,0,0,0.16), 0 38px 76px rgba(0,0,0,0.22)',
    '0 18px 36px rgba(0,0,0,0.18), 0 40px 80px rgba(0,0,0,0.22)',
  ],

  // Component Customization
  components: {
    // Button
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(99, 102, 241, 0.2)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px 0 rgba(99, 102, 241, 0.3)',
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '0.9375rem',
        },
      },
    },

    // Card
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },

    // Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },

    // TextField
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#6366f1',
              },
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
            },
          },
        },
      },
    },

    // Chip
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.8125rem',
        },
        filled: {
          border: 'none',
        },
      },
    },

    // Table
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            fontSize: '0.8125rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#475569',
            borderBottom: '2px solid #e2e8f0',
            padding: '16px',
          },
        },
      },
    },

    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              backgroundColor: '#f8fafc',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            },
            '&:last-child .MuiTableCell-root': {
              borderBottom: 'none',
            },
          },
          '& .MuiTableCell-root': {
            padding: '16px',
            borderBottom: '1px solid #f1f5f9',
          },
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
        },
      },
    },

    // Tabs
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: '2px solid #e2e8f0',
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          minHeight: 56,
          padding: '12px 20px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            color: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.04)',
          },
          '&.Mui-selected': {
            fontWeight: 600,
          },
        },
      },
    },

    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          padding: 8,
        },
      },
    },

    // Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          alignItems: 'center',
        },
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          color: '#059669',
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          color: '#dc2626',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          color: '#d97706',
        },
        standardInfo: {
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderColor: 'rgba(6, 182, 212, 0.3)',
          color: '#0891b2',
        },
      },
    },

    // IconButton
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
          },
        },
      },
    },

    // AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },

    // Drawer
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e2e8f0',
          boxShadow: 'none',
        },
      },
    },
  },

  // Transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
});

export default theme;
