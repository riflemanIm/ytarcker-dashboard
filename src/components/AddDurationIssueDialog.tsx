import { SetDataArgs, getIssueTypeList } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import {
  durationToWorkDays,
  isValidDuration,
  normalizeDuration,
  workMinutesToDurationInput,
} from "@/helpers";
import { buildFinalComment, stripRiskBlock } from "@/helpers/issueTypeComment";
import useForm from "@/hooks/useForm";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import {
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
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Issue } from "../types/global";
import MuiUIPicker from "./MUIDatePicker";
import SelectIssueTypeList from "./SelectIssueTypeList";
interface AddDurationIssueDialogProps {
  issues: Issue[];
  setData: (args: SetDataArgs) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialIssue?: Issue | null;
  hideTrigger?: boolean;
}

type FormValues = {
  issue: Issue | null;
  dateTime: Dayjs | null;
  duration: string;
  comment: string;
};

type IssueType = { label: string; hint: string };

const MAX_COMMENT_LENGTH = 200;

export default function AddDurationIssueDialog({
  issues,
  setData,
  open: openProp,
  onOpenChange,
  initialIssue,
  hideTrigger,
}: AddDurationIssueDialogProps) {
  const { state, dispatch } = useAppContext();
  const { token } = state.auth;
  const { tableTimePlanState } = state;
  const trackerUid =
    state.state.userId ||
    state.tableTimePlanState.selectedPatientUid ||
    (Array.isArray(state.state.users) && state.state.users.length === 1
      ? (state.state.users[0]?.id ?? null)
      : null);
  const [internalOpen, setInternalOpen] = useState(false);
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

  const createInitialValues = useCallback(
    (issue: Issue | null = null): FormValues => ({
      issue,
      dateTime: dayjs() as Dayjs | null,
      duration: "",
      comment: "", // ВСЕГДА чистый текст, без тегов
    }),
    [],
  );

  const labels = useMemo(
    () => (issueTypesState.issue_type_list ?? []).map((t) => t.label),
    [issueTypesState.issue_type_list],
  );
  const sprintName = useMemo(() => {
    const targetId = Number(tableTimePlanState.selectedSprintId);
    if (!Number.isFinite(targetId)) return "-";
    return (
      tableTimePlanState.sprins.find(
        (item) => item.yt_tl_sprints_id === targetId,
      )?.sprint ?? "-"
    );
  }, [tableTimePlanState.selectedSprintId, tableTimePlanState.sprins]);

  const buildRiskBlock = () =>
    `[Risks: { deadlineOk: ${riskState.deadlineOk}, needUpgradeEstimate: ${riskState.needUpgradeEstimate}, makeTaskFaster: ${riskState.makeTaskFaster} }]`;

  const appendRisksToComment = (comment: string) => {
    const cleaned = stripRiskBlock(comment);
    const riskBlock = buildRiskBlock();
    return cleaned ? `${cleaned}\n${riskBlock}` : riskBlock;
  };

  // валидация формы (без тегов в comment)
  const validate = (values: FormValues) => {
    const errs: Partial<Record<keyof FormValues, string>> = {};

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

  const formatWorkDays = useCallback((value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return "-";
    const sign = value < 0 ? "-" : "";
    return `${sign}${workMinutesToDurationInput(Math.abs(value))}`;
  }, []);

  const submit = () => {
    // Жёсткая проверка на выбранный тип при наличии списка
    if (labels.length > 0 && !selectedIssueType) return;

    const issueKey =
      (values.issue as any)?.TaskKey ?? values.issue?.key ?? null;
    if (!issueKey) return;
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
      issueId: issueKey,
      duration: normalizeDuration(values.duration ?? ""),
      comment: finalWithRisks, // тег и риски добавляются здесь
      checklistItemId: (values.issue as any)?.checklistItemId ?? undefined,
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

    handleClose();
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
    const key = (values.issue as any)?.TaskKey ?? values.issue?.key;
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
    if (selectedIssueType) return;
    const presetLabel =
      (values.issue as any)?.WorkNameDict ??
      (values.issue as any)?.issueTypeLabel ??
      null;
    if (presetLabel && labels.includes(presetLabel)) {
      setSelectedIssueType(presetLabel);
      return;
    }
    if (labels.length === 1) {
      setSelectedIssueType(labels[0]);
    }
  }, [issueTypesState.loaded, labels, selectedIssueType, values.issue]);

  const isControlled = openProp != null;
  const resolvedOpen = isControlled ? openProp : internalOpen;

  const initializeDialog = useCallback(
    (issue: Issue | null = null) => {
      setValues(createInitialValues(issue));
      setErrors({});
      setIssueTypesState({ issue_type_list: [], loaded: true });
      setSelectedIssueType(null);
      setRiskState({
        deadlineOk: true,
        needUpgradeEstimate: false,
        makeTaskFaster: false,
      });
    },
    [createInitialValues, setValues, setErrors],
  );

  const handleOpen = () => {
    initializeDialog(initialIssue ?? null);
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
      initializeDialog(initialIssue ?? null);
    }
  }, [openProp, initialIssue, initializeDialog, isControlled]);

  // Ошибка под селектом показывается, если:
  //  - список типов не пуст, и
  //  - тип не выбран, и
  //  - пользователь либо взаимодействовал с селектом, либо уже пытался сохранить
  const showTypeError = labels.length > 0 && !selectedIssueType;

  const isSaveDisabled =
    !issueTypesState.loaded ||
    Object.keys(errors).length > 0 ||
    (labels.length > 0 && !selectedIssueType);

  const hasTaskKey = Boolean(
    (values.issue as any)?.TaskKey ?? (values.issue as any)?.taskKey,
  );
  const planTask = values.issue as any;
  const headerTaskName = planTask?.TaskName ?? planTask?.summary ?? "-";
  const headerTaskKey =
    planTask?.taskKey ?? planTask?.TaskKey ?? planTask?.key ?? "-";
  const headerWorkName = planTask?.workName ?? planTask?.WorkName ?? "-";

  const remainTimeMinutes =
    (values.issue as any)?.remainTimeMinutes ??
    (values.issue as any)?.RemainTimeMinutes ??
    null;

  const remainingInfo = useMemo(() => {
    if (remainTimeMinutes == null) return null;
    const normalized = normalizeDuration(values.duration ?? "");
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      return null;
    }
    const planned = durationToWorkDays(normalized);
    if (!Number.isFinite(planned)) return null;
    return planned - remainTimeMinutes;
  }, [values.duration, remainTimeMinutes]);

  const planningSection = remainTimeMinutes != null && (
    <>
      <Typography variant="subtitle1">Планирование</Typography>
      <Stack direction="row" spacing={2} alignItems="center" mt={1}>
        <Typography variant="subtitle2">
          Осталось времени = {formatWorkDays(remainingInfo)}
        </Typography>
      </Stack>
    </>
  );

  const riskSection = (
    <>
      <Typography variant="subtitle1">Риски по задаче</Typography>
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
    </>
  );

  return (
    <>
      {!hideTrigger && (
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
      )}

      <Dialog open={resolvedOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h5" color="success">
              Добавить затраченное время по задаче
            </Typography>
            {hasTaskKey && (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">
                  {headerTaskName} • {headerTaskKey} • {headerWorkName}
                </Typography>
                <Typography variant="subtitle2">
                  Спринт: {sprintName}
                </Typography>
              </Stack>
            )}
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
            {!hasTaskKey && (
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
            )}

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

            {remainTimeMinutes != null && (
              <>
                <Grid size={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>{riskSection}</Grid>
                <Grid size={{ xs: 12, md: 6 }}>{planningSection}</Grid>
              </>
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
