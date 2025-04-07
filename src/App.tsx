import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { FC, useEffect, useState } from "react";
import { deleteData, getData, setData } from "./actions/data";
import AutocompleteUsers from "./components/AutocompleteUsers";
import LogInOut from "./components/LogInOut";
import TaskTable from "./components/TaskTable";
import WeekNavigator from "./components/WeekNavigator";
import isEmpty, {
  aggregateDurations,
  getWeekRange,
  isSuperLogin,
} from "./helpers";
import { AppState, AuthState, DataItem, TaskItem } from "./types/global";

const YandexTracker: FC = () => {
  const yandex_login =
    localStorage.getItem("yandex_login") ??
    localStorage.getItem("yandex_login")?.split("@")[0];
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem("yandex_token"),
    login: yandex_login,
  });
  const { token, login } = auth;

  const [state, setState] = useState<AppState>({
    loaded: true,
    userId: null,
    users: null,
    data: [], // Инициализация как пустой массив
    fetchByLogin: true,
  });

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
    setWeekOffset((prev) => (prev > 0 ? prev - 1 : 0));
  };
  const { start, end } = getWeekRange(weekOffset);

  useEffect(() => {
    console.log("login", login, "state.userId", state.userId, "token", token);
    if ((login !== null || state.userId) && token !== null) {
      setState((prev) => ({ ...prev, userId: null, data: [] }));
      getData({
        userId: state.fetchByLogin ? null : state.userId,
        setState,
        token,
        start: start.format("YYYY-MM-DD"),
        end: end.format("YYYY-MM-DD"),
        login: state.fetchByLogin ? login! : undefined,
      });
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
      login: state.fetchByLogin ? login! : undefined,
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
      login: state.fetchByLogin ? login! : undefined,
    });
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
                disableNext={weekOffset === 0}
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
                <Typography variant="h5" mb={2}>
                  Отметки времени по{" "}
                  {state.fetchByLogin ? "своему логину" : "сотруднику"}
                </Typography>
                <TaskTable
                  data={aggregateDurations(state.data as DataItem[])}
                  start={start}
                  setState={setState}
                  token={token}
                  setData={setData}
                  deleteData={deleteData}
                />
              </>
            ) : (
              <Alert severity="warning">
                Нет ни одно отметки времени за этот период
              </Alert>
            )}
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default YandexTracker;
