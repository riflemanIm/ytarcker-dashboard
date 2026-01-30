import { getWorkPlanCapacity } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { WorkPlanCapacityItem } from "@/types/global";
import { Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { FC, useCallback, useEffect, useMemo } from "react";
import DateRangeSprint from "./DateRangeSprint";
import type { Dayjs } from "dayjs";
import { workMinutesToDurationInput } from "@/helpers";

const TableWorkPlanCapacity: FC = () => {
  const { state: appState, dispatch } = useAppContext();
  const { workPlanCapacityState } = appState;
  const { trackerUids, projectIds, roleIds, groupIds, workPlanRefreshKey } =
    useTableTimePlanSelectors();
  const { rows, loading, refreshKey, capacityFrom, capacityTo } =
    workPlanCapacityState;

  const { selectedSprintId, sprins } = appState.tableTimePlanState;
  const sprintLabel = selectedSprintId
    ? sprins.find((item) => String(item.yt_tl_sprints_id) === selectedSprintId)
        ?.sprint
    : undefined;

  const handleRangeChange = useCallback(
    (newStart: Dayjs | null, newEnd: Dayjs | null) => {
      dispatch({
        type: "setWorkPlanCapacityState",
        payload: (prev) => ({
          ...prev,
          capacityFrom: newStart ? newStart.startOf("day") : prev.capacityFrom,
          capacityTo: newEnd ? newEnd.endOf("day") : prev.capacityTo,
        }),
      });
    },
    [dispatch],
  );

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
          "[TableWorkPlanCapacity] getWorkPlanCapacity error:",
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
    workPlanRefreshKey,
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
        field: "EstimateTimeMinutes",
        headerName: "План.",
        flex: 1.5,
        minWidth: 160,
        valueFormatter: (value: WorkPlanCapacityItem["EstimateTimeMinutes"]) =>
          workMinutesToDurationInput(value),
      },
      {
        field: "SpentTimeMinutes",
        headerName: "Факт.",
        flex: 1,
        minWidth: 60,
        valueFormatter: (value: WorkPlanCapacityItem["SpentTimeMinutes"]) =>
          workMinutesToDurationInput(value),
      },
      {
        field: "RemainTimeMinutes",
        headerName: "Остаток.",
        flex: 1,
        minWidth: 140,
        valueFormatter: (value: WorkPlanCapacityItem["RemainTimeMinutes"]) =>
          workMinutesToDurationInput(value),
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
        <DateRangeSprint
          start={capacityFrom}
          end={capacityTo}
          onPrevious={() => {}}
          onNext={() => {}}
          disableNext={false}
          sprint={sprintLabel}
          onRangeChange={handleRangeChange}
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

export default TableWorkPlanCapacity;
