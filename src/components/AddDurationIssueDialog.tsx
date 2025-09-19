import { SetDataArgs } from "@/actions/data";
import { getIssueTypeList } from "@/actions/data";
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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import useForm from "../helpers/useForm";
import type { AlertState, AppState, Issue } from "../types/global";
import MuiUIPicker from "./MUIDatePicker";
import SelectIssueTypeList from "./SelectIssueTypeList";

interface AddDurationIssueDialogProps {
  issues: Issue[];
  /** Подготовить данные для сохранения новой/обновлённой отметки */
  setData: (args: SetDataArgs) => void;
  setAlert: (alert: AlertState) => void;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  token: string | null;
}

type IssueType = { label: string; hint: string };

const MAX_COMMENT_LENGTH = 200;

export default function AddDurationIssueDialog({
  issues,
  setData,
  setAlert,
  setState,
  token,
}: AddDurationIssueDialogProps) {
  const [open, setOpen] = useState(false);

  // --- локальный state для списка типов (совместим с getIssueTypeList)
  const [issueTypesState, setIssueTypesState] = useState<{
    issue_type_list: IssueType[];
    loaded: boolean;
  }>({ issue_type_list: [], loaded: true });

  // --- контролируемое значение селекта (чтобы очищать после выбора)
  const [selectedIssueTypeLabel, setSelectedIssueTypeLabel] =
    useState<string>("");

  const initialValues = {
    issue: null as Issue | null,
    dateTime: dayjs() as Dayjs | null,
    duration: "",
    comment: "",
  };

  // helpers
  const mergeCommentWithIssueType = useCallback(
    (comment: string, label?: string | null) => {
      const base = (comment ?? "").trim();
      const tag = (label ?? "").trim();
      if (!tag) return base;

      // Уже есть такой тег?
      const parts = base
        .split("•")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.includes(tag)) return base;

      // Если пусто — начинаем с "• tag", иначе добавляем " • tag"
      return base ? `${base} • ${tag}` : `• ${tag}`;
    },
    []
  );

  const commentHasAnyIssueType = useCallback(
    (comment: string) => {
      const list = issueTypesState.issue_type_list;
      if (!list || list.length === 0) return false;
      const c = (comment ?? "").trim();
      if (!c) return false;
      return list.some((t) => t.label && c.includes(t.label));
    },
    [issueTypesState.issue_type_list]
  );

  // validate учитывает обязательность типа (через содержание комментария)
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

    // Обязательность выбора типа (через присутствие метки в комментарии)
    if (!commentHasAnyIssueType(values.comment)) {
      // если уже есть ошибка длины, оставляем её; иначе — требование типа
      errs.comment = errs.comment ?? "Укажите тип задачи";
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
      comment: values.comment, // тип уже добавлен при выборе
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

  // подгружаем issue types при выборе задачи
  useEffect(() => {
    const key = values.issue?.key;
    if (key) {
      // показываем скелетон при загрузке (если нужно)
      setIssueTypesState((prev) => ({ ...prev, loaded: false }));
      getIssueTypeList({
        setLocalState: setIssueTypesState as any, // сигнатура как в других местах
        token,
        entityKey: key,
      });
    } else {
      setIssueTypesState({ issue_type_list: [], loaded: true });
    }
    // и чистим выбранное значение селекта
    setSelectedIssueTypeLabel("");
  }, [values.issue, token]);

  // выбор в SelectIssueTypeList — сразу добавляем в комментарий и очищаем селект
  const handleIssueTypeChange = useCallback(
    (label: string) => {
      setSelectedIssueTypeLabel(label || "");

      const merged = mergeCommentWithIssueType(values.comment, label);
      const newVals = { ...values, comment: merged };
      setValues(newVals);
      setErrors(validate(newVals));
    },
    [mergeCommentWithIssueType, setErrors, setValues, validate, values]
  );
  const handleOpen = () => {
    setValues(initialValues);
    setErrors({});
    setIssueTypesState({ issue_type_list: [], loaded: true });
    setSelectedIssueTypeLabel("");
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // вычисления для ошибок селекта (required/error/helperText)
  const selectError = useMemo(
    () => !commentHasAnyIssueType(values.comment),
    [commentHasAnyIssueType, values.comment]
  );
  const selectHelper = selectError ? "Укажите тип задачи" : "";

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
                  setValues((prev) => ({ ...prev, issue: val }));
                  // при смене задачи — сбросим комментарий и ошибки по типу
                  setValues((prev) => ({ ...prev, comment: "" }));
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
                handleDateChange={(date) => {
                  handleDateChange(dayjs(date), "dateTime");
                }}
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

            {values.issue && (
              <Grid size={12}>
                <SelectIssueTypeList
                  issueTypes={issueTypesState.issue_type_list}
                  handleIssueTypeChange={handleIssueTypeChange}
                  selectedIssueTypeLabel={selectedIssueTypeLabel}
                  margin="dense"
                  required
                  // error={selectError}
                  // helperText={selectHelper}
                  loading={!issueTypesState.loaded} // NEW
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
            disabled={
              !issueTypesState.loaded || // NEW: ждём типы
              Object.keys(errors).length > 0 ||
              selectError
            }
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
