import React from "react";

// context
import { useUserStateDispatch } from "../context/UserContext";

import { Alert, Dialog, DialogContent, Typography } from "@mui/material";

// ----------------------------------------------------------------------

const ModalError = ({ serverResponseDictsError }) => {
  return (
    <Dialog open={true} keepMounted>
      <DialogContent>
        <Alert severity="error">
          <Typography variant="h6">{serverResponseDictsError}</Typography>
        </Alert>
      </DialogContent>
    </Dialog>
  );
};

export default function CatchErrorApp() {
  const { userState } = useUserStateDispatch();

  const { serverResponseDictsError } = userState;

  return serverResponseDictsError ? (
    <ModalError serverResponseDictsError={serverResponseDictsError} />
  ) : (
    <React.Fragment />
  );
}
