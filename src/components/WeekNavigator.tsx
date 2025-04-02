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
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  start,
  end,
  onPrevious,
  onNext,
  disableNext,
}) => {
  return (
    <Stack direction="row" spacing={2} alignSelf="center">
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
      <Typography variant="h5" alignSelf="center">
        {start.format("DD.MM.YYYY")} - {end.format("DD.MM.YYYY")}
      </Typography>
      {!disableNext && (
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
