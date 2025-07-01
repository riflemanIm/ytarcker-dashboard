import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import dayjs, { Dayjs } from "dayjs";
import React, { useState } from "react";
import MuiUIPicker from "./MUIDatePicker";
import AddIcon from "@mui/icons-material/Add";
import { SetDataArgs } from "@/actions/data";
import { isValidDuration, normalizeDuration } from "@/helpers";
import useForm from "../helpers/useForm";
import type { AlertState, AppState, Issue } from "../types/global";

interface AddDurationIssueDialogProps {
  issues: Issue[];
  /** Подготовить данные для сохранения новой/обновлённой отметки */
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

    // Проверка длительности через normalizeDuration и isValidDuration
    const normalized = normalizeDuration(values.duration);
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      errs.duration = `Значение "${values.duration}" не является корректным форматом времени.`;
    }

    if (values.comment.length > MAX_COMMENT_LENGTH) {
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
      duration: normalizeDuration(values.duration),
      comment: values.comment,
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

  const handleOpen = () => {
    setValues(initialValues);
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="Добавить затраченное время по задаче">
        {" "}
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
                onChange={(_, val) =>
                  setValues((prev) => ({ ...prev, issue: val }))
                }
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
                      </Typography>{" "}
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
                handleDateChange={(date) => handleDateChange(date, "dateTime")}
                disablePast
                label="Дата"
                errorText={errors.dateTime}
                name="dateTime"
                view="day"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Длительность"
                value={values.duration}
                onChange={(e) => {
                  const raw = e.target.value;
                  const norm = normalizeDuration(raw);
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
                name="comment"
                multiline
                minRows={3}
                value={values.comment}
                onChange={(e) => {
                  const newVals = { ...values, comment: e.target.value };
                  setValues(newVals);
                  setErrors(validate(newVals));
                }}
                error={Boolean(errors.comment)}
                helperText={errors.comment}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={Object.keys(errors).length > 0}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
