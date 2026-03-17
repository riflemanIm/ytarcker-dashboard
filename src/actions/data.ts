import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import isEmpty, { getLocalAdmin } from "@/helpers";
import {
  AppState,
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
  TaskPlanInfoItem,
  ChecklistDataPlanResult,
} from "@/types/global";
import { handleLogout } from "@/components/LogInOut";
import type { AppAction } from "@/context/AppContext";
import type { Dispatch } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

const apiUrl: string = import.meta.env.VITE_APP_API_URL;
let tlSprintsPromise: Promise<TlSprint[]> | null = null;
let tlSprintsCache: TlSprint[] | null = null;
let latestGetDataRequestId = 0;

const isSameId = (left: unknown, right: unknown): boolean =>
  String(left ?? "") === String(right ?? "");

type AppDispatch = Dispatch<AppAction>;

type GetDataArgs = {
  userId: string | null;
  dispatch: AppDispatch;
  token: string | null;
  start: string;
  end: string;
  login?: string;
};

type TrackerWorklogResponse = {
  id: string | number;
  duration: string;
  start: string;
  comment?: string | null;
  issue?: {
    key?: string;
    display?: string;
  };
  updatedBy?: {
    id?: string | number;
    display?: string;
  };
  createdBy?: {
    id?: string | number;
    display?: string;
  };
};

type AppStateUpdater = (prev: AppState) => AppState;
type DataTimeSpendUpdater = (prev: AppState["dataTimeSpend"]) => AppState["dataTimeSpend"];

const patchAppState = (dispatch: AppDispatch, updater: AppStateUpdater): void => {
  dispatch({
    type: "setState",
    payload: updater,
  });
};

const patchDataTimeSpend = (
  dispatch: AppDispatch,
  updater: DataTimeSpendUpdater,
): AppState["dataTimeSpend"] => {
  let snapshot: AppState["dataTimeSpend"] = [];
  patchAppState(dispatch, (prev) => {
    snapshot = [...prev.dataTimeSpend];
    return {
      ...prev,
      dataTimeSpend: updater(prev.dataTimeSpend),
    };
  });
  return snapshot;
};

const rollbackDataTimeSpend = (
  dispatch: AppDispatch,
  snapshot: AppState["dataTimeSpend"],
): void => {
  patchAppState(dispatch, (prev) => ({
    ...prev,
    dataTimeSpend: snapshot,
  }));
};

const toDataTimeSpendItem = (
  worklog: TrackerWorklogResponse,
  fallbackIssueId: string,
  fallbackTrackerUid: string,
): AppState["dataTimeSpend"][number] => ({
  id: String(worklog.id),
  duration: worklog.duration,
  start: worklog.start,
  comment: worklog.comment ?? "",
  issue: {
    key: worklog.issue?.key ?? fallbackIssueId,
    display: worklog.issue?.display ?? fallbackIssueId,
  },
  updatedBy: {
    id: String(worklog.updatedBy?.id ?? worklog.createdBy?.id ?? fallbackTrackerUid),
    display:
      worklog.updatedBy?.display ??
      worklog.createdBy?.display ??
      fallbackTrackerUid,
  },
});

export interface TlUserInfo {
  trackerUid: string;
  isAdmin: boolean;
  planEditMode: boolean;
}

