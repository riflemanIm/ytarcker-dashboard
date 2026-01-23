import { getWorkPlanCapacity } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { WorkPlanCapacityItem } from "@/types/global";
import { Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { FC, useEffect, useMemo } from "react";
import ReportDateRange from "./ReportDateRange";
import dayjs from "dayjs";

const WorkPlanCapacityTable: FC = () => {
  const { state: appState, dispatch } = useAppContext();
  const { workPlanCapacityState } = appState;
  const { trackerUids, projectIds, roleIds, groupIds } =
    useTableTimePlanSelectors();
  const { rows, loading, refreshKey, capacityFrom, capacityTo } =
    workPlanCapacityState;

  const handlePrevReportMonth = () => {
    dispatch({
      type: "setWorkPlanCapacityState",
      payload: (prev) => ({
        ...prev,
        capacityFrom: prev.capacityFrom.add(-1, "month").startOf("month"),
        capacityTo: prev.capacityTo.add(-1, "month").endOf("month"),
      }),
    });
  };

  const handleThisReportMonth = () => {
    dispatch({
      type: "setWorkPlanCapacityState",
      payload: (prev) => ({
        ...prev,
        capacityFrom: dayjs().startOf("month"),
        capacityTo: dayjs().endOf("month"),
      }),
    });
  };

  const handleNextReportMonth = () => {
    dispatch({
      type: "setWorkPlanCapacityState",
      payload: (prev) => ({
        ...prev,
        capacityFrom: prev.capacityFrom.add(1, "month").startOf("month"),
        capacityTo: prev.capacityTo.add(1, "month").endOf("month"),
      }),
    });
  };

  useEffect(() => {
    let isMounted = true;

    dispatch({
      type: "setWorkPlanCapacityState",
      payload: (prev) => ({ ...prev, loading: true }),
    });

    getWorkPlanCapacity({
      dateStart: capacityFrom.format("YYYY-MM-DD"),
      dateEnd: capacityTo.format("YYYY-MM-DD"),
      trackerUids,
      projectIds,
      roleIds,
      groupIds,
    })
      .then((data) => {
        if (!isMounted) return;
        dispatch({
          type: "setWorkPlanCapacityState",
          payload: (prev) => ({ ...prev, rows: data, loading: false }),
        });
      })
      .catch((error) => {
        console.error(
          "[WorkPlanCapacityTable] getWorkPlanCapacity error:",
          error.message,
        );
        if (!isMounted) return;
        dispatch({
          type: "setWorkPlanCapacityState",
          payload: (prev) => ({ ...prev, loading: false }),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [
    dispatch,
    capacityFrom,
    capacityTo,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    refreshKey,
  ]);

  const columns = useMemo<GridColDef<WorkPlanCapacityItem>[]>(
    () => [
      { field: "Sprint", headerName: "Спринт", flex: 1, minWidth: 160 },
      {
        field: "CheckListAssignee",
        headerName: "Сотрудник / Роль",
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <span>{params.row.CheckListAssignee}</span>
            <span>{params.row.RoleName}</span>
          </Box>
        ),
      },
      {
        field: "EstimateTimeDays",
        headerName: "План, дн.",
        flex: 1.5,
        minWidth: 160,
      },
      {
        field: "SpentTimeDays",
        headerName: "Факт, дн.",
        flex: 1,
        minWidth: 60,
      },
      {
        field: "RemainTimeDays",
        headerName: "Остаток, дн.",
        flex: 1,
        minWidth: 140,
      },
    ],
    [],
  );

  const gridRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        id: `${row.Sprint}-${row.CheckListAssignee}-${row.RoleName}-${index}`,
      })),
    [rows],
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <ReportDateRange
          from={capacityFrom}
          to={capacityTo}
          onPrevMonth={handlePrevReportMonth}
          onThisMonth={handleThisReportMonth}
          onNextMonth={handleNextReportMonth}
        />
      </Box>
      <Box sx={{ mt: 2, height: 360 }}>
        <DataGrid
          rows={gridRows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[20, 50, 100]}
          disableColumnMenu
        />
      </Box>
    </Box>
  );
};

export default WorkPlanCapacityTable;
