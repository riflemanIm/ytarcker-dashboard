import { getWorkPlan } from "@/actions/data";
import { WorkPlanItem } from "@/types/global";
import { Box } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { getPriorityPalette } from "@/helpers/priorityStyles";

const WorkPlanTable: FC = () => {
  const {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
  } = useTableTimePlanSelectors();
  const [rows, setRows] = useState<WorkPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isSprintReady = sprintId != null;

  useEffect(() => {
    let isMounted = true;

    if (!sprintId) {
      setRows([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);
    getWorkPlan({ sprintId, trackerUids, projectIds, roleIds, groupIds })
      .then((data) => {
        if (!isMounted) return;
        setRows(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("[WorkPlanTable] getWorkPlan error:", error.message);
        if (!isMounted) return;
        setLoading(false);
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

  const columns = useMemo<GridColDef<WorkPlanItem>[]>(
    () => [
      {
        field: "TaskName",
        headerName: "Название",
        flex: 1,
        minWidth: 220,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => (
          <IssueDisplay
            display={params.value}
            href={`https://tracker.yandex.ru/${params.row.TaskKey}`}
            fio={params.row.CheckListAssignee ?? ""}
          />
        ),
      },

      {
        field: "TaskKey",
        headerName: "Key",
        minWidth: 120,
        flex: 0.5,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },

      { field: "WorkName", headerName: "Работа", flex: 1.5, minWidth: 160 },
      {
        field: "WorkDone",
        headerName: "Сделано",
        flex: 1,
        minWidth: 110,
        valueFormatter: (value: WorkPlanItem["WorkDone"]) =>
          value ? "Да" : "Нет",
      },
      {
        field: "WorkNameDict",
        headerName: "Тип работы",
        flex: 1.5,
        minWidth: 180,
      },
      { field: "IsPlan", headerName: "План", flex: 1, minWidth: 100 },
      {
        field: "CheckListAssignee",
        headerName: "Сотрудник",
        flex: 1.5,
        minWidth: 160,
      },
      { field: "ProjectName", headerName: "Проект", flex: 1.5, minWidth: 180 },
      {
        field: "EstimateTimeDays",
        headerName: "Оценка, дн.",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "SpentTimeDays",
        headerName: "Потрачено, дн.",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "RemainTimeDays",
        headerName: "Остаток, дн.",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "Deadline",
        headerName: "Дедлайн",
        flex: 1,
        minWidth: 120,
        valueFormatter: (value: WorkPlanItem["Deadline"]) =>
          value && dayjs(value).isValid()
            ? dayjs(value).format("DD.MM.YYYY")
            : "-",
      },
    ],
    [],
  );

  return (
    <Box sx={{ mt: 2, height: 600 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading || !isSprintReady}
        pageSizeOptions={[20, 50, 100]}
        disableColumnMenu
        getRowClassName={(params) => {
          const priority = params.row.Priority;
          if (priority === "Red") return "priority-red";
          if (priority === "Orange") return "priority-orange";
          if (priority === "Green") return "priority-green";
          return "";
        }}
        getRowId={(row) => row.YT_TL_WORKPLAN_ID}
        sx={(theme) => {
          const palette = getPriorityPalette(theme);
          return {
            "& .priority-green .MuiDataGrid-cell": {
              backgroundColor: palette.Green.main,
              color: palette.Green.text,
            },
            "& .priority-green:hover .MuiDataGrid-cell": {
              backgroundColor: palette.Green.hover,
            },
            "& .priority-orange .MuiDataGrid-cell": {
              backgroundColor: palette.Orange.main,
              color: palette.Orange.text,
            },
            "& .priority-orange:hover .MuiDataGrid-cell": {
              backgroundColor: palette.Orange.hover,
            },
            "& .priority-red .MuiDataGrid-cell": {
              backgroundColor: palette.Red.main,
            },
            "& .priority-red:hover .MuiDataGrid-cell": {
              backgroundColor: palette.Red.hover,
              color: palette.Red.text,
            },
            "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell": {
              backgroundColor: "inherit",
            },
            "& .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell": {
              backgroundColor: "inherit",
            },
          };
        }}
      />
    </Box>
  );
};

export default WorkPlanTable;
