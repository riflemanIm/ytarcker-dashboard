import { setWorkPlan } from "@/actions/data";
import {
  durationToWorkMinutes,
  isValidDuration,
  normalizeDuration,
  workMinutesToDurationInput,
} from "@/helpers";
import { TaskListItem, WorkPlanItem } from "@/types/global";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import MuiUIPicker from "./MUIDatePicker";
import CloseIcon from "@mui/icons-material/Close";
import { useAppContext } from "@/context/AppContext";
import { getPriorityPalette } from "@/helpers/priorityStyles";

interface SetIssuePlanTableProps {
  open: boolean;
  onClose: () => void;
  issue: TaskListItem | WorkPlanItem | null;
  sprintId: number | null;
  mode?: "add" | "edit";
}

type FormState = {
  sprintId: number | null;
  taskKey: string;
  trackerUid: string;
  checklistItemId: string;
  workName: string;
  deadline: Dayjs | null;
  estimateTimeMinutes: string;
  priority: "Red" | "Orange" | "Green";
};

const isWorkPlanItem = (
  value: TaskListItem | WorkPlanItem | null,
): value is WorkPlanItem => Boolean(value && "YT_TL_WORKPLAN_ID" in value);

const getPriorityValue = (
  value: TaskListItem | WorkPlanItem | null,
): "Red" | "Orange" | "Green" => {
  if (isWorkPlanItem(value)) {
    const priority = value.Priority;
    if (priority === "Red" || priority === "Orange" || priority === "Green") {
      return priority;
    }
  }
  return "Green";
};

