import { DeleteDataArgs, SetDataArgs } from "@/actions/data";
import { useTableTimePlanSelectors } from "@/hooks/useTableTimePlanSelectors";
import {
  dayOfWeekNameByDate,
  displayDuration,
  headerWeekName,
  parseISODurationToSeconds,
  sumDurations,
  toTarget,
} from "@/helpers";
import { TaskItem, WorkPlanItem } from "@/types/global";
import { Alert } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";
import { FC, useMemo } from "react";
import IssueDisplay from "./IssueDisplay";
import SetTimeSpend from "./SetTimeSpend";
import TableCellInfoPopover from "./TableCellInfoPopover";
import TimeSpendCell from "./TimeSpendCell";
import { useTimeSpendCellControls } from "@/hooks/useTimeSpendCellControls";
import TableTimeDataGrid from "./TableTimeDataGrid";

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
  dataTimeSpendLoading?: boolean;
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
  dataTimeSpendLoading = false,
}) => {
  useTableTimePlanSelectors();
  const effectivePlanItems = planItems ?? [];
  console.log("data", data);
  console.log("planItems", planItems);
  const { planKeys, planMeta } = useMemo(() => {
    const next = new Set<string>();
    const meta: Record<
      string,
      {
        checklistItemId?: string | null;
        remainTimeMinutes?: number;
        workPlanId?: number | null;
        worklogIdInternal?: number | null;
      }
    > = {};
    effectivePlanItems.forEach((item) => {
      const key = String(item.TaskKey);
      next.add(key);
      if (!meta[key]) {
        meta[key] = {
          checklistItemId: item.checklistItemId ?? null,
          remainTimeMinutes: item.RemainTimeMinutes,
          workPlanId: item.YT_TL_WORKPLAN_ID ?? null,
          worklogIdInternal: item.YT_TL_WORKLOG_ID ?? null,
        };
      } else if (!meta[key].checklistItemId && item.checklistItemId) {
        meta[key].checklistItemId = item.checklistItemId;
      }
    });
    return { planKeys: next, planMeta: meta };
  }, [effectivePlanItems]);

  const rangeMode = Boolean(rangeStart && rangeEnd);
  const rangeDays = useMemo(() => {
    if (!rangeMode || !rangeStart || !rangeEnd) return [];
    const startDay = toTarget(rangeStart).startOf("day");
    const endDay = toTarget(rangeEnd).startOf("day");
    const days: string[] = [];
    for (
      let cursor = startDay;
      cursor.isSameOrBefore(endDay, "day");
      cursor = cursor.add(1, "day")
    ) {
      days.push(cursor.format("YYYY-MM-DD"));
    }
    return days;
  }, [rangeEnd, rangeMode, rangeStart]);

  const fieldKeyForDate = (date: Dayjs) =>
    rangeMode
      ? toTarget(date).format("YYYY-MM-DD")
      : (dayOfWeekNameByDate(date) as string);

  const getDateForField = (field: string) => {
    if (!rangeMode) return null;
    const parsed = dayjs(field);
    return parsed.isValid() ? parsed.startOf("day") : null;
  };

  const normalizedData = useMemo(() => {
    const items: TaskItem[] = [];
    data.forEach((item) => {
      const durations =
        Array.isArray(item.durations) && item.durations.length
          ? item.durations
          : [
              {
                id: item.id,
                duration: item.duration,
                start: item.start,
                comment: item.comment,
              },
            ];
      durations.forEach((d) => {
        items.push({
          ...item,
          start: d.start,
          duration: d.duration,
          comment: d.comment ?? item.comment,
          durations: undefined,
        });
      });
    });
    return items;
  }, [data]);

  const filteredData = useMemo(() => {
    if (!planKeys.size) return [];
    return normalizedData
      .filter((item) => planKeys.has(String(item.issueId)))
      .map((item) => {
        const meta = planMeta[String(item.issueId)];
        return {
          ...item,
          checklistItemId: meta?.checklistItemId ?? null,
          remainTimeMinutes: meta?.remainTimeMinutes,
          workPlanId: meta?.workPlanId ?? null,
          worklogIdInternal: meta?.worklogIdInternal ?? null,
        };
      });
  }, [normalizedData, planKeys, planMeta]);

  const dataForRange = useMemo(() => {
    const s =
      rangeMode && rangeStart ? toTarget(rangeStart).startOf("day") : start;
    const e =
      rangeMode && rangeEnd
        ? toTarget(rangeEnd).endOf("day")
        : toTarget(start).endOf("isoWeek");
    return filteredData.filter((i) => {
      const d = toTarget(i.start);
      return d.isSameOrAfter(s) && d.isSameOrBefore(e);
    });
  }, [filteredData, rangeEnd, rangeMode, rangeStart, start]);
  console.log("planKeys", planKeys);
  console.log("planMeta", planMeta);
  const fieldKeys = rangeMode
    ? rangeDays
    : [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

  const tableRows = useMemo(() => {
    const grouped: Record<
      string,
      {
        id: string;
        issue: TaskItem["issue"];
        issueId: string;
        groupIssue: string;
        checklistItemId?: string | null;
        remainTimeMinutes?: number;
        workPlanId?: number | null;
        worklogIdInternal?: number | null;
        fields: Record<string, string[]>;
      }
    > = {};
    const fieldSet = new Set(fieldKeys);

    dataForRange.forEach((item) => {
      const fieldKey = fieldKeyForDate(dayjs(item.start));
      if (!fieldSet.has(fieldKey)) return;
      if (!grouped[item.key]) {
        const fields: Record<string, string[]> = {};
        fieldKeys.forEach((key) => {
          fields[key] = [];
        });
        grouped[item.key] = {
          id: item.key,
          issue: item.issue,
          issueId: item.issueId,
          groupIssue: item.groupIssue,
          checklistItemId: item.checklistItemId ?? null,
          remainTimeMinutes: item.remainTimeMinutes,
          workPlanId: item.workPlanId ?? null,
          worklogIdInternal: item.worklogIdInternal ?? null,
          fields,
        };
      }
      grouped[item.key].fields[fieldKey].push(item.duration);
    });

    return Object.values(grouped).map((row) => {
      const totalsVals: string[] = [];
      const result: Record<string, string> = {};
      fieldKeys.forEach((key) => {
        const summed = sumDurations(row.fields[key]);
        result[key] = summed;
        totalsVals.push(summed);
      });
      return {
        id: row.id,
        issue: row.issue,
        issueId: row.issueId,
        groupIssue: row.groupIssue,
        checklistItemId: row.checklistItemId ?? null,
        remainTimeMinutes: row.remainTimeMinutes,
        workPlanId: row.workPlanId ?? null,
        worklogIdInternal: row.worklogIdInternal ?? null,
        ...result,
        total: displayDuration(sumDurations(totalsVals)),
      };
    });
  }, [dataForRange, fieldKeys]);

  const {
    cellHasAllTags,
    menuState,
    infoState,
    infoOpen,
    popoverPaperRef,
    handleMenuOpen,
    handleMenuClose,
    handleInfoOpen,
    handleCellInfoLeave,
    handlePopoverMouseEnter,
    handlePopoverMouseLeave,
    closeInfo,
  } = useTimeSpendCellControls({
    dataForRange,
    fieldKeyForDate,
    getDateForField,
  });

  const todayKey = useMemo(() => {
    const today = toTarget(dayjs()).startOf("day");
    if (rangeMode && rangeStart && rangeEnd) {
      const startDay = toTarget(rangeStart).startOf("day");
      const endDay = toTarget(rangeEnd).endOf("day");
      if (today.isSameOrAfter(startDay) && today.isSameOrBefore(endDay)) {
        return today.format("YYYY-MM-DD");
      }
      return "";
    }
    return "";
  }, [rangeEnd, rangeMode, rangeStart]);

  const columns: GridColDef[] = [
    {
      field: "issue",
      headerName: "Key + Название",
      flex: 4,
      minWidth: 420,
      sortable: true,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) =>
        params.row.id !== "total" ? (
          <IssueDisplay
            taskKey={params.row.issueId}
            taskName={params.value.display}
            href={params.value.href}
            fio={params.value.fio}
          />
        ) : (
          params.value.display
        ),
    },
    ...fieldKeys.map((field) => {
      const dateForHeader = dayjs(field);
      const header = rangeMode
        ? `${
            headerWeekName[
              dayOfWeekNameByDate(dateForHeader) as keyof typeof headerWeekName
            ]
          } ${dateForHeader.format("DD.MM")}`
        : (headerWeekName[field as keyof typeof headerWeekName] ?? field);
      return {
        field,
        headerName: header,
        flex: 1,
        editable: false,
        sortable: true,
        sortComparator: (v1: string, v2: string, params1, params2) => {
          if (params1.id === "total") return 1;
          if (params2.id === "total") return -1;
          return parseISODurationToSeconds(v1) - parseISODurationToSeconds(v2);
        },
        headerClassName: field === todayKey ? "current-column-header" : "",
        cellClassName: (params) =>
          params.field === todayKey ? "current-column-cell" : "",
        renderCell: (params: GridRenderCellParams) => (
          <TimeSpendCell
            params={params}
            isEditable={isEditable}
            isAddable={false}
            cellHasAllTags={cellHasAllTags}
            onMenuOpen={handleMenuOpen}
            onInfoOpen={handleInfoOpen}
          />
        ),
      } as GridColDef;
    }),
    { field: "total", headerName: "Итого", sortable: false, flex: 1.5 },
  ];

  const totalRow = useMemo(() => {
    const totals: Record<string, string> = {};
    const totalsVals: Record<string, string> = {};
    fieldKeys.forEach((field) => {
      totals[field] = displayDuration(
        sumDurations(tableRows.map((row) => (row as any)[field] as string)),
      );
      totalsVals[field] = sumDurations(
        tableRows.map((row) => (row as any)[field] as string),
      );
    });
    totals.total = displayDuration(sumDurations(Object.values(totalsVals)));
    return {
      id: "total",
      issue: { display: "Итого", href: "", fio: "" },
      issueId: "",
      groupIssue: "",
      ...totals,
    };
  }, [fieldKeys, tableRows]);

  if (tableRows.length === 0) {
    return (
      <Alert severity="warning">
        Нет ни одной отметки времени за выбранный период
      </Alert>
    );
  }

  return (
    <>
      <TableTimeDataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        loading={dataTimeSpendLoading}
        getRowClassName={(params) => (params.id === "total" ? "no-hover" : "")}
      />
      <SetTimeSpend
        key={`${menuState.issueId}-${menuState.field}-${menuState.dateField?.toISOString()}`}
        open={Boolean(menuState.anchorEl)}
        onClose={handleMenuClose}
        menuState={menuState}
        deleteData={deleteData}
        setData={setData}
        onWorkPlanRefresh={onWorkPlanRefresh}
      />
      <TableCellInfoPopover
        open={infoOpen}
        onClose={closeInfo}
        menuState={infoState}
        onPaperMouseEnter={handlePopoverMouseEnter}
        onPaperMouseLeave={handlePopoverMouseLeave}
        onCloseButtonClick={() => handleCellInfoLeave()}
        paperRef={popoverPaperRef}
      />
    </>
  );
};

export default TableTimeSpendByPlan;
