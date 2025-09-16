import * as React from "react";
import { Stack, Tooltip, IconButton, Typography } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DateRangeIcon from "@mui/icons-material/DateRange";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/ru";

dayjs.locale("ru");

export interface ReportDateRangeProps {
  from: Dayjs;
  to: Dayjs;
  onPrevMonth: () => void;
  onThisMonth: () => void;
  onNextMonth: () => void;
  disableNext?: boolean;
}

export default function ReportDateRange({
  from,
  onPrevMonth,
  onThisMonth,
  onNextMonth,
  disableNext = false,
}: ReportDateRangeProps) {
  return (
    <Stack direction="row" spacing={2} alignSelf="center" my={2}>
      <Tooltip title="Пред. месяц">
        <span>
          <IconButton
            onClick={onPrevMonth}
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

      <Typography variant="h5" alignSelf="center">
        {from.format("MMMM YYYY")}
      </Typography>

      <Tooltip title="Текущий месяц">
        <span>
          <IconButton
            onClick={onThisMonth}
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
            <DateRangeIcon />
          </IconButton>
        </span>
      </Tooltip>

      {!disableNext && (
        <Tooltip title="След. месяц">
          <span>
            <IconButton
              onClick={onNextMonth}
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
}
