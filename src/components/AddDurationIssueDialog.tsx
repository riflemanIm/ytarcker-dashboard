import { SetDataArgs } from "@/actions/data";
import { isValidDuration, normalizeDuration } from "@/helpers";
import AddIcon from "@mui/icons-material/Add";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import useForm from "@/hooks/useForm";
import type { AlertState, AppState, Issue } from "../types/global";
import MuiUIPicker from "./MUIDatePicker";
import SelectIssueTypeList from "./SelectIssueTypeList";
import { useIssueTypeTags } from "@/hooks/useIssueTypeTags";

interface AddDurationIssueDialogProps {
  issues: Issue[];
  setData: (args: SetDataArgs) => void;
  setAlert: (alert: AlertState) => void;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  token: string | null;
}

const MAX_COMMENT_LENGTH = 200;

export default function AddDurationIssueDialog({
  issues,
  setData,
  setAlert,
  setState,
  token,
}: AddDurationIssueDialogProps) {
  const [open, setOpen] = useState(false);

  const initialValues = {
    issue: null as Issue | null,
    dateTime: dayjs() as Dayjs | null,
    duration: "",
    comment: "",
  };

  const validate = (values: typeof initialValues) => {
    const errs: Partial<Record<keyof typeof initialValues, string>> = {};

    if (!values.issue) {
      errs.issue = "Выберите задачу";
    }
    if (!values.dateTime || !dayjs(values.dateTime).isValid()) {
      errs.dateTime = "Укажите дату и время";
    }

    const rawDuration = values.duration ?? ""; // ✅ защита
    const normalized = normalizeDuration(rawDuration); // ✅ теперь не падает
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      errs.duration = `Значение "${rawDuration}" не является корректным форматом времени.`;
    }

    const comment = values.comment ?? ""; // ✅ защита
    if (comment.length > MAX_COMMENT_LENGTH) {
      errs.comment = `Максимум ${MAX_COMMENT_LENGTH} символов`;
    }

    return errs;
  };

  const submit = () => {
    const dateCell = dayjs(values.dateTime);
    setData({
      dateCell,
      setState,
      setAlert,
      token,
      issueId: values.issue!.key,
      duration: normalizeDuration(values.duration ?? ""),
      comment: values.comment ?? "",
      addEndWorkDayTime: false,
    } as SetDataArgs);

    setAlert({
      open: true,
      severity: "success",
      message: "Отметка задачи сохранена",
    });
    setOpen(false);
  };

  const {
    values,
    errors,
    setValues,
    setErrors,
    handleDateChange,
    handleSubmit,
  } = useForm(submit, validate);

  // === ИСПОЛЬЗУЕМ ХУК С ТИПАМИ ===
  const issueKey = values.issue?.key ?? null;
  const {
    issueTypes,
    loading,
    selectedLabel,
    onSelect,
    hasTypeInComment,
    selectError,
    selectHelperText,
    reset,
  } = useIssueTypeTags({
    token,
    issueKey,
    comment: values.comment,
    setComment: (v) =>
      setValues((prev) => ({
        ...prev,
        comment: typeof v === "function" ? (v as any)(prev.comment) : v,
      })),
    autoApplySingle: true, // автоподстановка единственного типа — только для новой записи
  });

  // если меняется комментарий/валидируем — обновляем ошибки формы
  useEffect(() => {
    // перевалидация при изменении комментария (из-за меток)
    setErrors((prev) => ({ ...validate(values) }));
  }, [values.comment]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSaveDisabled =
    loading || // ждём типы
    Object.keys(errors).length > 0 ||
    selectError; // нет ни одной метки типа в комментарии

  const handleOpen = () => {
    setValues(initialValues);
    setErrors({});
    reset();
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="Добавить затраченное время по задаче">
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
          <AddIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h5" color="success">
            Добавить затраченное время по задаче
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Autocomplete
                options={issues}
                getOptionLabel={(opt) => `[${opt.key}] ${opt.summary}`}
                value={values.issue}
                onChange={(_, val) => {
                  setValues((prev) => ({ ...prev, issue: val, comment: "" }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.comment;
                    return next;
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Задача"
                    error={Boolean(errors.issue)}
                    helperText={errors.issue}
                    fullWidth
                  />
                )}
                renderOption={(props, option) => (
                  <Grid {...props} container spacing={2}>
                    <Grid size={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        [{option.key}]
                      </Typography>
                    </Grid>
                    <Grid size={9}>
                      <Typography variant="subtitle1">
                        {option.summary}
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              />
            </Grid>

            <Grid size={6}>
              <MuiUIPicker
                value={values.dateTime ?? null}
                handleDateChange={(date) =>
                  handleDateChange(dayjs(date), "dateTime")
                }
                label="Дата"
                errorText={errors.dateTime}
                name="dateTime"
                view="day"
              />
            </Grid>

            <Grid size={6}>
              <TextField
                label="Длительность"
                value={values.duration ?? ""} // ✅
                onChange={(e) => {
                  const raw = e.target.value ?? ""; // ✅
                  const newVals = { ...values, duration: raw };
                  setValues(newVals);
                  setErrors(validate(newVals));
                }}
                margin="normal"
                error={Boolean(errors.duration)}
                helperText={errors.duration}
                fullWidth
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Комментарий"
                value={values.comment ?? ""} // ✅
                onChange={(e) => {
                  const raw = e.target.value ?? ""; // ✅
                  const newVals = { ...values, comment: raw };
                  setValues(newVals);
                  setErrors(validate(newVals));
                }}
                name="comment"
                multiline
                minRows={3}
                error={Boolean(errors.comment)}
                helperText={errors.comment}
                fullWidth
              />
            </Grid>

            {values.issue && (
              <Grid size={12}>
                <SelectIssueTypeList
                  issueTypes={issueTypes}
                  handleIssueTypeChange={onSelect}
                  selectedIssueTypeLabel={selectedLabel ?? ""}
                  margin="dense"
                  required
                  error={selectError}
                  helperText={selectHelperText}
                  loading={loading}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSaveDisabled}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
