import {
  Alert,
  AlertColor,
  Grid2 as Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteData,
  getData,
  getTlUserInfo,
  getUserIssues,
  setData,
} from "./actions/data";
import AddDurationIssueDialog from "./components/AddDurationIssueDialog";
import AppHeader from "./components/AppHeader";
import DurationAlert from "./components/DurationAlert";
import SearchIssues from "./components/SearchIssues";
import TableTimeSpend from "./components/TableTimeSpend";
import ViewTimePlan from "./components/ViewTimePlan";
import WorklogWeeklyReport from "./components/WorklogWeeklyReport";
import { useAppContext } from "./context/AppContext";
import isEmpty, {
  aggregateDurations,
  getWeekRange,
  isSuperLogin,
} from "./helpers";
import { DataItem } from "./types/global";

const parseSprintRange = (raw?: string | null) => {
  if (!raw) return null;
  const dateMatches = raw.match(/\d{2}\.\d{2}(?:\.\d{4})?/g);
  if (!dateMatches || dateMatches.length < 2) return null;
  const left = dateMatches[0]?.trim();
  const right = dateMatches[1]?.trim();
  if (!left || !right) return null;
  const yearMatch = right.match(/(\d{4})/);
  const fallbackYear = yearMatch ? yearMatch[1] : dayjs().format("YYYY");
  const parseToIso = (value: string, year: string) => {
    const match = value.match(/^(\d{2})\.(\d{2})(?:\.(\d{4}))?$/);
    if (!match) return null;
    const [, day, month, rawYear] = match;
    const finalYear = rawYear ?? year;
    return `${finalYear}-${month}-${day}`;
  };
  const startIso = parseToIso(left, fallbackYear);
  const endIso = parseToIso(right, fallbackYear);
  if (!startIso || !endIso) return null;
  const start = dayjs(startIso);
  const end = dayjs(endIso);
  if (!start.isValid() || !end.isValid()) return null;
  return { start: start.startOf("day"), end: end.endOf("day") };
};

