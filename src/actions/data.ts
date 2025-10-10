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
  IssueType,
  TaskItemMenu,
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
  setState((prev) => ({ ...prev, loaded: false }));

  try {
    // Проверяем обязательный токен
    if (!token) {
      throw new Error("token not passed");
    }

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

      // const startDate = () => {
      //   const HOURS_END_DAY = 18; // конец рабочего для
      //   if (addEndWorkDayTime && dateCell) {
      //     //дата из ячейки + добавленное время на конец рабочего дня
      //     return dateCell
      //       .add(HOURS_END_DAY, "hours")
      //       .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      //   }
      //   if (addEndWorkDayTime) {
      //     //дата now + добавленное время на конец рабочего дня
      //     return;
      //     dayjs()
      //       .add(HOURS_END_DAY, "hours")
      //       .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      //   }
      //   if (dateCell) {
      //     return dateCell.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      //   }

      //   return dayjs().format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      // };

      const startDate = () => {
        const now = dayjs();

        if (addEndWorkDayTime && dateCell) {
          // дата из ячейки + текущее время
          return dayjs(
            `${dateCell.format("YYYY-MM-DD")}T${now.format("HH:mm:ss.SSSZZ")}`
          ).format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }

        if (addEndWorkDayTime) {
          // просто now
          return now.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }

        if (dateCell) {
          // дата из ячейки + текущее время
          return dayjs(
            `${dateCell.format("YYYY-MM-DD")}T${now.format("HH:mm:ss.SSSZZ")}`
          ).format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }

        return now.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
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
  setState((prev) => ({ ...prev, loaded: false }));
  try {
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
  } catch (err: any) {
    console.error("[Ошибка в getUserIssues]:", err.message);
    // Если токен протух — разлогиниваем
    setState((prev) => ({ ...prev, loaded: true }));
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      handleLogout();
    }
  }
};

export const getIssueTypeList = async ({
  setLocalState,
  token,
  entityKey,
}: {
  setLocalState: React.Dispatch<React.SetStateAction<TaskItemMenu>>;
  token: string | null;
  entityKey?: string | null;
}): Promise<void> => {
  const yandex_login = localStorage.getItem("yandex_login") ?? "";
  if (!yandex_login) {
    return;
  }
  setLocalState((prev) => ({ ...prev, loaded: false }));
  try {
    // Проверяем обязательный токен
    if (!token) {
      throw new Error("token not passed");
    }
    // Проверяем,  yandex_login и entityKey
    if (
      !yandex_login ||
      yandex_login === "undefined" ||
      yandex_login === "null"
    ) {
      throw new Error("Either yandex_login must be provided");
    }
    if (!entityKey || entityKey === "undefined" || entityKey === "null") {
      throw new Error("Either  entityKey must be provided");
    }

    // GET /api/user_issues?token=…&userId=…&login=…
    const res = await axios.get<{ issue_type_list: IssueType[] }>(
      `${apiUrl}/api/issue_type_list`,
      {
        params: { token, entityKey, email: yandex_login },
      }
    );
    console.log(" res.data.issue_type_list", res.data.issue_type_list);

    // const mok = [
    //   {
    //     label: "label1",
    //     hint: "hint1",
    //   },
    //   {
    //     label: "label2",
    //     hint: "hint2",
    //   },
    //   {
    //     label: "label3",
    //     hint: "hint3",
    //   },
    // ];
    setLocalState((prev) => ({
      ...prev,
      loaded: true,
      //issue_type_list: mok,
      issue_type_list: res.data.issue_type_list,
    }));
  } catch (err: any) {
    console.error("[Ошибка в getIssueTypeList]:", err.message);
    // Если токен протух — разлогиниваем
    setLocalState((prev) => ({ ...prev, loaded: true }));
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      handleLogout();
    }
  }
};
