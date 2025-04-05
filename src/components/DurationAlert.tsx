import React, { FC } from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";

interface DurationAlertProps {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
  severity?: AlertColor;
}

const DurationAlert: FC<DurationAlertProps> = ({
  open,
  message,
  onClose,
  duration = 10000,
  severity = "error",
}) => (
  <Snackbar
    open={open}
    autoHideDuration={duration}
    onClose={onClose}
    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    TransitionProps={{ timeout: { enter: 500, exit: 500 } }}
  >
    <Alert severity={severity} variant="filled" onClose={onClose}>
      {message}
    </Alert>
  </Snackbar>
);

export default DurationAlert;
