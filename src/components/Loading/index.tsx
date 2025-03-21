import React from 'react';
import {
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
interface LoadingProps {
  msg?: string;
  isLinear?: boolean;
  size?: number;
  variant?: 'h4' | 'h5' | 'h6' | 'body1' | 'body2';
}

const Loading: React.FC = ({
  msg,
  isLinear = false,
  size = 38,
  variant = 'h5',
}: LoadingProps) => (
  <Grid
    container
    spacing={3}
    sx={{
      width: '100%',
      height: '100%',
    }}
    alignItems="center"
    justifyContent="center"
  >
    {msg != null && (
      <Grid size="grow">
        <Typography variant={variant}>{msg}</Typography>
      </Grid>
    )}
    <Grid
      size={msg != null && !isLinear ? 1.5 : 12}
      textAlign="center"
    >
      {!isLinear ? (
        <CircularProgress size={size} />
      ) : (
        <LinearProgress />
      )}
    </Grid>
  </Grid>
);

export default Loading;
