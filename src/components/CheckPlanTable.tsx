import { getTaskList } from "@/actions/data";
import { TaskListItem } from "@/types/global";
import { Box, Button, Stack } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";
import SetIssuePlanTable from "./SetIssuePlanTable";

interface CheckPlanTableProps {
  sprintId: number | null;
  trackerUids: string[];
  projectIds: number[];
  roleIds: number[];
  groupIds: number[];
}

const CheckPlanTable: FC<CheckPlanTableProps> = ({
  sprintId,
  trackerUids,
  projectIds,
  roleIds,
  groupIds,
}) => {
  const [rows, setRows] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<TaskListItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getTaskList({ trackerUids, projectIds, roleIds, groupIds })
      .then((data) => {
        if (!isMounted) return;
        setRows(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("[CheckPlanTable] getTaskList error:", error.message);
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [trackerUids, projectIds, roleIds, groupIds]);

  const columns = useMemo<GridColDef<TaskListItem>[]>(
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
        minWidth: 200,
        flex: 0.8,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <span>{params.value}</span>
            <Button
              size="small"
              variant="text"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedIssue(params.row);
                setDialogOpen(true);
              }}
              disabled={!sprintId}
            >
              Добавить в план
            </Button>
          </Stack>
        ),
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
      {
        field: "trackerUid",
        headerName: "UID",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "WorkDays",
        headerName: "Трудозатраты, дн.",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "Deadline",
        headerName: "Дедлайн",
        flex: 1,
        minWidth: 120,
        valueFormatter: (value: TaskListItem["Deadline"]) =>
          value && dayjs(value).isValid()
            ? dayjs(value).format("DD.MM.YYYY")
            : "-",
      },
    ],
    []
  );

  return (
    <Box sx={{ mt: 2, height: 600 }}>
      <DataGrid
        rows={rows.map((item) => ({
          ...item,
          id: item.checklistItemId,
        }))}
        columns={columns}
        loading={loading}
        pageSizeOptions={[20, 50, 100]}
        disableColumnMenu
      />
      <SetIssuePlanTable
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        issue={selectedIssue}
        sprintId={sprintId}
      />
    </Box>
  );
};

export default CheckPlanTable;
