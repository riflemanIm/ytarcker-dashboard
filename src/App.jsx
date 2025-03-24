import axios from "axios";
import { useEffect, useState } from "react";
import TaskTable from "./components/TaskTable";
import isEmpty, { getWeekRange } from "./helpers";
import Loading from "./components/Loading";
import { Button, Grid2 as Grid, Stack, Typography } from "@mui/material";
import AutocompleteUsers from "./components/AutocompleteUsers";
import WeekNavigator from "./components/WeekNavigator";
import dayjs from "dayjs";

const CLIENT_ID = "bbdf8a5464ba4d7f8a29e947a1a3d913";
const REDIRECT_URI = import.meta.env.VITE_APP_REDIRECT_URI;
const AUTH_URL = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;

const apiUrl = import.meta.env.VITE_APP_API_URL;

export const getData = async ({ state, setState, token, start, end }) => {
  try {
    setState({
      ...state,
      loaded: false,
    });
    console.log("state.userId", state?.userId);
    const userId = (state.users || []).find(
      (it) => state?.userId && it.id === state.userId
    )?.id;
    console.log("userId ", userId);
    const res = await axios.get(
      `${apiUrl}/api/issues?token=${token}&endDate=${end}&startDate=${start}&userId=${userId}`
    );

    if (res.status !== 200) {
      throw new Error("Api issues error");
    }
    setState({ ...state, loaded: true, ...res.data });
  } catch (err) {
    console.log("ERROR ", err.message);
    setState({ ...state, loaded: true });
  }
};

export default function YandexTracker() {
  const [token, setToken] = useState(localStorage.getItem("yandex_token"));
  // const [token, setToken] = useState(
  //   "y0__xD48tOlqveAAhjtmjYg4MvKyxK1MAkqmCzdKHCxTza9dSbqrC4bvA"
  // );

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = params.get("access_token");

      if (accessToken) {
        setToken(accessToken);
        localStorage.setItem("yandex_token", accessToken);
      }
    }
  }, []);

  const [state, setState] = useState({
    loaded: true,
    userId: null,
    users: null,
    data: null,
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const handlePrevious = () => {
    setWeekOffset((prev) => prev + 1);
  };
  const handleNext = () => {
    setWeekOffset((prev) => (prev > 0 ? prev - 1 : 0));
  };
  const { start, end } = getWeekRange(weekOffset);
  useEffect(() => {
    if (token) {
      getData({ state, setState, token, start, end });
    }
  }, [token, weekOffset]);

  const handleLogin = () => {
    window.location.href = AUTH_URL;
  };
  const handleLogout = () => {
    localStorage.removeItem("yandex_token");
    window.location.href = "";
  };
  const handleSelectedUsersChange = (userId) => {
    const newState = { ...state, userId };
    setState(newState);

    getData({ state: newState, setState, token, start, end });
  };
  console.log("state", state);

  // (state.data || []).forEach((it) => {
  //   console.log("updatedDate", dayjs(it.updatedAt).format("YYYY-MM-DD"));
  // });

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
        <Grid
          size={2}
          sx={{
            alignSelf: "center",
            justifySelf: "center",
            textAlign: "center",
          }}
        >
          {token ? (
            <Typography variant="body1">
              Вы авторизованы. <Button onClick={handleLogout}>Выйти</Button>
            </Typography>
          ) : (
            <Button onClick={handleLogin}>Войти</Button>
          )}
        </Grid>
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
        {state.loaded && !isEmpty(state.users) && (
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
            />
          </Grid>
        )}
      </>
      {token && (
        <Grid
          size={12}
          sx={{ height: "80vh", background: "white", mx: "auto" }}
        >
          {!state.loaded && <Loading />}

          {state.loaded && !isEmpty(state.data) && (
            <TaskTable data={state.data} />
          )}
          {state.loaded && isEmpty(state.data) && (
            <Typography variant="h6">Нет данных</Typography>
          )}
        </Grid>
      )}
    </Grid>
  );
}
