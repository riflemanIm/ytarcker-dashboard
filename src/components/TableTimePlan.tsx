import { Box, Typography } from "@mui/material";
import { FC } from "react";
import CheckPlanTable from "./CheckPlanTable";
import WorkPlanTable from "./WorkPlanTable";

const TableTimePlan: FC = () => {
  return (
    <Box sx={{ px: 2 }}>
      <Typography variant="h5" textAlign="center" my={2}>
        Подбор задач в план
      </Typography>
      <CheckPlanTable />
      <Typography variant="h5" textAlign="center" my={2}>
        План работ
      </Typography>
      <WorkPlanTable />
    </Box>
  );
};

export default TableTimePlan;
