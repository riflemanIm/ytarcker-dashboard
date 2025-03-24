import React from "react";
import { Button, Typography, Stack } from "@mui/material";
import dayjs from "dayjs";

interface WeekNavigatorProps {
  start: string;
  end: string;
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
    <Stack spacing={2} alignItems="center">
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={onPrevious}>
          Previous Week
        </Button>
        <Button variant="contained" onClick={onNext} disabled={disableNext}>
          Next Week
        </Button>
      </Stack>
      <Typography variant="h6">
        {dayjs(start).format("DD.MM.YYYY")} - {dayjs(end).format("DD.MM.YYYY")}
      </Typography>
    </Stack>
  );
};

export default WeekNavigator;
