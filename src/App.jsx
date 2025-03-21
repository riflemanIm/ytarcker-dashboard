import axios from "axios";
import { useEffect, useState } from "react";
import TaskTable from "./components/TaskTable";
import isEmpty from "./helpers";
import Loading from "./components/Loading";
import dayjs from "dayjs";
import { Button, Grid2 as Grid, Typography } from "@mui/material";
import AutocompleteUsers from "./components/AutocompleteUsers";
//import { Button } from "@/components/ui/button";

const CLIENT_ID = "bbdf8a5464ba4d7f8a29e947a1a3d913";
const REDIRECT_URI =
  import.meta.env.NODE_ENV !== "production"
    ? "http://localhost:3007"
    : "https://ytracker.mobimed.ru";
const AUTH_URL = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;

export const getData = async ({ state, setState, token, typeData = "all" }) => {
  const startDate = dayjs()
    .subtract(7, "day")
    .startOf("day")
    .format("YYYY-MM-DD");
  const endDate = dayjs().endOf("day").format("YYYY-MM-DD");

  try {
    setState({
      ...state,
      loaded: false,
    });
    console.log("state.userId", state?.userId);
    const login = (state.users || []).find(
      (it) => state?.userId && it.id === state.userId
    )?.login;
    console.log("login ", login);
    const res = await axios.get(
      `http://localhost:4000/api/issues?token=${token}&endDate=${endDate}&startDate=${startDate}&login=${login}&typeData=${typeData}`
    );

    if (res.status !== 200) {
      throw new Error("Api issues error");
    }
    if (typeData === "all") {
      setState({ ...state, loaded: true, ...res.data });
    }
    if (typeData === "data") {
      setState({ ...state, loaded: true, data: res.data.data });
    }
    if (typeData === "users") {
      setState({ ...state, loaded: true, users: res.data.users });
    }
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
  // typeData: "all", //all|users|data
  useEffect(() => {
    if (token) {
      getData({ state, setState, token, typeData: "all" });
    }
  }, [token]);

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
    getData({ state: newState, setState, token, typeData: "data" });
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
        width: "100vw",
        justifyContent: "center",
      }}
    >
      <Grid
        size={12}
        sx={{ alignSelf: "center", justifySelf: "center", textAlign: "center" }}
      >
        {token ? (
          <Typography variant="body1">
            Вы авторизованы. <Button onClick={handleLogout}>Выйти</Button>
          </Typography>
        ) : (
          <Button onClick={handleLogin}>Войти</Button>
        )}
      </Grid>
      {state.loaded && !isEmpty(state.users) && (
        <Grid size={6}>
          <AutocompleteUsers
            userId={state.userId}
            handleSelectedUsersChange={handleSelectedUsersChange}
            // users={(state.users || []).map((it) => ({
            //   id: it.uid,
            //   name: `${it.lastName ?? ""} ${it.firstName ?? ""} ${it.middleName ?? ""}`,
            // }))}
            users={state.users}
          />
        </Grid>
      )}
      {token && (
        <Grid
          size={12}
          sx={{ height: "80vh", background: "white", mx: "auto" }}
        >
          {!state.loaded && <Loading />}
          {state.loaded && !isEmpty(state.data) && (
            <TaskTable data={state.data} />
          )}
        </Grid>
      )}
    </Grid>
  );
}
