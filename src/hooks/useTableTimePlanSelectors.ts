import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";

export const useTableTimePlanSelectors = () => {
  const { state } = useAppContext();
  const { tableTimePlanState } = state;
  const { fetchByLogin, userId, users } = state.state;

  const sprintId = useMemo(() => {
    const parsed = Number(tableTimePlanState.selectedSprintId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [tableTimePlanState.selectedSprintId]);

  const currentTrackerUid =
    userId ||
    tableTimePlanState.selectedPatientUid ||
    (Array.isArray(users) && users.length === 1 ? users[0]?.id ?? null : null);

  const trackerUids = useMemo(() => {
    if (fetchByLogin && currentTrackerUid) return [currentTrackerUid];
    return tableTimePlanState.selectedPatientUid
      ? [tableTimePlanState.selectedPatientUid]
      : [];
  }, [fetchByLogin, currentTrackerUid, tableTimePlanState.selectedPatientUid]);

  const projectIds = useMemo(
    () =>
      tableTimePlanState.selectedProjectIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [tableTimePlanState.selectedProjectIds]
  );

  const roleIds = useMemo(
    () =>
      tableTimePlanState.selectedRoleIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [tableTimePlanState.selectedRoleIds]
  );

  const groupIds = useMemo(
    () =>
      tableTimePlanState.selectedGroupIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [tableTimePlanState.selectedGroupIds]
  );

  return {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey: tableTimePlanState.workPlanRefreshKey,
  };
};
