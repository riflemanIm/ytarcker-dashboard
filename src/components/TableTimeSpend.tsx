import { DeleteDataArgs, SetDataArgs } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import {
  dayOfWeekNameByDate,
  daysMap,
  dayToNumber,
  displayDuration,
  getDateOfWeekday,
  headerWeekName,
  isValidDuration,
  normalizeDuration,
  parseISODurationToSeconds,
  sumDurations,
  toTarget, // ⬅️ добавили
} from "@/helpers";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import React, {
  FC,
  useCallback,
  useMemo,
} from "react";
import {
  DayOfWeek,
  TaskItem,
  TaskItemIssue,
  TransformedTaskRow,
} from "../types/global";
import IssueDisplay from "./IssueDisplay";
import TableCellInfoPopover from "./TableCellInfoPopover";
import SetTimeSpend from "./SetTimeSpend";
import TimeSpendCell from "./TimeSpendCell";
import { useTimeSpendCellControls } from "@/hooks/useTimeSpendCellControls";
import TableTimeDataGrid from "./TableTimeDataGrid";

dayjs.locale("ru");
dayjs.extend(utc);

export const durationComparator = (a: string, b: string): number =>
  parseISODurationToSeconds(a) - parseISODurationToSeconds(b);

interface TableTimeSpendProps {
  data: TaskItem[];
  start: Dayjs; // первый день недели (понедельник)
  rangeStart?: Dayjs;
  rangeEnd?: Dayjs;
  title?: string;
  setData: (args: SetDataArgs) => Promise<void>;
  deleteData: (args: DeleteDataArgs) => void;
  isEditable: boolean;
  isAddable?: boolean;
  onWorkPlanRefresh?: () => void;
  dataTimeSpendLoading?: boolean;
}

interface RawTransformedRow {
  id: string;
  issue: TaskItemIssue;
  issueId: string;
  groupIssue: string;
  checklistItemId?: string | null;
  remainTimeMinutes?: number;
  fields: Record<string, string[]>;
}

const transformData = (
  data: TaskItem[],
  issueMeta: Map<
    string,
    { checklistItemId?: string | null; remainTimeMinutes?: number }
  >,
  fieldKeys: string[],
  fieldKeyForDate: (date: Dayjs) => string,
): TransformedTaskRow[] => {
  const grouped: Record<string, RawTransformedRow> = {} as Record<
    string,
    RawTransformedRow
  >;
  const fieldSet = new Set(fieldKeys);

  data.forEach((item: TaskItem) => {
    const fieldKey = fieldKeyForDate(dayjs(item.start));
    if (!fieldSet.has(fieldKey)) return;

    if (!grouped[item.key]) {
      const meta = issueMeta.get(item.issueId);
      const fields: Record<string, string[]> = {};
      fieldKeys.forEach((key) => {
        fields[key] = [];
      });
      grouped[item.key] = {
        id: item.key,
        issue: item.issue,
        issueId: item.issueId,
        groupIssue: item.groupIssue,
        checklistItemId: item.checklistItemId ?? meta?.checklistItemId ?? null,
        remainTimeMinutes: item.remainTimeMinutes ?? meta?.remainTimeMinutes,
        fields,
      };
    }

    if (!grouped[item.key].checklistItemId && item.checklistItemId) {
      grouped[item.key].checklistItemId = item.checklistItemId;
    }
    if (
      grouped[item.key].remainTimeMinutes == null &&
      item.remainTimeMinutes != null
    ) {
      grouped[item.key].remainTimeMinutes = item.remainTimeMinutes;
    }

    grouped[item.key].fields[fieldKey].push(item.duration);
  });

  return Object.values(grouped).map((rawRow) => {
    const totalsVals: string[] = [];
    const result: Record<string, string> = {};
    fieldKeys.forEach((key) => {
      const summed = sumDurations(rawRow.fields[key]);
      result[key] = summed;
      totalsVals.push(summed);
    });

    return {
      id: rawRow.id,
      issue: rawRow.issue,
      issueId: rawRow.issueId,
      groupIssue: rawRow.groupIssue,
      checklistItemId: rawRow.checklistItemId ?? null,
      remainTimeMinutes: rawRow.remainTimeMinutes,
      ...result,
      total: displayDuration(sumDurations(totalsVals)),
    } as unknown as TransformedTaskRow;
  });
};

