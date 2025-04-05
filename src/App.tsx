import RefreshIcon from "@mui/icons-material/Refresh";
import {
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
import isEmpty, { aggregateDurations, getWeekRange } from "./helpers";

const ADMIN_LOGINS = ["l.musaeva", "s.ermakov", "a.smirnov", "o.lambin"];
const isSuperLogin = (login: string | null): boolean => {
  if (!login) return false;
  return ADMIN_LOGINS.includes(login);
};

import { AuthState } from "./types/AuthState.d";

interface AppState {
  loaded: boolean;
  userId: string | null;
  users: any; // замените any на более конкретный тип, если он известен
  data: any; // аналогично, заменить на конкретный тип данных
  fetchByLogin: boolean;
}

const YandexTracker: FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem("yandex_token"),
    login: localStorage.getItem("yandex_login"),
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
      data: null,
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
      setState((prev) => ({ ...prev, userId: null, data: null }));
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
    setState((prev) => ({ ...prev, userId, data: null }));
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

  console.log("state.data", state.data);
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
              {isSuperLogin(login ?? null) && (
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
                    <AutocompleteUsers
                      userId={state.userId}
                      handleSelectedUsersChange={handleSelectedUsersChange}
                      users={state.users}
                      disabled={!state.loaded || state.fetchByLogin}
                    />
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
                  data={aggregateDurations(state.data)}
                  start={start}
                  setState={setState}
                  token={token}
                  setData={setData}
                  deleteData={deleteData}
                />
              </>
            ) : (
              <Typography variant="h6">Нет данных</Typography>
            )}
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default YandexTracker;
