import { useEffect, useState } from "react";
import TaskTable from "./components/TaskTable";
import isEmpty, { aggregateDurations, getWeekRange } from "./helpers";
import Loading from "./components/Loading";
import { Grid2 as Grid, Typography } from "@mui/material";
import AutocompleteUsers from "./components/AutocompleteUsers";
import WeekNavigator from "./components/WeekNavigator";
import { getData, setData } from "./actions/data";
import LogInOut from "./components/LogInOut";

export default function YandexTracker() {
  const [token, setToken] = useState(localStorage.getItem("yandex_token"));
  // const [token, setToken] = useState(
  //   "y0__xD48tOlqveAAhjtmjYg4MvKyxK1MAkqmCzdKHCxTza9dSbqrC4bvA"
  // );
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
      getData({ userId: state.userId, setState, token, start, end });
    }
  }, [token, weekOffset]);

  const handleSelectedUsersChange = (userId) => {
    setState((prev) => ({ ...prev, userId }));
    getData({ userId, setState, token, start, end });
  };

  // (state.data || []).forEach((it) => {
  //   console.log("updatedDate", dayjs(it.updatedAt).format("YYYY-MM-DD"));
  // });
  //console.log("state.data", state.data);
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
