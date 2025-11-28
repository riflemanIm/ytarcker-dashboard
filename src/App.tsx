import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  AlertColor,
  Box,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { FC, useCallback, useEffect, useState } from "react";
import { deleteData, getData, getUserIssues, setData } from "./actions/data";
import AddDurationIssueDialog from "./components/AddDurationIssueDialog";
import AutocompleteUsers from "./components/AutocompleteUsers";
import DurationAlert from "./components/DurationAlert";
import FetchModeSwitch from "./components/FetchModeSwitch";
import LogInOut from "./components/LogInOut";
import ReportDateRange from "./components/ReportDateRange";
import SearchIssues from "./components/SearchIssues";
import TaskTable from "./components/TaskTable";
import ToggleViewButton from "./components/ToggleViewButton";
import WeekNavigator from "./components/WeekNavigator";
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
          <Paper
            elevation={2}
            sx={(theme) => ({
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              backgroundImage:
                theme.palette.mode === "light"
                  ? `linear-gradient(135deg, ${theme.palette.grey[50]}, ${theme.palette.primary.light}33)`
                  : `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.grey[900]})`,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow:
                theme.palette.mode === "light"
                  ? "0px 10px 25px rgba(15, 23, 42, 0.08)"
                  : theme.shadows[3],
            })}
          >
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              alignItems="stretch"
              justifyContent="space-between"
              flexWrap="wrap"
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", md: "center" }}
                flexWrap="wrap"
                sx={{ flex: "1 1 200px", minWidth: { xs: "100%", md: 220 } }}
              >
                {token && state.loaded && isSuperLogin(login) && (
                  <ToggleViewButton viewMode={viewMode} onChange={setViewMode} />
                )}
              </Stack>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", md: "center" }}
                flexWrap="wrap"
                sx={{ flex: "1 1 280px", minWidth: { xs: "100%", md: 280 } }}
              >
                {token && state.loaded && isSuperLogin(login) && (
                  <Box sx={{ flex: 1 }}>
                    {viewMode === "table" ? (
                      <WeekNavigator
                        start={start}
                        end={end}
                        onPrevious={handlePrevious}
                        onNext={handleNext}
                        disableNext={weekOffset === -6}
                      />
                    ) : (
                      <ReportDateRange
                        from={reportFrom}
                        to={reportTo}
                        onPrevMonth={() => {
                          setReportFrom((prev) =>
                            prev.add(-1, "month").startOf("month")
                          );
                          setReportTo((prev) =>
                            prev.add(-1, "month").endOf("month")
                          );
                        }}
                        onThisMonth={() => {
                          setReportFrom(dayjs().startOf("month"));
                          setReportTo(dayjs().endOf("month"));
                        }}
                        onNextMonth={() => {
                          setReportFrom((prev) =>
                            prev.add(1, "month").startOf("month")
                          );
                          setReportTo((prev) =>
                            prev.add(1, "month").endOf("month")
                          );
                        }}
                      />
                    )}
                  </Box>
                )}
              </Stack>

              {token &&
                state.loaded &&
                login &&
                isSuperLogin(login) &&
                (
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems="stretch"
                    flexWrap="wrap"
                    sx={{ flex: "2 1 420px", minWidth: { xs: "100%", md: 420 } }}
                  >
                    <FetchModeSwitch
                      fetchByLogin={state.fetchByLogin}
                      login={login}
                      onToggle={toggleFetchMode}
                      disabled={!state.loaded}
                    />
                    {isEmpty(state.users) && !state.fetchByLogin ? (
                      <Alert severity="info" sx={{ flex: 1 }}>
                        Нет сотрудников за этот период
                      </Alert>
                    ) : (
                      <Box sx={{ flex: 1, minWidth: 260 }}>
                        <AutocompleteUsers
                          userId={state.userId}
                          handleSelectedUsersChange={
                            handleSelectedUsersChange
                          }
                          users={state.users}
                          disabled={!state.loaded || state.fetchByLogin}
                        />
                      </Box>
                    )}
                  </Stack>
                )}

              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                justifyContent="flex-end"
                flexWrap="wrap"
                sx={{ minWidth: { xs: "100%", md: 200 } }}
              >
                {token && state.loaded && (
                  <IconButton
                    onClick={handleRefresh}
                    sx={(theme) => ({
                      backgroundColor:
                        theme.palette.mode === "light"
                          ? theme.palette.common.white
                          : theme.palette.grey[800],
                      boxShadow: "0 6px 20px rgba(15, 23, 42, 0.15)",
                    })}
                  >
                    <RefreshIcon color="primary" />
                  </IconButton>
                )}
                <LogInOut token={token} setAuth={setAuth} />
              </Stack>
            </Stack>
          </Paper>
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
