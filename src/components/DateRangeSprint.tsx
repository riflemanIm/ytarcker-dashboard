import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stack } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ruRU } from "@mui/x-date-pickers/locales";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ru";

interface DateRangeSprintProps {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  onPrevious: () => void;
  onNext: () => void;
  disableNext: boolean;
  sprint?: string;
  onRangeChange?: (start: Dayjs | null, end: Dayjs | null) => void;
}

const parseSprintRange = (raw?: string) => {
  if (!raw) return null;
  const parts = raw.split("-");
  if (parts.length !== 2) return null;
  const left = parts[0]?.trim();
  const right = parts[1]?.trim();
  if (!left || !right) return null;
  const yearMatch = right.match(/(\d{4})/);
  if (!yearMatch) return null;
  const year = yearMatch[1];
  const startStr = left.includes(year) ? left : `${left}.${year}`;
  const start = dayjs(startStr, "DD.MM.YYYY", true);
  const end = dayjs(right, "DD.MM.YYYY", true);
  if (!start.isValid() || !end.isValid()) return null;
  return { start: start.startOf("day"), end: end.endOf("day") };
};

const DateRangeSprint: React.FC<DateRangeSprintProps> = ({
  start,
  end,
  onPrevious,
  onNext,
  disableNext,
  sprint,
  onRangeChange,
}) => {
  const sprintRange = useMemo(() => parseSprintRange(sprint), [sprint]);
  const [value, setValue] = useState<[Dayjs | null, Dayjs | null]>(() =>
    sprintRange ? [sprintRange.start, sprintRange.end] : [start, end],
  );
  const maxDate = sprintRange ? undefined : disableNext ? end : undefined;

  const sprintKey = sprint?.trim() ?? null;
  const lastSprintKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sprintRange) return;
    if (lastSprintKeyRef.current === sprintKey) return;
    lastSprintKeyRef.current = sprintKey;
    setValue([sprintRange.start, sprintRange.end]);
    onRangeChange?.(sprintRange.start, sprintRange.end);
  }, [onRangeChange, sprintKey, sprintRange]);

  useEffect(() => {
    if (sprintRange) return;
    setValue([start, end]);
  }, [end, sprintRange, start]);

  const handleRangeChange = useCallback(
    (newValue: [Dayjs | null, Dayjs | null]) => {
      setValue(newValue);
      if (onRangeChange) {
        const [newStart, newEnd] = newValue;
        onRangeChange(newStart, newEnd);
        return;
      }
      const [newStart] = newValue;
      if (!newStart) return;
      const targetWeekStart = newStart.startOf("isoWeek");
      const currentWeekStart = start.startOf("isoWeek");
      const diffWeeks = currentWeekStart.diff(targetWeekStart, "week");
      if (diffWeeks > 0) {
        for (let i = 0; i < diffWeeks; i += 1) onPrevious();
      } else if (diffWeeks < 0) {
        for (let i = 0; i < Math.abs(diffWeeks); i += 1) onNext();
      }
    },
    [onNext, onPrevious, onRangeChange, start],
  );

  return (
    <Stack
      direction="row"
      spacing={2}
      alignSelf="center"
      sx={{ minWidth: 0, maxWidth: 300 }}
    >
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="ru"
        localeText={
          ruRU.components.MuiLocalizationProvider.defaultProps!.localeText
        }
      >
        <DatePicker
          value={value[0]}
          onChange={(newStart) => handleRangeChange([newStart, value[1]])}
          maxDate={value[1] ?? maxDate}
          format="DD.MM.YYYY"
          slotProps={{
            textField: {
              label: "С",

              fullWidth: true,
            },
          }}
        />
        <DatePicker
          value={value[1]}
          onChange={(newEnd) => handleRangeChange([value[0], newEnd])}
          minDate={value[0] ?? undefined}
          maxDate={maxDate}
          format="DD.MM.YYYY"
          slotProps={{
            textField: {
              label: "По",

              fullWidth: true,
            },
          }}
        />
      </LocalizationProvider>
    </Stack>
  );
};

export default DateRangeSprint;
