import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * Shows all cross-tab validation issues before the final submit.
 *
 * Props:
 *  open          - boolean
 *  onClose       - () => void  — dismiss without navigating
 *  onGoToTab     - (tabIndex: number) => void  — jump to the offending tab
 *  tabErrors     - Array<{ tabIndex: number, tabLabel: string, fields: string[] }>
 */
const ValidationSummaryDialog = ({ open, onClose, onGoToTab, tabErrors = [] }) => {
  const hasErrors = tabErrors.some(t => t.fields.length > 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        <Typography variant="h6" component="span" fontWeight={600}>
          Please fix these issues before submitting
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {!hasErrors ? (
          <Typography color="text.secondary">No validation issues found.</Typography>
        ) : (
          tabErrors.map((tab) =>
            tab.fields.length > 0 ? (
              <React.Fragment key={tab.tabIndex}>
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ mt: 1, mb: 0.5, fontWeight: 600 }}
                >
                  {tab.tabLabel}
                </Typography>
                <List dense disablePadding>
                  {tab.fields.map((field) => (
                    <ListItem
                      key={field}
                      disablePadding
                      secondaryAction={
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => { onGoToTab(tab.tabIndex); onClose(); }}
                        >
                          Go to tab
                        </Button>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ErrorOutlineIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={field}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </React.Fragment>
            ) : null
          )
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Review form
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ValidationSummaryDialog;
