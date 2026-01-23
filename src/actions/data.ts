import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import isEmpty from "@/helpers";
import {
  AppState,
  DataItem,
  Issue,
  IssueType,
  QueueInfo,
  SearchIssuesResponse,
  TaskItemMenu,
  TlGroup,
  TlGroupPatient,
  TlProject,
  TlRole,
  TlSprint,
  TaskListItem,
  WorkPlanItem,
  WorkPlanCapacityItem,
} from "@/types/global";
import { handleLogout } from "@/components/LogInOut";
import type { AppAction } from "@/context/AppContext";
import type { Dispatch } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

const apiUrl: string = import.meta.env.VITE_APP_API_URL;

type AppDispatch = Dispatch<AppAction>;

type GetDataArgs = {
  userId: string | null;
  dispatch: AppDispatch;
  token: string | null;
  start: string;
  end: string;
  login?: string;
};

export const getData = async ({
  userId,
  dispatch,
  token,
  start,
  end,
  login,
}: GetDataArgs): Promise<void> => {
  dispatch({ type: "setState", payload: (prev) => ({ ...prev, loaded: false }) });

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
    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, loaded: true, ...res.data }),
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      //handleLogout();
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("getData error:", errorMessage);
    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, loaded: true }),
    });
  }
};

export interface SetDataArgs {
  dateCell?: Dayjs;
  dispatch: AppDispatch;
  token: string | null;
  issueId: string | null;
  duration: string;
  comment?: string;
  worklogId?: string | null;
  addEndWorkDayTime?: boolean;
}

export const setData = async ({
  dateCell,
  dispatch,
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

      const startDate = (): string => {
        const HOURS_END_DAY = 18; // конец рабочего дня

        if (addEndWorkDayTime && dateCell) {
          // дата из ячейки + конец рабочего дня
          return dateCell
            .add(HOURS_END_DAY, "hours")
            .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }

        if (addEndWorkDayTime && !dateCell) {
          // текущая дата + конец рабочего дня
          return dayjs()
            .add(HOURS_END_DAY, "hours")
            .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }

        if (dateCell) {
          return dateCell.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
        }

        return dayjs().format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      };

      // const startDate = () => {
      //   const now = dayjs();

      //   if (addEndWorkDayTime && dateCell) {
      //     // дата из ячейки + текущее время
      //     return dayjs(
      //       `${dateCell.format("YYYY-MM-DD")}T${now.format("HH:mm:ss.SSSZZ")}`
      //     ).format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      //   }

      //   if (addEndWorkDayTime) {
      //     // просто now
      //     return now.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      //   }

      //   if (dateCell) {
      //     // дата из ячейки + текущее время
      //     return dayjs(
      //       `${dateCell.format("YYYY-MM-DD")}T${now.format("HH:mm:ss.SSSZZ")}`
      //     ).format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      //   }

      //   return now.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
      // };

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
      dispatch({
        type: "setState",
        payload: (prev: AppState) => ({
          ...prev,
          loaded: true,
          data: worklogId
            ? prev.data.map((item: DataItem) =>
                item.id === (res.data as DataItem).id
                  ? (res.data as DataItem)
                  : item
              )
            : [...prev.data, { ...(res.data as DataItem) }],
        }),
      });
      dispatch({
        type: "setAlert",
        payload: {
          open: true,
          severity: "success",
          message: worklogId
            ? "Запись успешно изменена"
            : "Данные успешно добавлены",
        },
      });
    } else {
      throw new Error(
        worklogId ? "Ошибка изменения данных" : "Ошибка добавления данных"
      );
    }
  } catch (err: any) {
    console.error("ERROR", err.message);
    dispatch({
      type: "setState",
      payload: (prev: AppState) => ({ ...prev, loaded: true }),
    });
    dispatch({
      type: "setAlert",
      payload: { open: true, severity: "error", message: err.message },
    });
  }
};

export interface DeleteDataArgs {
  token: string | null;
  dispatch: AppDispatch;
  issueId: string | null;
  ids: string[];
}

export const deleteData = async ({
  token,
  dispatch,
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
    if (res.data === true) {
      dispatch({
        type: "setState",
        payload: (prev: AppState) => ({
          ...prev,
          loaded: true,
          data: [
            ...prev.data.filter((item: DataItem) => !ids.includes(item.id)),
          ],
        }),
      });
      dispatch({
        type: "setAlert",
        payload: {
          open: true,
          severity: "success",
          message: "Данные успешно удалены",
        },
      });
    } else {
      throw new Error("Ошибка удаления данных");
    }
  } catch (err: any) {
    console.error("ERROR", err.message);
    dispatch({
      type: "setState",
      payload: (prev: AppState) => ({ ...prev, loaded: true }),
    });
    dispatch({
      type: "setAlert",
      payload: { open: true, severity: "error", message: err.message },
    });
  }
};

export const getUserIssues = async ({
  dispatch,
  token,
  userId,
  login,
}: {
  dispatch: AppDispatch;
  token: string | null;
  userId?: string | null;
  login?: string | null;
}): Promise<void> => {
  dispatch({ type: "setState", payload: (prev) => ({ ...prev, loaded: false }) });
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
    dispatch({
      type: "setState",
      payload: (prev: AppState) => ({
        ...prev,
        loaded: true,
        issues: res.data.issues,
      }),
    });
  } catch (err: any) {
    console.error("[Ошибка в getUserIssues]:", err.message);
    // Если токен протух — разлогиниваем
    dispatch({
      type: "setState",
      payload: (prev) => ({ ...prev, loaded: true }),
    });
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      handleLogout();
    }
  }
};

