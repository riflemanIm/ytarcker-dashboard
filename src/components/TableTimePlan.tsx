import {
  getTaskList,
  getTlGroupPatients,
  getTlGroups,
  getTlProjects,
  getTlRoles,
  getTlSprints,
} from "@/actions/data";
import {
  TaskListItem,
  TlGroup,
  TlGroupPatient,
  TlProject,
  TlRole,
  TlSprint,
} from "@/types/global";
import { Box, Stack } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useEffect, useMemo, useState } from "react";
import SelectGroupList from "./SelectGroupList";
import SelectGroupPatientsList from "./SelectGroupPatientsList";
import SelectProjectList from "./SelectProjectList";
import SelectRoleList from "./SelectRoleList";
import SelectSprintList from "./SelectSprintList";

interface TableTimePlanState {
  sprins: TlSprint[];
  groups: TlGroup[];
  roles: TlRole[];
  projects: TlProject[];
  groupPatients: TlGroupPatient[];
  taskList: TaskListItem[];
  loading: boolean;
  loadingGroups: boolean;
  loadingRoles: boolean;
  loadingProjects: boolean;
  loadingPatients: boolean;
  loadingTaskList: boolean;
  selectedSprintId: string;
  selectedGroupIds: string[];
  selectedRoleIds: string[];
  selectedProjectIds: string[];
  selectedPatientUid: string;
}

