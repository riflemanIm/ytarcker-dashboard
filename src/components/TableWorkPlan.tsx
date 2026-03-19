import { SetDataArgs } from "@/actions/data";
import {
  TablePlanProvider,
  useTablePlanContext,
} from "@/context/TablePlanContext";
import { WorkPlanItem } from "@/types/global";
import { Alert, Box, Tooltip, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useMemo } from "react";
import IssueDisplay from "./IssueDisplay";
import { getPriorityPalette } from "@/helpers/priorityStyles";
import { workMinutesToDurationInput } from "@/helpers";
import TableWorkPlanActions, {
  TableWorkPlanActionDialogs,
} from "./TableWorkPlanActions";
import TableWorkPlanFilters from "./TableWorkPlanFilters";

interface TableWorkPlanProps {
  rows: WorkPlanItem[];
  loading?: boolean;
  setData?: (args: SetDataArgs) => Promise<boolean>;
  onWorkPlanRefresh?: () => void | Promise<void>;
}

const formatWorkMinutes = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return workMinutesToDurationInput(num);
};

const TableWorkPlan: FC<TableWorkPlanProps> = ({
  rows,
  loading = false,
  setData,
  onWorkPlanRefresh,
}) => (
  <TablePlanProvider
    rows={rows}
    loading={loading}
    setData={setData}
    onWorkPlanRefresh={onWorkPlanRefresh}
  >
    <TableWorkPlanContent />
  </TablePlanProvider>
);

