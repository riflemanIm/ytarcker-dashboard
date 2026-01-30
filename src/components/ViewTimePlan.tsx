import { DeleteDataArgs, SetDataArgs, getWorkPlan } from "@/actions/data";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { TaskItem, WorkPlanItem } from "@/types/global";
import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import { Dayjs } from "dayjs";
import { FC, useCallback, useEffect, useState } from "react";
import TableCheckPlan from "./TableCheckPlan";
import TableTimeSpendByPlan from "./TableTimeSpendByPlan";
import TableWorkPlan from "./TableWorkPlan";
import TableWorkPlanCapacity from "./TableWorkPlanCapacity";

interface ViewTimePlanProps {
  data: TaskItem[];
  start: Dayjs;
  rangeStart?: Dayjs;
  rangeEnd?: Dayjs;
  setData: (args: SetDataArgs) => Promise<void>;
  deleteData: (args: DeleteDataArgs) => void;
}

const ViewTimePlan: FC<ViewTimePlanProps> = ({
  data,
  start,
  rangeStart,
  rangeEnd,
  setData,
  deleteData,
}) => {
  const {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
    fetchByLogin,
  } = useTableTimePlanSelectors();

  const [workPlanRows, setWorkPlanRows] = useState<WorkPlanItem[]>([]);
  const [workPlanLoading, setWorkPlanLoading] = useState(false);

  const fetchWorkPlan = useCallback(
    async (isActive?: () => boolean) => {
      const active = isActive ?? (() => true);
      if (!sprintId) {
        if (!active()) return;
        setWorkPlanRows([]);
        setWorkPlanLoading(false);
        return;
      }

      if (active()) setWorkPlanLoading(true);
      try {
        const items = await getWorkPlan({
          sprintId,
          trackerUids: trackerUids.length ? trackerUids : undefined,
          projectIds,
          roleIds,
          groupIds,
        });
        if (!active()) return;
        setWorkPlanRows(items as WorkPlanItem[]);
        setWorkPlanLoading(false);
      } catch (error: any) {
        console.error("[ViewTimePlan] getWorkPlan error:", error.message);
        if (!active()) return;
        setWorkPlanRows([]);
        setWorkPlanLoading(false);
      }
    },
    [sprintId, trackerUids, projectIds, roleIds, groupIds],
  );

  useEffect(() => {
    let isMounted = true;
    fetchWorkPlan(() => isMounted);
    if (trackerUids.length === 0) {
      return () => {
        isMounted = false;
      };
    }
  }, [
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
    fetchWorkPlan,
  ]);
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ width: "100%" }}
      >
        {!fetchByLogin && (
          <>
            {" "}
            <Paper
              variant="elevation"
              sx={(theme) => ({
                p: { xs: 1, sm: 2 },
                borderRadius: { xs: 1, sm: 2 },
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "0px 10px 15px rgba(15, 23, 42, 0.04)",
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
          </>
        )}
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

        <TableWorkPlan
          rows={workPlanRows}
          loading={workPlanLoading}
          setData={setData}
          onWorkPlanRefresh={fetchWorkPlan}
        />
        <Divider sx={{ my: 2 }} />
        <Typography variant="h5" textAlign="center" my={2}>
          Затраченное время по плану
        </Typography>
        <TableTimeSpendByPlan
          data={data}
          start={start}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          setData={setData}
          deleteData={deleteData}
          isEditable={fetchByLogin}
          planItems={workPlanRows}
          onWorkPlanRefresh={fetchWorkPlan}
        />
      </Paper>
    </Box>
  );
};

export default ViewTimePlan;
