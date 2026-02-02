import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { isSuperLogin } from "@/helpers";

export const useTableTimePlanSelectors = () => {
  const { state } = useAppContext();
  const { tableTimePlanState } = state;
  const { fetchByLogin, loginUid } = state.state;
  const { login } = state.auth;
  const isAdmin = !!(login && isSuperLogin(login));

  const sprintId = useMemo(() => {
    const parsed = Number(tableTimePlanState.selectedSprintId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [tableTimePlanState.selectedSprintId]);

  const currentTrackerUid = !fetchByLogin
    ? tableTimePlanState.selectedPatientUid
    : loginUid;

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
    fetchByLogin,
    tableTimePlanState,
    workPlanRefreshKey: tableTimePlanState.workPlanRefreshKey,
    isAdmin,
  };
};
