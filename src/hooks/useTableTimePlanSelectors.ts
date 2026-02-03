import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
export const useTableTimePlanSelectors = () => {
  const { state } = useAppContext();
  const { tableTimePlanState } = state;
  const { showAdminControls, loginUid, isAdmin, planEditMode } = state.state;

  const sprintId = useMemo(() => {
    const parsed = Number(tableTimePlanState.selectedSprintId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [tableTimePlanState.selectedSprintId]);

  const currentTrackerUid = showAdminControls
    ? tableTimePlanState.selectedPatientUid
    : loginUid;

  const trackerUids = useMemo(() => {
    if (!showAdminControls && currentTrackerUid) return [currentTrackerUid];
    return tableTimePlanState.selectedPatientUid
      ? [tableTimePlanState.selectedPatientUid]
      : [];
  }, [
    showAdminControls,
    currentTrackerUid,
    tableTimePlanState.selectedPatientUid,
  ]);

  const projectIds = useMemo(
    () =>
      tableTimePlanState.selectedProjectIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [tableTimePlanState.selectedProjectIds],
  );

  const roleIds = useMemo(
    () =>
      tableTimePlanState.selectedRoleIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [tableTimePlanState.selectedRoleIds],
  );

  const groupIds = useMemo(
    () =>
      tableTimePlanState.selectedGroupIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    [tableTimePlanState.selectedGroupIds],
  );

  return {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    currentTrackerUid,
    showAdminControls,
    tableTimePlanState,
    workPlanRefreshKey: tableTimePlanState.workPlanRefreshKey,
    isAdmin,
    planEditMode,
  };
};
