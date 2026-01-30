import { getTaskList, getTaskPlanInfo } from "@/actions/data";
import { TaskListItem, TaskPlanInfoItem } from "@/types/global";
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
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";
import SetIssuePlanTable from "./SetIssuePlanTable";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import FilterTableText from "./FilterTableText";
import { useTheme } from "@mui/material/styles";
import { workMinutesToDurationInput } from "@/helpers";
import { useAppContext } from "@/context/AppContext";
import InfoIcon from "@mui/icons-material/Info";
import TableTaskPlanInfo from "./TableTaskPlanInfo";

const TableCheckPlan: FC = () => {
  const {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
  } = useTableTimePlanSelectors();
  const { state } = useAppContext();
  const fetchByLogin = state.state.fetchByLogin;
  const currentTrackerUid =
    state.state.userId ||
    state.tableTimePlanState.selectedPatientUid ||
    (Array.isArray(state.state.users) && state.state.users.length === 1
      ? (state.state.users[0]?.id ?? null)
      : null);
  const effectiveTrackerUids = useMemo(() => {
    if (fetchByLogin) return trackerUids;
    return currentTrackerUid ? [currentTrackerUid] : [];
  }, [currentTrackerUid, fetchByLogin, trackerUids]);
  const [rows, setRows] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<TaskListItem | null>(null);
  const [filterText, setFilterText] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoRows, setInfoRows] = useState<TaskPlanInfoItem[]>([]);
  const [infoTaskKey, setInfoTaskKey] = useState<string | null>(null);
  const [infoTaskName, setInfoTaskName] = useState<string | null>(null);
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
    if (isXlUp) return 520;
    if (isLgUp) return 380;
    if (isMdUp) return 620;
    if (isSmUp) return 480;
    return 400;
  }, [isLgUp, isMdUp, isSmUp, isXlUp]);
  const isSprintReady = sprintId != null;
  const handleOpenInfo = async (row: TaskListItem) => {
    setInfoTaskKey(row.TaskKey ?? null);
    setInfoTaskName(row.TaskName ?? null);
    setInfoOpen(true);
    setInfoLoading(true);
    setInfoRows([]);
    try {
      const data = await getTaskPlanInfo(row.TaskKey);
      setInfoRows(data);
    } catch (error: any) {
      console.error("[TableCheckPlan] getTaskPlanInfo error:", error?.message);
    } finally {
      setInfoLoading(false);
    }
  };
  useEffect(() => {
    let isMounted = true;
    if (effectiveTrackerUids.length === 0) {
      setRows([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }
    setLoading(true);
    getTaskList({
      trackerUids: effectiveTrackerUids,
      projectIds,
      roleIds,
      groupIds,
    })
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
  }, [effectiveTrackerUids, projectIds, roleIds, groupIds, workPlanRefreshKey]);

  const columns = useMemo<GridColDef<TaskListItem>[]>(
    () => [
      {
        field: "TaskName",
        headerName: "Название",
        flex: 1,
        minWidth: nameMinWidth,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) => {
          const workName = params.row.WorkName ?? "";
          const workType = params.row.WorkNameDict ?? "";
          const title =
            [params.value, workName, workType].filter(Boolean).join(" / ") ||
            "-";
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
        minWidth: 196,
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
            <Tooltip title="Показать информацию по задаче">
              <IconButton
                size="small"
                sx={(theme) => ({ color: theme.palette.info.main })}
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenInfo(params.row as TaskListItem);
                }}
              >
                <InfoIcon fontSize="small" />
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

  if (effectiveTrackerUids.length === 0) {
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
    </Box>
  );
};

export default TableCheckPlan;
