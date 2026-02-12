import { getTaskPlanInfo, syncChecklistDataPlan } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import useForm from "@/hooks/useForm";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskPlanInfoItem } from "@/types/global";
import TableTaskPlanInfo from "./TableTaskPlanInfo";

interface SyncChecklistDataPlanDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  initialEntityKey?: string | null;
  onSaved?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
}

type FormValues = {
  entityKey: string;
  updatePlan: boolean;
  rePlan: boolean;
  synchronizePlan: boolean;
};

const createInitialValues = (entityKey?: string | null): FormValues => ({
  entityKey: entityKey ?? "",
  updatePlan: true,
  rePlan: false,
  synchronizePlan: true,
});

export default function SyncChecklistDataPlanDialog({
  open: openProp,
  onOpenChange,
  hideTrigger,
  initialEntityKey,
  onSaved,
  onRefresh,
}: SyncChecklistDataPlanDialogProps) {
  const { dispatch } = useAppContext();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [info, setInfo] = useState<{
    open: boolean;
    loading: boolean;
    rows: TaskPlanInfoItem[];
    taskKey: string | null;
  }>({
    open: false,
    loading: false,
    rows: [],
    taskKey: null,
  });

  const isControlled = openProp != null;
  const resolvedOpen = isControlled ? openProp : internalOpen;

  const validate = useCallback((values: FormValues) => {
    const errs: Partial<Record<keyof FormValues, string>> = {};
    if (!values.entityKey || values.entityKey.trim().length === 0) {
      errs.entityKey = "Укажите ключ задачи, например PMTTASKS-47";
    }
    return errs;
  }, []);

  const submit = async () => {
    const entityKey = values.entityKey.trim();
    if (!entityKey) return;

    setIsLoading(true);
    const res = await syncChecklistDataPlan({
      entityKey,
      updatePlan: values.updatePlan,
      rePlan: values.rePlan,
      synchronizePlan: values.synchronizePlan,
    });
    setIsLoading(false);

    if (res?.result) {
      dispatch({
        type: "setAlert",
        payload: {
          open: true,
          severity: "success",
          message: res.message || "Данные обновлены успешно",
        },
      });
      await onRefresh?.();
      await onSaved?.();
      handleClose();
      return;
    }

    dispatch({
      type: "setAlert",
      payload: {
        open: true,
        severity: "error",
        message: res?.message || "Ошибка синхронизации чек-листов",
      },
    });
  };

  const { values, errors, setValues, setErrors, handleSubmit, handleChange } =
    useForm<FormValues>(submit, validate);

  const handleOpenInfo = useCallback(async () => {
    const taskKey = values.entityKey?.trim();
    if (!taskKey) {
      setErrors((prev) => ({
        ...prev,
        entityKey: "Укажите ключ задачи, например PMTTASKS-47",
      }));
      return;
    }

    setInfo({ open: true, loading: true, rows: [], taskKey });
    try {
      const data = await getTaskPlanInfo(taskKey);
      setInfo((prev) => ({ ...prev, rows: data }));
    } catch (error: any) {
      console.error(
        "[SyncChecklistDataPlanDialog] getTaskPlanInfo error:",
        error?.message,
      );
    } finally {
      setInfo((prev) => ({ ...prev, loading: false }));
    }
  }, [setErrors, values.entityKey]);

  const initializeDialog = useCallback(() => {
    const initialValues = createInitialValues(initialEntityKey);
    setValues(initialValues);
    setErrors(validate(initialValues));
    setInfo({ open: false, loading: false, rows: [], taskKey: null });
  }, [initialEntityKey, setValues, setErrors, validate]);

  const handleOpen = () => {
    initializeDialog();
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      setInternalOpen(true);
    }
  };

  const handleClose = () => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
    }
  };

  useEffect(() => {
    if (!isControlled) return;
    if (openProp) {
      initializeDialog();
    }
  }, [openProp, initializeDialog, isControlled]);

  useEffect(() => {
    if (!isControlled) {
      initializeDialog();
    }
  }, [initializeDialog, isControlled]);

  const isSaveDisabled = useMemo(
    () => isLoading || Object.keys(errors).length > 0,
    [errors, isLoading],
  );

  return (
    <>
      {!hideTrigger && (
        <Tooltip title="Синхронизация данных по задаче">
          <IconButton
            onClick={handleOpen}
            sx={(theme) => ({
              borderRadius: "50%",
              p: 3,
              border: 1,
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              "&:hover": {
                color: theme.palette.success.main,
                borderColor: theme.palette.success.main,
              },
            })}
          >
            <SyncAltIcon />
          </IconButton>
        </Tooltip>
      )}

      <Dialog
        open={resolvedOpen}
        onClose={handleClose}
        maxWidth={info.open ? "md" : "sm"}
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h5" color="success">
              Синхронизация данных по задаче
            </Typography>
            <IconButton
              onClick={handleClose}
              sx={(theme) => ({
                borderRadius: "50%",
                p: 2,
                ml: 2,
                color: theme.palette.background.default,
                background: theme.palette.primary.light,
                "&:hover": {
                  color: theme.palette.background.default,
                  background: theme.palette.primary.main,
                },
              })}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Stack direction="row" spacing={1} alignItems="top" py={2}>
                <TextField
                  label="Ключ задачи"
                  name="entityKey"
                  value={values.entityKey ?? ""}
                  onChange={handleChange}
                  error={Boolean(errors.entityKey)}
                  helperText={errors.entityKey}
                  fullWidth
                  sx={{
                    my: 2,
                  }}
                />
                <Tooltip title="Показать информацию по задаче">
                  <IconButton
                    sx={(theme) => ({
                      borderRadius: "50%",
                      mt: 2,
                      color: theme.palette.background.default,
                      background: theme.palette.primary.light,
                      "&:hover": {
                        color: theme.palette.background.default,
                        background: theme.palette.primary.main,
                      },
                    })}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenInfo();
                    }}
                    disabled={info.loading || !(values.entityKey ?? "").trim()}
                  >
                    <InfoIcon fontSize="large" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
            {info.open && (
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Информация по задаче • {info.taskKey ?? "-"}
                </Typography>
                <TableTaskPlanInfo rows={info.rows} loading={info.loading} />
              </Grid>
            )}
            <Grid size={12}>
              <Typography variant="subtitle1">
                Параметры планирования
              </Typography>
              <Stack spacing={1} mt={1} direction="row">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.updatePlan ?? false}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          updatePlan: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Обновить план"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.rePlan ?? false}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          rePlan: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Перепланировать"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.synchronizePlan ?? false}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          synchronizePlan: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Синхронизировать план"
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSaveDisabled}
          >
            Запустить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
