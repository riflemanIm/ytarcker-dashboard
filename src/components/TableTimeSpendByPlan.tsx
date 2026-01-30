import { DeleteDataArgs, SetDataArgs } from "@/actions/data";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { TaskItem, WorkPlanItem } from "@/types/global";
import { Alert } from "@mui/material";
import { FC, useMemo } from "react";
import TableTimeSpend from "./TableTimeSpend";
import { Dayjs } from "dayjs";

interface TableTimeSpendByPlanProps {
  data: TaskItem[];
  start: Dayjs;
  rangeStart?: Dayjs;
  rangeEnd?: Dayjs;
  setData: (args: SetDataArgs) => Promise<void>;
  deleteData: (args: DeleteDataArgs) => void;
  isEditable: boolean;
  planItems?: WorkPlanItem[];
  onWorkPlanRefresh?: () => void;
}

const TableTimeSpendByPlan: FC<TableTimeSpendByPlanProps> = ({
  data,
  start,
  rangeStart,
  rangeEnd,
  setData,
  deleteData,
  isEditable,
  planItems,
  onWorkPlanRefresh,
}) => {
  useTableTimePlanSelectors();
  const effectivePlanItems = planItems ?? [];

  const { planKeys, planMeta } = useMemo(() => {
    const next = new Set<string>();
    const meta: Record<
      string,
      { checklistItemId?: string | null; remainTimeMinutes?: number }
    > = {};
    effectivePlanItems.forEach((item) => {
      const key = String(item.TaskKey);
      next.add(key);
      if (!meta[key]) {
        meta[key] = {
          checklistItemId: item.checklistItemId ?? null,
          remainTimeMinutes: item.RemainTimeMinutes,
        };
      } else if (!meta[key].checklistItemId && item.checklistItemId) {
        meta[key].checklistItemId = item.checklistItemId;
      }
    });
    return { planKeys: next, planMeta: meta };
  }, [effectivePlanItems]);

  const filteredData = useMemo(() => {
    if (!planKeys.size) return [];
    return data
      .filter((item) => planKeys.has(String(item.issueId)))
      .map((item) => {
        const meta = planMeta[String(item.issueId)];
        return {
          ...item,
          checklistItemId: meta?.checklistItemId ?? null,
          remainTimeMinutes: meta?.remainTimeMinutes,
        };
      });
  }, [data, planKeys, planMeta]);

  if (filteredData.length === 0) {
    return (
      <Alert severity="warning">
        Нет ни одной отметки времени за выбранный период
      </Alert>
    );
  }

  return (
    <TableTimeSpend
      data={filteredData}
      start={start}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      title="Затраченное время по плану"
      setData={setData}
      deleteData={deleteData}
      isEditable={isEditable}
      isAddable={false}
      onWorkPlanRefresh={onWorkPlanRefresh}
    />
  );
};

export default TableTimeSpendByPlan;
