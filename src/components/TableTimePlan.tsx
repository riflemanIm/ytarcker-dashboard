import {
  getTlGroupPatients,
  getTlGroups,
  getTlProjects,
  getTlRoles,
  getTlSprints,
} from "@/actions/data";
import {
  TlGroup,
  TlGroupPatient,
  TlProject,
  TlRole,
  TlSprint,
} from "@/types/global";
import { Box, Stack } from "@mui/material";
import { FC, useEffect, useMemo, useState } from "react";
import SelectGroupList from "./SelectGroupList";
import SelectGroupPatientsList from "./SelectGroupPatientsList";
import SelectProjectList from "./SelectProjectList";
import SelectRoleList from "./SelectRoleList";
import SelectSprintList from "./SelectSprintList";
import CheckPlanTable from "./CheckPlanTable";
import WorkPlanTable from "./WorkPlanTable";

interface TableTimePlanState {
  sprins: TlSprint[];
  groups: TlGroup[];
  roles: TlRole[];
  projects: TlProject[];
  groupPatients: TlGroupPatient[];
  loading: boolean;
  loadingGroups: boolean;
  loadingRoles: boolean;
  loadingProjects: boolean;
  loadingPatients: boolean;
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
    loading: false,
    loadingGroups: false,
    loadingRoles: false,
    loadingProjects: false,
    loadingPatients: false,
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

  const sprintId = useMemo(() => {
    const parsed = Number(localState.selectedSprintId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [localState.selectedSprintId]);

  const trackerUids = useMemo(
    () =>
      localState.selectedPatientUid ? [localState.selectedPatientUid] : [],
    [localState.selectedPatientUid],
  );
  const projectIds = useMemo(
    () =>
      localState.selectedProjectIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [localState.selectedProjectIds],
  );
  const roleIds = useMemo(
    () =>
      localState.selectedRoleIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [localState.selectedRoleIds],
  );
  const groupIds = useMemo(
    () =>
      localState.selectedGroupIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [localState.selectedGroupIds],
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
        <SelectGroupPatientsList
          patients={localState.groupPatients}
          handlePatientChange={handlePatientChange}
          selectedPatientUid={localState.selectedPatientUid}
          loading={localState.loadingPatients}
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
      </Stack>
      <CheckPlanTable
        sprintId={sprintId}
        trackerUids={trackerUids}
        projectIds={projectIds}
        roleIds={roleIds}
        groupIds={groupIds}
      />
      <WorkPlanTable
        sprintId={sprintId}
        trackerUids={trackerUids}
        projectIds={projectIds}
        roleIds={roleIds}
        groupIds={groupIds}
      />
    </Box>
  );
};

export default TableTimePlan;
