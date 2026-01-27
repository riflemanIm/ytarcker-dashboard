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
import { parseFirstIssueTypeLabel } from "@/helpers/issueTypeComment";
import AddIcon from "@mui/icons-material/Add";
import { Box, Chip, IconButton, Paper, Stack, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DayOfWeek,
  MenuState,
  TaskItem,
  TaskItemIssue,
  TransformedTaskRow,
} from "../types/global";
import AddDurationIssueDialog from "./AddDurationIssueDialog";
import IssueDisplay from "./IssueDisplay";
import TableCellInfoPopover from "./TableCellInfoPopover";
import SetTimeSpend from "./SetTimeSpend";

dayjs.locale("ru");
dayjs.extend(utc);

const createEmptyMenuState = (): MenuState => ({
  anchorEl: null,
  issue: null,
  field: null,
  issueId: null,
  checklistItemId: null,
  remainTimeDays: undefined,
  durations: null,
  dateField: null,
});

export const durationComparator = (a: string, b: string): number =>
  parseISODurationToSeconds(a) - parseISODurationToSeconds(b);

interface TableTimeSpendProps {
  data: TaskItem[];
  start: Dayjs; // первый день недели (понедельник)
  rangeStart?: Dayjs;
  rangeEnd?: Dayjs;
  setData: (args: SetDataArgs) => Promise<void>;
  deleteData: (args: DeleteDataArgs) => void;
  isEditable: boolean;
}

interface RawTransformedRow {
  id: string;
  issue: TaskItemIssue;
  issueId: string;
  groupIssue: string;
  checklistItemId?: string | null;
  remainTimeDays?: number;
  fields: Record<string, string[]>;
}

