import { SetDataArgs, getIssueTypeList } from "@/actions/data";
import { isValidDuration, normalizeDuration } from "@/helpers";
import { buildFinalComment } from "@/helpers/issueTypeComment";
import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import dayjs, { Dayjs } from "dayjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import useForm from "@/hooks/useForm";
import type { Issue } from "../types/global";
import MuiUIPicker from "./MUIDatePicker";
import SelectIssueTypeList from "./SelectIssueTypeList";

interface AddDurationIssueDialogProps {
  issues: Issue[];
  setData: (args: SetDataArgs) => void;
}

type IssueType = { label: string; hint: string };

const MAX_COMMENT_LENGTH = 200;

export default function AddDurationIssueDialog({
  issues,
  setData,
}: AddDurationIssueDialogProps) {
  const { state, dispatch } = useAppContext();
  const { token } = state.auth;
  const trackerUid =
    state.state.userId ||
    state.tableTimePlanState.selectedPatientUid ||
    (Array.isArray(state.state.users) && state.state.users.length === 1
      ? state.state.users[0]?.id ?? null
      : null);
  const [open, setOpen] = useState(false);
  const [riskState, setRiskState] = useState({
    deadlineOk: true,
    needUpgradeEstimate: false,
    makeTaskFaster: false,
  });

  // список типов по выбранной задаче
  const [issueTypesState, setIssueTypesState] = useState<{
    issue_type_list: IssueType[];
    loaded: boolean;
  }>({ issue_type_list: [], loaded: true });

  // выбранный тип (только значение label; тег в комментарий НЕ вставляем до сохранения)
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(
    null,
  );

  const initialValues = {
    issue: null as Issue | null,
    dateTime: dayjs() as Dayjs | null,
    duration: "",
    comment: "", // ВСЕГДА чистый текст, без тегов
  };

  const labels = useMemo(
    () => (issueTypesState.issue_type_list ?? []).map((t) => t.label),
    [issueTypesState.issue_type_list],
  );

  const buildRiskBlock = () =>
    `[Risks: { deadlineOk: ${riskState.deadlineOk}, needUpgradeEstimate: ${riskState.needUpgradeEstimate}, makeTaskFaster: ${riskState.makeTaskFaster} }]`;

  const appendRisksToComment = (comment: string) => {
    const cleaned = (comment ?? "")
      .replace(/\n?\[Risks:\s*\{[\s\S]*?\}\s*\]/m, "")
      .trimEnd();
    const riskBlock = buildRiskBlock();
    return cleaned ? `${cleaned}\n${riskBlock}` : riskBlock;
  };

  // валидация формы (без тегов в comment)
  const validate = (values: typeof initialValues) => {
    const errs: Partial<Record<keyof typeof initialValues, string>> = {};

    if (!values.issue) {
      errs.issue = "Выберите задачу";
    }
    if (!values.dateTime || !dayjs(values.dateTime).isValid()) {
      errs.dateTime = "Укажите дату и время";
    }

    const normalized = normalizeDuration(values.duration ?? "");
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      errs.duration = `Значение "${values.duration ?? ""}" не является корректным форматом времени.`;
    }

    if ((values.comment ?? "").length > MAX_COMMENT_LENGTH) {
      errs.comment = `Максимум ${MAX_COMMENT_LENGTH} символов`;
    }

    // требование выбора типа здесь не подсвечиваем, чтобы
    // не показывать ошибку раньше времени (см. showTypeError ниже)
    return errs;
  };

  const submit = () => {
    // Жёсткая проверка на выбранный тип при наличии списка
    if (labels.length > 0 && !selectedIssueType) return;

    const dateCell = dayjs(values.dateTime);
    const finalComment = buildFinalComment(
      values.comment ?? "",
      selectedIssueType ?? undefined,
    );
    const finalWithRisks = appendRisksToComment(finalComment);

    setData({
      dateCell,
      dispatch,
      token,
      issueId: values.issue!.key,
      duration: normalizeDuration(values.duration ?? ""),
      comment: finalWithRisks, // тег и риски добавляются здесь
      deadlineOk: riskState.deadlineOk,
      needUpgradeEstimate: riskState.needUpgradeEstimate,
      makeTaskFaster: riskState.makeTaskFaster,
      addEndWorkDayTime: false,
      trackerUid,
    } as SetDataArgs);

    dispatch({
      type: "setAlert",
      payload: {
        open: true,
        severity: "success",
        message: "Отметка задачи сохранена",
      },
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

  // загрузка типов при выборе задачи
  useEffect(() => {
    const key = values.issue?.key;
    if (key) {
      setIssueTypesState((prev) => ({ ...prev, loaded: false }));
      getIssueTypeList({
        setLocalState: setIssueTypesState as any,
        token,
        entityKey: key,
      });
      // сброс селекта и UI-флагов
      setSelectedIssueType(null);
    } else {
      setIssueTypesState({ issue_type_list: [], loaded: true });
      setSelectedIssueType(null);
    }
  }, [values.issue, token]);

  // автоселект единственного типа
  useEffect(() => {
    if (!issueTypesState.loaded) return;
    if (labels.length === 1 && !selectedIssueType) {
      setSelectedIssueType(labels[0]);
    }
  }, [issueTypesState.loaded, labels, selectedIssueType]);

  const handleOpen = () => {
    setValues(initialValues);
    setErrors({});
    setIssueTypesState({ issue_type_list: [], loaded: true });
    setSelectedIssueType(null);
    setRiskState({
      deadlineOk: true,
      needUpgradeEstimate: false,
      makeTaskFaster: false,
    });

    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // Ошибка под селектом показывается, если:
  //  - список типов не пуст, и
  //  - тип не выбран, и
  //  - пользователь либо взаимодействовал с селектом, либо уже пытался сохранить
  const showTypeError = labels.length > 0 && !selectedIssueType;

  const isSaveDisabled =
    !issueTypesState.loaded ||
    Object.keys(errors).length > 0 ||
    (labels.length > 0 && !selectedIssueType);

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
                  // при смене задачи сбросим комментарий и ошибки по нему
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
                  // ВАЖНО: props должны быть на li, а не на Grid
                  <Grid container spacing={2} component="li" {...props}>
                    <Grid size={3} component="div">
                      <Typography variant="subtitle2" color="text.secondary">
                        [{option.key}]
                      </Typography>
                    </Grid>
                    <Grid size={9} component="div">
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
                value={values.duration ?? ""}
                onChange={(e) => {
                  const raw = e.target.value ?? "";
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
                value={values.comment ?? ""} // ВСЕГДА чистый (без тегов)
                onChange={(e) => {
                  const newVals = { ...values, comment: e.target.value ?? "" };
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
                  handleIssueTypeChange={(label) => {
                    setSelectedIssueType(label || null);
                  }}
                  selectedIssueTypeLabel={selectedIssueType ?? ""}
                  margin="dense"
                  required
                  error={showTypeError}
                  helperText={showTypeError ? "Укажите тип задачи" : ""}
                  loading={!issueTypesState.loaded}
                />
              </Grid>
            )}

            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1">Риски по задаче</Typography>
            </Grid>

            <Grid size={12}>
              <Stack spacing={1} mt={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={riskState.deadlineOk}
                      onChange={(e) =>
                        setRiskState((prev) => ({
                          ...prev,
                          deadlineOk: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Подтверждаю выполнение в срок"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={riskState.needUpgradeEstimate}
                      onChange={(e) =>
                        setRiskState((prev) => ({
                          ...prev,
                          needUpgradeEstimate: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Требуется увеличить оценку времени"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={riskState.makeTaskFaster}
                      onChange={(e) =>
                        setRiskState((prev) => ({
                          ...prev,
                          makeTaskFaster: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Сделаю быстрее (оценка)"
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
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
