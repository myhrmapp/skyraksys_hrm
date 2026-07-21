// SKYRAKSYS Technologies Brand Theme
// Derived from official SKYRAKSYS Technologies logo
// Primary: Sky Blue #0099D4 | Accents: Orange #FF8C00, Magenta #FF3399, Purple #9B30FF

import { createTheme } from '@mui/material/styles';

// ─── Brand Tokens ──────────────────────────────────────────────────────────────
export const brand = {
  blue:         '#0099D4', // Sky Blue — primary brand colour (SKYRAKSYS wordmark)
  blueDark:     '#006FA3', // Darker shade for hover/focus
  blueLight:    '#33B8E8', // Lighter shade / "Technologies" text tone
  blueNavy:     '#1A4B8C', // Logo arc/caduceus element
  orange:       '#FF8C00', // Left ribbon — orange
  orangeLight:  '#FFCC00', // Left ribbon highlight — yellow
  magenta:      '#FF3399', // Centre ribbon — hot pink/magenta
  purple:       '#9B30FF', // Right ribbon — violet
  purpleLight:  '#CC66FF', // Right ribbon highlight
  // Gradient helpers
  brandGradient:     'linear-gradient(135deg, #0099D4 0%, #006FA3 100%)',
  accentGradient:    'linear-gradient(135deg, #FF8C00 0%, #FF3399 50%, #9B30FF 100%)',
  sidebarGradient:   'linear-gradient(180deg, #0A2540 0%, #0D3061 60%, #0A2540 100%)',
};