const TableTimeSpend: FC<TableTimeSpendProps> = ({
  data,
  start,
  rangeStart,
  rangeEnd,
  title,
  setData,
  deleteData,
  isEditable = false,
  isAddable = true,
  onWorkPlanRefresh,
  dataTimeSpendLoading = false,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const { token } = appState.auth;
  const {
    state: { loginUid },
  } = appState;

  const trackerUid = loginUid;
  const issueMeta = useMemo(() => {
    const map = new Map<
      string,
      { checklistItemId?: string | null; remainTimeMinutes?: number }
    >();
    (appState.state.issues ?? []).forEach((issue: any) => {
      const key = issue?.key ?? issue?.issueId ?? issue?.id;
      if (!key) return;
      const checklistItemId =
        issue?.checklistItemId ??
        issue?.ChecklistItemId ??
        issue?.checklist_item_id ??
        issue?.checklistItem?.id ??
        null;
      const remainTimeMinutes =
        issue?.remainTimeMinutes ??
        issue?.RemainTimeMinutes ??
        issue?.remain_time_days;
      map.set(String(key), { checklistItemId, remainTimeMinutes });
    });
    return map;
  }, [appState.state.issues]);
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

  const fieldKeys = rangeMode ? rangeDays : daysMap;

  const fieldKeyForDate = useCallback(
    (date: Dayjs) => {
      const targetDate = toTarget(date);
      return rangeMode
        ? targetDate.format("YYYY-MM-DD")
        : (dayOfWeekNameByDate(targetDate) as DayOfWeek);
    },
    [rangeMode],
  );

  const viewStart = useMemo(() => {
    if (rangeMode && rangeStart) {
      return toTarget(rangeStart).startOf("day");
    }
    const s = toTarget(start).startOf("isoWeek");
    const e = s.endOf("isoWeek");

    const hasInThisWeek = data.some((i) => {
      const d = toTarget(i.start);
      return d.isSameOrAfter(s) && d.isSameOrBefore(e);
    });

    if (hasInThisWeek) return s;

    // если в выбранной неделе нет данных — подстраиваемся под самую раннюю запись
    if (data.length) {
      const first = data
        .map((i) => toTarget(i.start))
        .sort((a, b) => a.valueOf() - b.valueOf())[0];
      return first.startOf("isoWeek");
    }

    return s;
  }, [data, rangeMode, rangeStart, start]);

  const getDateForField = useCallback(
    (field: string) => {
      if (rangeMode) {
        const parsed = dayjs(field);
        return parsed.isValid() ? parsed.startOf("day") : null;
      }
      return getDateOfWeekday(viewStart, dayToNumber(field as DayOfWeek));
    },
    [rangeMode, viewStart],
  );

  // --- 1) Берём только записи выбранного диапазона ---
  const dataForRange = useMemo(() => {
    const s =
      rangeMode && rangeStart ? toTarget(rangeStart).startOf("day") : viewStart;
    const e =
      rangeMode && rangeEnd
        ? toTarget(rangeEnd).endOf("day")
        : viewStart.endOf("isoWeek");
    return data.filter((i) => {
      const d = toTarget(i.start);
      return d.isSameOrAfter(s) && d.isSameOrBefore(e);
    });
  }, [data, rangeEnd, rangeMode, rangeStart, viewStart]);

  // --- 3) Строим строки по отфильтрованным данным ---
  const tableRows = useMemo(
    () => transformData(dataForRange, issueMeta, fieldKeys, fieldKeyForDate),
    [dataForRange, fieldKeyForDate, fieldKeys, issueMeta],
  );

  // --- 4) Определяем «сегодняшний» столбец в рамках диапазона ---
  const todayKey: string | "" = useMemo(() => {
    const today = toTarget(dayjs()).startOf("day");
    if (rangeMode && rangeStart && rangeEnd) {
      const startDay = toTarget(rangeStart).startOf("day");
      const endDay = toTarget(rangeEnd).endOf("day");
      if (today.isSameOrAfter(startDay) && today.isSameOrBefore(endDay)) {
        return today.format("YYYY-MM-DD");
      }
      return "";
    }
    for (const day of daysMap) {
      const dateOfThisDay = getDateOfWeekday(
        viewStart,
        dayToNumber(day),
      ).startOf("day");
      if (dateOfThisDay.isSame(today)) return day;
    }
    return "";
  }, [rangeEnd, rangeMode, rangeStart, viewStart]);

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

  // --- 6) Сохранение времени в выбранный день диапазона ---
  const handleCellEdit = useCallback(
    (
      field: string,
      newValue: string,
      issueId: string,
      checklistItemId?: string | null,
    ) => {
      const normalizedValue = normalizeDuration(newValue);
      if (
        normalizedValue.trim() === "" ||
        normalizedValue === "P" ||
        token == null
      ) {
        return false;
      }
      if (!isValidDuration(normalizedValue)) {
        dispatch({
          type: "setAlert",
          payload: {
            open: true,
            severity: "error",
            message: `Значение "${newValue}" не является корректным форматом времени.`,
          },
        });
        return false;
      }
      try {
        const dateCell = getDateForField(field);
        if (!dateCell || !dateCell.isValid()) {
          return false;
        }
        setData({
          dateCell,
          dispatch,
          token,
          issueId,
          duration: normalizedValue,
          trackerUid,
          checklistItemId: checklistItemId ?? undefined,
        });
        return true;
      } catch (err: any) {
        console.error("handleCellEdit error:", err.message);
        dispatch({
          type: "setAlert",
          payload: { open: true, severity: "error", message: err.message },
        });
        return false;
      }
    },
    [dispatch, getDateForField, setData, token, trackerUid],
  );

  // --- 7) Колонки (шапка дат строится от viewStart/диапазона) ---
  const columns: GridColDef[] = [
    {
      field: "issue",
      headerName: "Key + Название",
      flex: 4,
      minWidth: 420,
      sortable: true,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) =>
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
      const dateForHeader = getDateForField(field);
      const header =
        dateForHeader != null
          ? `${
              headerWeekName[
                dayOfWeekNameByDate(
                  dateForHeader,
                ) as keyof typeof headerWeekName
              ]
            } ${dateForHeader.format("DD.MM")}`
          : field;

      return {
        field,
        headerName: header,
        flex: 1,
        editable: false,
        sortable: true,
        sortComparator: (v1: string, v2: string, params1, params2) => {
          if (params1.id === "total") return 1;
          if (params2.id === "total") return -1;
          return durationComparator(v1, v2);
        },
        headerClassName: field === todayKey ? "current-column-header" : "",
        cellClassName: (params: GridRenderCellParams) =>
          params.field === todayKey ? "current-column-cell" : "",
        renderCell: (params: GridRenderCellParams) => (
          <TimeSpendCell
            params={params}
            isEditable={isEditable}
            isAddable={isAddable}
            cellHasAllTags={cellHasAllTags}
            onMenuOpen={handleMenuOpen}
            onInfoOpen={handleInfoOpen}
          />
        ),
      } as GridColDef;
    }),

    { field: "total", headerName: "Итого", sortable: false, flex: 1.5 },
  ];

  // --- 8) Строка «Итого» по отфильтрованным строкам ---
  const calculateTotalRow = useCallback(
    (rows: TransformedTaskRow[]): TransformedTaskRow => {
      const totals: Record<string, string> = {};
      const totalsVals: Record<string, string> = {};
      fieldKeys.forEach((field) => {
        totals[field] = displayDuration(
          sumDurations(rows.map((row) => (row as any)[field] as string)),
        );
        totalsVals[field] = sumDurations(
          rows.map((row) => (row as any)[field] as string),
        );
      });

      totals.total = displayDuration(sumDurations(Object.values(totalsVals)));
      return {
        id: "total",
        issue: { display: "Итого", href: "", fio: "" },
        issueId: "",
        groupIssue: "",
        ...totals,
      } as TransformedTaskRow;
    },
    [fieldKeys],
  );

  const totalRow = useMemo(
    () => calculateTotalRow(tableRows),
    [tableRows, calculateTotalRow],
  );

  const isEmptyDurationValue = (value: unknown): boolean => {
    if (value == null) return true;
    if (typeof value !== "string") return false;
    return value === "P" || value === "PT0M" || value.trim() === "";
  };

  return (
    <>
      <TableTimeDataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        loading={dataTimeSpendLoading}
      onCellClick={(params, event) => {
        if (
          isEditable &&
          isAddable &&
          params.row.id !== "total" &&
          fieldKeys.includes(params.field as string) &&
          isEmptyDurationValue(params.value) &&
          (event as React.MouseEvent).detail === 1
        ) {
          handleMenuOpen(
            event as React.MouseEvent<HTMLElement>,
            params as GridRenderCellParams,
          );
        }
      }}
      processRowUpdate={(updatedRow, originalRow) => {
        const changedField = Object.keys(updatedRow).find(
          (key) => (updatedRow as any)[key] !== (originalRow as any)[key],
        ) as string;
        return handleCellEdit(
          changedField,
          (updatedRow as any)[changedField],
          updatedRow.issueId,
          (updatedRow as any).checklistItemId,
        )
          ? updatedRow
          : originalRow;
      }}
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

export default TableTimeSpend;
