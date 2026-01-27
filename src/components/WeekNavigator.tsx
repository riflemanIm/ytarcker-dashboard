import React, { useEffect, useMemo, useRef } from "react";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import dayjs from "dayjs";

interface WeekNavigatorProps {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  onPrevious: () => void;
  onNext: () => void;
  disableNext: boolean;
  sprint?: string;
}

const parseSprintRange = (raw?: string) => {
  if (!raw) return null;
  const dateMatches = raw.match(/\d{2}\.\d{2}(?:\.\d{4})?/g);
  if (!dateMatches || dateMatches.length < 2) return null;
  const left = dateMatches[0]?.trim();
  const right = dateMatches[1]?.trim();
  if (!left || !right) return null;
  const yearMatch = right.match(/(\d{4})/);
  const fallbackYear = yearMatch ? yearMatch[1] : dayjs().format("YYYY");
  const parseToIso = (value: string, year: string) => {
    const match = value.match(/^(\d{2})\.(\d{2})(?:\.(\d{4}))?$/);
    if (!match) return null;
    const [, day, month, rawYear] = match;
    const finalYear = rawYear ?? year;
    return `${finalYear}-${month}-${day}`;
  };
  const startIso = parseToIso(left, fallbackYear);
  const endIso = parseToIso(right, fallbackYear);
  if (!startIso || !endIso) return null;
  const start = dayjs(startIso);
  const end = dayjs(endIso);
  if (!start.isValid() || !end.isValid()) return null;
  return { start: start.startOf("day"), end: end.endOf("day") };
};

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  start,
  end,
  onPrevious,
  onNext,
  disableNext,
  sprint,
}) => {
  console.log("sprint", sprint);
  const sprintRange = parseSprintRange(sprint);
  const sprintKey = sprint?.trim() ?? null;
  const lastAppliedSprintKeyRef = useRef<string | null>(null);
  const targetWeekStart = useMemo(() => {
    if (!sprintRange) return null;
    const now = dayjs();
    if (
      now.isSameOrAfter(sprintRange.start) &&
      now.isSameOrBefore(sprintRange.end)
    ) {
      return now.startOf("isoWeek");
    }
    return sprintRange.start.startOf("isoWeek");
  }, [sprintRange]);

  useEffect(() => {
    console.log("targetWeekStart", targetWeekStart);
    if (!targetWeekStart) return;
    const currentWeekStart = start.startOf("isoWeek");
    if (
      lastAppliedSprintKeyRef.current === sprintKey &&
      currentWeekStart.isSame(targetWeekStart, "day")
    ) {
      return;
    }
    if (currentWeekStart.isSame(targetWeekStart, "day")) {
      lastAppliedSprintKeyRef.current = sprintKey;
      return;
    }
    const diffWeeks = currentWeekStart.diff(targetWeekStart, "week");
    if (diffWeeks > 0) {
      for (let i = 0; i < diffWeeks; i += 1) onPrevious();
    } else if (diffWeeks < 0) {
      for (let i = 0; i < Math.abs(diffWeeks); i += 1) onNext();
    }
  }, [onNext, onPrevious, sprintKey, start, targetWeekStart]);
  const prevStart = start.subtract(1, "week");
  const prevEnd = end.subtract(1, "week");
  const nextStart = start.add(1, "week");
  const nextEnd = end.add(1, "week");
  const canShowPrev = sprintRange
    ? prevStart.isSameOrAfter(sprintRange.start) &&
      prevEnd.isSameOrBefore(sprintRange.end)
    : true;
  const canShowNext = sprintRange
    ? nextEnd.isSameOrBefore(sprintRange.end) &&
      nextStart.isSameOrAfter(sprintRange.start)
    : true;
  return (
    <Stack direction="row" spacing={2} alignSelf="center">
      {canShowPrev && (
        <Tooltip title="Пред. неделя">
          <span>
            <IconButton
              onClick={onPrevious}
              sx={(theme) => ({
                borderRadius: "50%",
                p: 3,

                color: theme.palette.background.default,
                background: theme.palette.primary.light,

                "&:hover": {
                  color: theme.palette.background.default,
                  background: theme.palette.primary.main,
                },
              })}
            >
              <ArrowBackIosNewIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
      <Typography variant="h5" alignSelf="center">
        {start.format("DD.MM.YYYY")} - {end.format("DD.MM.YYYY")}
      </Typography>
      {!disableNext && canShowNext && (
        <Tooltip title="След. неделя">
          <span>
            <IconButton
              onClick={onNext}
              disabled={disableNext}
              sx={(theme) => ({
                borderRadius: "50%",
                p: 3,

                color: theme.palette.background.default,
                background: theme.palette.primary.light,

                "&:hover": {
                  color: theme.palette.background.default,
                  background: theme.palette.primary.main,
                },
              })}
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
};

export default WeekNavigator;
