import { getTaskList, getTaskPlanInfo } from "@/actions/data";
import { workMinutesToDurationInput } from "@/helpers";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { TaskListItem, TaskPlanInfoItem } from "@/types/global";
import InfoIcon from "@mui/icons-material/Info";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useReducer } from "react";
import FilterTableText from "./FilterTableText";
import IssueDisplay from "./IssueDisplay";
import SetIssuePlanTable from "./SetIssuePlanTable";
import TableTaskPlanInfo from "./TableTaskPlanInfo";

const TableCheckPlan: FC = () => {
  const {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
    showAdminControls,
  } = useTableTimePlanSelectors();

  type InfoState = {
    open: boolean;
    loading: boolean;
    rows: TaskPlanInfoItem[];
    taskKey: string | null;
    taskName: string | null;
  };

  type State = {
    rows: TaskListItem[];
    loading: boolean;
    dialogOpen: boolean;
    selectedIssue: TaskListItem | null;
    filterText: string;
    info: InfoState;
  };

  type Action =
    | { type: "setRows"; rows: TaskListItem[] }
    | { type: "setLoading"; loading: boolean }
    | { type: "setDialog"; open: boolean; issue?: TaskListItem | null }
    | { type: "setFilter"; value: string }
    | { type: "setInfo"; payload: Partial<InfoState> };

  const initialState: State = {
    rows: [],
    loading: false,
    dialogOpen: false,
    selectedIssue: null,
    filterText: "",
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
      case "setRows":
        return { ...state, rows: action.rows };
      case "setLoading":
        return { ...state, loading: action.loading };
      case "setDialog":
        return {
          ...state,
          dialogOpen: action.open,
          selectedIssue:
            action.open === false
              ? null
              : (action.issue ?? state.selectedIssue),
        };
      case "setFilter":
        return { ...state, filterText: action.value };
      case "setInfo":
        return { ...state, info: { ...state.info, ...action.payload } };
      default:
        return state;
    }
  };

  const [state, dispatchState] = useReducer(reducer, initialState);
  const { rows, loading, dialogOpen, selectedIssue, filterText, info } = state;
  const theme = useTheme();
  const isXlUp = useMediaQuery(theme.breakpoints.up("xl"));
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));
  const formatWorkMinutes = (value: unknown) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return workMinutesToDurationInput(num);
  };
  const nameMinWidth = useMemo(() => {
    if (isXlUp) return 620;
    if (isLgUp) return 480;
    if (isMdUp) return 720;
    if (isSmUp) return 480;
    return 400;
  }, [isLgUp, isMdUp, isSmUp, isXlUp]);
  const isSprintReady = sprintId != null;
  const handleOpenInfo = async (row: TaskListItem) => {
    dispatchState({
      type: "setInfo",
      payload: {
        taskKey: row.TaskKey ?? null,
        taskName: row.TaskName ?? null,
        open: true,
        loading: true,
        rows: [],
      },
    });
    try {
      const data = await getTaskPlanInfo(row.TaskKey);
      dispatchState({ type: "setInfo", payload: { rows: data } });
    } catch (error: any) {
      console.error("[TableCheckPlan] getTaskPlanInfo error:", error?.message);
    } finally {
      dispatchState({ type: "setInfo", payload: { loading: false } });
    }
  };
  useEffect(() => {
    let isMounted = true;
    if (trackerUids.length === 0) {
      dispatchState({ type: "setRows", rows: [] });
      dispatchState({ type: "setLoading", loading: false });
      return () => {
        isMounted = false;
      };
    }
    dispatchState({ type: "setLoading", loading: true });
    getTaskList({
      trackerUids: trackerUids,
      projectIds,
      roleIds,
      groupIds,
    })
      .then((data) => {
        if (!isMounted) return;
        dispatchState({ type: "setRows", rows: data });
        dispatchState({ type: "setLoading", loading: false });
      })
      .catch((error) => {
        console.error("[TableCheckPlan] getTaskList error:", error.message);
        if (!isMounted) return;
        dispatchState({ type: "setLoading", loading: false });
      });

    return () => {
      isMounted = false;
    };
  }, [
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
    showAdminControls,
  ]);

  const columns = useMemo<GridColDef<TaskListItem>[]>(
    () => [
      {
        field: "TaskName",
        headerName: "Key + Название",
        flex: 1,
        minWidth: nameMinWidth,
        sortable: true,
        filterable: false,
        disableColumnMenu: true,
        valueGetter: (_value, row) => row.TaskKey,
        renderCell: (params: GridRenderCellParams) => {
          const workName = params.row.WorkName ?? "";
          const workType = params.row.WorkNameDict ?? "";
          const hintParts = [
            workName ? `Работа: ${workName}` : null,
            workType ? `Тип работы: ${workType}` : null,
          ].filter(Boolean);
          const hint = hintParts.length ? (
            <Box sx={{ whiteSpace: "pre-line" }}>{hintParts.join("\n")}</Box>
          ) : null;
          return (
            <IssueDisplay
              taskKey={params.row.TaskKey}
              taskName={params.row.TaskName}
              href={`https://tracker.yandex.ru/${params.row.TaskKey}`}
              fio={params.row.CheckListAssignee ?? ""}
              hint={hint}
            />
          );
        },
      },
      {
        field: "TaskKey",
        headerName: "В План",
        minWidth: 76,
        flex: 1,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ height: "100%" }}
          >
            <Tooltip title={params.value}>
              <span>
                <IconButton
                  size="medium"
                  sx={(theme) => ({ color: theme.palette.primary.main })}
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatchState({
                      type: "setDialog",
                      open: true,
                      issue: params.row,
                    });
                  }}
                  disabled={!sprintId}
                >
                  <PlaylistAddIcon fontSize="medium" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Показать информацию по задаче">
              <IconButton
                size="medium"
                sx={(theme) => ({ color: theme.palette.info.main })}
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenInfo(params.row as TaskListItem);
                }}
              >
                <InfoIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },

      {
        field: "WorkMinutes",
        headerName: "Трудозатраты.",
        flex: 1,
        minWidth: 60,
        disableColumnMenu: true,
        valueFormatter: (value: TaskListItem["WorkMinutes"]) =>
          formatWorkMinutes(value) || "-",
      },
      {
        field: "Deadline",
        headerName: "Дедлайн",
        flex: 1,
        minWidth: 90,
        disableColumnMenu: true,
        valueFormatter: (value: TaskListItem["Deadline"]) =>
          value && dayjs(value).isValid()
            ? dayjs(value).format("DD.MM.YYYY")
            : "-",
      },
    ],
    [nameMinWidth, sprintId],
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

  if (trackerUids.length === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Выберите сотрудника или сотрудников для отображения задач.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2, height: 400 }}>
      <FilterTableText
        value={filterText}
        onChange={(value) => dispatchState({ type: "setFilter", value })}
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
        onClose={() => dispatchState({ type: "setDialog", open: false })}
        issue={selectedIssue}
        sprintId={sprintId}
      />
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
    </Box>
  );
};

export default TableCheckPlan;
