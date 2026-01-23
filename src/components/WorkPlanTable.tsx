import { getWorkPlan, setWorkPlan } from "@/actions/data";
import { WorkPlanItem } from "@/types/global";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import IssueDisplay from "./IssueDisplay";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { getPriorityPalette } from "@/helpers/priorityStyles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SetIssuePlanTable from "./SetIssuePlanTable";
import { useAppContext } from "@/context/AppContext";

const WorkPlanTable: FC = () => {
  const {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
  } = useTableTimePlanSelectors();
  const { dispatch } = useAppContext();
  const [rows, setRows] = useState<WorkPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isSprintReady = sprintId != null;
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<WorkPlanItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkPlanItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        minWidth: 100,
        flex: 0.4,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: "actions",
        headerName: "Действия",
        minWidth: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<WorkPlanItem>) => (
          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              sx={(theme) => ({ color: theme.palette.primary.main })}
              onClick={() => {
                setSelectedRow(params.row);
                setEditOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              sx={(theme) => ({ color: theme.palette.warning.main })}
              onClick={() => {
                setDeleteTarget(params.row);
                setDeleteOpen(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
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
        field: "EstimateTimeDays",
        headerName: "Оценка, дн.",
        flex: 0.7,
        minWidth: 90,
      },
      {
        field: "SpentTimeDays",
        headerName: "Потрачено, дн.",
        flex: 0.8,
        minWidth: 100,
      },
      {
        field: "RemainTimeDays",
        headerName: "Остаток, дн.",
        flex: 0.8,
        minWidth: 100,
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
    ],
    [],
  );

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
      console.error("[WorkPlanTable] delete work plan error:", error?.message);
    } finally {
      setDeleteLoading(false);
    }
  };

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
    </Box>
  );
};

export default WorkPlanTable;
