import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import isEmpty, { parseISODurationToSeconds } from "@/helpers";
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
  DurationItem,
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
  dispatch({
    type: "setState",
    payload: (prev) => ({ ...prev, loaded: false }),
  });

  try {
    // Проверяем обязательный токен
    if (!token) {
      throw new Error("token not passed");
    }

    const res = await axios.get(
      `${apiUrl}/api/issues?token=${token}&endDate=${end}&startDate=${start}&userId=${userId}&login=${login}`,
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
  planningComment?: string;
  worklogId?: string | null;
  addEndWorkDayTime?: boolean;
  trackerUid?: string | null;
  checklistItemId?: string | null;
  deadlineOk?: boolean;
  needUpgradeEstimate?: boolean;
  makeTaskFaster?: boolean;
  startDate?: string;
}

export interface TlWorklogUpdateArgs {
  taskKey: string;
  duration: number;
  startDate: string;
  deadlineOk: boolean;
  needUpgradeEstimate: boolean;
  makeTaskFaster: boolean;
  comment: string;
  action: 0 | 1 | 2;
  checklistItemId?: string;
  trackerUid: string;
  worklogId?: number;
}

export const updateTlWorklog = async (
  payload: TlWorklogUpdateArgs,
): Promise<{ YT_TL_WORKLOG_ID: number } | null> => {
  try {
    if ((payload.action === 1 || payload.action === 2) && !payload.worklogId) {
      throw new Error("worklogId is required for edit/delete actions");
    }
    const res = await axios.post<{ YT_TL_WORKLOG_ID: number }>(
      `${apiUrl}/tlworklogupdate`,
      payload,
    );
    return res.data ?? null;
  } catch (err: any) {
    console.error("[Ошибка в updateTlWorklog]:", err.message);
    return null;
  }
};

const buildTlWorklogPayload = (args: {
  taskKey: string;
  durationIso: string;
  startDate: string;
  comment: string;
  action: 0 | 1 | 2;
  trackerUid: string;
  checklistItemId?: string | null;
  worklogId?: string | number | null;
  deadlineOk?: boolean;
  needUpgradeEstimate?: boolean;
  makeTaskFaster?: boolean;
}): TlWorklogUpdateArgs | null => {
  const seconds = parseISODurationToSeconds(args.durationIso);
  const minutes = Math.round(seconds / 60);
  if (!Number.isFinite(minutes)) return null;
  const worklogId =
    args.worklogId != null && args.worklogId !== ""
      ? Number(args.worklogId)
      : undefined;
  return {
    taskKey: args.taskKey,
    duration: minutes,
    startDate: args.startDate,
    deadlineOk: args.deadlineOk ?? true,
    needUpgradeEstimate: args.needUpgradeEstimate ?? false,
    makeTaskFaster: args.makeTaskFaster ?? false,
    comment: args.comment ?? "",
    action: args.action,
    checklistItemId: args.checklistItemId ?? undefined,
    trackerUid: args.trackerUid,
    worklogId: Number.isFinite(worklogId) ? worklogId : undefined,
  };
};

export const setData = async ({
  dateCell,
  dispatch,
  token,
  issueId,
  duration,
  comment = "",
  planningComment,
  worklogId = null,
  addEndWorkDayTime = true,
  trackerUid,
  checklistItemId,
  deadlineOk,
  needUpgradeEstimate,
  makeTaskFaster,
  startDate,
}: SetDataArgs): Promise<void> => {
  if (token == null) {
    return;
  }
  if (!issueId) {
    dispatch({
      type: "setAlert",
      payload: {
        open: true,
        severity: "error",
        message: "Не указан ключ задачи (taskKey)",
      },
    });
    return;
  }
  if (!trackerUid) {
    dispatch({
      type: "setAlert",
      payload: {
        open: true,
        severity: "error",
        message: "Не выбран UID пользователя (trackerUid)",
      },
    });
    return;
  }

  try {
    const startDateTime = (() => {
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
    })();

    const internalStartDate =
      startDate ||
      (dateCell
        ? dayjs(dateCell).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"));

    const seconds = parseISODurationToSeconds(duration);
    const durationMinutes = Math.round(seconds / 60);
    if (!Number.isFinite(durationMinutes)) {
      throw new Error("Некорректная длительность");
    }

    const payload = {
      token,
      taskKey: issueId,
      action: worklogId ? 1 : 0,
      duration,
      durationMinutes,
      start: startDateTime,
      startDate: internalStartDate,
      comment: planningComment ?? comment ?? "",
      worklogId: worklogId ? Number(worklogId) : undefined,
      trackerUid,
      checklistItemId,
      deadlineOk: deadlineOk ?? true,
      needUpgradeEstimate: needUpgradeEstimate ?? false,
      makeTaskFaster: makeTaskFaster ?? false,
    };

    const res = await axios.post(`${apiUrl}/api/worklog_update`, payload);

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
                  : item,
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
        worklogId ? "Ошибка изменения данных" : "Ошибка добавления данных",
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
  durations?: DurationItem[] | null;
  trackerUid?: string | null;
  checklistItemId?: string | null;
  deadlineOk?: boolean;
  needUpgradeEstimate?: boolean;
  makeTaskFaster?: boolean;
}

export const deleteData = async ({
  token,
  dispatch,
  issueId,
  ids,
  durations,
  trackerUid,
  checklistItemId,
  deadlineOk,
  needUpgradeEstimate,
  makeTaskFaster,
}: DeleteDataArgs): Promise<void> => {
  if (token == null) {
    return;
  }
  if (!issueId) {
    dispatch({
      type: "setAlert",
      payload: {
        open: true,
        severity: "error",
        message: "Не указан ключ задачи (taskKey)",
      },
    });
    return;
  }
  if (!trackerUid) {
    dispatch({
      type: "setAlert",
      payload: {
        open: true,
        severity: "error",
        message: "Не выбран UID пользователя (trackerUid)",
      },
    });
    return;
  }

  try {
    const items =
      Array.isArray(durations) && durations.length
        ? durations
            .filter((item) => ids.includes(item.id))
            .map((item) => {
              const seconds = parseISODurationToSeconds(item.duration);
              const durationMinutes = Math.round(seconds / 60);
              return {
                worklogId: item.id,
                durationMinutes,
                startDate: dayjs(item.start).format("YYYY-MM-DD"),
                comment: item.comment ?? "",
              };
            })
        : [];

    const payload = {
      token,
      taskKey: issueId,
      action: 2,
      ids,
      items,
      trackerUid,
      checklistItemId,
      deadlineOk: deadlineOk ?? true,
      needUpgradeEstimate: needUpgradeEstimate ?? false,
      makeTaskFaster: makeTaskFaster ?? false,
    };
    const res = await axios.post(`${apiUrl}/api/worklog_update`, payload);
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
  dispatch({
    type: "setState",
    payload: (prev) => ({ ...prev, loaded: false }),
  });
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
      },
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
      },
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
    }>(`${apiUrl}/api/search_issues`, {
      params,
    });
    const totalCount =
      typeof res.data.total === "number"
        ? res.data.total
        : (res.data.issues?.length ?? 0);
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
      },
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
  groupIds: number[],
): Promise<TlGroupPatient[]> => {
  try {
    const res = await axios.post<TlGroupPatient[]>(
      `${apiUrl}/api/tl_group_patients`,
      { groupIds },
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
  filters: TaskListFilters,
): Promise<TaskListItem[]> => {
  try {
    const res = await axios.post<TaskListItem[]>(
      `${apiUrl}/api/tl_tasklist`,
      filters,
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
  filters: WorkPlanFilters,
): Promise<WorkPlanItem[]> => {
  try {
    const res = await axios.post<WorkPlanItem[]>(
      `${apiUrl}/api/tl_workplan`,
      filters,
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
  payload: SetWorkPlanArgs,
): Promise<{ YT_TL_WORKPLAN_ID: number } | null> => {
  try {
    if ((payload.action === 1 || payload.action === 2) && !payload.workPlanId) {
      throw new Error("workPlanId is required for edit/delete actions");
    }
    const res = await axios.post<{ YT_TL_WORKPLAN_ID: number }>(
      `${apiUrl}/api/setworkplan`,
      payload,
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
  filters: WorkPlanCapacityFilters,
): Promise<WorkPlanCapacityItem[]> => {
  try {
    const res = await axios.post<WorkPlanCapacityItem[]>(
      `${apiUrl}/api/tl_workplan_capacity`,
      filters,
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getWorkPlanCapacity]:", err.message);
    return [];
  }
};
