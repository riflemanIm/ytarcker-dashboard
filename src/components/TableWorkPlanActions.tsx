import { setWorkPlan } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import { useTablePlanContext } from "@/context/TablePlanContext";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
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
} from "@mui/material";
import { FC } from "react";
import { Issue, WorkPlanItem } from "@/types/global";
import AddDurationIssueDialog from "./AddDurationIssueDialog";
import SetIssuePlanTable from "./SetIssuePlanTable";
import TableTaskPlanInfo from "./TableTaskPlanInfo";

interface TableWorkPlanActionsProps {
  row: WorkPlanItem;
}

const TableWorkPlanActions: FC<TableWorkPlanActionsProps> = ({ row }) => {
  const {
    canAddTime,
    canEditPlan,
    actionsDisabled,
    dataTimeSpendLoading,
    handleOpenInfo,
    handleAddTime,
    handleEdit,
    handleOpenDelete,
  } = useTablePlanContext();
  const addTimeDisabled = actionsDisabled || dataTimeSpendLoading;

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
      <Tooltip title="Показать информацию по задаче">
        <IconButton
          size="medium"
          disabled={actionsDisabled}
          sx={(theme) => ({ color: theme.palette.info.main })}
          onClick={(event) => {
            event.stopPropagation();
            if (actionsDisabled) return;
            handleOpenInfo(row);
          }}
        >
          <InfoIcon fontSize="medium" />
        </IconButton>
      </Tooltip>
      {canAddTime && (
        <Tooltip title="Добавить отметку времени">
          <span>
            <IconButton
              size="medium"
              disabled={addTimeDisabled}
              sx={(theme) => ({ color: theme.palette.success.main })}
              onClick={(event) => {
                event.stopPropagation();
                if (addTimeDisabled) return;
                handleAddTime({
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
              }}
            >
              <AddAlarmIcon fontSize="medium" />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {canEditPlan && (
        <>
          <IconButton
            size="medium"
            sx={(theme) => ({ color: theme.palette.primary.main })}
            disabled={actionsDisabled}
            onClick={(event) => {
              event.stopPropagation();
              if (actionsDisabled) return;
              handleEdit(row);
            }}
          >
            <EditIcon fontSize="medium" />
          </IconButton>
          <IconButton
            size="medium"
            sx={(theme) => ({ color: theme.palette.warning.main })}
            disabled={actionsDisabled}
            onClick={(event) => {
              event.stopPropagation();
              if (actionsDisabled) return;
              handleOpenDelete(row);
            }}
          >
            <DeleteIcon fontSize="medium" />
          </IconButton>
        </>
      )}
    </Stack>
  );
};

export const TableWorkPlanActionDialogs: FC = () => {
  const {
    state: {
      editOpen,
      selectedRow,
      deleteOpen,
      deleteTarget,
      deleteLoading,
      addTimeOpen,
      addTimeIssue,
      info,
    },
    rows,
    canAddTime,
    sprintId,
    setData,
    onWorkPlanRefresh,
    closeEdit,
    closeDelete,
    closeInfo,
    setAddTimeOpen,
  } = useTablePlanContext();
  const issues = rows.map((item) => ({
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
  })) as Issue[];

  return (
    <>
      <SetIssuePlanTable
        open={editOpen}
        onClose={closeEdit}
        issue={selectedRow}
        sprintId={sprintId}
        mode="edit"
      />
      <Dialog open={deleteOpen} onClose={closeDelete}>
        <DialogTitle>Удалить запись из плана?</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            {deleteTarget?.TaskName} • {deleteTarget?.TaskKey}
          </Box>
        </DialogContent>
        <DialogActions>
          <DeleteActionButton />
          <Button onClick={closeDelete}>Отмена</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={info.open} onClose={closeInfo} maxWidth="lg" fullWidth>
        <DialogTitle>
          Информация по задаче • {info.taskKey ?? "-"} • {info.taskName ?? "-"}
        </DialogTitle>
        <DialogContent>
          <TableTaskPlanInfo rows={info.rows} loading={info.loading} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInfo}>Закрыть</Button>
        </DialogActions>
      </Dialog>
      {canAddTime && setData && (
        <AddDurationIssueDialog
          issues={issues}
          setData={setData}
          open={addTimeOpen}
          onOpenChange={setAddTimeOpen}
          initialIssue={addTimeIssue}
          hideTrigger
          onWorkPlanRefresh={onWorkPlanRefresh}
        />
      )}
    </>
  );
};

const DeleteActionButton: FC = () => {
  const {
    state: { deleteTarget, deleteLoading },
    sprintId,
    dispatch,
  } = useTablePlanContext();
  const { dispatch: appDispatch } = useAppContext();

  const handleDelete = async () => {
    if (!deleteTarget || !sprintId) return;
    dispatch({ type: "setDeleteLoading", loading: true });
    try {
      await setWorkPlan({
        sprintId,
        taskKey: deleteTarget.TaskKey,
        trackerUid: deleteTarget.trackerUid,
        action: 2,
        workPlanId: deleteTarget.YT_TL_WORKPLAN_ID,
      });
      appDispatch({
        type: "setTableTimePlanState",
        payload: (prev) => ({
          ...prev,
          workPlanRefreshKey: prev.workPlanRefreshKey + 1,
        }),
      });
      dispatch({ type: "setDelete", open: false });
    } catch (error: any) {
      console.error("[TableWorkPlan] delete work plan error:", error?.message);
    } finally {
      dispatch({ type: "setDeleteLoading", loading: false });
    }
  };

  return (
    <Button
      color="error"
      variant="contained"
      onClick={handleDelete}
      disabled={deleteLoading}
    >
      Удалить
    </Button>
  );
};

export default TableWorkPlanActions;
