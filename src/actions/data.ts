import { Button } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios, { AxiosError } from "axios";
import isEmpty from "@/helpers";
import {
  AlertState,
  AppState,
  DataItem,
  GetDataArgs,
  Issue,
} from "@/types/global";
import { handleLogout } from "@/components/LogInOut";

dayjs.extend(utc);
dayjs.extend(timezone);

const apiUrl: string = import.meta.env.VITE_APP_API_URL;
console.log("apiUrl", apiUrl);

export const getData = async ({
  userId,
  setState,
  token,
  start,
  end,
  login,
}: GetDataArgs): Promise<void> => {
  try {
    setState((prev) => ({ ...prev, loaded: false }));

    const res = await axios.get(
      `${apiUrl}/api/issues?token=${token}&endDate=${end}&startDate=${start}&userId=${userId}&login=${login}`
    );

    if (res.status !== 200) {
      throw new Error("Api get data error");
    }
    setState((prev) => ({ ...prev, loaded: true, ...res.data }));
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      //handleLogout();
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.log("ERROR ", errorMessage);
    setState((prev) => ({ ...prev, loaded: true }));
  }
};

export interface SetDataArgs {
  dateCell?: Dayjs;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setAlert: (args: AlertState) => void;
  token: string | null;
  issueId: string | null;
  duration: string;
  comment?: string;
  worklogId?: string | null;
  addEndWorkDayTime?: boolean;
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
  addEndWorkDayTime = true,
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

      const startDate = () => {
        if (addEndWorkDayTime && dateCell) {
          return dateCell.add(18, "hours").format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }
        if (addEndWorkDayTime) {
          dayjs().add(18, "hours").format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }
        if (dateCell) {
          return dateCell.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }

        return dayjs().format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      };

      const payload = {
        token,
        issueId,
        start: startDate(),
        duration,
        comment,
      };
      res = await axios.post(`${apiUrl}/api/add_time`, payload);
    }

    if (res.status !== 200) {
      throw new Error("Api set data error");
    }

    if (!isEmpty(res.data)) {
      setState((prev: AppState) => ({
        ...prev,
        loaded: true,
        data: worklogId
          ? prev.data.map((item: DataItem) =>
              item.id === (res.data as DataItem).id
                ? (res.data as DataItem)
                : item
            )
          : [...prev.data, { ...(res.data as DataItem) }],
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
    setState((prev: AppState) => ({ ...prev, loaded: true }));
    setAlert({ open: true, severity: "error", message: err.message });
  }
};

export interface DeleteDataArgs {
  token: string | null;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
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
      setState((prev: AppState) => ({
        ...prev,
        loaded: true,
        data: [...prev.data.filter((item: DataItem) => !ids.includes(item.id))],
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
    setState((prev: AppState) => ({ ...prev, loaded: true }));
    setAlert({ open: true, severity: "error", message: err.message });
  }
};

export const getUserIssues = async ({
  setState,

  token,
  userId,
  login,
}: {
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  token: string | null;
  userId?: string | null;
  login?: string | null;
}): Promise<void> => {
  // Проверяем обязательный токен
  if (!token) {
    throw new Error("token not passed");
  }
  // Проверяем, что передан хотя бы userId или login
  if (
    (!login || login === "undefined" || login === "null") &&
    (!userId || userId === "undefined" || userId === "null")
  ) {
    throw new Error("Either userId or login must be provided");
  }
  console.log("getUserIssues]:");
  try {
    // GET /api/user_issues?token=…&userId=…&login=…
    const res = await axios.get<{ issues: Issue[] }>(
      `${apiUrl}/api/user_issues`,
      {
        params: { token, userId, login },
      }
    );
    setState((prev: AppState) => ({
      ...prev,
      loaded: true,
      issues: res.data.issues,
    }));

    console.log("issues:", res.data.issues);
  } catch (err: any) {
    console.error("[Ошибка в getUserIssues]:", err.message);
    // Если токен протух — разлогиниваем
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      handleLogout();
    }
    throw err;
  }
};
