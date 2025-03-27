import React from "react";
import { Button, Stack, Typography } from "@mui/material";
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
    <Stack direction="row" spacing={2} alignSelf="center">
      <Button variant="contained" onClick={onPrevious}>
        Пред. неделя
      </Button>
      <Typography variant="h5">
        {dayjs(start).format("DD.MM.YYYY")} - {dayjs(end).format("DD.MM.YYYY")}
      </Typography>
      <Button variant="contained" onClick={onNext} disabled={disableNext}>
        След. неделя
      </Button>
    </Stack>
  );
};

export default WeekNavigator;
