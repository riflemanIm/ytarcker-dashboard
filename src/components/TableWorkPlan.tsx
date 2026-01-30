import { SetDataArgs, getTaskPlanInfo, setWorkPlan } from "@/actions/data";
import { Issue, TaskPlanInfoItem, WorkPlanItem } from "@/types/global";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useCallback, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";
import { getPriorityPalette } from "@/helpers/priorityStyles";
import { isSuperLogin, workMinutesToDurationInput } from "@/helpers";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import InfoIcon from "@mui/icons-material/Info";
import SetIssuePlanTable from "./SetIssuePlanTable";
import { useAppContext } from "@/context/AppContext";
import FilterTableText from "./FilterTableText";
import AddDurationIssueDialog from "./AddDurationIssueDialog";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import TableTaskPlanInfo from "./TableTaskPlanInfo";

interface TableWorkPlanProps {
  rows: WorkPlanItem[];
  loading?: boolean;
  setData?: (args: SetDataArgs) => Promise<void>;
}

const TableWorkPlan: FC<TableWorkPlanProps> = ({
  rows,
  loading = false,
  setData,
}) => {
  const { sprintId } = useTableTimePlanSelectors();
  const { state, dispatch } = useAppContext();
  const fetchByLogin = state.state.fetchByLogin;

  const { login } = state.auth;
  const [filterText, setFilterText] = useState("");
  const isSprintReady = sprintId != null;
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<WorkPlanItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkPlanItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [addTimeIssue, setAddTimeIssue] = useState<Issue | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoRows, setInfoRows] = useState<TaskPlanInfoItem[]>([]);
  const [infoTaskKey, setInfoTaskKey] = useState<string | null>(null);
  const [infoTaskName, setInfoTaskName] = useState<string | null>(null);
  const isAdmin = !!(login && isSuperLogin(login));

  const canAddTime = fetchByLogin;
  const canEditPlan = !fetchByLogin;
  const formatWorkMinutes = (value: unknown) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return workMinutesToDurationInput(num);
  };

  const handleOpenInfo = useCallback(async (row: WorkPlanItem) => {
    setInfoTaskKey(row.TaskKey);
    setInfoTaskName(row.TaskName);
    setInfoOpen(true);
    setInfoLoading(true);
    setInfoRows([]);
    try {
      const data = await getTaskPlanInfo(row.TaskKey);
      setInfoRows(data);
    } catch (error: any) {
      console.error("[TableWorkPlan] getTaskPlanInfo error:", error?.message);
    } finally {
      setInfoLoading(false);
    }
  }, []);

  const columns = useMemo<GridColDef<WorkPlanItem | { id: string }>[]>(() => {
    const baseColumns: GridColDef<WorkPlanItem | { id: string }>[] = [
      {
        field: "TaskName",
        headerName: "Название",
        flex: 1,
        minWidth: 220,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => {
          if ((params.row as any).id === "__total__") {
            return <Typography variant="subtitle1">{params.value}</Typography>;
          }
          const row = params.row as WorkPlanItem;
          const title =
            [params.value, row.WorkName, row.WorkNameDict]
              .filter(Boolean)
              .join(" / ") || "-";
          return (
            <Tooltip title={title}>
              <span>
                <IssueDisplay
                  display={params.value}
                  href={`https://tracker.yandex.ru/${row.TaskKey}`}
                  fio={row.CheckListAssignee ?? ""}
                />
              </span>
            </Tooltip>
          );
        },
      },
      {
        field: "TaskKey",
        headerName: "Key",
        minWidth: 100,
        flex: 0.4,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
    ];

    const actionColumn: GridColDef<WorkPlanItem | { id: string }> = {
      field: "actions",
      headerName: "Действия",
      minWidth: canAddTime ? 160 : 120,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (
        params: GridRenderCellParams<WorkPlanItem | { id: string }>,
      ) =>
        (params.row as any).id === "__total__" ? null : (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ height: "100%" }}
          >
            <Tooltip title="Показать информацию по задаче">
              <IconButton
                size="small"
                sx={(theme) => ({ color: theme.palette.info.main })}
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenInfo(params.row as WorkPlanItem);
                }}
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canAddTime && (
              <Tooltip title="Добавить отметку времени">
                <IconButton
                  size="small"
                  sx={(theme) => ({ color: theme.palette.success.main })}
                  onClick={() => {
                    const row = params.row as WorkPlanItem;
                    setAddTimeIssue({
                      key: row.TaskKey,
                      summary: row.TaskName,
                      remainTimeMinutes: row.RemainTimeMinutes,
                      checklistItemId: row.checklistItemId ?? null,
                      YT_TL_WORKPLAN_ID: row.YT_TL_WORKPLAN_ID ?? null,
                      YT_TL_WORKLOG_ID: row.YT_TL_WORKLOG_ID ?? null,
                      TaskName: row.TaskName,
                      TaskKey: row.TaskKey,
                      WorkName: row.WorkName,
                      WorkNameDict: row.WorkNameDict,
                    });
                    setAddTimeOpen(true);
                  }}
                >
                  <AddAlarmIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canEditPlan && (
              <>
                <IconButton
                  size="small"
                  sx={(theme) => ({ color: theme.palette.primary.main })}
                  disabled={!canEditPlan}
                  onClick={() => {
                    if (!canEditPlan) return;
                    setSelectedRow(params.row as WorkPlanItem);
                    setEditOpen(true);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  sx={(theme) => ({ color: theme.palette.warning.main })}
                  disabled={!canEditPlan}
                  onClick={() => {
                    if (!canEditPlan) return;
                    setDeleteTarget(params.row as WorkPlanItem);
                    setDeleteOpen(true);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Stack>
        ),
    };

    const tailColumns: GridColDef<WorkPlanItem | { id: string }>[] = [
      { field: "WorkName", headerName: "Работа", flex: 1, minWidth: 120 },
      {
        field: "WorkDone",
        headerName: "Сделано",
        flex: 0.6,
        minWidth: 70,
        valueFormatter: (value: WorkPlanItem["WorkDone"]) =>
          value ? "Да" : "Нет",
      },
      {
        field: "StatusName",
        headerName: "Статус",
        flex: 0.9,
        minWidth: 120,
      },
      {
        field: "Comment",
        headerName: "Комментарий",
        flex: 1.2,
        minWidth: 160,
      },
      {
        field: "WorkNameDict",
        headerName: "Тип работы",
        flex: 0.9,
        minWidth: 120,
      },
      { field: "IsPlan", headerName: "План", flex: 0.5, minWidth: 70 },
      {
        field: "CheckListAssignee",
        headerName: "Сотрудник",
        flex: 1.5,
        minWidth: 160,
      },
      { field: "ProjectName", headerName: "Проект", flex: 1.2, minWidth: 150 },
      {
        field: "EstimateTimeMinutes",
        headerName: "Оценка.",
        flex: 0.7,
        minWidth: 90,
        valueFormatter: (value: WorkPlanItem["EstimateTimeMinutes"]) =>
          formatWorkMinutes(value),
      },
      {
        field: "SpentTimeMinutes",
        headerName: "Потрачено.",
        flex: 0.8,
        minWidth: 100,
        valueFormatter: (value: WorkPlanItem["SpentTimeMinutes"]) =>
          formatWorkMinutes(value),
      },
      {
        field: "RemainTimeMinutes",
        headerName: "Остаток.",
        flex: 0.8,
        minWidth: 100,
        valueFormatter: (value: WorkPlanItem["RemainTimeMinutes"]) =>
          formatWorkMinutes(value),
      },
      {
        field: "Deadline",
        headerName: "Дедлайн",
        flex: 0.7,
        minWidth: 90,
        valueFormatter: (value: WorkPlanItem["Deadline"]) =>
          value && dayjs(value).isValid()
            ? dayjs(value).format("DD.MM.YYYY")
            : "-",
      },
    ];

    return isAdmin
      ? [...baseColumns, actionColumn, ...tailColumns]
      : [...baseColumns, ...tailColumns];
  }, [isAdmin, canAddTime, handleOpenInfo]);

  const filteredRows = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((item) => {
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
  }, [rows, filterText]);

  const dialogIssues = useMemo<Issue[]>(
    () =>
      rows.map((item) => ({
        key: item.TaskKey,
        summary: item.TaskName,
        remainTimeMinutes: item.RemainTimeMinutes,
        checklistItemId: item.checklistItemId ?? null,
        YT_TL_WORKPLAN_ID: item.YT_TL_WORKPLAN_ID ?? null,
        YT_TL_WORKLOG_ID: item.YT_TL_WORKLOG_ID ?? null,
        TaskName: item.TaskName,
        TaskKey: item.TaskKey,
        WorkName: item.WorkName,
        WorkNameDict: item.WorkNameDict,
      })),
    [rows],
  );

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

  const sprintWorkingDays = useMemo(() => {
    const { selectedSprintId, sprins } = state.tableTimePlanState;
    if (!selectedSprintId) return null;
    const sprint = sprins.find(
      (item) => String(item.yt_tl_sprints_id) === selectedSprintId,
    );
    return sprint?.workingminutes ?? null;
  }, [state.tableTimePlanState]);

  const totalSpentDays = useMemo(() => {
    const total = filteredRows.reduce(
      (acc, item) => acc + (Number(item.SpentTimeMinutes) || 0),
      0,
    );
    return formatWorkMinutes(total);
  }, [filteredRows]);

  const remainingDays = useMemo(() => {
    if (sprintWorkingDays == null) return null;
    const spent = Number(totalSpentDays);
    if (!Number.isFinite(spent)) return null;
    return formatWorkMinutes(sprintWorkingDays - spent);
  }, [sprintWorkingDays, totalSpentDays]);

  const handleDelete = async () => {
    if (!deleteTarget || !sprintId) return;
    setDeleteLoading(true);
    try {
      const res = await setWorkPlan({
        sprintId,
        taskKey: deleteTarget.TaskKey,
        trackerUid: deleteTarget.trackerUid,
        action: 2,
        workPlanId: deleteTarget.YT_TL_WORKPLAN_ID,
      });
      if (res?.YT_TL_WORKPLAN_ID != null) {
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({
            ...prev,
            workPlanRefreshKey: prev.workPlanRefreshKey + 1,
          }),
        });
        setDeleteOpen(false);
        setDeleteTarget(null);
      }
    } catch (error: any) {
      console.error("[TableWorkPlan] delete work plan error:", error?.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <FilterTableText
        value={filterText}
        onChange={setFilterText}
        label="Фильтр"
        placeholder="Название, Key, Работа, Тип работы, Проект, Сотрудник, Статус, Комментарий"
        disabled={loading || rows.length === 0}
      />
      <DataGrid
        rows={rowsWithTotal}
        columns={columns}
        loading={loading || !isSprintReady}
        pageSizeOptions={[20, 50, 100]}
        disableColumnMenu
        getRowClassName={(params) => {
          if ((params.row as any).id === "__total__") return "row-total";
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
          };
        }}
      />
      {/* <Box sx={{ mt: 1 }}>
        <Typography variant="h6" color="error">
          Остаток: {remainingDays ?? "-"}
        </Typography>
      </Box> */}
      <SetIssuePlanTable
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedRow(null);
        }}
        issue={selectedRow}
        sprintId={sprintId}
        mode="edit"
      />
      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
      >
        <DialogTitle>Удалить запись из плана?</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            {deleteTarget?.TaskName} • {deleteTarget?.TaskKey}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteOpen(false);
              setDeleteTarget(null);
            }}
          >
            Отмена
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Информация по задаче • {infoTaskKey ?? "-"} • {infoTaskName ?? "-"}
        </DialogTitle>
        <DialogContent>
          <TableTaskPlanInfo rows={infoRows} loading={infoLoading} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
      {canAddTime && setData && (
        <AddDurationIssueDialog
          issues={dialogIssues}
          setData={setData}
          open={addTimeOpen}
          onOpenChange={(open) => {
            setAddTimeOpen(open);
            if (!open) setAddTimeIssue(null);
          }}
          initialIssue={addTimeIssue}
          hideTrigger
        />
      )}
    </Box>
  );
};

export default TableWorkPlan;
