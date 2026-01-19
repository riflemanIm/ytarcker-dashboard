import { getTlGroupPatients, getTlGroups, getTlSprints } from "@/actions/data";
import { TlGroup, TlGroupPatient, TlSprint } from "@/types/global";
import { Box, Stack } from "@mui/material";
import { FC, useEffect, useState } from "react";
import SelectGroupList from "./SelectGroupList";
import SelectGroupPatientsList from "./SelectGroupPatientsList";
import SelectSprintList from "./SelectSprintList";

interface TableTimePlanState {
  sprins: TlSprint[];
  groups: TlGroup[];
  groupPatients: TlGroupPatient[];
  loading: boolean;
  loadingGroups: boolean;
  loadingPatients: boolean;
  selectedSprintId: string;
  selectedGroupIds: string[];
  selectedPatientUid: string;
}

const TableTimePlan: FC = () => {
  const [localState, setLocalState] = useState<TableTimePlanState>({
    sprins: [],
    groups: [],
    groupPatients: [],
    loading: false,
    loadingGroups: false,
    loadingPatients: false,
    selectedSprintId: "",
    selectedGroupIds: [],
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

  const handlePatientChange = (patientUid: string) => {
    setLocalState((prev) => ({ ...prev, selectedPatientUid: patientUid }));
  };

  console.log("localState", localState);

  return (
    <Box sx={{ px: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
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
      </Stack>
    </Box>
  );
};

export default TableTimePlan;
