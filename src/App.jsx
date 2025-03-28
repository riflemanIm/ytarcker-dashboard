import { Grid2 as Grid, Typography, Button, IconButton } from "@mui/material"; // ...existing code...
import RefreshIcon from "@mui/icons-material/Refresh";
import { useEffect, useState } from "react";
import { deleteData, getData, setData } from "./actions/data";
import AutocompleteUsers from "./components/AutocompleteUsers";
import Loading from "./components/Loading";
import LogInOut from "./components/LogInOut";
import TaskTable from "./components/TaskTable";
import WeekNavigator from "./components/WeekNavigator";
import isEmpty, { aggregateDurations, getWeekRange } from "./helpers";

export default function YandexTracker() {
  const [token, setToken] = useState(localStorage.getItem("yandex_token"));
  // const [token, setToken] = useState(
  //   "y0__xD48tOlqveAAhjtmjYg4MvKyxK1MAkqmCzdKHCxTza9dSbqrC4bvA"
  // );
  let login = localStorage.getItem("yandex_login");
  login = login ? login.split("@")[0] : login;

  const [state, setState] = useState({
    loaded: true,
    userId: null,
    users: null,
    data: null,
  });

  const [fetchByLogin, setFetchByLogin] = useState(true);
  const toggleFetchMode = () => {
    setFetchByLogin((prev) => !prev);
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
    if (token != null) {
      getData({
        userId: fetchByLogin ? null : state.userId,
        setState,
        token,
        start,
        end,
        login: fetchByLogin ? login : undefined,
      });
    }
  }, []);

  useEffect(() => {
    if (token != null) {
      getData({
        userId: fetchByLogin ? null : state.userId,
        setState,
        token,
        start,
        end,
        login: fetchByLogin ? login : undefined,
      });
    }
  }, [weekOffset, fetchByLogin]);

  const handleSelectedUsersChange = (userId) => {
    setState((prev) => ({ ...prev, userId }));
    getData({
      userId: fetchByLogin ? null : userId,
      setState,
      token,
      start,
      end,
      login: fetchByLogin ? login : undefined,
    });
  };

  // Функция для обновления state
  const handleRefresh = () => {
    setState((prev) => ({ ...prev, loaded: false }));
    getData({
      userId: fetchByLogin ? null : state.userId,
      setState,
      token,
      start,
      end,
      login: fetchByLogin ? login : undefined,
    });
  };

  console.log("state.data", state.data);
  return (
    <Grid
      container
      size={12}
      sx={{
        background: "white",
        height: "100vh",
        width: "98vw",
        justifyContent: "center",
        alignSelf: "center",
        justifySelf: "center",
        textAlign: "center",
      }}
      spacing={2}
    >
      <>
        {token && (
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
        {state.loaded && (
          <>
            <Grid
              size={1}
              alignSelf="center"
              justifySelf="center"
              textAlign="center"
            >
              {/* IconButton для обновления состояния */}
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Grid>
            <Grid
              size="1"
              alignSelf="center"
              justifySelf="center"
              textAlign="center"
            >
              <Button
                onClick={toggleFetchMode}
                variant={fetchByLogin ? "contained" : "outlined"}
              >
                {fetchByLogin ? "По сотруднику" : "По своему логину"}
              </Button>
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
                disabled={!state.loaded || fetchByLogin}
              />
            </Grid>
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
          <LogInOut token={token} setToken={setToken} />
        </Grid>
      </>
      {token && (
        <Grid
          size={12}
          sx={{ height: "80vh", background: "white", mx: "auto" }}
        >
          {!state.loaded && <Loading />}
          {state.loaded && !isEmpty(state.data) && (
            <>
              {state.userId == null && (
                <Typography variant="h5" mb={2}>
                  По всем сотрудникам
                </Typography>
              )}
              <TaskTable
                data={aggregateDurations(state.data)}
                userId={state.userId}
                setState={setState}
                token={token}
                setData={setData}
                deleteData={deleteData}
              />
            </>
          )}
          {state.loaded && isEmpty(state.data) && (
            <Typography variant="h6">Нет данных</Typography>
          )}
        </Grid>
      )}
    </Grid>
  );
}
