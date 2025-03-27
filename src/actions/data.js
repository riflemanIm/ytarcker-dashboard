import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import isEmpty from "@/helpers";

dayjs.extend(utc);
dayjs.extend(timezone);
const apiUrl = import.meta.env.VITE_APP_API_URL;
console.log("apiUrl", apiUrl);

export const getData = async ({ userId, setState, token, start, end }) => {
  try {
    setState((prev) => ({ ...prev, loaded: false }));

    const res = await axios.get(
      `${apiUrl}/api/issues?token=${token}&endDate=${end}&startDate=${start}&userId=${userId}`
    );

    if (res.status !== 200) {
      throw new Error("Api get data error");
    }
    setState((prev) => ({ ...prev, loaded: true, ...res.data }));
  } catch (err) {
    console.log("ERROR ", err.message);
    setState((prev) => ({ ...prev, loaded: true }));
  }
};
export const setData = async ({
  dateCell,
  setState,
  token,
  issueId,
  duration,
  comment = "",
}) => {
  if (token == null) {
    return;
  }

  try {
    //setState((prev) => ({ ...prev, loaded: false }));

    const start = dayjs(dateCell)
      .tz("Europe/Moscow")
      .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");

    const payload = {
      token,
      issueId,
      start,
      duration,
      comment,
    };

    const res = await axios.post(`${apiUrl}/api/add_time`, payload);

    if (res.status !== 200) {
      throw new Error("Api set data error");
    }

    if (!isEmpty(res.data)) {
      setState((prev) => ({
        ...prev,
        loaded: true,
        data: [...prev.data, res.data],
      }));
    } else {
      setState((prev) => ({ ...prev, loaded: true }));
    }
  } catch (err) {
    console.error("ERROR", err.message);
    setState((prev) => ({ ...prev, loaded: true }));
  }
};

export const deleteData = async ({ token, setState, issueId, ids }) => {
  if (token == null) {
    return;
  }
  console.error("deleteData");
  try {
    const payload = {
      issueId,
      ids,
      token,
    };
    const res = await axios.post(`${apiUrl}/api/delete_all`, payload);
    if (res.status !== 200) {
      throw new Error("Api delete Data error");
    }
    console.log("res", res);
    setState((prev) => ({
      ...prev,
      loaded: true,
      data: [...prev.data.filter((item) => !ids.includes(item.id))],
    }));
  } catch (err) {
    console.error("ERROR", err.message);
    setState((prev) => ({ ...prev, loaded: true }));
  }
};