export const getData = async ({
  userId,
  dispatch,
  token,
  start,
  end,
  login,
}: GetDataArgs): Promise<void> => {
  const requestId = ++latestGetDataRequestId;

  dispatch({
    type: "setState",
    payload: (prev) => ({
      ...prev,
      dataTimeSpendLoading: true,
    }),
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
    if (requestId !== latestGetDataRequestId) {
      return;
    }

    dispatch({
      type: "setState",
      payload: (prev) => {
        const nextData = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.dataTimeSpend)
            ? res.data.dataTimeSpend
            : [];
        const { data, dataTimeSpend, ...rest } = res.data ?? {};
        return {
          ...prev,
          dataTimeSpendLoading: false,
          ...rest,
          dataTimeSpend: nextData,
        };
      },
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      //handleLogout();
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("getData error:", errorMessage);
    if (requestId !== latestGetDataRequestId) {
      return;
    }
    dispatch({
      type: "setState",
      payload: (prev) => ({
        ...prev,
        dataTimeSpendLoading: false,
      }),
    });
  }
};

export const getTlUserInfo = async ({
  trackerUid,
  email,
  login,
  dispatch,
}: {
  trackerUid?: string | null;
  email?: string | null;
  login?: string | null;
  dispatch: AppDispatch;
}): Promise<{ info: TlUserInfo | null; errorStatus?: number | null }> => {
  if (!trackerUid && !email) {
    throw new Error("trackerUid or email is required");
  }

  try {
    const res = await axios.post<TlUserInfo[]>(`${apiUrl}/api/tl_userinfo`, {
      trackerUid: trackerUid ?? undefined,
      email: email ?? undefined,
    });
    if (!Array.isArray(res.data) || res.data.length === 0) {
      return { info: null };
    }
    const info = res.data[0] ?? null;
    if (!info) return { info: null };

    console.log("info", info);
    const localAdmin = getLocalAdmin(login ?? null);
    dispatch({
      type: "setState",
      // payload: (prev) => ({
      //   ...prev,
      //   loginUid: info.trackerUid ?? prev.loginUid ?? null,
      //   isAdmin: localAdmin?.isAdmin ?? info.isAdmin ?? prev.isAdmin ?? false,
      //   planEditMode:
      //     localAdmin?.planEditMode ??
      //     info.planEditMode ??
      //     prev.planEditMode ??
      //     false,
      // }),
      payload: (prev) => ({
        ...prev,
        loginUid: info.trackerUid ?? prev.loginUid ?? null,
        isAdmin: info.isAdmin ?? localAdmin?.isAdmin ?? prev.isAdmin ?? false,
        planEditMode:
          info.planEditMode ??
          localAdmin?.planEditMode ??
          prev.planEditMode ??
          false,
      }),
    });

    return { info };
  } catch (err: any) {
    console.error("[Ошибка в getTlUserInfo]:", err.message);
    const errorStatus = axios.isAxiosError(err)
      ? (err.response?.status ?? null)
      : null;
    return { info: null, errorStatus };
  }
};

export interface SetDataArgs {
  dateCell?: Dayjs;
  dispatch: AppDispatch;
  token: string | null;
  issueId: string | null;
  duration: string | number;
  comment?: string;
  planningComment?: string;
  worklogId?: string | null;
  worklogIdInternal?: string | number | null;
  addEndWorkDayTime?: boolean;
  trackerUid?: string | null;
  checklistItemId?: string | null;
  deadlineOk?: boolean;
  needUpgradeEstimate?: boolean;
  makeTaskFaster?: boolean;
  startDate?: string;
  issueTypeLabel?: string | null;
  workPlanId?: string | number | null;
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
  issueTypeLabel?: string | null;
  workPlanId?: string | number | null;
}

export const updateTlWorklog = async (
  payload: TlWorklogUpdateArgs,
): Promise<{ YT_TL_WORKLOG_ID: number } | null> => {
  try {
    if ((payload.action === 1 || payload.action === 2) && !payload.worklogId) {
      throw new Error("worklogId is required for edit/delete actions");
    }
    const res = await axios.post<{ YT_TL_WORKLOG_ID: number }>(
      `${apiUrl}/api/worklog_update`,
      {
        ...payload,
      },
    );
    return res.data ?? null;
  } catch (err: any) {
    console.error("[Ошибка в updateTlWorklog]:", err.message);
    return null;
  }
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
  worklogIdInternal = null,
  addEndWorkDayTime = true,
  trackerUid,
  checklistItemId,
  deadlineOk,
  needUpgradeEstimate,
  makeTaskFaster,
  startDate,
  issueTypeLabel,
  workPlanId,
}: SetDataArgs): Promise<boolean> => {
  if (token == null) {
    return false;
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
    return false;
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
    return false;
  }

  patchAppState(dispatch, (prev) => ({ ...prev, dataTimeSpendLoading: true }));

  const startDateTime = (() => {
    const HOURS_END_DAY = 18;

    if (addEndWorkDayTime && dateCell) {
      return dateCell
        .add(HOURS_END_DAY, "hours")
        .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
    }

    if (addEndWorkDayTime && !dateCell) {
      return dayjs()
        .add(HOURS_END_DAY, "hours")
        .format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
    }

    if (dateCell) {
      return dateCell.format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
    }

    return dayjs().format("YYYY-MM-DDTHH:mm:ss.SSSZZ");
  })();

  const optimisticDuration = String(duration ?? "");
  const optimisticComment = planningComment ?? comment ?? "";
  const optimisticItem = {
    id: worklogId
      ? String(worklogId)
      : `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    duration: optimisticDuration,
    start: startDateTime,
    comment: optimisticComment,
    issue: {
      key: issueId,
      display: issueId,
    },
    updatedBy: {
      id: trackerUid,
      display: trackerUid,
    },
  };

  const optimisticSnapshot = patchDataTimeSpend(dispatch, (prevData) => {
    if (worklogId) {
      return prevData.map((item) =>
        isSameId(item.id, worklogId)
          ? {
              ...item,
              duration: optimisticDuration,
              comment: optimisticComment,
              start: startDateTime,
            }
          : item,
      );
    }
    return [optimisticItem as any, ...prevData];
  });

  try {
    const internalStartDate =
      startDate ||
      (dateCell
        ? dayjs(dateCell).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"));

    const payload = {
      token,
      taskKey: issueId,
      action: worklogId ? 1 : 0,
      duration,
      start: startDateTime,
      startDate: internalStartDate,
      comment: planningComment ?? comment ?? "",
      worklogId: worklogId ? Number(worklogId) : undefined,
      worklogIdInternal:
        worklogIdInternal != null ? Number(worklogIdInternal) : undefined,
      trackerUid,
      checklistItemId,
      deadlineOk: deadlineOk ?? true,
      needUpgradeEstimate: needUpgradeEstimate ?? false,
      makeTaskFaster: makeTaskFaster ?? false,
      issueTypeLabel: issueTypeLabel ?? null,
      workPlanId: workPlanId ?? null,
    };

    const res = await axios.post<TrackerWorklogResponse>(
      `${apiUrl}/api/worklog_update`,
      payload,
    );

    if (res.status !== 200) {
      throw new Error("Api set data error");
    }

    if (!isEmpty(res.data)) {
      const savedItem = toDataTimeSpendItem(res.data, issueId, trackerUid);
      patchDataTimeSpend(dispatch, (prevData) => {
        if (worklogId) {
          return prevData.map((item) =>
            isSameId(item.id, worklogId) ? savedItem : item,
          );
        }
        return prevData.map((item) =>
          isSameId(item.id, optimisticItem.id) ? savedItem : item,
        );
      });

      patchAppState(dispatch, (prev: AppState) => ({
        ...prev,
        dataTimeSpendLoading: false,
      }));
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
      return true;
    } else {
      throw new Error(
        worklogId ? "Ошибка изменения данных" : "Ошибка добавления данных",
      );
    }
  } catch (err: any) {
    console.error("ERROR", err.message);
    rollbackDataTimeSpend(dispatch, optimisticSnapshot);
    patchAppState(dispatch, (prev: AppState) => ({
      ...prev,
      dataTimeSpendLoading: false,
    }));
    dispatch({
      type: "setAlert",
      payload: { open: true, severity: "error", message: err.message },
    });
    return false;
  }
};

export interface DeleteDataArgs {
  token: string | null;
  dispatch: AppDispatch;
  issueId: string | null;
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
  durations,
  trackerUid,
  checklistItemId,
  deadlineOk,
  needUpgradeEstimate,
  makeTaskFaster,
}: DeleteDataArgs): Promise<boolean> => {
  if (token == null) {
    return false;
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
    return false;
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
    return false;
  }

  patchAppState(dispatch, (prev) => ({ ...prev, dataTimeSpendLoading: true }));

  const optimisticIds = Array.isArray(durations)
    ? durations
        .map((item) => item?.id)
        .filter((id): id is string | number => id != null)
        .map((id) => String(id))
    : [];

  const optimisticSnapshot = patchDataTimeSpend(dispatch, (prevData) => {
    if (optimisticIds.length === 0) return prevData;
    return prevData.filter(
      (item) => !optimisticIds.includes(String(item.id)),
    );
  });

  try {
    const items =
      Array.isArray(durations) && durations.length
        ? durations.map((item) => ({
            worklogId: item.id,
            duration: item.duration,
            startDate: dayjs(item.start).format("YYYY-MM-DD"),
            comment: item.comment ?? "",
          }))
        : [];

    const payload = {
      token,
      taskKey: issueId,
      action: 2,
      items,
      trackerUid,
      checklistItemId,
      deadlineOk: deadlineOk ?? true,
      needUpgradeEstimate: needUpgradeEstimate ?? false,
      makeTaskFaster: makeTaskFaster ?? false,
    };
    console.log("payload", payload);
    //return;
    const res = await axios.post(`${apiUrl}/api/worklog_update`, payload);
    if (res.status !== 200) {
      throw new Error("Ошибка удаления данных");
    }
    if (res.data === true) {
      patchAppState(dispatch, (prev: AppState) => ({
        ...prev,
        dataTimeSpendLoading: false,
      }));
      dispatch({
        type: "setAlert",
        payload: {
          open: true,
          severity: "success",
          message: "Данные успешно удалены",
        },
      });
      return true;
    } else {
      throw new Error("Ошибка удаления данных");
    }
  } catch (err: any) {
    console.error("ERROR", err.message);
    rollbackDataTimeSpend(dispatch, optimisticSnapshot);
    patchAppState(dispatch, (prev: AppState) => ({
      ...prev,
      dataTimeSpendLoading: false,
    }));
    dispatch({
      type: "setAlert",
      payload: { open: true, severity: "error", message: err.message },
    });
    return false;
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
        issues: res.data.issues,
      }),
    });
  } catch (err: any) {
    console.error("[Ошибка в getUserIssues]:", err.message);
    // Если токен протух — разлогиниваем
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
    if (tlSprintsCache) return tlSprintsCache;
    if (!tlSprintsPromise) {
      tlSprintsPromise = axios
        .post<TlSprint[]>(`${apiUrl}/api/tl_sprints`, {})
        .then((res) => (Array.isArray(res.data) ? res.data : []))
        .then((data) => {
          tlSprintsCache = data;
          return data;
        })
        .catch((err) => {
          tlSprintsPromise = null;
          throw err;
        });
    }
    return await tlSprintsPromise;
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
  estimateTimeMinutes?: number;
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

export const getTaskPlanInfo = async (
  taskKey: string,
): Promise<TaskPlanInfoItem[]> => {
  try {
    const res = await axios.post<TaskPlanInfoItem[]>(
      `${apiUrl}/api/task_plan_info`,
      { taskKey },
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    console.error("[Ошибка в getTaskPlanInfo]:", err.message);
    return [];
  }
};

export interface ChecklistDataPlanArgs {
  entityKey: string;
  updatePlan?: boolean;
  rePlan?: boolean;
  synchronizePlan?: boolean;
}

export const syncChecklistDataPlan = async (
  payload: ChecklistDataPlanArgs,
): Promise<ChecklistDataPlanResult | null> => {
  try {
    if (!payload.entityKey) {
      throw new Error("entityKey is required");
    }
    const res = await axios.post<ChecklistDataPlanResult>(
      `${apiUrl}/api/yt_tl_checklist_data`,
      payload,
    );
    return res.data ?? null;
  } catch (err: any) {
    console.error("[Ошибка в syncChecklistDataPlan]:", err.message);
    return null;
  }
};
