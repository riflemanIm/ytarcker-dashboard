import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import axios from "axios";
import { FC, useEffect, useMemo, useState } from "react";

const AppUpdateDialog: FC = () => {
  const currentVersion = useMemo(() => __APP_VERSION__, []);
  const [open, setOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const fetchLatestVersion = async () => {
      try {
        const response = await axios.get<{ version?: string }>(
          `/version.json?t=${Date.now()}`,
        );
        const remoteVersion = response.data?.version ?? null;
        if (!isActive || !remoteVersion) return;
        setLatestVersion(remoteVersion);
        if (remoteVersion !== currentVersion) {
          setOpen(true);
        }
      } catch (error) {
        console.warn("[AppUpdateDialog] version.json fetch failed:", error);
      }
    };
    fetchLatestVersion();
    const intervalId = window.setInterval(fetchLatestVersion, 10_000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [currentVersion]);

  const handleConfirm = () => {
    window.location.reload();
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Доступна новая версия</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography>
            Обнаружена новая версия приложения. Обновить сейчас?
          </Typography>
          <Stack spacing={0.5}>
            {latestVersion && (
              <Typography variant="body2" color="text.secondary">
                Доступна версия: {latestVersion}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Текущая версия: {currentVersion}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Позже
        </Button>
        <Button onClick={handleConfirm} variant="contained">
          Обновить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppUpdateDialog;
