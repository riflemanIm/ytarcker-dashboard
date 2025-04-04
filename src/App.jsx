import RefreshIcon from "@mui/icons-material/Refresh";
import {
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { deleteData, getData, setData } from "./actions/data";
import AutocompleteUsers from "./components/AutocompleteUsers";
import Loading from "./components/Loading";
import LogInOut from "./components/LogInOut";
import TaskTable from "./components/TaskTable";
import WeekNavigator from "./components/WeekNavigator";
import isEmpty, { aggregateDurations, getWeekRange } from "./helpers";

const ADMIN_LOGINS = ["s.ermakov", "a.smirnov", "o.lambin"];
const isSuperLogin = (login) => ADMIN_LOGINS.includes(login);

export default function YandexTracker() {
  const [auth, setAuth] = useState({
    token: localStorage.getItem("yandex_token"),
    login: localStorage.getItem("yandex_login"),
  });
  const { token, login } = auth;
  // const [token, setAuth] = useState("y0__xD48tOlqveAAhjtmjYg4MvKyxK1MAkqmCzdKHCxTza9dSbqrC4bvA");

  const [state, setState] = useState({
    loaded: true,
    userId: null,
    users: null,
    data: null,
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

  const [weekOffset, setWeekOffset] = useState(0);
  const handlePrevious = () => {
    setWeekOffset((prev) => prev + 1);
  };
  const handleNext = () => {
    setWeekOffset((prev) => (prev > 0 ? prev - 1 : 0));
  };
  const { start, end } = getWeekRange(weekOffset);

  // При первом рендере

  useEffect(() => {
    console.log("login", login, "state.userId", state.userId, "token", token);
    if ((login != null || state.userId) && token != null) {
      setState((prev) => ({ ...prev, userId: null, data: null }));
      getData({
        userId: state.fetchByLogin ? null : state.userId,
        setState,
        token,
        start: start.format("YYYY-MM-DD"),
        end: end.format("YYYY-MM-DD"),
        login: state.fetchByLogin ? login : undefined,
      });
    }
  }, [login, weekOffset, state.fetchByLogin]);

  const handleSelectedUsersChange = (userId) => {
    setState((prev) => ({ ...prev, userId, data: null }));
    getData({
      userId: state.fetchByLogin ? null : userId,
      setState,
      token,
      start: start.format("YYYY-MM-DD"),
      end: end.format("YYYY-MM-DD"),
      login: state.fetchByLogin ? login : undefined,
    });
  };

  // Функция для обновления state
  const handleRefresh = () => {
    setState((prev) => ({ ...prev, loaded: false }));
    getData({
      userId: state.fetchByLogin ? null : state.userId,
      setState,
      token,
      start: start.format("YYYY-MM-DD"),
      end: end.format("YYYY-MM-DD"),
      login: state.fetchByLogin ? login : undefined,
    });
  };

  console.log("state.data", state.data);
  return (
    <>
      {!state.loaded && <Loading isLinear />}
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
                {/* IconButton для обновления состояния */}
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
              {isSuperLogin(login) && (
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
                        label={state.fetchByLogin ? login : ""}
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
            {!isEmpty(state.data) && (
              <>
                <Typography variant="h5" mb={2}>
                  Отметки времени по{" "}
                  {!state.fetchByLogin ? "сотруднику" : "своему логину"}
                </Typography>
                <TaskTable
                  data={aggregateDurations(state.data)}
                  userId={state.userId}
                  setState={setState}
                  token={token}
                  setData={setData}
                  deleteData={deleteData}
                  start={start}
                  end={end}
                />
              </>
            )}
            {isEmpty(state.data) && (
              <Typography variant="h6">Нет данных</Typography>
            )}
          </Grid>
        )}
      </Grid>
    </>
  );
}