const transformData = (
  data: TaskItem[],
  issueMeta: Map<
    string,
    { checklistItemId?: string | null; remainTimeDays?: number }
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
        remainTimeDays: item.remainTimeDays ?? meta?.remainTimeDays,
        fields,
      };
    }

    if (!grouped[item.key].checklistItemId && item.checklistItemId) {
      grouped[item.key].checklistItemId = item.checklistItemId;
    }
    if (grouped[item.key].remainTimeDays == null && item.remainTimeDays != null) {
      grouped[item.key].remainTimeDays = item.remainTimeDays;
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
      remainTimeDays: rawRow.remainTimeDays,
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
  setData,
  deleteData,
  isEditable = false,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const { token } = appState.auth;
  const trackerUid =
    appState.state.userId ||
    appState.tableTimePlanState.selectedPatientUid ||
    (Array.isArray(appState.state.users) && appState.state.users.length === 1
      ? (appState.state.users[0]?.id ?? null)
      : null);
  const issueMeta = useMemo(() => {
    const map = new Map<
      string,
      { checklistItemId?: string | null; remainTimeDays?: number }
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
      const remainTimeDays =
        issue?.remainTimeDays ??
        issue?.RemainTimeDays ??
        issue?.remain_time_days;
      map.set(String(key), { checklistItemId, remainTimeDays });
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
    const s = rangeMode && rangeStart ? toTarget(rangeStart).startOf("day") : viewStart;
    const e = rangeMode && rangeEnd ? toTarget(rangeEnd).endOf("day") : viewStart.endOf("isoWeek");
    return data.filter((i) => {
      const d = toTarget(i.start);
      return d.isSameOrAfter(s) && d.isSameOrBefore(e);
    });
  }, [data, rangeEnd, rangeMode, rangeStart, viewStart]);

  // --- 2) Проверка тегов для ячейки (внутри этой недели) ---
  const cellHasAllTags = useCallback(
    (rowId: string | number, field: string): boolean => {
      if (!dataForRange) return true;

      const norm = (s: string) => s.replace(/[\u00A0\u202F]/g, " ");
      const BAD_TAG_RE =
        /\[\s*ProjectControlWT\s*:\s*Временно\s+не\s*определ[её]н\s*\]/i;

      const rawItems = dataForRange.filter(
        (r) => r.key === rowId && fieldKeyForDate(dayjs(r.start)) === field,
      );

      if (rawItems.length === 0) return false;

      for (const r of rawItems) {
        const durations =
          Array.isArray((r as any).durations) && (r as any).durations.length
            ? (r as any).durations
            : [r as any];

        for (const d of durations) {
          const commentRaw = (d?.comment ?? "").toString();
          const comment = norm(commentRaw).trim();

          if (!comment) return false;
          if (BAD_TAG_RE.test(comment)) return false;

          const tag = parseFirstIssueTypeLabel(comment);
          if (!tag) return false;
        }
      }
      return true;
    },
    [dataForRange, fieldKeyForDate],
  );

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

  // --- 5) Контекстное меню по клику на ячейку ---
  const [menuState, setMenuState] = useState<MenuState>(createEmptyMenuState);
  const [infoState, setInfoState] = useState<MenuState>(createEmptyMenuState);
  const [infoOpen, setInfoOpen] = useState(false);
  const popoverPaperRef = useRef<HTMLDivElement | null>(null);
  const infoCloseTimer = useRef<number | null>(null);

  const clearInfoCloseTimer = useCallback(() => {
    if (infoCloseTimer.current != null) {
      window.clearTimeout(infoCloseTimer.current);
      infoCloseTimer.current = null;
    }
  }, []);

  const closeInfo = useCallback(() => {
    clearInfoCloseTimer();
    setInfoOpen(false);
    setInfoState(createEmptyMenuState());
  }, [clearInfoCloseTimer, setInfoOpen, setInfoState]);

  const scheduleInfoClose = useCallback(() => {
    clearInfoCloseTimer();
    infoCloseTimer.current = window.setTimeout(() => {
      infoCloseTimer.current = null;
      const anchorHovered = infoState.anchorEl?.matches?.(":hover");
      const popoverHovered = popoverPaperRef.current?.matches?.(":hover");
      if (anchorHovered || popoverHovered) {
        return;
      }
      closeInfo();
    }, 15000);
  }, [clearInfoCloseTimer, closeInfo, infoState.anchorEl]);

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, params: GridRenderCellParams) => {
      clearInfoCloseTimer();
      const anchor = event.currentTarget as HTMLElement;
      const foundRow =
        dataForRange != null
          ? dataForRange.find(
              (row) =>
                fieldKeyForDate(dayjs(row.start)) === params.field &&
                row.key === params.id,
            )?.durations
          : null;
      console.log("params.row", params.row);
      setMenuState({
        anchorEl: anchor,
        issue: params.row.issue.display,
        field: params.field as string,
        issueId: params.row.issueId,
        checklistItemId: params.row.checklistItemId ?? null,
        remainTimeDays: params.row.remainTimeDays,
        durations: foundRow ?? null,
        dateField: getDateForField(params.field as string),
      });
    },
    [dataForRange, fieldKeyForDate, getDateForField, setMenuState],
  );

  const handleMenuClose = useCallback(() => {
    setMenuState(createEmptyMenuState());
  }, [setMenuState]);

  const handleInfoOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, params: GridRenderCellParams) => {
      clearInfoCloseTimer();
      const anchor = event.currentTarget as HTMLElement;
      const foundRow =
        dataForRange != null
          ? dataForRange.find(
              (row) =>
                fieldKeyForDate(dayjs(row.start)) === params.field &&
                row.key === params.id,
            )?.durations
          : null;

      if (!foundRow || foundRow.length === 0) {
        closeInfo();
        return;
      }

      // закрываем предыдущий поповер, если он открыт
      closeInfo();

      const nextState: MenuState = {
        anchorEl: anchor,
        issue: params.row.issue.display,
        field: params.field as string,
        issueId: params.row.issueId,
        checklistItemId: params.row.checklistItemId ?? null,
        remainTimeDays: params.row.remainTimeDays,
        durations: foundRow,
        dateField: getDateForField(params.field as string),
      };

      setInfoState(nextState);
      setInfoOpen(true);
    },
    [
      dataForRange,
      fieldKeyForDate,
      getDateForField,
      closeInfo,
      setInfoState,
      setInfoOpen,
      clearInfoCloseTimer,
    ],
  );

  const handleCellInfoLeave = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      const nextTarget = event?.relatedTarget as Node | null;
      if (
        event &&
        nextTarget &&
        popoverPaperRef.current?.contains(nextTarget)
      ) {
        return;
      }
      scheduleInfoClose();
    },
    [scheduleInfoClose],
  );

  const handlePopoverMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      const anchor = infoState.anchorEl;
      if (anchor && nextTarget && anchor.contains(nextTarget)) {
        return;
      }
      scheduleInfoClose();
    },
    [infoState.anchorEl, scheduleInfoClose],
  );

  const handlePopoverMouseEnter = useCallback(() => {
    clearInfoCloseTimer();
  }, [clearInfoCloseTimer]);

  useEffect(() => {
    return () => {
      clearInfoCloseTimer();
    };
  }, [clearInfoCloseTimer]);

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
      headerName: "Название",
      flex: 4,
      sortable: false,
      renderCell: (params: GridRenderCellParams) =>
        params.row.id !== "total" ? (
          <IssueDisplay
            display={params.value.display}
            href={params.value.href}
            fio={params.value.fio}
          />
        ) : (
          params.value.display
        ),
    },
    { field: "issueId", headerName: "Key", flex: 1.5, sortable: true },

    ...fieldKeys.map((field) => {
      const dateForHeader = getDateForField(field);
      const header =
        dateForHeader != null
          ? `${headerWeekName[
              dayOfWeekNameByDate(dateForHeader) as keyof typeof headerWeekName
            ]} ${dateForHeader.format("DD.MM")}`
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
        renderCell: (params: GridRenderCellParams) => {
          const val = displayDuration(params.value);
          if (params.row.id === "total") return val;

          if (val === "" && isEditable) {
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  margin: "0 auto",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget.firstChild as HTMLElement).style.opacity =
                    "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.firstChild as HTMLElement).style.opacity =
                    "0";
                }}
              >
                <IconButton
                  sx={(theme) => ({
                    opacity: 0,
                    transition: "opacity 0.3s",
                    color: theme.palette.primary.main,
                    width: "100%",
                    height: "100%",
                  })}
                >
                  <AddIcon />
                </IconButton>
              </div>
            );
          }

          const allTagged = cellHasAllTags(params.id, params.field);

          if (isEditable) {
            return (
              <Chip
                label={val}
                variant="outlined"
                clickable
                color={allTagged ? "success" : "error"}
                onClick={(e) => handleMenuOpen(e, params)}
              />
            );
          }

          if (val === "") {
            return (
              <Typography
                variant="body2"
                sx={(theme) => ({
                  color: allTagged
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                  fontWeight: 500,
                })}
              >
                {val}
              </Typography>
            );
          }

          return (
            <Box
              //onMouseEnter={(e) => handleInfoOpen(e, params)}
              onClick={(e) => handleInfoOpen(e, params)}
              //onMouseLeave={handleCellInfoLeave}
            >
              <Typography
                variant="button"
                sx={(theme) => ({
                  color: allTagged
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                  fontWeight: 600,
                })}
              >
                {val}
              </Typography>
            </Box>
          );
        },
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
    <Paper
      variant="elevation"
      sx={(theme) => ({
        p: { xs: 1, sm: 2 },
        borderRadius: { xs: 1, sm: 2 },
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "0px 10px 15px rgba(15, 23, 42, 0.04)",
      })}
    >
      <Stack
        spacing={2}
        direction="row"
        alignItems="center"
        justifyContent="center"
        mb={2}
      >
        <Typography variant="h5">
          Затраченное время{" "}
          {appState.state.fetchByLogin ? "по задачам" : "по сотрудникам"}
        </Typography>
        {isEditable && (
          <AddDurationIssueDialog
            issues={appState.state.issues}
            setData={setData}
          />
        )}
      </Stack>
      <DataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        disableColumnMenu
        pageSizeOptions={[15]}
        onCellClick={(params, event) => {
          if (
            isEditable &&
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
        sx={{
          "& .no-hover:hover": { backgroundColor: "transparent !important" },
          "& .current-column-header": {
            backgroundColor: "rgba(200, 220, 255, 0.5)",
          },
          "& .current-column-cell": {
            backgroundColor: "rgba(200, 230, 255, 0.2)",
          },
          height: "81vh",
        }}
      />
      <SetTimeSpend
        key={`${menuState.issueId}-${menuState.field}-${menuState.dateField?.toISOString()}`}
        open={Boolean(menuState.anchorEl)}
        onClose={handleMenuClose}
        menuState={menuState}
        deleteData={deleteData}
        setData={setData}
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
    </Paper>
  );
};

export default TableTimeSpend;
