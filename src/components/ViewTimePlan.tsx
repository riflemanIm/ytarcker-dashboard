import { Box, Paper, Stack, Typography } from "@mui/material";
import { FC } from "react";
import TableCheckPlan from "./TableCheckPlan";
import TableWorkPlan from "./TableWorkPlan";
import TableWorkPlanCapacity from "./TableWorkPlanCapacity";

const ViewTimePlan: FC = () => {
  return (
    <Box sx={{ px: 2 }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ width: "100%" }}
      >
        <Paper
          variant="elevation"
          sx={(theme) => ({
            p: { xs: 1, sm: 2 },
            borderRadius: { xs: 1, sm: 2 },
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: "0px 10px 15px rgba(15, 23, 42, 0.04)",
            my: 2,
            flexBasis: { xs: "100%", lg: "50%" },
            flexGrow: 1,
            minWidth: 0,
            minHeight: 530,
          })}
        >
          <Typography variant="h5" textAlign="center" my={2}>
            Подбор задач в план
          </Typography>
          <TableCheckPlan />
        </Paper>
        <Paper
          variant="elevation"
          sx={(theme) => ({
            p: { xs: 1, sm: 2 },
            borderRadius: { xs: 1, sm: 2 },
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: "0px 10px 15px rgba(15, 23, 42, 0.04)",
            my: 2,
            flexBasis: { xs: "100%", lg: "50%" },
            flexGrow: 1,
            minWidth: 0,
            minHeight: 530,
          })}
        >
          <Typography variant="h5" textAlign="center" my={2}>
            Загрузка сотрудников
          </Typography>
          <TableWorkPlanCapacity />
        </Paper>
      </Stack>
      <Paper
        variant="elevation"
        sx={(theme) => ({
          p: { xs: 1, sm: 2 },
          borderRadius: { xs: 1, sm: 2 },
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0px 10px 15px rgba(15, 23, 42, 0.04)",
          my: 2,
        })}
      >
        <Typography variant="h5" textAlign="center" my={2}>
          План работ
        </Typography>
        <TableWorkPlan />
      </Paper>
    </Box>
  );
};

export default ViewTimePlan;
