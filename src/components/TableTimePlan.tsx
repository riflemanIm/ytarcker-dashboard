import { Box, Stack, Typography } from "@mui/material";
import { FC } from "react";
import CheckPlanTable from "./CheckPlanTable";
import WorkPlanTable from "./WorkPlanTable";
import WorkPlanCapacityTable from "./WorkPlanCapacityTable";

const TableTimePlan: FC = () => {
  return (
    <Box sx={{ px: 2 }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ width: "100%" }}
      >
        <Box
          sx={{
            flexBasis: { xs: "100%", lg: "60%" },
            flexGrow: 1,
            minWidth: 0,
            minHeight: 550,
          }}
        >
          <Typography variant="h5" textAlign="center" my={2}>
            Подбор задач в план
          </Typography>
          <CheckPlanTable />
        </Box>
        <Box
          sx={{
            flexBasis: { xs: "100%", lg: "40%" },
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <Typography variant="h5" textAlign="center" my={2}>
            Загрузка сотрудников
          </Typography>
          <WorkPlanCapacityTable />
        </Box>
      </Stack>
      <Typography variant="h5" textAlign="center" my={2}>
        План работ
      </Typography>
      <WorkPlanTable />
    </Box>
  );
};

export default TableTimePlan;
