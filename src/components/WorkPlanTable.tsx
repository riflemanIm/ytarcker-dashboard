import { getWorkPlan } from "@/actions/data";
import { WorkPlanItem } from "@/types/global";
import { Box } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";

interface WorkPlanTableProps {
  sprintId: number | null;
  trackerUids: string[];
  projectIds: number[];
  roleIds: number[];
  groupIds: number[];
}

const WorkPlanTable: FC<WorkPlanTableProps> = ({
  sprintId,
  trackerUids,
  projectIds,
  roleIds,
  groupIds,
}) => {
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
  }, [sprintId, trackerUids, projectIds, roleIds, groupIds]);

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
        field: "WorkNameDict",
        headerName: "Тип работы",
        flex: 1.5,
        minWidth: 180,
      },
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
      { field: "Priority", headerName: "Приоритет", flex: 1, minWidth: 120 },
      { field: "IsPlan", headerName: "План", flex: 1, minWidth: 100 },
    ],
    []
  );

  return (
    <Box sx={{ mt: 2, height: 600 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading || !isSprintReady}
        pageSizeOptions={[20, 50, 100]}
        disableColumnMenu
        getRowId={(row) => row.YT_TL_WORKPLAN_ID}
      />
    </Box>
  );
};

export default WorkPlanTable;
