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
  const {
    auth,
    state,
    alert,
    setAlert,
    setState,
    viewMode,
    setViewMode,
    weekOffset,
    setWeekOffset,
    reportFrom,
    setReportFrom,
    reportTo,
    setReportTo,
  } = useAppContext();
  const { token, login } = auth;
  const handleCloseAlert = useCallback(
    () => setAlert({ open: false, severity: "", message: "" }),
    [],
  );

  const toggleFetchMode = () => {
    setState((prev) => ({
      ...prev,
      fetchByLogin: !prev.fetchByLogin,
      userId: null,
      data: [],
    }));
  };

  // НЕДЕЛЬНЫЙ РЕЖИМ (TaskTable)
  const handlePrevious = () => setWeekOffset((prev) => prev + 1);
  const handleNext = () => setWeekOffset((prev) => prev - 1);
  const { start, end } = getWeekRange(weekOffset);

  // РЕЖИМ ОТЧЁТА: произвольный диапазон дат (по умолчанию текущий месяц)
  const handlePrevReportMonth = () => {
    setReportFrom((prev) => prev.add(-1, "month").startOf("month"));
    setReportTo((prev) => prev.add(-1, "month").endOf("month"));
  };

  const handleThisReportMonth = () => {
    setReportFrom(dayjs().startOf("month"));
    setReportTo(dayjs().endOf("month"));
  };

  const handleNextReportMonth = () => {
    setReportFrom((prev) => prev.add(1, "month").startOf("month"));
    setReportTo((prev) => prev.add(1, "month").endOf("month"));
  };

  const fetchForActiveRange = useCallback(() => {
    if (viewMode === "search") return;
    if (!(login || state.userId) || !token) return;

    const rangeStart = viewMode === "report" ? reportFrom : start;
    const rangeEnd = viewMode === "report" ? reportTo : end;

    setState((prev) => ({ ...prev, data: [] }));
    getData({
      userId: state.fetchByLogin ? null : state.userId,
      setState,
      token,
      start: rangeStart.format("YYYY-MM-DD"),
      end: rangeEnd.format("YYYY-MM-DD"),
      login: state.fetchByLogin && login ? login : undefined,
    });
  }, [
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
      getUserIssues({ setState, token, userId: state.userId, login });
    }
  }, [viewMode]);

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
    setState((prev) => ({ ...prev, userId }));
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
          width: "98vw",
          justifyContent: "center",
          textAlign: "center",
        }}
        spacing={3}
      >
        <Grid size={12}>
          <AppHeader
            isSuperUser={!!(login && isSuperLogin(login))}
            loaded={state.loaded}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            weekNavigation={{
              start,
              end,
              onPrevious: handlePrevious,
              onNext: handleNext,
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
            sx={{ height: "80vh", background: "white", mx: "auto" }}
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
