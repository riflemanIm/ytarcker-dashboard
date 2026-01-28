import {
  durationToWorkMinutes,
  isValidDuration,
  normalizeDuration,
  workMinutesToDurationInput,
} from "@/helpers";
import { Divider, Grid2 as Grid, Stack, Typography } from "@mui/material";
import { ReactNode, useMemo } from "react";

type PlanningInfoSectionProps = {
  remainTimeMinutes: number | null | undefined;
  duration: string;
  riskSection: ReactNode;
  showDivider?: boolean;
  renderPlanningContent?: (formattedRemaining: string) => ReactNode;
};

const formatWorkMinutes = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "-";
  const sign = value < 0 ? "-" : "";
  return `${sign}${workMinutesToDurationInput(Math.abs(value))}`;
};

const PlanningInfoSection = ({
  remainTimeMinutes,
  duration,
  riskSection,
  showDivider = true,
  renderPlanningContent,
}: PlanningInfoSectionProps) => {
  const remainingInfo = useMemo(() => {
    if (remainTimeMinutes == null) return null;
    const normalized = normalizeDuration(duration ?? "");
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      return null;
    }
    const planned = durationToWorkMinutes(normalized);
    if (!Number.isFinite(planned)) return null;
    return remainTimeMinutes - planned;
  }, [duration, remainTimeMinutes]);

  if (remainTimeMinutes == null) return null;

  const formattedRemaining = formatWorkMinutes(remainingInfo);

  return (
    <>
      {showDivider && (
        <Grid size={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>
      )}
      <Grid size={{ xs: 12, md: 6 }}>{riskSection}</Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        {renderPlanningContent ? (
          renderPlanningContent(formattedRemaining)
        ) : (
          <>
            <Stack direction="row" spacing={2}>
              <Typography variant="subtitle1">Осталось времени</Typography>
              <Typography variant="subtitle1" color="warning">
                {formattedRemaining}
              </Typography>
            </Stack>
          </>
        )}
      </Grid>
    </>
  );
};

export default PlanningInfoSection;