const theme = createTheme({
  // ─── Palette ────────────────────────────────────────────────────────────────
  palette: {
    mode: 'light',
    primary: {
      main:          brand.blue,
      light:         brand.blueLight,
      dark:          brand.blueDark,
      contrastText:  '#ffffff',
      gradient:      brand.brandGradient,
    },
    secondary: {
      main:          brand.purple,
      light:         brand.purpleLight,
      dark:          '#7B00E0',
      contrastText:  '#ffffff',
    },
    success: {
      main:  '#10b981',
      light: '#34d399',
      dark:  '#059669',
    },
    warning: {
      main:  brand.orange,
      light: brand.orangeLight,
      dark:  '#CC7000',
    },
    error: {
      main:  '#ef4444',
      light: '#f87171',
      dark:  '#dc2626',
    },
    info: {
      main:  brand.blue,
      light: brand.blueLight,
      dark:  brand.blueDark,
    },
    background: {
      default: '#f0f6fb',
      paper:   '#ffffff',
      subtle:  '#e8f4fb',
    },
    text: {
      primary:   '#0A2540',
      secondary: '#4A6480',
      disabled:  '#b0c4d8',
    },
    divider: '#d0e4f0',
  },

  // ─── Typography ─────────────────────────────────────────────────────────────
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem',  fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem',    fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.5rem',  fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1.125rem',fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontSize: '1rem',    fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.875rem',fontWeight: 500, lineHeight: 1.5 },
    body1:     { fontSize: '1rem',    lineHeight: 1.6 },
    body2:     { fontSize: '0.875rem',lineHeight: 1.6 },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    caption: { fontSize: '0.75rem', lineHeight: 1.5, color: '#4A6480' },
  },

  // ─── Shape ──────────────────────────────────────────────────────────────────
  shape: { borderRadius: 12 },

  // ─── Shadows ────────────────────────────────────────────────────────────────
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,153,212,0.06)',
    '0 1px 3px 0 rgba(0,153,212,0.1), 0 1px 2px 0 rgba(0,153,212,0.06)',
    '0 4px 6px -1px rgba(0,153,212,0.1), 0 2px 4px -1px rgba(0,153,212,0.06)',
    '0 10px 15px -3px rgba(0,153,212,0.1), 0 4px 6px -2px rgba(0,153,212,0.05)',
    '0 20px 25px -5px rgba(0,153,212,0.1), 0 10px 10px -5px rgba(0,153,212,0.04)',
    '0 25px 50px -12px rgba(0,153,212,0.25)',
    '0 1px 3px rgba(0,0,0,0.12), 0 4px 8px rgba(0,153,212,0.08)',
    '0 2px 4px rgba(0,0,0,0.10), 0 8px 16px rgba(0,153,212,0.10)',
    '0 2px 6px rgba(0,0,0,0.10), 0 10px 20px rgba(0,153,212,0.12)',
    '0 4px 8px rgba(0,0,0,0.10), 0 12px 24px rgba(0,153,212,0.12)',
    '0 4px 10px rgba(0,0,0,0.10), 0 14px 28px rgba(0,153,212,0.14)',
    '0 6px 12px rgba(0,0,0,0.10), 0 16px 32px rgba(0,153,212,0.14)',
    '0 6px 14px rgba(0,0,0,0.10), 0 18px 36px rgba(0,153,212,0.16)',
    '0 8px 16px rgba(0,0,0,0.10), 0 20px 40px rgba(0,153,212,0.16)',
    '0 8px 18px rgba(0,0,0,0.10), 0 22px 44px rgba(0,153,212,0.18)',
    '0 10px 20px rgba(0,0,0,0.10), 0 24px 48px rgba(0,153,212,0.18)',
    '0 10px 22px rgba(0,0,0,0.10), 0 26px 52px rgba(0,153,212,0.20)',
    '0 12px 24px rgba(0,0,0,0.12), 0 28px 56px rgba(0,153,212,0.20)',
    '0 12px 26px rgba(0,0,0,0.12), 0 30px 60px rgba(0,153,212,0.22)',
    '0 14px 28px rgba(0,0,0,0.12), 0 32px 64px rgba(0,153,212,0.22)',
    '0 14px 30px rgba(0,0,0,0.14), 0 34px 68px rgba(0,153,212,0.24)',
    '0 16px 32px rgba(0,0,0,0.14), 0 36px 72px rgba(0,153,212,0.24)',
    '0 16px 34px rgba(0,0,0,0.14), 0 38px 76px rgba(0,153,212,0.26)',
    '0 18px 36px rgba(0,0,0,0.16), 0 40px 80px rgba(0,153,212,0.28)',
  ],

  // ─── Component Overrides ────────────────────────────────────────────────────
  components: {
    // Button
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: `0 4px 16px 0 rgba(0,153,212,0.28)`,
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: `0 6px 20px 0 rgba(0,153,212,0.36)`,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
        sizeSmall: { padding: '6px 16px', fontSize: '0.8125rem' },
        sizeLarge: { padding: '12px 24px', fontSize: '0.9375rem' },
      },
    },

    // Card
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0,153,212,0.1), 0 1px 2px 0 rgba(0,153,212,0.06)',
          border: '1px solid rgba(0,153,212,0.08)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 10px 30px -3px rgba(0,153,212,0.15), 0 4px 6px -2px rgba(0,153,212,0.08)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    // Paper
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0,153,212,0.1), 0 1px 2px 0 rgba(0,153,212,0.06)',
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
                borderColor: brand.blue,
              },
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px rgba(0,153,212,0.12)`,
            },
          },
        },
      },
    },

    // Chip
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, fontSize: '0.8125rem' },
        filled: { border: 'none' },
      },
    },

    // Table
    MuiTable: {
      styleOverrides: {
        root: { borderCollapse: 'separate', borderSpacing: 0 },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#e8f4fb',
            fontWeight: 700,
            fontSize: '0.8125rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: brand.blueDark,
            borderBottom: `2px solid rgba(0,153,212,0.2)`,
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
              backgroundColor: 'rgba(0,153,212,0.04)',
              boxShadow: '0 2px 8px rgba(0,153,212,0.08)',
            },
            '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
          },
          '& .MuiTableCell-root': {
            padding: '16px',
            borderBottom: '1px solid rgba(0,153,212,0.08)',
          },
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid rgba(0,153,212,0.15)`,
          boxShadow: 'none',
        },
      },
    },

    // Tabs
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: `2px solid rgba(0,153,212,0.15)` },
        indicator: { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: brand.blue },
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
            color: brand.blue,
            backgroundColor: 'rgba(0,153,212,0.05)',
          },
          '&.Mui-selected': { fontWeight: 700 },
        },
      },
    },

    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, padding: 8 },
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
          backgroundColor: 'rgba(16,185,129,0.08)',
          borderColor: 'rgba(16,185,129,0.3)',
          color: '#059669',
        },
        standardError: {
          backgroundColor: 'rgba(239,68,68,0.08)',
          borderColor: 'rgba(239,68,68,0.3)',
          color: '#dc2626',
        },
        standardWarning: {
          backgroundColor: 'rgba(255,140,0,0.08)',
          borderColor: 'rgba(255,140,0,0.3)',
          color: '#CC7000',
        },
        standardInfo: {
          backgroundColor: 'rgba(0,153,212,0.08)',
          borderColor: 'rgba(0,153,212,0.3)',
          color: brand.blueDark,
        },
      },
    },

    // IconButton
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.2s ease-in-out',
          '&:hover': { backgroundColor: 'rgba(0,153,212,0.08)' },
        },
      },
    },

    // AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0,153,212,0.12), 0 1px 2px 0 rgba(0,153,212,0.06)',
        },
      },
    },

    // Drawer
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '4px 0 24px rgba(0,153,212,0.12)',
        },
      },
    },

    // LinearProgress
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: 'rgba(0,153,212,0.12)' },
        bar: { borderRadius: 4 },
      },
    },
  },

  // ─── Transitions ────────────────────────────────────────────────────────────
  transitions: {
    duration: {
      shortest: 150,
      shorter:  200,
      short:    250,
      standard: 300,
      complex:  375,
      enteringScreen: 225,
      leavingScreen:  195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut:   'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
      sharp:     'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
});

export default theme;
