import { SetDataArgs, getTaskPlanInfo } from "@/actions/data";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { Issue, TaskPlanInfoItem, WorkPlanItem } from "@/types/global";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type FC,
  type PropsWithChildren,
} from "react";
import { useAppContext } from "./AppContext";

type InfoState = {
  open: boolean;
  loading: boolean;
  rows: TaskPlanInfoItem[];
  taskKey: string | null;
  taskName: string | null;
};

type TablePlanState = {
  filterText: string;
  filterPriority: string;
  filterNotWorkDone: boolean;
  editOpen: boolean;
  selectedRow: WorkPlanItem | null;
  deleteOpen: boolean;
  deleteTarget: WorkPlanItem | null;
  deleteLoading: boolean;
  addTimeOpen: boolean;
  addTimeIssue: Issue | null;
  info: InfoState;
};

type TablePlanAction =
  | { type: "setFilter"; value: string }
  | { type: "setFilterPriority"; value: string }
  | { type: "setFilterNotWorkDone"; value: boolean }
  | { type: "setEdit"; open: boolean; row?: WorkPlanItem | null }
  | { type: "setDelete"; open: boolean; row?: WorkPlanItem | null }
  | { type: "setDeleteLoading"; loading: boolean }
  | { type: "setAddTime"; open: boolean; issue?: Issue | null }
  | { type: "setInfo"; payload: Partial<InfoState> };

interface TablePlanProviderProps extends PropsWithChildren {
  rows: WorkPlanItem[];
  loading?: boolean;
  setData?: (args: SetDataArgs) => Promise<boolean>;
  onWorkPlanRefresh?: () => void | Promise<void>;
}

type TablePlanContextValue = {
  state: TablePlanState;
  dispatch: Dispatch<TablePlanAction>;
  rows: WorkPlanItem[];
  loading: boolean;
  setData?: (args: SetDataArgs) => Promise<boolean>;
  onWorkPlanRefresh?: () => void | Promise<void>;
  sprintId: number | null;
  trackerUids: string[];
  canAddTime: boolean;
  canEditPlan: boolean;
  actionsDisabled: boolean;
  dataTimeSpendLoading: boolean;
  handleOpenInfo: (row: WorkPlanItem) => Promise<void>;
  handleAddTime: (issue: Issue) => void;
  handleEdit: (row: WorkPlanItem) => void;
  handleOpenDelete: (row: WorkPlanItem) => void;
  closeEdit: () => void;
  closeDelete: () => void;
  closeInfo: () => void;
  setAddTimeOpen: (open: boolean) => void;
};

const TablePlanContext = createContext<TablePlanContextValue | undefined>(
  undefined,
);

const initialState: TablePlanState = {
  filterText: "",
  filterPriority: "",
  filterNotWorkDone: true,
  editOpen: false,
  selectedRow: null,
  deleteOpen: false,
  deleteTarget: null,
  deleteLoading: false,
  addTimeOpen: false,
  addTimeIssue: null,
  info: {
    open: false,
    loading: false,
    rows: [],
    taskKey: null,
    taskName: null,
  },
};

const reducer = (
  state: TablePlanState,
  action: TablePlanAction,
): TablePlanState => {
  switch (action.type) {
    case "setFilter":
      return { ...state, filterText: action.value };
    case "setFilterPriority":
      return { ...state, filterPriority: action.value };
    case "setFilterNotWorkDone":
      return { ...state, filterNotWorkDone: action.value };
    case "setEdit":
      return {
        ...state,
        editOpen: action.open,
        selectedRow:
          action.open === false ? null : (action.row ?? state.selectedRow),
      };
    case "setDelete":
      return {
        ...state,
        deleteOpen: action.open,
        deleteTarget:
          action.open === false ? null : (action.row ?? state.deleteTarget),
      };
    case "setDeleteLoading":
      return { ...state, deleteLoading: action.loading };
    case "setAddTime":
      return {
        ...state,
        addTimeOpen: action.open,
        addTimeIssue:
          action.open === false ? null : (action.issue ?? state.addTimeIssue),
      };
    case "setInfo":
      return { ...state, info: { ...state.info, ...action.payload } };
    default:
      return state;
  }
};

export const TablePlanProvider: FC<TablePlanProviderProps> = ({
  children,
  rows,
  loading = false,
  setData,
  onWorkPlanRefresh,
}) => {
  const { sprintId, trackerUids, planEditMode, showAdminControls } =
    useTableTimePlanSelectors();
  const { state: appState } = useAppContext();
  const [state, dispatch] = useReducer(reducer, initialState);

  const dataTimeSpendLoading = appState.state.dataTimeSpendLoading;
  const canAddTime = !showAdminControls;
  const canEditPlan = showAdminControls && !!planEditMode;
  const actionsDisabled = loading;

  const handleOpenInfo = useCallback(async (row: WorkPlanItem) => {
    dispatch({
      type: "setInfo",
      payload: {
        taskKey: row.TaskKey,
        taskName: row.TaskName,
        open: true,
        loading: true,
        rows: [],
      },
    });
    try {
      const data = await getTaskPlanInfo(row.TaskKey);
      dispatch({ type: "setInfo", payload: { rows: data } });
    } catch (error: any) {
      console.error("[TableWorkPlan] getTaskPlanInfo error:", error?.message);
    } finally {
      dispatch({ type: "setInfo", payload: { loading: false } });
    }
  }, []);

  const handleAddTime = useCallback((issue: Issue) => {
    dispatch({ type: "setAddTime", open: true, issue });
  }, []);

  const handleEdit = useCallback((row: WorkPlanItem) => {
    dispatch({ type: "setEdit", open: true, row });
  }, []);

  const handleOpenDelete = useCallback((row: WorkPlanItem) => {
    dispatch({ type: "setDelete", open: true, row });
  }, []);

  const closeEdit = useCallback(() => {
    dispatch({ type: "setEdit", open: false });
  }, []);

  const closeDelete = useCallback(() => {
    dispatch({ type: "setDelete", open: false });
  }, []);

  const closeInfo = useCallback(() => {
    dispatch({ type: "setInfo", payload: { open: false } });
  }, []);

  const setAddTimeOpen = useCallback((open: boolean) => {
    dispatch({ type: "setAddTime", open });
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      rows,
      loading,
      setData,
      onWorkPlanRefresh,
      sprintId,
      trackerUids,
      canAddTime,
      canEditPlan,
      actionsDisabled,
      dataTimeSpendLoading,
      handleOpenInfo,
      handleAddTime,
      handleEdit,
      handleOpenDelete,
      closeEdit,
      closeDelete,
      closeInfo,
      setAddTimeOpen,
    }),
    [
      state,
      rows,
      loading,
      setData,
      onWorkPlanRefresh,
      sprintId,
      trackerUids,
      canAddTime,
      canEditPlan,
      actionsDisabled,
      dataTimeSpendLoading,
      handleOpenInfo,
      handleAddTime,
      handleEdit,
      handleOpenDelete,
      closeEdit,
      closeDelete,
      closeInfo,
      setAddTimeOpen,
    ],
  );

  return (
    <TablePlanContext.Provider value={value}>
      {children}
    </TablePlanContext.Provider>
  );
};

export const useTablePlanContext = (): TablePlanContextValue => {
  const context = useContext(TablePlanContext);
  if (!context) {
    throw new Error(
      "useTablePlanContext must be used within TablePlanProvider",
    );
  }
  return context;
};
