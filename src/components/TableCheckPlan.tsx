import { getTaskList } from "@/actions/data";
import { TaskListItem } from "@/types/global";
import { Box, Button, Stack, Tooltip } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";
import SetIssuePlanTable from "./SetIssuePlanTable";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import FilterTableText from "./FilterTableText";

const TableCheckPlan: FC = () => {
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
        console.error("[TableCheckPlan] getTaskList error:", error.message);
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
        minWidth: 480,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => {
          const workName = params.row.WorkName ?? "";
          const workType = params.row.WorkNameDict ?? "";
          const title = [workName, workType].filter(Boolean).join(" / ") || "-";
          return (
            <Tooltip title={title}>
              <span>
                <IssueDisplay
                  display={params.value}
                  href={`https://tracker.yandex.ru/${params.row.TaskKey}`}
                  fio={params.row.CheckListAssignee ?? ""}
                />
              </span>
            </Tooltip>
          );
        },
      },
      {
        field: "TaskKey",
        headerName: "В План",
        minWidth: 100,
        flex: 0.2,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => (
          <Tooltip title="В План">
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
              {params.value}
            </Button>
          </Tooltip>
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

  const rowsWithId = useMemo(
    () =>
      rows.map((item, index) => ({
        ...item,
        id: `${item.TaskKey}_${item.checklistItemId ?? "none"}_${index}`,
      })),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) return rowsWithId;
    return rowsWithId.filter((item) => {
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
  }, [rowsWithId, filterText]);

  return (
    <Box sx={{ mt: 2, height: 400 }}>
      <FilterTableText
        value={filterText}
        onChange={setFilterText}
        label="Фильтр"
        placeholder="Название, Key, Работа, Тип работы"
        disabled={loading || rows.length === 0}
      />
      <DataGrid
        rows={filteredRows}
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

export default TableCheckPlan;