export interface SearchIssuesArgs {
  token: string | null;
  searchStr: string;
  queue?: string;
  page?: number;
  perPage?: number;
}

export const getQueues = async (token: string | null): Promise<QueueInfo[]> => {
  if (!token) {
    return [];
  }

  try {
    const res = await axios.get<{ queues: QueueInfo[] }>(
      `${apiUrl}/api/queues`,
      {
        params: { token },
      }
    );
    return res.data.queues ?? [];
  } catch (err: any) {
    console.error("[Ошибка в getQueues]:", err.message);
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      handleLogout();
    }
    return [];
  }
};

export const searchIssues = async ({
  token,
  searchStr,
  queue,
  page = 1,
  perPage = 20,
}: SearchIssuesArgs): Promise<SearchIssuesResponse> => {
  if (!token) {
    throw new Error("token not passed");
  }

  const query = searchStr.trim();
  if (!query) {
    return { issues: [], total: 0, page: 1, perPage, hasMore: false };
  }

  try {
    const params: Record<string, string> = {
      token: token!,
      search_str: query,
      page: String(page),
      per_page: String(perPage),
    };

    if (queue) {
      params.queue = queue;
    }

    const res = await axios.get<{
      issues: Issue[];
      total?: number;
      page?: number;
      perPage?: number;
      hasMore?: boolean;
    }>(
      `${apiUrl}/api/search_issues`,
      {
        params,
      }
    );
    const totalCount =
      typeof res.data.total === "number"
        ? res.data.total
        : res.data.issues?.length ?? 0;
    return {
      issues: res.data.issues ?? [],
      total: totalCount,
      page: res.data.page ?? page,
      perPage: res.data.perPage ?? perPage,
      hasMore: res.data.hasMore ?? false,
    };
  } catch (err: any) {
    console.error("[Ошибка в searchIssues]:", err.message);
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      handleLogout();
    }
    throw err;
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

export const getTlSprints = async (): Promise<TlSprint[]> => {
  try {
    const res = await axios.post<TlSprint[]>(`${apiUrl}/api/tl_sprints`, {});
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getTlSprints]:", err.message);
    return [];
  }
};

export const getTlGroups = async (): Promise<TlGroup[]> => {
  try {
    const res = await axios.post<TlGroup[]>(`${apiUrl}/api/tl_groups`, {});
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getTlGroups]:", err.message);
    return [];
  }
};

export const getTlRoles = async (): Promise<TlRole[]> => {
  try {
    const res = await axios.post<TlRole[]>(`${apiUrl}/api/tl_roles`, {});
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getTlRoles]:", err.message);
    return [];
  }
};

export const getTlProjects = async (): Promise<TlProject[]> => {
  try {
    const res = await axios.post<TlProject[]>(`${apiUrl}/api/tl_projects`, {});
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getTlProjects]:", err.message);
    return [];
  }
};

export const getTlGroupPatients = async (
  groupIds: number[]
): Promise<TlGroupPatient[]> => {
  try {
    const res = await axios.post<TlGroupPatient[]>(
      `${apiUrl}/api/tl_group_patients`,
      { groupIds }
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getTlGroupPatients]:", err.message);
    return [];
  }
};

export interface TaskListFilters {
  trackerUids: string[];
  projectIds: number[];
  roleIds: number[];
  groupIds: number[];
}

export const getTaskList = async (
  filters: TaskListFilters
): Promise<TaskListItem[]> => {
  try {
    const res = await axios.post<TaskListItem[]>(
      `${apiUrl}/api/tl_tasklist`,
      filters
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getTaskList]:", err.message);
    return [];
  }
};

export interface WorkPlanFilters {
  sprintId: number;
  trackerUids?: string[];
  projectIds?: number[];
  roleIds?: number[];
  groupIds?: number[];
}

export const getWorkPlan = async (
  filters: WorkPlanFilters
): Promise<WorkPlanItem[]> => {
  try {
    const res = await axios.post<WorkPlanItem[]>(
      `${apiUrl}/api/tl_workplan`,
      filters
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getWorkPlan]:", err.message);
    return [];
  }
};

export interface SetWorkPlanArgs {
  sprintId: number;
  taskKey: string;
  trackerUid: string;
  action: 0 | 1 | 2;
  checklistItemId?: string;
  workName?: string;
  deadline?: string | null;
  estimateTimeDays?: number;
  priority?: "Red" | "Orange" | "Green";
  workPlanId?: number;
}

export const setWorkPlan = async (
  payload: SetWorkPlanArgs
): Promise<{ YT_TL_WORKPLAN_ID: number } | null> => {
  try {
    if ((payload.action === 1 || payload.action === 2) && !payload.workPlanId) {
      throw new Error("workPlanId is required for edit/delete actions");
    }
    const res = await axios.post<{ YT_TL_WORKPLAN_ID: number }>(
      `${apiUrl}/setworkplan`,
      payload
    );
    return res.data ?? null;
  } catch (err: any) {
    console.error("[Ошибка в setWorkPlan]:", err.message);
    return null;
  }
};

export interface WorkPlanCapacityFilters {
  dateStart: string;
  dateEnd: string;
  trackerUids?: string[];
  projectIds?: number[];
  roleIds?: number[];
  groupIds?: number[];
}

export const getWorkPlanCapacity = async (
  filters: WorkPlanCapacityFilters
): Promise<WorkPlanCapacityItem[]> => {
  try {
    const res = await axios.post<WorkPlanCapacityItem[]>(
      `${apiUrl}/api/tl_workplan_capacity`,
      filters
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getWorkPlanCapacity]:", err.message);
    return [];
  }
};
