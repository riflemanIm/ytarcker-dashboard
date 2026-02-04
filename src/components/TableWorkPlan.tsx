import { SetDataArgs, getTaskPlanInfo, setWorkPlan } from "@/actions/data";
import { Issue, TaskPlanInfoItem, WorkPlanItem } from "@/types/global";
import {
  Alert,
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
import { FC, useCallback, useMemo, useReducer } from "react";
import IssueDisplay from "./IssueDisplay";
import { getPriorityPalette } from "@/helpers/priorityStyles";
import { workMinutesToDurationInput } from "@/helpers";
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
  onWorkPlanRefresh?: () => void | Promise<void>;
}

const TableWorkPlan: FC<TableWorkPlanProps> = ({
  rows,
  loading = false,
  setData,
  onWorkPlanRefresh,
}) => {
  const { sprintId, trackerUids, planEditMode, showAdminControls } =
    useTableTimePlanSelectors();

  const { state: appState, dispatch } = useAppContext();
  const dataTimeSpendLoading = appState.state.dataTimeSpendLoading;

  const canAddTime = !showAdminControls;
  const canEditPlan = showAdminControls && !!planEditMode;

  //console.log("canAddTime", canAddTime);

  type InfoState = {
    open: boolean;
    loading: boolean;
    rows: TaskPlanInfoItem[];
    taskKey: string | null;
    taskName: string | null;
  };

  type State = {
    filterText: string;
    editOpen: boolean;
    selectedRow: WorkPlanItem | null;
    deleteOpen: boolean;
    deleteTarget: WorkPlanItem | null;
    deleteLoading: boolean;
    addTimeOpen: boolean;
    addTimeIssue: Issue | null;
    info: InfoState;
  };

  type Action =
    | { type: "setFilter"; value: string }
    | { type: "setEdit"; open: boolean; row?: WorkPlanItem | null }
    | { type: "setDelete"; open: boolean; row?: WorkPlanItem | null }
    | { type: "setDeleteLoading"; loading: boolean }
    | { type: "setAddTime"; open: boolean; issue?: Issue | null }
    | { type: "setInfo"; payload: Partial<InfoState> };

  const initialState: State = {
    filterText: "",
    editOpen: false,
    selectedRow: null,
    deleteOpen: false,
    deleteTarget: null,
    deleteLoading: false,
    addTimeOpen: false,
    addTimeIssue: null,
    info: {
      open: false,
      loading: false,
      rows: [],
      taskKey: null,
      taskName: null,
    },
  };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case "setFilter":
        return { ...state, filterText: action.value };
      case "setEdit":
        return {
          ...state,
          editOpen: action.open,
          selectedRow:
            action.open === false ? null : action.row ?? state.selectedRow,
        };
      case "setDelete":
        return {
          ...state,
          deleteOpen: action.open,
          deleteTarget:
            action.open === false ? null : action.row ?? state.deleteTarget,
        };
      case "setDeleteLoading":
        return { ...state, deleteLoading: action.loading };
      case "setAddTime":
        return {
          ...state,
          addTimeOpen: action.open,
          addTimeIssue:
            action.open === false ? null : action.issue ?? state.addTimeIssue,
        };
      case "setInfo":
        return { ...state, info: { ...state.info, ...action.payload } };
      default:
        return state;
    }
  };

  const [state, dispatchState] = useReducer(reducer, initialState);
  const {
    filterText,
    editOpen,
    selectedRow,
    deleteOpen,
    deleteTarget,
    deleteLoading,
    addTimeOpen,
    addTimeIssue,
    info,
  } = state;

  const isSprintReady = sprintId != null;

  const formatWorkMinutes = (value: unknown) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return workMinutesToDurationInput(num);
  };

  const handleOpenInfo = useCallback(async (row: WorkPlanItem) => {
    dispatchState({
      type: "setInfo",
      payload: {
        taskKey: row.TaskKey,
        taskName: row.TaskName,
        open: true,
        loading: true,
        rows: [],
      },
    });
    try {
      const data = await getTaskPlanInfo(row.TaskKey);
      dispatchState({ type: "setInfo", payload: { rows: data } });
    } catch (error: any) {
      console.error("[TableWorkPlan] getTaskPlanInfo error:", error?.message);
    } finally {
      dispatchState({ type: "setInfo", payload: { loading: false } });
    }
  }, []);

  const handleTimeSaved = useCallback(() => {
    onWorkPlanRefresh?.();
  }, [onWorkPlanRefresh]);

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
                <span>
                  <IconButton
                    size="small"
                    disabled={dataTimeSpendLoading}
                    sx={(theme) => ({ color: theme.palette.success.main })}
                    onClick={() => {
                      if (dataTimeSpendLoading) return;
                      const row = params.row as WorkPlanItem;
                      dispatchState({
                        type: "setAddTime",
                        open: true,
                        issue: {
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
                        },
                      });
                    }}
                  >
                    <AddAlarmIcon fontSize="small" />
                  </IconButton>
                </span>
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
                    dispatchState({
                      type: "setEdit",
                      open: true,
                      row: params.row as WorkPlanItem,
                    });
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
                    dispatchState({
                      type: "setDelete",
                      open: true,
                      row: params.row as WorkPlanItem,
                    });
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

    return [...baseColumns, actionColumn, ...tailColumns];
  }, [
    canAddTime,
    canEditPlan,
    dataTimeSpendLoading,
    handleOpenInfo,
    showAdminControls,
  ]);

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

  const handleDelete = async () => {
    if (!deleteTarget || !sprintId) return;
    dispatchState({ type: "setDeleteLoading", loading: true });
    try {
      await setWorkPlan({
        sprintId,
        taskKey: deleteTarget.TaskKey,
        trackerUid: deleteTarget.trackerUid,
        action: 2,
        workPlanId: deleteTarget.YT_TL_WORKPLAN_ID,
      });
      dispatch({
        type: "setTableTimePlanState",
        payload: (prev) => ({
          ...prev,
          workPlanRefreshKey: prev.workPlanRefreshKey + 1,
        }),
      });
      dispatchState({ type: "setDelete", open: false });
    } catch (error: any) {
      console.error("[TableWorkPlan] delete work plan error:", error?.message);
    } finally {
      dispatchState({ type: "setDeleteLoading", loading: false });
    }
  };
  if (trackerUids.length === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Выберите сотрудника или сотрудников для отображения задач.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <FilterTableText
        value={filterText}
        onChange={(value) => dispatchState({ type: "setFilter", value })}
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
      {/* <Box sx={{ mt: 1 }}>
        <Typography variant="h6" color="error">
          Остаток: {remainingDays ?? "-"}
        </Typography>
      </Box> */}
      <SetIssuePlanTable
        open={editOpen}
        onClose={() => dispatchState({ type: "setEdit", open: false })}
        issue={selectedRow}
        sprintId={sprintId}
        mode="edit"
      />
      <Dialog
        open={deleteOpen}
        onClose={() => dispatchState({ type: "setDelete", open: false })}
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
              dispatchState({ type: "setDelete", open: false });
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
        open={info.open}
        onClose={() =>
          dispatchState({ type: "setInfo", payload: { open: false } })
        }
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Информация по задаче • {info.taskKey ?? "-"} • {info.taskName ?? "-"}
        </DialogTitle>
        <DialogContent>
          <TableTaskPlanInfo rows={info.rows} loading={info.loading} />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              dispatchState({ type: "setInfo", payload: { open: false } })
            }
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
      {canAddTime && setData && (
        <AddDurationIssueDialog
          issues={dialogIssues}
          setData={setData}
          open={addTimeOpen}
          onOpenChange={(open) => {
            dispatchState({ type: "setAddTime", open });
          }}
          initialIssue={addTimeIssue}
          hideTrigger
          onSaved={handleTimeSaved}
          onWorkPlanRefresh={onWorkPlanRefresh}
        />
      )}
    </Box>
  );
};

export default TableWorkPlan;
