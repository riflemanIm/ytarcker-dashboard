import { setWorkPlan } from "@/actions/data";
import { TaskListItem } from "@/types/global";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";

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
  deadline: string;
  estimateTimeDays: string;
  priority: "Red" | "Orange" | "Green";
};

const SetIssuePlanTable: FC<SetIssuePlanTableProps> = ({
  open,
  onClose,
  issue,
  sprintId,
}) => {
  const [form, setForm] = useState<FormState>({
    sprintId,
    taskKey: issue?.TaskKey ?? "",
    trackerUid: issue?.trackerUid ?? "",
    checklistItemId: issue?.checklistItemId ?? "",
    workName: issue?.WorkName ?? "",
    deadline: issue?.Deadline && dayjs(issue.Deadline).isValid()
      ? dayjs(issue.Deadline).format("YYYY-MM-DD")
      : "",
    estimateTimeDays: issue?.WorkDays != null ? String(issue.WorkDays) : "",
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
      deadline: issue?.Deadline && dayjs(issue.Deadline).isValid()
        ? dayjs(issue.Deadline).format("YYYY-MM-DD")
        : "",
      estimateTimeDays: issue?.WorkDays != null ? String(issue.WorkDays) : "",
      priority: "Green",
    });
    setErrors({});
  }, [issue, sprintId, open]);

  const canSubmit = useMemo(
    () => !!form.sprintId && form.taskKey && form.trackerUid && !saving,
    [form.sprintId, form.taskKey, form.trackerUid, saving]
  );

  const handleChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.sprintId) nextErrors.sprintId = "Нужен спринт";
    if (!form.taskKey) nextErrors.taskKey = "Нужен ключ";
    if (!form.trackerUid) nextErrors.trackerUid = "Нужен UID";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const payload = {
      sprintId: form.sprintId as number,
      taskKey: form.taskKey,
      trackerUid: form.trackerUid,
      checklistItemId: form.checklistItemId || undefined,
      workName: form.workName || undefined,
      deadline: form.deadline || undefined,
      estimateTimeDays:
        form.estimateTimeDays !== ""
          ? Number(form.estimateTimeDays)
          : undefined,
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
      <DialogTitle>Добавить в план</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Спринт"
            value={form.sprintId ?? ""}
            error={Boolean(errors.sprintId)}
            helperText={errors.sprintId}
            fullWidth
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Key"
            value={form.taskKey}
            error={Boolean(errors.taskKey)}
            helperText={errors.taskKey}
            fullWidth
            InputProps={{ readOnly: true }}
          />
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
            fullWidth
          />
          <TextField
            label="Дедлайн"
            type="date"
            value={form.deadline}
            onChange={handleChange("deadline")}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Оценка, дн."
            type="number"
            value={form.estimateTimeDays}
            onChange={handleChange("estimateTimeDays")}
            fullWidth
            inputProps={{ min: 0, step: 0.1 }}
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
