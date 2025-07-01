import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  AlertColor,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { FC, useCallback, useEffect, useState } from "react";
import { deleteData, getData, getUserIssues, setData } from "./actions/data";
import AutocompleteUsers from "./components/AutocompleteUsers";
import LogInOut from "./components/LogInOut";
import TaskTable from "./components/TaskTable";
import WeekNavigator from "./components/WeekNavigator";
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
  Issue,
} from "./types/global";
import DurationAlert from "./components/DurationAlert";
import AddDurationIssueDialog from "./components/AddDurationIssueDialog";

const YandexTracker: FC = () => {
  const yandex_login = localStorage.getItem("yandex_login") ?? "";

  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem("yandex_token"),
    login: yandex_login.includes("@") ? yandex_login.split("@")[0] : null,
  });

  console.log("auth", auth);
  const { token, login } = auth;

  const [state, setState] = useState<AppState>({
    loaded: true,
    userId: null,
    users: null,
    data: [], // Инициализация как пустой массив
    fetchByLogin: true,
    issues: [],
  });

  // Состояние для показа ошибок при вводе времени
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    severity: "",
    message: "",
  });
  const handleCloseAlert = useCallback(() => {
    setAlert({ open: false, severity: "", message: "" });
  }, []);

  const toggleFetchMode = () => {
    setState((prev) => ({
      ...prev,
      fetchByLogin: !prev.fetchByLogin,
      userId: null,
      data: [],
    }));
  };

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const handlePrevious = () => {
    setWeekOffset((prev) => prev + 1);
  };
  const handleNext = () => {
    setWeekOffset((prev) => prev - 1);
  };
  const { start, end } = getWeekRange(weekOffset);

  useEffect(() => {
    console.log("login", login, "state.userId", state.userId, "token", token);
    if ((login || state.userId) && token) {
      setState((prev) => ({ ...prev, data: [] }));
      getData({
        userId: state.fetchByLogin ? null : state.userId,
        setState,
        token,
        start: start.format("YYYY-MM-DD"),
        end: end.format("YYYY-MM-DD"),
        login: state.fetchByLogin && login ? login : undefined,
      });
      getUserIssues({ setState, token, userId: state.userId, login });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login, weekOffset, state.fetchByLogin]);

  const handleSelectedUsersChange = (userId: string | null) => {
    setState((prev) => ({ ...prev, userId, data: [] }));
    getData({
      userId: state.fetchByLogin ? null : userId,
      setState,
      token,
      start: start.format("YYYY-MM-DD"),
      end: end.format("YYYY-MM-DD"),
      login: state.fetchByLogin && login ? login : undefined,
    });
  };

  const handleRefresh = () => {
    setState((prev) => ({ ...prev, loaded: false }));
    getData({
      userId: state.fetchByLogin ? null : state.userId,
      setState,
      token,
      start: start.format("YYYY-MM-DD"),
      end: end.format("YYYY-MM-DD"),
      login: state.fetchByLogin && login ? login : undefined,
    });
    getUserIssues({ setState, token, userId: state.userId, login });
  };

  console.log("state", state);

  return (
    <>
      {!state.loaded && <LinearProgress />}
      <Grid
        container
        size={12}
        sx={{
          background: "white",
          height: "100vh",
          width: "98vw",
          justifyContent: "center",
          justifySelf: "center",
          textAlign: "center",
        }}
        spacing={2}
      >
        <>
          {token && state.loaded && (
            <Grid
              size={5}
              alignSelf="center"
              justifySelf="center"
              textAlign="center"
            >
              <WeekNavigator
                start={start}
                end={end}
                onPrevious={handlePrevious}
                onNext={handleNext}
                disableNext={weekOffset === -6}
              />
            </Grid>
          )}
          {token && state.loaded && (
            <>
              <Grid
                size={1}
                alignSelf="center"
                justifySelf="center"
                textAlign="center"
              >
                <IconButton
                  onClick={handleRefresh}
                  color="primary"
                  sx={(theme) => ({
                    borderRadius: "50%",
                    p: 3,
                    color: theme.palette.background.default,
                    background: theme.palette.primary.light,
                    "&:hover": {
                      color: theme.palette.background.default,
                      background: theme.palette.primary.main,
                    },
                  })}
                >
                  <RefreshIcon />
                </IconButton>
              </Grid>
              {login && isSuperLogin(login) && (
                <>
                  <Grid
                    size={0.8}
                    alignSelf="center"
                    justifySelf="center"
                    textAlign="center"
                  >
                    <Tooltip
                      title={
                        state.fetchByLogin
                          ? "Переключится на выборку по сотруднику"
                          : "Переключится на выборку по своему логину"
                      }
                      placement="top"
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!state.fetchByLogin}
                            onChange={toggleFetchMode}
                            color="primary"
                          />
                        }
                        labelPlacement="bottom"
                        label={state.fetchByLogin ? login || "" : ""}
                      />
                    </Tooltip>
                  </Grid>
                  <Grid
                    size="grow"
                    alignSelf="center"
                    justifySelf="center"
                    textAlign="center"
                  >
                    {isEmpty(state.users) && !state.fetchByLogin ? (
                      <Alert severity="info">
                        Нет сотрудников за этот период
                      </Alert>
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
            </>
          )}
          <Grid
            size={2}
            sx={{
              alignSelf: "center",
              justifySelf: "center",
              textAlign: "center",
            }}
          >
            <LogInOut token={token} setAuth={setAuth} />
          </Grid>
        </>
        {token && state.loaded && (
          <Grid
            size={12}
            sx={{ height: "80vh", background: "white", mx: "auto" }}
          >
            {!isEmpty(state.data) ? (
              <>
                <Stack
                  spacing={2}
                  direction="row"
                  alignItems="center"
                  justifyItems="center"
                  justifyContent="center"
                  my={2}
                >
                  <Typography variant="h5">
                    Отметки времени по{" "}
                    {state.fetchByLogin ? "своему логину" : "сотруднику"}
                  </Typography>
                  <AddDurationIssueDialog
                    issues={state.issues}
                    setData={setData}
                    setAlert={setAlert}
                    setState={setState}
                    token={token}
                  />
                </Stack>
                <TaskTable
                  data={aggregateDurations(state.data as DataItem[])}
                  start={start}
                  setState={setState}
                  token={token}
                  setData={setData}
                  deleteData={deleteData}
                  setAlert={setAlert}
                />
                <DurationAlert
                  open={alert.open}
                  message={alert.message}
                  severity={alert.severity as AlertColor | undefined}
                  onClose={handleCloseAlert}
                />
              </>
            ) : (
              <Alert severity="warning">
                Нет ни одной отметки времени за этот период
              </Alert>
            )}
          </Grid>
        )}
      </Grid>
      <Alert severity="warning">
        Чтобы добавить время в незаполненную ячейку, дважды щёлкните по ней.
      </Alert>
    </>
  );
};

export default YandexTracker;
