import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import isEmpty from "@/helpers";

dayjs.extend(utc);
dayjs.extend(timezone);
const apiUrl = import.meta.env.VITE_APP_API_URL;
console.log("apiUrl", apiUrl);

export const getData = async ({
  userId,
  setState,
  token,
  start,
  end,
  login,
}) => {
  try {
    setState((prev) => ({ ...prev, loaded: false }));

    const res = await axios.get(
      `${apiUrl}/api/issues?token=${token}&endDate=${end}&startDate=${start}&userId=${userId}&login=${login}`
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
  setAlert,
  token,
  issueId,
  duration,
  comment = "",
  worklogId = null,
}) => {
  if (token == null) {
    return;
  }

  try {
    let res;
    if (worklogId) {
      // Если worklogId передан, редактируем существующую запись
      const payload = {
        token,
        issueId,
        worklogId,
        duration,
        comment,
      };
      res = await axios.patch(`${apiUrl}/api/edit_time`, payload);
    } else {
      // Добавляем новую запись, формируем время из dateCell

      const start =
        dateCell != null
          ? dateCell.add(8, "hours").format("YYYY-MM-DDTHH:mm:ss.SSSZZ")
          : dayjs().add(8, "hours").format("YYYY-MM-DDTHH:mm:ss.SSSZZ");

      const payload = {
        token,
        issueId,
        start,
        duration,
        comment,
      };
      res = await axios.post(`${apiUrl}/api/add_time`, payload);
    }

    if (res.status !== 200) {
      throw new Error("Api set data error");
    }

    if (!isEmpty(res.data)) {
      setState((prev) => ({
        ...prev,
        loaded: true,
        data: worklogId
          ? prev.data.map((item) => (item.id === res.data.id ? res.data : item))
          : [...prev.data, { ...res.data }],
      }));
      setAlert({
        open: true,
        severity: "success",
        message: worklogId
          ? "Запись успешно изменена"
          : "Данные успешно добавлены",
      });
    } else {
      throw new Error(
        worklogId ? "Ошибка изменения данных" : "Ошибка добавления данных"
      );
    }
  } catch (err) {
    console.error("ERROR", err.message);
    setState((prev) => ({ ...prev, loaded: true }));
    setAlert({ open: true, severity: "error", message: err.message });
  }
};

export const deleteData = async ({
  token,
  setState,
  setAlert,
  issueId,
  ids,
}) => {
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
      throw new Error("Ошибка удаления данных");
    }
    console.log("===data==", res.data);
    if (res.data === true) {
      setState((prev) => ({
        ...prev,
        loaded: true,
        data: [...prev.data.filter((item) => !ids.includes(item.id))],
      }));
      setAlert({
        open: true,
        severity: "success",
        message: "Данные успешно удалены",
      });
    } else {
      throw new Error("Ошибка удаления данных");
    }
  } catch (err) {
    console.error("ERROR", err.message);
    setState((prev) => ({ ...prev, loaded: true }));
    setAlert({ open: true, severity: "error", message: err.message });
  }
};
