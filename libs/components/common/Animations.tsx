import React from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

interface AnimatedSnackbarProps {
  open: boolean;
  onClose: () => void;
  message: string;
  severity?: 'success' | 'info' | 'warning' | 'error';
}

export default function AnimatedSnackbar({
  open,
  onClose,
  message,
  severity = 'info',
}: AnimatedSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3500}
      onClose={onClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        '& .MuiPaper-root': {
          bgcolor: 'rgba(55, 65, 81, 0.95)', // dark background with opacity
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: '600',
          padding: '16px 32px',
          borderRadius: '8px',
          boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
          minWidth: '320px',
          textAlign: 'center',
        },
      }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          bgcolor: 'transparent',
          color: 'inherit',
          boxShadow: 'none',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          padding: 0,
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

