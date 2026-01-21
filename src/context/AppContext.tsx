import {
  createContext,
  useContext,
  useMemo,
  useState,
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
  TableTimePlanState,
  ViewMode,
} from "@/types/global";

type AppContextValue = {
  auth: AuthState;
  setAuth: Dispatch<SetStateAction<AuthState>>;
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  alert: AlertState;
  setAlert: Dispatch<SetStateAction<AlertState>>;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  weekOffset: number;
  setWeekOffset: Dispatch<SetStateAction<number>>;
  reportFrom: dayjs.Dayjs;
  setReportFrom: Dispatch<SetStateAction<dayjs.Dayjs>>;
  reportTo: dayjs.Dayjs;
  setReportTo: Dispatch<SetStateAction<dayjs.Dayjs>>;
  tableTimePlanState: TableTimePlanState;
  setTableTimePlanState: Dispatch<SetStateAction<TableTimePlanState>>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

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
  groups: [],
  roles: [],
  projects: [],
  groupPatients: [],
  loadingGroups: false,
  loadingRoles: false,
  loadingProjects: false,
  loadingPatients: false,
  selectedSprintId: "",
  selectedGroupIds: [],
  selectedRoleIds: [],
  selectedProjectIds: [],
  selectedPatientUid: "",
};

export const AppProvider: FC<PropsWithChildren> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(getInitialAuth);
  const [state, setState] = useState<AppState>(initialState);
  const [alert, setAlert] = useState<AlertState>(initialAlert);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [weekOffset, setWeekOffset] = useState<number>(initialWeekOffset);
  const [reportFrom, setReportFrom] = useState<dayjs.Dayjs>(initialReportFrom);
  const [reportTo, setReportTo] = useState<dayjs.Dayjs>(initialReportTo);
  const [tableTimePlanState, setTableTimePlanState] =
    useState<TableTimePlanState>(initialTableTimePlanState);

  const value = useMemo(
    () => ({
      auth,
      setAuth,
      state,
      setState,
      alert,
      setAlert,
      viewMode,
      setViewMode,
      weekOffset,
      setWeekOffset,
      reportFrom,
      setReportFrom,
      reportTo,
      setReportTo,
      tableTimePlanState,
      setTableTimePlanState,
    }),
    [
      auth,
      state,
      alert,
      viewMode,
      weekOffset,
      reportFrom,
      reportTo,
      tableTimePlanState,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};