const SetIssuePlanTable: FC<SetIssuePlanTableProps> = ({
  open,
  onClose,
  issue,
  sprintId,
  mode = "add",
}) => {
  console.log("issue", issue);
  const { state, dispatch } = useAppContext();
  const { tableTimePlanState } = state;
  const [form, setForm] = useState<FormState>({
    sprintId,
    taskKey: issue?.TaskKey ?? "",
    trackerUid: issue?.trackerUid ?? "",
    checklistItemId: issue?.checklistItemId ?? "",
    workName: issue?.WorkName ?? "",
    deadline:
      issue?.Deadline && dayjs(issue.Deadline).isValid()
        ? dayjs(issue.Deadline)
        : null,
    estimateTimeMinutes: isWorkPlanItem(issue)
      ? workMinutesToDurationInput(issue.EstimateTimeMinutes)
      : workMinutesToDurationInput(issue?.WorkMinutes),
    priority: getPriorityValue(issue),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      sprintId,
      taskKey: issue?.TaskKey ?? "",
      trackerUid: issue?.trackerUid ?? "",
      checklistItemId: issue?.checklistItemId ?? "",
      workName: issue?.WorkName ?? "",
      deadline:
        issue?.Deadline && dayjs(issue.Deadline).isValid()
          ? dayjs(issue.Deadline)
          : null,
      estimateTimeMinutes: isWorkPlanItem(issue)
        ? workMinutesToDurationInput(issue.EstimateTimeMinutes)
        : workMinutesToDurationInput(issue?.WorkMinutes),
      priority: getPriorityValue(issue),
    });
    setErrors({});
  }, [issue, sprintId, open]);

  const validate = (values: FormState) => {
    const nextErrors: Record<string, string> = {};
    if (!values.sprintId) nextErrors.sprintId = "Нужен спринт";
    if (!values.taskKey) nextErrors.taskKey = "Нужен ключ";
    if (!values.trackerUid) nextErrors.trackerUid = "Нужен UID";
    if (!values.workName.trim()) {
      nextErrors.workName = "Название задачи не может быть пустым";
    }
    if (values.deadline && !dayjs(values.deadline).isValid()) {
      nextErrors.deadline = "Укажите корректную дату";
    }

    const normalized = normalizeDuration(values.estimateTimeMinutes ?? "");
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      nextErrors.estimateTimeMinutes = `Значение "${
        values.estimateTimeMinutes ?? ""
      }" не является корректным форматом времени.`;
    }
    return nextErrors;
  };

  const canSubmit = useMemo(
    () => !!form.sprintId && form.taskKey && form.trackerUid && !saving,
    [form.sprintId, form.taskKey, form.trackerUid, saving],
  );
  const sprintName = useMemo(() => {
    const targetId =
      form.sprintId ?? Number(tableTimePlanState.selectedSprintId);
    if (!Number.isFinite(targetId)) return "-";
    return (
      tableTimePlanState.sprins.find(
        (item) => item.yt_tl_sprints_id === targetId,
      )?.sprint ?? "-"
    );
  }, [
    form.sprintId,
    tableTimePlanState.selectedSprintId,
    tableTimePlanState.sprins,
  ]);
  const sprintOptions = useMemo(
    () =>
      mode === "edit"
        ? tableTimePlanState.sprins.filter((item) => !item.archive)
        : tableTimePlanState.sprins,
    [mode, tableTimePlanState.sprins],
  );

  const updateForm = (next: FormState) => {
    setForm(next);
    setErrors(validate(next));
  };

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateForm({ ...form, [field]: event.target.value });
    };

  const handleEstimateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value ?? "";
    updateForm({ ...form, estimateTimeMinutes: raw });
  };

  const handleDeadlineChange = (date: Dayjs | null) => {
    updateForm({ ...form, deadline: date });
  };

  const handleSubmit = async () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const normalizedEstimate = normalizeDuration(
      form.estimateTimeMinutes ?? "",
    );
    const estimateMinutes =
      normalizedEstimate !== ""
        ? durationToWorkMinutes(normalizedEstimate)
        : undefined;
    const action: 0 | 1 = mode === "edit" ? 1 : 0;
    if (action === 1 && !isWorkPlanItem(issue)) {
      setSaving(false);
      return;
    }

    setSaving(true);
    const payload = {
      sprintId: form.sprintId as number,
      taskKey: form.taskKey,
      trackerUid: form.trackerUid,
      action,
      workPlanId: isWorkPlanItem(issue) ? issue.YT_TL_WORKPLAN_ID : undefined,
      checklistItemId: form.checklistItemId || undefined,
      workName: form.workName || undefined,
      deadline: form.deadline
        ? dayjs(form.deadline).format("YYYY-MM-DD")
        : null,
      estimateTimeMinutes: estimateMinutes,
      priority: form.priority,
    };

    try {
      const res = await setWorkPlan(payload);
      if (res?.YT_TL_WORKPLAN_ID != null) {
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({
            ...prev,
            workPlanRefreshKey: prev.workPlanRefreshKey + 1,
          }),
        });
        onClose();
      }
    } catch (error: any) {
      console.error("[SetIssuePlanTable] setWorkPlan error:", error?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">
              {mode === "edit" ? "Изменить запись плана" : "Добавить в план"}
            </Typography>
            <Typography variant="subtitle2">
              {issue?.TaskName} • {form?.taskKey || "-"} • {form?.workName}
            </Typography>
            <Typography variant="subtitle2">Спринт: {sprintName}</Typography>
          </Stack>
          <IconButton
            onClick={onClose}
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
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* <TextField
            label="Tracker UID"
            value={form.trackerUid}
            error={Boolean(errors.trackerUid)}
            helperText={errors.trackerUid}
            fullWidth
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Checklist Item ID"
            value={form.checklistItemId}
            fullWidth
            InputProps={{ readOnly: true }}
          /> */}
          <TextField
            label="Спринт"
            select
            value={form.sprintId ?? ""}
            onChange={(event) =>
              updateForm({
                ...form,
                sprintId: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            error={Boolean(errors.sprintId)}
            helperText={errors.sprintId}
            fullWidth
          >
            {sprintOptions.map((item) => (
              <MenuItem
                key={item.yt_tl_sprints_id}
                value={item.yt_tl_sprints_id}
              >
                {item.sprint}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <MuiUIPicker
              value={form.deadline ?? null}
              handleDateChange={(date) => handleDeadlineChange(date)}
              label="Дедлайн"
              errorText={errors.deadline}
              name="deadline"
              view="day"
            />
            <TextField
              label="Оценка времени (d h m), "
              value={form.estimateTimeMinutes}
              onChange={handleEstimateChange}
              margin="normal"
              error={Boolean(errors.estimateTimeMinutes)}
              helperText={errors.estimateTimeMinutes}
              fullWidth
            />
            <TextField
              label="Приоритет"
              select
              value={form.priority}
              onChange={handleChange("priority")}
              fullWidth
            >
              <MenuItem
                value="Green"
                sx={(theme) => ({
                  backgroundColor: getPriorityPalette(theme).Green.main,
                  color: getPriorityPalette(theme).Green.text,
                  "&:hover": {
                    backgroundColor: getPriorityPalette(theme).Green.hover,
                  },
                  "&.Mui-selected": {
                    backgroundColor: getPriorityPalette(theme).Green.main,
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: getPriorityPalette(theme).Green.hover,
                  },
                })}
              >
                Тривиальный
              </MenuItem>
              <MenuItem
                value="Orange"
                sx={(theme) => ({
                  backgroundColor: getPriorityPalette(theme).Orange.main,
                  color: getPriorityPalette(theme).Orange.text,
                  "&:hover": {
                    backgroundColor: getPriorityPalette(theme).Orange.hover,
                  },
                  "&.Mui-selected": {
                    backgroundColor: getPriorityPalette(theme).Orange.main,
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: getPriorityPalette(theme).Orange.hover,
                  },
                })}
              >
                Важный
              </MenuItem>
              <MenuItem
                value="Red"
                sx={(theme) => ({
                  backgroundColor: getPriorityPalette(theme).Red.main,
                  color: getPriorityPalette(theme).Red.text,
                  "&:hover": {
                    backgroundColor: getPriorityPalette(theme).Red.hover,
                  },
                  "&.Mui-selected": {
                    backgroundColor: getPriorityPalette(theme).Red.main,
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: getPriorityPalette(theme).Red.hover,
                  },
                })}
              >
                Критический
              </MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant="contained"
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetIssuePlanTable;
