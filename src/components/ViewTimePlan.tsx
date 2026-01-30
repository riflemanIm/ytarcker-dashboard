import { DeleteDataArgs, SetDataArgs, getWorkPlan } from "@/actions/data";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { TaskItem, WorkPlanItem } from "@/types/global";
import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import { Dayjs } from "dayjs";
import { FC, useEffect, useRef, useState } from "react";
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
  const lastRequestKeyRef = useRef<string>("");

  useEffect(() => {
    let isMounted = true;

    if (!sprintId || trackerUids.length === 0) {
      setWorkPlanRows([]);
      setWorkPlanLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const requestKey = `${sprintId}|${trackerUids.join(",")}|${projectIds.join(
      ",",
    )}|${roleIds.join(",")}|${groupIds.join(",")}`;
    if (lastRequestKeyRef.current === requestKey) {
      return () => {
        isMounted = false;
      };
    }
    lastRequestKeyRef.current = requestKey;

    setWorkPlanLoading(true);
    getWorkPlan({
      sprintId,
      trackerUids: trackerUids,
      projectIds,
      roleIds,
      groupIds,
    })
      .then((items) => {
        if (!isMounted) return;
        setWorkPlanRows(items as WorkPlanItem[]);
        setWorkPlanLoading(false);
      })
      .catch((error) => {
        console.error("[ViewTimePlan] getWorkPlan error:", error.message);
        if (!isMounted) return;
        setWorkPlanRows([]);
        setWorkPlanLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
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
        />
      </Paper>
    </Box>
  );
};

export default ViewTimePlan;
