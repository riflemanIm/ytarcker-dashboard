import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  AlertColor,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
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
import TaskTable from "./components/TaskTable";
import ToggleViewButton from "./components/ToggleViewButton";
import WeekNavigator from "./components/WeekNavigator";
import WorklogWeeklyReport from "./components/WorklogWeeklyReport";
import isEmpty, {
  aggregateDurations,
  getWeekRange,
  isSuperLogin,
} from "./helpers";
import { AlertState, AppState, AuthState, DataItem } from "./types/global";

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
  const [viewMode, setViewMode] = useState<"table" | "report">("table");
  const toggleView = () =>
    setViewMode((v) => (v === "table" ? "report" : "table"));

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
        {login && isSuperLogin(login) && state.loaded && (
          <>
            <Grid
              size="auto"
              alignSelf="center"
              justifySelf="center"
              textAlign="center"
            >
              <FetchModeSwitch
                fetchByLogin={state.fetchByLogin}
                login={login}
                onToggle={toggleFetchMode}
                disabled={!state.loaded}
              />
            </Grid>
            <Grid
              size="grow"
              alignSelf="center"
              justifySelf="center"
              textAlign="center"
            >
              {isEmpty(state.users) && !state.fetchByLogin ? (
                <Alert severity="info">Нет сотрудников за этот период</Alert>
              ) : (
                <AutocompleteUsers
                  userId={state.userId}
                  handleSelectedUsersChange={handleSelectedUsersChange}
                  users={state.users}
                  disabled={!state.loaded || state.fetchByLogin}
                />
              )}
            </Grid>
          </>
        )}
        {token && state.loaded && (
          <Grid
            size="auto"
            alignSelf="center"
            justifySelf="center"
            textAlign="center"
          >
            {/* Левая панель: кнопка-переключатель и навигатор/диапазон */}
            <Stack
              direction="row"
              gap={1}
              alignItems="center"
              justifyContent="center"
            >
              {isSuperLogin(login) && (
                <ToggleViewButton viewMode={viewMode} onToggle={toggleView} />
              )}
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
                    setReportTo((prev) => prev.add(-1, "month").endOf("month"));
                  }}
                  onThisMonth={() => {
                    setReportFrom(dayjs().startOf("month"));
                    setReportTo(dayjs().endOf("month"));
                  }}
                  onNextMonth={() => {
                    setReportFrom((prev) =>
                      prev.add(1, "month").startOf("month")
                    );
                    setReportTo((prev) => prev.add(1, "month").endOf("month"));
                  }}
                />
              )}
            </Stack>
          </Grid>
        )}

        {token && state.loaded && (
          <Grid
            size={1}
            alignSelf="center"
            justifySelf="center"
            textAlign="center"
          >
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Grid>
        )}
        <Grid
          size="grow"
          alignSelf="center"
          justifySelf="center"
          textAlign={state.loaded ? "right" : "center"}
        >
          <LogInOut token={token} setAuth={setAuth} />
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

            {!isEmpty(state.data) ? (
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
