import { DeleteDataArgs, SetDataArgs, getWorkPlan } from "@/actions/data";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import { TaskItem } from "@/types/global";
import { FC, useEffect, useMemo, useState } from "react";
import TableTimeSpend from "./TableTimeSpend";
import { Dayjs } from "dayjs";

interface TableTimeSpendByPlanProps {
  data: TaskItem[];
  start: Dayjs;
  setData: (args: SetDataArgs) => Promise<void>;
  deleteData: (args: DeleteDataArgs) => void;
  isEditable: boolean;
}

const TableTimeSpendByPlan: FC<TableTimeSpendByPlanProps> = ({
  data,
  start,
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
        setPlanKeys(next);
      })
      .catch((error: Error) => {
        console.error(
          "[TableTimeSpendByPlan] getWorkPlan error:",
          error.message,
        );
        if (!isMounted) return;
        setPlanKeys(new Set());
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
    return data.filter((item) => planKeys.has(String(item.issueId)));
  }, [data, planKeys]);

  return (
    <TableTimeSpend
      data={filteredData}
      start={start}
      setData={setData}
      deleteData={deleteData}
      isEditable={isEditable}
    />
  );
};

export default TableTimeSpendByPlan;