const YandexTracker: FC = () => {
  const { state: appState, dispatch } = useAppContext();
  const { auth, state, alert, viewMode, weekOffset, reportFrom, reportTo } =
    appState;
  const { token, login } = auth;
  const {
    selectedSprintId,
    sprins,
    workPlanRefreshKey,
    selectedGroupIds,
    selectedPatientUid,
  } = appState.tableTimePlanState;
  const userInfoEmail = useMemo(() => {
    const raw = localStorage.getItem("yandex_login");
    if (raw && raw !== "undefined" && raw !== "null") return raw;
    return login ?? null;
  }, [login]);
  const handleCloseAlert = useCallback(
    () =>
      dispatch({
        type: "setAlert",
        payload: { open: false, severity: "", message: "" },
      }),
    [dispatch],
  );

  const toggleShowAdminControls = () => {
    dispatch({
      type: "setState",
      payload: (prev) => ({
        ...prev,
        showAdminControls: !prev.showAdminControls,
        dataTimeSpend: [],
      }),
    });
  };

  // НЕДЕЛЬНЫЙ РЕЖИМ (TableTimeSpend)
  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const sprintLabel = useMemo(() => {
    if (!selectedSprintId) return null;
    return (
      sprins.find((item) => String(item.yt_tl_sprints_id) === selectedSprintId)
        ?.sprint ?? null
    );
  }, [selectedSprintId, sprins]);
  const sprintRange = useMemo(
    () => parseSprintRange(sprintLabel),
    [sprintLabel],
  );

  // РЕЖИМ ОТЧЁТА: произвольный диапазон дат (по умолчанию текущий месяц)
  const handlePrevReportMonth = () => {
    dispatch({
      type: "setReportFrom",
      payload: (prev) => prev.add(-1, "month").startOf("month"),
    });
    dispatch({
      type: "setReportTo",
      payload: (prev) => prev.add(-1, "month").endOf("month"),
    });
  };

  const handleThisReportMonth = () => {
    dispatch({
      type: "setReportFrom",
      payload: dayjs().startOf("month"),
    });
    dispatch({
      type: "setReportTo",
      payload: dayjs().endOf("month"),
    });
  };

  const handleNextReportMonth = () => {
    dispatch({
      type: "setReportFrom",
      payload: (prev) => prev.add(1, "month").startOf("month"),
    });
    dispatch({
      type: "setReportTo",
      payload: (prev) => prev.add(1, "month").endOf("month"),
    });
  };

  const currentTrackerUid = state.showAdminControls
    ? appState.tableTimePlanState.selectedPatientUid
    : state.loginUid;

  const [userInfoStatus, setUserInfoStatus] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");

  const fetchUserInfo = useCallback(async () => {
    if (!token) return false;
    const trackerUidCandidate = state.loginUid ?? null;
    if (!userInfoEmail && !trackerUidCandidate) return false;

    setUserInfoStatus("loading");
    const result = await getTlUserInfo({
      email: userInfoEmail ?? undefined,
      trackerUid: trackerUidCandidate ?? undefined,
      dispatch,
    });
    if (!result.info || result.errorStatus === 500) {
      setUserInfoStatus("failed");
      dispatch({
        type: "setAlert",
        payload: {
          open: true,
          severity: "error",
          message: "Вы не подключены к офисной сети.",
        },
      });
      return false;
    }

    setUserInfoStatus("ready");
    return true;
  }, [dispatch, state.loginUid, token, userInfoEmail]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const fetchPlanRangeData = useCallback(() => {
    if (viewMode !== "table_time_plan") return;
    if (userInfoStatus !== "ready") return;
    const planRangeStart = sprintRange?.start;
    const planRangeEnd = sprintRange?.end;

    if (!currentTrackerUid || !token || !planRangeStart || !planRangeEnd) {
      return;
    }

    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, dataTimeSpend: [] }),
    });
    getData({
      userId: currentTrackerUid,
      dispatch,
      token,
      start: planRangeStart.format("YYYY-MM-DD"),
      end: planRangeEnd.format("YYYY-MM-DD"),
      login: undefined,
    });
  }, [
    currentTrackerUid,
    dispatch,
    sprintRange,
    token,
    viewMode,
    state.showAdminControls,
    workPlanRefreshKey,
    userInfoStatus,
  ]);

  const fetchUserIssues = useCallback(() => {
    if (viewMode !== "table_time_spend") return;
    if (userInfoStatus !== "ready") return;
    if (state.showAdminControls && !selectedPatientUid) return;
    getUserIssues({
      dispatch,
      token,
      userId: state.showAdminControls ? selectedPatientUid : null,
      login: !state.showAdminControls ? login : null,
    });
  }, [
    dispatch,
    login,
    selectedPatientUid,
    token,
    viewMode,
    state.showAdminControls,
    userInfoStatus,
  ]);

  const fetchForActiveRange = useCallback(() => {
    if (viewMode === "search" || viewMode === "table_time_plan") return;
    if (userInfoStatus !== "ready") return;
    if (
      !token ||
      (!state.showAdminControls && !login) ||
      (state.showAdminControls && !selectedPatientUid)
    ) {
      return;
    }

    const rangeStart = viewMode === "report" ? reportFrom : start;
    const rangeEnd = viewMode === "report" ? reportTo : end;

    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, dataTimeSpend: [] }),
    });
    getData({
      userId: state.showAdminControls ? selectedPatientUid : null,
      dispatch,
      token,
      start: rangeStart.format("YYYY-MM-DD"),
      end: rangeEnd.format("YYYY-MM-DD"),
      login: !state.showAdminControls && login ? login : undefined,
    });
  }, [
    dispatch,
    login,
    token,
    state.showAdminControls,
    reportFrom,
    reportTo,
    sprintRange,
    start,
    end,
    viewMode,
    selectedPatientUid,
    userInfoStatus,
  ]);

  useEffect(() => {
    fetchPlanRangeData();
  }, [fetchPlanRangeData]);

  useEffect(() => {
    fetchForActiveRange();
  }, [fetchForActiveRange]);

  useEffect(() => {
    if (viewMode !== "table_time_spend") return;
    const defaultGroupId = "4";
    if (
      selectedGroupIds.length === 1 &&
      selectedGroupIds[0] === defaultGroupId
    ) {
      return;
    }
    try {
      window.localStorage.setItem(
        "selected_group_ids",
        JSON.stringify([defaultGroupId]),
      );
    } catch (error) {
      console.warn("[App] localStorage write failed:", error);
    }
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({
        ...prev,
        selectedGroupIds: [defaultGroupId],
        groupPatients: [],
        groupPatientsKey: "",
        selectedPatientUid: "",
      }),
    });
  }, [dispatch, selectedGroupIds, viewMode]);

  const handleRefresh = async () => {
    const ok = await fetchUserInfo();
    if (!ok) return;
    if (viewMode === "table_time_plan") {
      dispatch({
        type: "setTableTimePlanState",
        payload: (prev) => ({
          ...prev,
          workPlanRefreshKey: prev.workPlanRefreshKey + 1,
        }),
      });
    }
    fetchForActiveRange();
    fetchPlanRangeData();
    fetchUserIssues();
  };

  console.log("state", state);
  const isSuperUser = !!(state.isAdmin || (login && isSuperLogin(login)));
  const shouldShowAddDialog =
    viewMode === "table_time_spend" &&
    !state.showAdminControls &&
    !isEmpty(appState.state.issues);
  return (
    <>
      {state.dataTimeSpendLoading && <LinearProgress />}
      <Grid
        container
        sx={{
          background: "white",
          height: "100vh",

          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Grid size={12}>
          <AppHeader
            isSuperUser={isSuperUser}
            dataTimeSpendLoading={state.dataTimeSpendLoading}
            viewMode={viewMode}
            onViewModeChange={(mode) =>
              dispatch({ type: "setViewMode", payload: mode })
            }
            weekNavigation={{
              start,
              end,
              onPrevious: () =>
                dispatch({
                  type: "setWeekOffset",
                  payload: (prev) => prev + 1,
                }),
              onNext: () =>
                dispatch({
                  type: "setWeekOffset",
                  payload: (prev) => prev - 1,
                }),
              disableNext: weekOffset === -6,
            }}
            reportRange={{
              from: reportFrom,
              to: reportTo,
              onPrevMonth: handlePrevReportMonth,
              onThisMonth: handleThisReportMonth,
              onNextMonth: handleNextReportMonth,
            }}
            showRangeControls={viewMode !== "search"}
            showAdminControls={state.showAdminControls}
            onToggleShowAdminControls={toggleShowAdminControls}
            onRefresh={handleRefresh}
            showRefresh={viewMode !== "search"}
          />
        </Grid>
        {token && (
          <Grid
            size={12}
            sx={{ height: "87vh", background: "white", mx: "auto", mt: 2 }}
          >
            {viewMode === "search" ? (
              <SearchIssues token={token} />
            ) : viewMode === "table_time_plan" ? (
              <>
                <ViewTimePlan
                  data={aggregateDurations(state.dataTimeSpend as DataItem[])}
                  start={start}
                  rangeStart={sprintRange?.start}
                  rangeEnd={sprintRange?.end}
                  setData={setData}
                  deleteData={deleteData}
                  dataTimeSpendLoading={state.dataTimeSpendLoading}
                />
                <DurationAlert
                  open={alert.open}
                  message={alert.message}
                  severity={alert.severity as AlertColor | undefined}
                  onClose={handleCloseAlert}
                />
              </>
            ) : !isEmpty(state.dataTimeSpend) ? (
              <>
                {viewMode === "table_time_spend" ? (
                  <>
                    <Stack
                      spacing={2}
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                      mb={2}
                    >
                      <Typography variant="h5">
                        {`Затраченное время ${
                          state.showAdminControls
                            ? "по сотрудникам"
                            : "по задачам"
                        }`}
                      </Typography>
                      {shouldShowAddDialog && (
                        <AddDurationIssueDialog
                          issues={appState.state.issues}
                          setData={setData}
                        />
                      )}
                    </Stack>
                    <TableTimeSpend
                      data={aggregateDurations(
                        state.dataTimeSpend as DataItem[],
                      )}
                      start={start}
                      setData={setData}
                      deleteData={deleteData}
                      isEditable={!state.showAdminControls}
                      dataTimeSpendLoading={state.dataTimeSpendLoading}
                    />
                  </>
                ) : (
                  <WorklogWeeklyReport
                    from={reportFrom.toDate()}
                    to={reportTo.toDate()}
                    data={state.dataTimeSpend as any}
                    height={780}
                  />
                )}

                <DurationAlert
                  open={alert.open}
                  message={alert.message}
                  severity={alert.severity as AlertColor | undefined}
                  onClose={handleCloseAlert}
                />
              </>
            ) : (
              <>
                {viewMode === "table_time_spend" && (
                  <Stack
                    spacing={2}
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    mb={2}
                  >
                    <Typography variant="h5">
                      {`Затраченное время ${
                        state.showAdminControls
                          ? "по сотрудникам"
                          : "по задачам"
                      }`}
                    </Typography>
                    {shouldShowAddDialog && (
                      <AddDurationIssueDialog
                        issues={appState.state.issues}
                        setData={setData}
                      />
                    )}
                  </Stack>
                )}
                {userInfoStatus === "failed" && (
                  <Alert severity="error">
                    Вы не подключены к офисной сети.
                  </Alert>
                )}
                {isEmpty(state.dataTimeSpend) && (
                  <Alert severity="warning">
                    Нет ни одной отметки времени за выбранный период
                  </Alert>
                )}
              </>
            )}
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default YandexTracker;
