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
  issuesId,
  duration,
  ids = null,
  comment = "",
}) => {
  try {
    setState((prev) => ({ ...prev, loaded: false }));

    const start = dayjs(dateCell)
      .tz("Europe/Moscow")
      .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");

    const payload = {
      token,
      issuesId,
      start,
      duration,
      comment,
    };

    if (!isEmpty(ids)) payload.ids = ids.join(",");

    const res = await axios.post(`${apiUrl}/api/set_time`, payload);

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
