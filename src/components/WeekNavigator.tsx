import React from "react";
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

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  start,
  end,
  onPrevious,
  onNext,
  disableNext,
  sprint,
}) => {
  const sprintRange = parseSprintRange(sprint);
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
