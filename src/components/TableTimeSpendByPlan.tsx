import { DeleteDataArgs, SetDataArgs, getWorkPlan } from "@/actions/data";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { TaskItem } from "@/types/global";
import { FC, useEffect, useMemo, useState } from "react";
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
}

const TableTimeSpendByPlan: FC<TableTimeSpendByPlanProps> = ({
  data,
  start,
  rangeStart,
  rangeEnd,
  setData,
  deleteData,
  isEditable,
}) => {
  const {
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
  } = useTableTimePlanSelectors();
  const [planKeys, setPlanKeys] = useState<Set<string>>(new Set());
  const [planMeta, setPlanMeta] = useState<
    Record<string, { checklistItemId?: string | null; remainTimeDays?: number }>
  >({});

  useEffect(() => {
    let isMounted = true;

    if (!sprintId) {
      setPlanKeys(new Set());
      return () => {
        isMounted = false;
      };
    }

    getWorkPlan({ sprintId, trackerUids, projectIds, roleIds, groupIds })
      .then((items) => {
        if (!isMounted) return;
        const next = new Set(items.map((item) => String(item.TaskKey)));
        const meta: Record<
          string,
          { checklistItemId?: string | null; remainTimeDays?: number }
        > = {};
        items.forEach((item) => {
          const key = String(item.TaskKey);
          if (!meta[key]) {
            meta[key] = {
              checklistItemId: item.checklistItemId ?? null,
              remainTimeDays: item.RemainTimeDays,
            };
          } else if (!meta[key].checklistItemId && item.checklistItemId) {
            meta[key].checklistItemId = item.checklistItemId;
          }
        });
        setPlanKeys(next);
        setPlanMeta(meta);
      })
      .catch((error: Error) => {
        console.error(
          "[TableTimeSpendByPlan] getWorkPlan error:",
          error.message,
        );
        if (!isMounted) return;
        setPlanKeys(new Set());
        setPlanMeta({});
      });

    return () => {
      isMounted = false;
    };
  }, [
    sprintId,
    trackerUids,
    projectIds,
    roleIds,
    groupIds,
    workPlanRefreshKey,
  ]);

  const filteredData = useMemo(() => {
    if (!planKeys.size) return [];
    return data
      .filter((item) => planKeys.has(String(item.issueId)))
      .map((item) => {
        const meta = planMeta[String(item.issueId)];
        return {
          ...item,
          checklistItemId: meta?.checklistItemId ?? null,
          remainTimeDays: meta?.remainTimeDays,
        };
      });
  }, [data, planKeys, planMeta]);

  return (
    <TableTimeSpend
      data={filteredData}
      start={start}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      setData={setData}
      deleteData={deleteData}
      isEditable={isEditable}
    />
  );
};

export default TableTimeSpendByPlan;
