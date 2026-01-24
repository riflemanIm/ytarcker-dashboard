import {
  Alert,
  AlertColor,
  Grid2 as Grid,
  LinearProgress,
} from "@mui/material";
import dayjs from "dayjs";
import { FC, useCallback, useEffect } from "react";
import { deleteData, getData, getUserIssues, setData } from "./actions/data";
import AppHeader from "./components/AppHeader";
import DurationAlert from "./components/DurationAlert";
import SearchIssues from "./components/SearchIssues";
import TaskTable from "./components/TaskTable";
import TableTimePlan from "./components/TableTimePlan";
import WorklogWeeklyReport from "./components/WorklogWeeklyReport";
import { useAppContext } from "./context/AppContext";
import isEmpty, {
  aggregateDurations,
  getWeekRange,
  isSuperLogin,
} from "./helpers";
import { DataItem } from "./types/global";

const YandexTracker: FC = () => {
  const { state: appState, dispatch } = useAppContext();
  const { auth, state, alert, viewMode, weekOffset, reportFrom, reportTo } =
    appState;
  const { token, login } = auth;
  const handleCloseAlert = useCallback(
    () =>
      dispatch({
        type: "setAlert",
        payload: { open: false, severity: "", message: "" },
      }),
    [dispatch],
  );

  const toggleFetchMode = () => {
    dispatch({
      type: "setState",
      payload: (prev) => ({
        ...prev,
        fetchByLogin: !prev.fetchByLogin,
        userId: null,
        data: [],
      }),
    });
  };

  // НЕДЕЛЬНЫЙ РЕЖИМ (TaskTable)
  const { start, end } = getWeekRange(weekOffset);

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

  const fetchForActiveRange = useCallback(() => {
    if (viewMode === "search") return;
    if (!(login || state.userId) || !token) return;

    const rangeStart = viewMode === "report" ? reportFrom : start;
    const rangeEnd = viewMode === "report" ? reportTo : end;

    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, data: [] }),
    });
    getData({
      userId: state.fetchByLogin ? null : state.userId,
      dispatch,
      token,
      start: rangeStart.format("YYYY-MM-DD"),
      end: rangeEnd.format("YYYY-MM-DD"),
      login: state.fetchByLogin && login ? login : undefined,
    });
  }, [
    dispatch,
    login,
    state.userId,
    token,
    state.fetchByLogin,
    reportFrom,
    reportTo,
    start,
    end,
    viewMode,
  ]);
  useEffect(() => {
    if (viewMode === "table_time_spend") {
      getUserIssues({ dispatch, token, userId: state.userId, login });
    }
  }, [dispatch, login, state.userId, token, viewMode]);

  useEffect(() => {
    fetchForActiveRange();
  }, [
    login,
    state.userId,
    state.fetchByLogin,
    weekOffset,
    viewMode,
    reportFrom,
    reportTo,
  ]);

  const handleSelectedUsersChange = (userId: string | null) => {
    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, userId }),
    });
  };

  const handleRefresh = () => {
    fetchForActiveRange();
  };

  console.log("state", state);
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
            isSuperUser={!!(login && isSuperLogin(login))}
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
            fetchByLogin={state.fetchByLogin}
            onToggleFetchMode={toggleFetchMode}
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
              <TableTimePlan />
            ) : !isEmpty(state.data) ? (
              <>
                {viewMode === "table_time_spend" ? (
                  <TaskTable
                    data={aggregateDurations(state.data as DataItem[])}
                    start={start}
                    setData={setData}
                    deleteData={deleteData}
                    isEditable={state.fetchByLogin}
                  />
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
              <Alert severity="warning">
                Нет ни одной отметки времени за выбранный период
              </Alert>
            )}
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default YandexTracker;