const TableTimePlan: FC = () => {
  const [localState, setLocalState] = useState<TableTimePlanState>({
    sprins: [],
    groups: [],
    roles: [],
    projects: [],
    groupPatients: [],
    taskList: [],
    loading: false,
    loadingGroups: false,
    loadingRoles: false,
    loadingProjects: false,
    loadingPatients: false,
    loadingTaskList: false,
    selectedSprintId: "",
    selectedGroupIds: [],
    selectedRoleIds: [],
    selectedProjectIds: [],
    selectedPatientUid: "",
  });

  useEffect(() => {
    let isMounted = true;
    setLocalState((prev) => ({ ...prev, loading: true }));
    getTlSprints()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        const defaultSprintId =
          sorted.find((item) => item.current_sprint)?.yt_tl_sprints_id ?? "";
        setLocalState((prev) => ({
          ...prev,
          sprins: sorted,
          loading: false,
          selectedSprintId:
            prev.selectedSprintId ||
            (defaultSprintId ? String(defaultSprintId) : ""),
        }));
      })
      .catch((error) => {
        console.error("[TableTimePlan] getTlSprints error:", error.message);
        if (!isMounted) return;
        setLocalState((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLocalState((prev) => ({ ...prev, loadingGroups: true }));
    getTlGroups()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        setLocalState((prev) => ({
          ...prev,
          groups: sorted,
          loadingGroups: false,
        }));
      })
      .catch((error) => {
        console.error("[TableTimePlan] getTlGroups error:", error.message);
        if (!isMounted) return;
        setLocalState((prev) => ({ ...prev, loadingGroups: false }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLocalState((prev) => ({ ...prev, loadingRoles: true }));
    getTlRoles()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        setLocalState((prev) => ({
          ...prev,
          roles: sorted,
          loadingRoles: false,
        }));
      })
      .catch((error) => {
        console.error("[TableTimePlan] getTlRoles error:", error.message);
        if (!isMounted) return;
        setLocalState((prev) => ({ ...prev, loadingRoles: false }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLocalState((prev) => ({ ...prev, loadingProjects: true }));
    getTlProjects()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        setLocalState((prev) => ({
          ...prev,
          projects: sorted,
          loadingProjects: false,
        }));
      })
      .catch((error) => {
        console.error("[TableTimePlan] getTlProjects error:", error.message);
        if (!isMounted) return;
        setLocalState((prev) => ({ ...prev, loadingProjects: false }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const groupIds = localState.selectedGroupIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (groupIds.length === 0) {
      setLocalState((prev) => ({
        ...prev,
        groupPatients: [],
        loadingPatients: false,
        selectedPatientUid: "",
      }));
      return;
    }

    setLocalState((prev) => ({ ...prev, loadingPatients: true }));
    getTlGroupPatients(groupIds)
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        setLocalState((prev) => {
          const selectedPatientUid = sorted.some(
            (item) => item.trackerUid === prev.selectedPatientUid,
          )
            ? prev.selectedPatientUid
            : "";
          return {
            ...prev,
            groupPatients: sorted,
            loadingPatients: false,
            selectedPatientUid,
          };
        });
      })
      .catch((error) => {
        console.error(
          "[TableTimePlan] getTlGroupPatients error:",
          error.message,
        );
        if (!isMounted) return;
        setLocalState((prev) => ({ ...prev, loadingPatients: false }));
      });

    return () => {
      isMounted = false;
    };
  }, [localState.selectedGroupIds]);

  useEffect(() => {
    let isMounted = true;
    const trackerUids = localState.selectedPatientUid
      ? [localState.selectedPatientUid]
      : [];
    const projectIds = localState.selectedProjectIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
    const roleIds = localState.selectedRoleIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
    const groupIds = localState.selectedGroupIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    setLocalState((prev) => ({ ...prev, loadingTaskList: true }));
    getTaskList({ trackerUids, projectIds, roleIds, groupIds })
      .then((data) => {
        if (!isMounted) return;
        setLocalState((prev) => ({
          ...prev,
          taskList: data,
          loadingTaskList: false,
        }));
      })
      .catch((error) => {
        console.error("[TableTimePlan] getTaskList error:", error.message);
        if (!isMounted) return;
        setLocalState((prev) => ({ ...prev, loadingTaskList: false }));
      });

    return () => {
      isMounted = false;
    };
  }, [
    localState.selectedPatientUid,
    localState.selectedProjectIds,
    localState.selectedRoleIds,
    localState.selectedGroupIds,
  ]);

  const handleSprintChange = (sprintId: string) => {
    setLocalState((prev) => ({ ...prev, selectedSprintId: sprintId }));
  };

  const handleGroupChange = (groupIds: string[]) => {
    setLocalState((prev) => ({ ...prev, selectedGroupIds: groupIds }));
  };

  const handleRoleChange = (roleIds: string[]) => {
    setLocalState((prev) => ({ ...prev, selectedRoleIds: roleIds }));
  };

  const handleProjectChange = (projectIds: string[]) => {
    setLocalState((prev) => ({ ...prev, selectedProjectIds: projectIds }));
  };

  const handlePatientChange = (patientUid: string) => {
    setLocalState((prev) => ({ ...prev, selectedPatientUid: patientUid }));
  };

  const taskListColumns = useMemo<GridColDef<TaskListItem>[]>(
    () => [
      { field: "TaskKey", headerName: "Ключ", flex: 1, minWidth: 120 },
      { field: "TaskName", headerName: "Задача", flex: 2.5, minWidth: 220 },
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
    [],
  );

  return (
    <Box sx={{ px: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <SelectSprintList
          sprins={localState.sprins}
          handleSprintChange={handleSprintChange}
          selectedSprintId={localState.selectedSprintId}
          loading={localState.loading}
        />
        <SelectGroupList
          groups={localState.groups}
          handleGroupChange={handleGroupChange}
          selectedGroupIds={localState.selectedGroupIds}
          loading={localState.loadingGroups}
        />
        <SelectRoleList
          roles={localState.roles}
          handleRoleChange={handleRoleChange}
          selectedRoleIds={localState.selectedRoleIds}
          loading={localState.loadingRoles}
        />
        <SelectProjectList
          projects={localState.projects}
          handleProjectChange={handleProjectChange}
          selectedProjectIds={localState.selectedProjectIds}
          loading={localState.loadingProjects}
        />
        <SelectGroupPatientsList
          patients={localState.groupPatients}
          handlePatientChange={handlePatientChange}
          selectedPatientUid={localState.selectedPatientUid}
          loading={localState.loadingPatients}
        />
      </Stack>
      <Box sx={{ mt: 2, height: 600 }}>
        <DataGrid
          rows={localState.taskList.map((item) => ({
            ...item,
            id: item.checklistItemId,
          }))}
          columns={taskListColumns}
          loading={localState.loadingTaskList}
          pageSizeOptions={[20, 50, 100]}
          disableColumnMenu
        />
      </Box>
    </Box>
  );
};

export default TableTimePlan;