const TableWorkPlanContent: FC = () => {
  const {
    state: { filterText, filterPriority, filterNotWorkDone },
    rows,
    loading,
    sprintId,
    trackerUids,
    canAddTime,
  } = useTablePlanContext();
  const isSprintReady = sprintId != null;

  const columns = useMemo<GridColDef<WorkPlanItem | { id: string }>[]>(() => {
    const SHRINK_MIN_WIDTH = 72;

    const baseColumns: GridColDef<WorkPlanItem | { id: string }>[] = [
      {
        field: "TaskKey",
        headerName: "Key + Название",
        flex: 520,
        minWidth: SHRINK_MIN_WIDTH,
        sortable: true,
        filterable: false,
        disableColumnMenu: true,
        valueGetter: (_value, row) => (row as WorkPlanItem).TaskKey,
        renderCell: (params: GridRenderCellParams) => {
          if ((params.row as any).id === "__total__") {
            return (
              <Typography variant="subtitle1">
                {(params.row as any).TaskName ?? params.value}
              </Typography>
            );
          }
          const row = params.row as WorkPlanItem;
          const hintParts = [
            row.WorkName ? `Работа: ${row.WorkName}` : null,
            row.WorkNameDict ? `Тип работы: ${row.WorkNameDict}` : null,
            row.Comment ? `Комментарий: ${row.Comment}` : null,
          ].filter(Boolean);
          const hint = hintParts.length ? (
            <Box sx={{ whiteSpace: "pre-line" }}>{hintParts.join("\n")}</Box>
          ) : null;
          return (
            <IssueDisplay
              taskKey={row.TaskKey}
              taskName={row.TaskName}
              href={`https://tracker.yandex.ru/${row.TaskKey}`}
              fio={row.CheckListAssignee ?? ""}
              hint={hint}
            />
          );
        },
      },
    ];

    const actionFlex = canAddTime ? 160 : 120;
    const actionColumn: GridColDef<WorkPlanItem | { id: string }> = {
      field: "actions",
      headerName: "Действия",
      flex: actionFlex,
      minWidth: SHRINK_MIN_WIDTH,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<WorkPlanItem | { id: string }>) =>
        (params.row as any).id === "__total__" ? null : (
          <TableWorkPlanActions row={params.row as WorkPlanItem} />
        ),
    };

    const tailColumns: GridColDef<WorkPlanItem | { id: string }>[] = [
      {
        field: "Deadline",
        headerName: "Дедлайн",
        flex: 90,
        minWidth: SHRINK_MIN_WIDTH,
        valueFormatter: (value: WorkPlanItem["Deadline"]) =>
          value && dayjs(value).isValid()
            ? dayjs(value).format("DD.MM.YYYY")
            : "-",
      },
      {
        field: "WorkName",
        headerName: "Работа",
        flex: 200,
        minWidth: SHRINK_MIN_WIDTH,
        renderCell: (params: GridRenderCellParams) => {
          const row = params.row as WorkPlanItem;
          const title =
            [row.WorkName, row.WorkNameDict].filter(Boolean).join(" / ") || "-";
          return (
            <Tooltip title={title}>
              <span>{params.value ?? "-"}</span>
            </Tooltip>
          );
        },
      },
      {
        field: "EstimateTimeMinutes",
        headerName: "Оценка.",
        flex: 90,
        minWidth: SHRINK_MIN_WIDTH,
        valueFormatter: (value: WorkPlanItem["EstimateTimeMinutes"]) =>
          formatWorkMinutes(value),
      },
      {
        field: "RemainTimeMinutes",
        headerName: "Остаток.",
        flex: 90,
        minWidth: SHRINK_MIN_WIDTH,
        valueFormatter: (value: WorkPlanItem["RemainTimeMinutes"]) =>
          formatWorkMinutes(value),
      },
      {
        field: "Comment",
        headerName: "Комментарий",
        flex: 280,
        minWidth: SHRINK_MIN_WIDTH,
        renderCell: (params: GridRenderCellParams) => (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "normal",
              lineHeight: 1.2,
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            {params.value ?? "-"}
          </Typography>
        ),
      },
      {
        field: "CheckListAssignee",
        headerName: "Тек.Исполнитель",
        flex: 120,
        minWidth: SHRINK_MIN_WIDTH,
      },
      {
        field: "StatusName",
        headerName: "Статус",
        flex: 120,
        minWidth: SHRINK_MIN_WIDTH,
        renderCell: (params: GridRenderCellParams) => (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "normal",
              lineHeight: 1.2,
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            {params.value ?? "-"}
          </Typography>
        ),
      },
      {
        field: "ProjectName",
        headerName: "Проект",
        flex: 150,
        minWidth: SHRINK_MIN_WIDTH,
      },
    ];

    return [...baseColumns, actionColumn, ...tailColumns];
  }, [canAddTime]);

  const filteredRows = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    const priority = filterPriority.trim();

    return rows.filter((item) => {
      if (priority && item.Priority !== priority) return false;
      if (filterNotWorkDone && item.WorkDone) return false;
      if (!query) return true;

      const values = [
        item.TaskName,
        item.TaskKey,
        item.Sprint,
        item.WorkName,
        item.WorkNameDict,
        item.ProjectName,
        item.CheckListAssignee,
        item.StatusName,
        item.Comment,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(query));
    });
  }, [rows, filterPriority, filterText, filterNotWorkDone]);

  const rowsWithTotal = useMemo(() => {
    if (filteredRows.length === 0) return filteredRows;
    const sum = (items: WorkPlanItem[], key: keyof WorkPlanItem) =>
      items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);

    return [
      ...filteredRows,
      {
        id: "__total__",
        TaskName: "Итого",
        TaskKey: "",
        Sprint: "",
        WorkName: "",
        WorkNameDict: "",
        StatusName: "",
        Comment: "",
        CheckListAssignee: "",
        ProjectName: "",
        EstimateTimeMinutes: sum(filteredRows, "EstimateTimeMinutes"),
        SpentTimeMinutes: sum(filteredRows, "SpentTimeMinutes"),
        RemainTimeMinutes: sum(filteredRows, "RemainTimeMinutes"),
      } as any,
    ];
  }, [filteredRows]);

  // const sprintWorkingDays = useMemo(() => {
  //   const { selectedSprintId, sprins } = state.tableTimePlanState;
  //   if (!selectedSprintId) return null;
  //   const sprint = sprins.find(
  //     (item) => String(item.yt_tl_sprints_id) === selectedSprintId,
  //   );
  //   return sprint?.workingminutes ?? null;
  // }, [state.tableTimePlanState]);

  // const totalSpentDays = useMemo(() => {
  //   const total = filteredRows.reduce(
  //     (acc, item) => acc + (Number(item.SpentTimeMinutes) || 0),
  //     0,
  //   );
  //   return formatWorkMinutes(total);
  // }, [filteredRows]);

  // const remainingDays = useMemo(() => {
  //   if (sprintWorkingDays == null) return null;
  //   const spent = Number(totalSpentDays);
  //   if (!Number.isFinite(spent)) return null;
  //   return formatWorkMinutes(sprintWorkingDays - spent);
  // }, [sprintWorkingDays, totalSpentDays]);

  if (trackerUids.length === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Выберите сотрудника или сотрудников для отображения задач.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <TableWorkPlanFilters />
      <DataGrid
        rows={rowsWithTotal}
        columns={columns}
        loading={loading || !isSprintReady}
        pageSizeOptions={[20, 50, 100]}
        disableColumnMenu
        getRowClassName={(params) => {
          if ((params.row as any).id === "__total__") return "row-total";
          if ((params.row as WorkPlanItem).WorkDone) return "row-done";
          const priority = (params.row as WorkPlanItem).Priority;
          if (priority === "Red") return "priority-red";
          if (priority === "Orange") return "priority-orange";
          if (priority === "Green") return "priority-green";
          return "";
        }}
        getRowId={(row) => (row as any).id ?? row.YT_TL_WORKPLAN_ID}
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
            },
            "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell": {
              backgroundColor: "inherit",
            },
            "& .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell": {
              backgroundColor: "inherit",
            },
            "& .row-total": {
              fontWeight: 600,
              backgroundColor: theme.palette.action.hover,
            },
            "& .row-done": {
              backgroundColor: theme.palette.action.disabledBackground,
              color: theme.palette.text.disabled,
            },
          };
        }}
      />
      <TableWorkPlanActionDialogs />
    </Box>
  );
};

export default TableWorkPlan;
