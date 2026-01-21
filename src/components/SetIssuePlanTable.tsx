import { setWorkPlan } from "@/actions/data";
import {
  durationToWorkDays,
  isValidDuration,
  normalizeDuration,
  workDaysToDurationInput,
} from "@/helpers";
import { TaskListItem } from "@/types/global";
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

interface SetIssuePlanTableProps {
  open: boolean;
  onClose: () => void;
  issue: TaskListItem | null;
  sprintId: number | null;
}

type FormState = {
  sprintId: number | null;
  taskKey: string;
  trackerUid: string;
  checklistItemId: string;
  workName: string;
  deadline: Dayjs | null;
  estimateTimeDays: string;
  priority: "Red" | "Orange" | "Green";
};

const SetIssuePlanTable: FC<SetIssuePlanTableProps> = ({
  open,
  onClose,
  issue,
  sprintId,
}) => {
  const { tableTimePlanState } = useAppContext();
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
    estimateTimeDays: workDaysToDurationInput(issue?.WorkDays),
    priority: "Green",
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
      estimateTimeDays: workDaysToDurationInput(issue?.WorkDays),
      priority: "Green",
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

    const normalized = normalizeDuration(values.estimateTimeDays ?? "");
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      nextErrors.estimateTimeDays = `Значение "${
        values.estimateTimeDays ?? ""
      }" не является корректным форматом времени.`;
    }
    return nextErrors;
  };

  const canSubmit = useMemo(
    () => !!form.sprintId && form.taskKey && form.trackerUid && !saving,
    [form.sprintId, form.taskKey, form.trackerUid, saving]
  );
  const sprintName = useMemo(() => {
    const targetId = form.sprintId ?? Number(tableTimePlanState.selectedSprintId);
    if (!Number.isFinite(targetId)) return "-";
    return (
      tableTimePlanState.sprins.find(
        (item) => item.yt_tl_sprints_id === targetId
      )?.sprint ?? "-"
    );
  }, [form.sprintId, tableTimePlanState.selectedSprintId, tableTimePlanState.sprins]);

  const updateForm = (next: FormState) => {
    setForm(next);
    setErrors(validate(next));
  };

  const handleChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateForm({ ...form, [field]: event.target.value });
  };

  const handleEstimateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value ?? "";
    updateForm({ ...form, estimateTimeDays: raw });
  };

  const handleDeadlineChange = (date: Dayjs | null) => {
    updateForm({ ...form, deadline: date });
  };

  const handleSubmit = async () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const normalizedEstimate = normalizeDuration(form.estimateTimeDays ?? "");
    const estimateDays =
      normalizedEstimate !== ""
        ? durationToWorkDays(normalizedEstimate)
        : undefined;

    setSaving(true);
    const payload = {
      sprintId: form.sprintId as number,
      taskKey: form.taskKey,
      trackerUid: form.trackerUid,
      checklistItemId: form.checklistItemId || undefined,
      workName: form.workName || undefined,
      deadline: form.deadline ? dayjs(form.deadline).format("YYYY-MM-DD") : null,
      estimateTimeDays: estimateDays,
      priority: form.priority,
    };

    try {
      const res = await setWorkPlan(payload);
      if (res?.YT_TL_WORKPLAN_ID) {
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
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">Добавить в план</Typography>
            <Typography variant="subtitle1">
              Спринт: {sprintName} • Key: {form.taskKey || "-"}
            </Typography>
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
          <TextField
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
          />
          <TextField
            label="Название работы"
            value={form.workName}
            onChange={handleChange("workName")}
            error={Boolean(errors.workName)}
            helperText={errors.workName}
            fullWidth
          />
          <MuiUIPicker
            value={form.deadline ?? null}
            handleDateChange={(date) => handleDeadlineChange(date)}
            label="Дедлайн"
            errorText={errors.deadline}
            name="deadline"
            view="day"
          />
          <TextField
            label="Оценка времени в днях."
            value={form.estimateTimeDays}
            onChange={handleEstimateChange}
            margin="normal"
            error={Boolean(errors.estimateTimeDays)}
            helperText={errors.estimateTimeDays}
            fullWidth
          />
          <TextField
            label="Приоритет"
            select
            value={form.priority}
            onChange={handleChange("priority")}
            fullWidth
          >
            <MenuItem value="Green">Green</MenuItem>
            <MenuItem value="Orange">Orange</MenuItem>
            <MenuItem value="Red">Red</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} variant="contained">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetIssuePlanTable;
