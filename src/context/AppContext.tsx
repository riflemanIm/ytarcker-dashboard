import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type FC,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import dayjs from "dayjs";
import type {
  AlertState,
  AppState,
  AuthState,
  WorkPlanCapacityState,
  TableTimePlanState,
  ViewMode,
} from "@/types/global";

type AppContextValue = {
  state: AppContextState;
  dispatch: Dispatch<AppAction>;
};

export type AppContextState = {
  auth: AuthState;
  state: AppState;
  alert: AlertState;
  viewMode: ViewMode;
  weekOffset: number;
  reportFrom: dayjs.Dayjs;
  reportTo: dayjs.Dayjs;
  tableTimePlanState: TableTimePlanState;
  workPlanCapacityState: WorkPlanCapacityState;
};

export type AppAction =
  | { type: "setAuth"; payload: SetStateAction<AuthState> }
  | { type: "setState"; payload: SetStateAction<AppState> }
  | { type: "setAlert"; payload: SetStateAction<AlertState> }
  | { type: "setViewMode"; payload: SetStateAction<ViewMode> }
  | { type: "setWeekOffset"; payload: SetStateAction<number> }
  | { type: "setReportFrom"; payload: SetStateAction<dayjs.Dayjs> }
  | { type: "setReportTo"; payload: SetStateAction<dayjs.Dayjs> }
  | {
      type: "setTableTimePlanState";
      payload: SetStateAction<TableTimePlanState>;
    }
  | {
      type: "setWorkPlanCapacityState";
      payload: SetStateAction<WorkPlanCapacityState>;
    };

const AppContext = createContext<AppContextValue | undefined>(undefined);

const applySetState = <T,>(current: T, next: SetStateAction<T>): T =>
  typeof next === "function" ? (next as (prev: T) => T)(current) : next;

const getInitialAuth = (): AuthState => {
  const token = localStorage.getItem("yandex_token");
  const rawLogin = localStorage.getItem("yandex_login") ?? "";
  const login = rawLogin
    ? rawLogin.includes("@")
      ? rawLogin.split("@")[0]
      : rawLogin
    : null;

  return { token, login };
};

const initialState: AppState = {
  loaded: true,
  userId: null,
  users: null,
  data: [],
  fetchByLogin: true,
  issues: [],
};

const initialAlert: AlertState = {
  open: false,
  severity: "",
  message: "",
};

const initialViewMode: ViewMode = "table_time_spend";
const initialWeekOffset = 0;
const initialReportFrom = dayjs().startOf("month");
const initialReportTo = dayjs().endOf("month");
const initialTableTimePlanState: TableTimePlanState = {
  sprins: [],
  sprinsLoaded: false,
  groups: [],
  groupsLoaded: false,
  roles: [],
  rolesLoaded: false,
  projects: [],
  projectsLoaded: false,
  groupPatients: [],
  groupPatientsKey: "",
  loadingGroups: false,
  loadingRoles: false,
  loadingProjects: false,
  loadingPatients: false,
  selectedSprintId: "",
  selectedGroupIds: [],
  selectedRoleIds: [],
  selectedProjectIds: [],
  selectedPatientUid: "",
  workPlanRefreshKey: 0,
};

const initialWorkPlanCapacityState: WorkPlanCapacityState = {
  rows: [],
  loading: false,
  refreshKey: 0,
  capacityFrom: dayjs().startOf("month"),
  capacityTo: dayjs().endOf("month"),
};

const initAppContextState = (): AppContextState => ({
  auth: getInitialAuth(),
  state: initialState,
  alert: initialAlert,
  viewMode: initialViewMode,
  weekOffset: initialWeekOffset,
  reportFrom: initialReportFrom,
  reportTo: initialReportTo,
  tableTimePlanState: initialTableTimePlanState,
  workPlanCapacityState: initialWorkPlanCapacityState,
});

function appReducer(
  state: AppContextState,
  action: AppAction,
): AppContextState {
  switch (action.type) {
    case "setAuth":
      return { ...state, auth: applySetState(state.auth, action.payload) };
    case "setState":
      return { ...state, state: applySetState(state.state, action.payload) };
    case "setAlert":
      return { ...state, alert: applySetState(state.alert, action.payload) };
    case "setViewMode":
      return {
        ...state,
        viewMode: applySetState(state.viewMode, action.payload),
      };
    case "setWeekOffset":
      return {
        ...state,
        weekOffset: applySetState(state.weekOffset, action.payload),
      };
    case "setReportFrom":
      return {
        ...state,
        reportFrom: applySetState(state.reportFrom, action.payload),
      };
    case "setReportTo":
      return {
        ...state,
        reportTo: applySetState(state.reportTo, action.payload),
      };
    case "setTableTimePlanState":
      console.log("case setTableTimePlanState");
      return {
        ...state,
        tableTimePlanState: applySetState(
          state.tableTimePlanState,
          action.payload,
        ),
      };
    case "setWorkPlanCapacityState":
      return {
        ...state,
        workPlanCapacityState: applySetState(
          state.workPlanCapacityState,
          action.payload,
        ),
      };
    default:
      return state;
  }
}

export const AppProvider: FC<PropsWithChildren> = ({ children }) => {
  const [appState, dispatch] = useReducer(
    appReducer,
    undefined,
    initAppContextState,
  );

  const value = useMemo(() => ({ state: appState, dispatch }), [appState]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};
