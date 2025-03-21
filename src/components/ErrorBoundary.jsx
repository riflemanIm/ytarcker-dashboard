import React from "react";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { clearLocalStorage } from "../actions/user";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Обновить состояние с тем, чтобы следующий рендер показал запасной UI.
    console.log("getDerivedStateFromError", error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Можно также сохранить информацию об ошибке в соответствующую службу журнала ошибок
    //logErrorToMyService(error, errorInfo);
    console.log("componentDidCatch error", "\n\n", error, "\n\n");
    console.log("componentDidCatch errorInfo", "\n\n", errorInfo, "\n\n");
  }

  render() {
    if (this.state.hasError) {
      // Можно отрендерить запасной UI произвольного вида
      return (
        <Dialog open={true} keepMounted>
          <DialogContent>
            <Alert severity="error">
              <Typography variant="body2">Something went wrong.</Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                clearLocalStorage();
                window.location.href = "/";
              }}
              style={{ marginRight: 18 }}
            >
              Try Reload page
            </Button>
          </DialogActions>
        </Dialog>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
