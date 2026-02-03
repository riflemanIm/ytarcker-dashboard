import {
  Alert,
  AlertColor,
  Grid2 as Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { FC, useCallback, useEffect, useMemo } from "react";
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
import { debugUserId, useAppContext } from "./context/AppContext";
import isEmpty, { aggregateDurations, getWeekRange } from "./helpers";
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
  const { selectedSprintId, sprins } = appState.tableTimePlanState;
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
        userId: null,
        data: [],
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

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    const trackerUidCandidate = state.loginUid ?? null;
    if (!userInfoEmail && !trackerUidCandidate) return;

    const fetchUserInfo = async () => {
      await getTlUserInfo({
        email: userInfoEmail ?? undefined,
        trackerUid: trackerUidCandidate ?? undefined,
        dispatch,
      });
    };

    fetchUserInfo();
    return () => {
      isMounted = false;
    };
  }, [dispatch, login, state.loginUid, token, userInfoEmail]);

  const fetchPlanRangeData = useCallback(() => {
    if (viewMode !== "table_time_plan") return;
    const planRangeStart = sprintRange?.start;
    const planRangeEnd = sprintRange?.end;

    if (!currentTrackerUid || !token || !planRangeStart || !planRangeEnd) {
      return;
    }

    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, data: [] }),
    });
    getData({
      userId: currentTrackerUid,
      dispatch,
      token,
      start: planRangeStart.format("YYYY-MM-DD"),
      end: planRangeEnd.format("YYYY-MM-DD"),
      login: undefined,
    });
  }, [currentTrackerUid, dispatch, sprintRange, token, viewMode]);

  const fetchUserIssues = useCallback(() => {
    if (viewMode !== "table_time_spend") return;
    const issuesUserId = debugUserId || state.userId;
    getUserIssues({
      dispatch,
      token,
      userId: issuesUserId,
      login: debugUserId ? null : login,
    });
  }, [dispatch, login, state.userId, token, viewMode]);

  const fetchForActiveRange = useCallback(() => {
    if (viewMode === "search" || viewMode === "table_time_plan") return;
    if (!(login || state.userId || currentTrackerUid) || !token) return;

    const rangeStart = viewMode === "report" ? reportFrom : start;
    const rangeEnd = viewMode === "report" ? reportTo : end;

    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, data: [] }),
    });
    getData({
      userId: state.showAdminControls ? state.userId : null,
      dispatch,
      token,
      start: rangeStart.format("YYYY-MM-DD"),
      end: rangeEnd.format("YYYY-MM-DD"),
      login: !state.showAdminControls && login ? login : undefined,
    });
  }, [
    dispatch,
    login,
    state.userId,
    token,
    state.showAdminControls,

    reportFrom,
    reportTo,
    sprintRange,
    start,
    end,
    viewMode,
  ]);

  useEffect(() => {
    fetchPlanRangeData();
  }, [fetchPlanRangeData]);

  useEffect(() => {
    fetchUserIssues();
  }, [fetchUserIssues]);

  useEffect(() => {
    fetchForActiveRange();
  }, [fetchForActiveRange]);

  const handleSelectedUsersChange = (userId: string | null) => {
    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, userId }),
    });
  };

  const handleRefresh = () => {
    fetchForActiveRange();
    fetchPlanRangeData();
    fetchUserIssues();
  };

  console.log("state", state);
  const isSuperUser = !!state.isAdmin;
  const shouldShowAddDialog =
    viewMode === "table_time_spend" &&
    !state.showAdminControls &&
    !isEmpty(appState.state.issues);
  return (
    <>
      {!state.loaded && <LinearProgress />}
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
            loaded={state.loaded}
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
            users={state.users}
            userId={state.userId}
            handleSelectedUsersChange={handleSelectedUsersChange}
            onRefresh={handleRefresh}
            showRefresh={viewMode !== "search"}
          />
        </Grid>
        {token && state.loaded && (
          <Grid
            size={12}
            sx={{ height: "87vh", background: "white", mx: "auto", mt: 2 }}
          >
            {viewMode === "search" ? (
              <SearchIssues token={token} />
            ) : viewMode === "table_time_plan" ? (
              <>
                <ViewTimePlan
                  data={aggregateDurations(state.data as DataItem[])}
                  start={start}
                  rangeStart={sprintRange?.start}
                  rangeEnd={sprintRange?.end}
                  setData={setData}
                  deleteData={deleteData}
                />
                <DurationAlert
                  open={alert.open}
                  message={alert.message}
                  severity={alert.severity as AlertColor | undefined}
                  onClose={handleCloseAlert}
                />
              </>
            ) : !isEmpty(state.data) ? (
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
                      data={aggregateDurations(state.data as DataItem[])}
                      start={start}
                      setData={setData}
                      deleteData={deleteData}
                      isEditable={!state.showAdminControls}
                    />
                  </>
                ) : (
                  <WorklogWeeklyReport
                    from={reportFrom.toDate()}
                    to={reportTo.toDate()}
                    data={state.data as any}
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
                <Alert severity="warning">
                  Нет ни одной отметки времени за выбранный период
                </Alert>
              </>
            )}
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default YandexTracker;
