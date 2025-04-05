import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import isEmpty from "@/helpers";

dayjs.extend(utc);
dayjs.extend(timezone);

const apiUrl: string = import.meta.env.VITE_APP_API_URL;
console.log("apiUrl", apiUrl);

export interface GetDataArgs {
  userId: string | null;
  setState: React.Dispatch<React.SetStateAction<any>>;
  token: string | null;
  start: string;
  end: string;
  login?: string;
}

export const getData = async ({
  userId,
  setState,
  token,
  start,
  end,
  login,
}: GetDataArgs): Promise<void> => {
  try {
    setState((prev: any) => ({ ...prev, loaded: false }));

    const res = await axios.get(
      `${apiUrl}/api/issues?token=${token}&endDate=${end}&startDate=${start}&userId=${userId}&login=${login}`
    );

    if (res.status !== 200) {
      throw new Error("Api get data error");
    }
    setState((prev: any) => ({ ...prev, loaded: true, ...res.data }));
  } catch (err: any) {
    console.log("ERROR ", err.message);
    setState((prev: any) => ({ ...prev, loaded: true }));
  }
};

export interface SetDataArgs {
  dateCell?: Dayjs;
  setState: React.Dispatch<React.SetStateAction<any>>;
  setAlert: (args: {
    open: boolean;
    severity: string;
    message: string;
  }) => void;
  token: string | null;
  issueId: string | null;
  duration: string;
  comment?: string;
  worklogId?: string | null;
}

export const setData = async ({
  dateCell,
  setState,
  setAlert,
  token,
  issueId,
  duration,
  comment = "",
  worklogId = null,
}: SetDataArgs): Promise<void> => {
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
      const startDate =
        dateCell != null
          ? dateCell.add(18, "hours").format("YYYY-MM-DDTHH:mm:ss.SSSZZ")
          : dayjs().add(18, "hours").format("YYYY-MM-DDTHH:mm:ss.SSSZZ");

      const payload = {
        token,
        issueId,
        start: startDate,
        duration,
        comment,
      };
      res = await axios.post(`${apiUrl}/api/add_time`, payload);
    }

    if (res.status !== 200) {
      throw new Error("Api set data error");
    }

    if (!isEmpty(res.data)) {
      setState((prev: any) => ({
        ...prev,
        loaded: true,
        data: worklogId
          ? prev.data.map((item: any) =>
              item.id === res.data.id ? res.data : item
            )
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
  } catch (err: any) {
    console.error("ERROR", err.message);
    setState((prev: any) => ({ ...prev, loaded: true }));
    setAlert({ open: true, severity: "error", message: err.message });
  }
};

export interface DeleteDataArgs {
  token: string | null;
  setState: React.Dispatch<React.SetStateAction<any>>;
  setAlert: (args: {
    open: boolean;
    severity: string;
    message: string;
  }) => void;
  issueId: string | null;
  ids: string[];
}

export const deleteData = async ({
  token,
  setState,
  setAlert,
  issueId,
  ids,
}: DeleteDataArgs): Promise<void> => {
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
      setState((prev: any) => ({
        ...prev,
        loaded: true,
        data: [...prev.data.filter((item: any) => !ids.includes(item.id))],
      }));
      setAlert({
        open: true,
        severity: "success",
        message: "Данные успешно удалены",
      });
    } else {
      throw new Error("Ошибка удаления данных");
    }
  } catch (err: any) {
    console.error("ERROR", err.message);
    setState((prev: any) => ({ ...prev, loaded: true }));
    setAlert({ open: true, severity: "error", message: err.message });
  }
};
