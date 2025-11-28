import {
  Alert,
  AlertColor,
  Grid2 as Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { FC, useCallback, useEffect, useState } from "react";
import { deleteData, getData, getUserIssues, setData } from "./actions/data";
import AddDurationIssueDialog from "./components/AddDurationIssueDialog";
import AppHeader from "./components/AppHeader";
import DurationAlert from "./components/DurationAlert";
import SearchIssues from "./components/SearchIssues";
import TaskTable from "./components/TaskTable";
import WorklogWeeklyReport from "./components/WorklogWeeklyReport";
import isEmpty, {
  aggregateDurations,
  getWeekRange,
  isSuperLogin,
} from "./helpers";
import {
  AlertState,
  AppState,
  AuthState,
  DataItem,
  ViewMode,
} from "./types/global";

const YandexTracker: FC = () => {
  const yandex_login = localStorage.getItem("yandex_login") ?? "";

  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem("yandex_token"),
    login: yandex_login.includes("@") ? yandex_login.split("@")[0] : null,
  });

  const { token, login } = auth;

  const [state, setState] = useState<AppState>({
    loaded: true,
    userId: null,
    users: null,
    data: [],
    fetchByLogin: true,
    issues: [],
  });

  const [alert, setAlert] = useState<AlertState>({
    open: false,
    severity: "",
    message: "",
  });
  const handleCloseAlert = useCallback(
    () => setAlert({ open: false, severity: "", message: "" }),
    []
  );

  const toggleFetchMode = () => {
    setState((prev) => ({
      ...prev,
      fetchByLogin: !prev.fetchByLogin,
      userId: null,
      data: [],
    }));
  };

  // Переключатель представлений
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // НЕДЕЛЬНЫЙ РЕЖИМ (TaskTable)
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const handlePrevious = () => setWeekOffset((prev) => prev + 1);
  const handleNext = () => setWeekOffset((prev) => prev - 1);
  const { start, end } = getWeekRange(weekOffset);

  // РЕЖИМ ОТЧЁТА: произвольный диапазон дат (по умолчанию текущий месяц)
  const [reportFrom, setReportFrom] = useState<dayjs.Dayjs>(() =>
    dayjs().startOf("month")
  );
  const [reportTo, setReportTo] = useState<dayjs.Dayjs>(() =>
    dayjs().endOf("month")
  );

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
    if (viewMode === "table") {
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
            token={token}
            login={login}
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
            setAuth={setAuth}
          />
        </Grid>
        {token && state.loaded && (
          <Grid
            size={12}
            sx={{ height: "80vh", background: "white", mx: "auto" }}
          >
            <Stack
              spacing={2}
              direction="row"
              alignItems="center"
              justifyContent="center"
              my={2}
            >
              <Typography variant="h5">
                {viewMode === "table" && (
                  <>
                    Затраченное время{" "}
                    {state.fetchByLogin ? "по задачам" : "по сотрудникам"}
                  </>
                )}
                {viewMode === "search" && <>Поиск по задачам</>}
              </Typography>
              {state.fetchByLogin && viewMode === "table" && (
                <AddDurationIssueDialog
                  issues={state.issues}
                  setData={setData}
                  setAlert={setAlert}
                  setState={setState}
                  token={token}
                />
              )}
            </Stack>

            {viewMode === "search" ? (
              <SearchIssues token={token} />
            ) : !isEmpty(state.data) ? (
              <>
                {viewMode === "table" ? (
                  <TaskTable
                    data={aggregateDurations(state.data as DataItem[])}
                    start={start}
                    setState={setState}
                    token={token}
                    setData={setData}
                    deleteData={deleteData}
                    setAlert={setAlert}
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
