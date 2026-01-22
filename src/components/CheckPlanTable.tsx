import { getTaskList } from "@/actions/data";
import { TaskListItem } from "@/types/global";
import { Box, Button, Stack, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";
import SetIssuePlanTable from "./SetIssuePlanTable";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import TableTextFilter from "./TableTextFilter";

const CheckPlanTable: FC = () => {
  const { sprintId, trackerUids, projectIds, roleIds, groupIds } =
    useTableTimePlanSelectors();
  const [rows, setRows] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<TaskListItem | null>(null);
  const [filterText, setFilterText] = useState("");
  const isSprintReady = sprintId != null;
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
        minWidth: 150,
        flex: 0.2,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <span>{params.value}</span>
            <Button
              size="small"
              variant="outlined"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedIssue(params.row);
                setDialogOpen(true);
              }}
              disabled={!sprintId}
            >
              в план
            </Button>
          </Stack>
        ),
      },

      {
        field: "WorkNameDict",
        flex: 0.1,
        minWidth: 100,
        headerName: "Работа / Тип работы ",
        renderCell: (params: GridRenderCellParams) => (
          <Stack spacing={0.25}>
            <Typography variant="body2">{params.row.WorkName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {params.row.WorkNameDict}
            </Typography>
          </Stack>
        ),
      },

      {
        field: "WorkDays",
        headerName: "Трудозатраты, дн.",
        flex: 1,
        minWidth: 40,
      },
      {
        field: "Deadline",
        headerName: "Дедлайн",
        flex: 1,
        minWidth: 40,
        valueFormatter: (value: TaskListItem["Deadline"]) =>
          value && dayjs(value).isValid()
            ? dayjs(value).format("DD.MM.YYYY")
            : "-",
      },
    ],
    [sprintId],
  );

  const filteredRows = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((item) => {
      const values = [
        item.TaskName,
        item.TaskKey,
        item.WorkName,
        item.WorkNameDict,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(query));
    });
  }, [rows, filterText]);

  return (
    <Box sx={{ mt: 2, height: 600 }}>
      <TableTextFilter
        value={filterText}
        onChange={setFilterText}
        label="Фильтр"
        placeholder="Название, Key, Работа, Тип работы"
        disabled={loading || rows.length === 0}
      />
      <DataGrid
        rows={filteredRows.map((item) => ({
          ...item,
          id: item.checklistItemId,
        }))}
        columns={columns}
        loading={loading || !isSprintReady}
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
