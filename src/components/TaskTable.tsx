import { DeleteDataArgs, SetDataArgs } from "@/actions/data";
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
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Chip, IconButton, Typography } from "@mui/material";
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
  AlertState,
  AppState,
  DayOfWeek,
  MenuState,
  TaskItem,
  TaskItemIssue,
  TransformedTaskRow,
} from "../types/global";
import TableCellMenu from "./TableCellMenu";
import TableCellInfoPopover from "./TableCellInfoPopover";

dayjs.locale("ru");
dayjs.extend(utc);

const createEmptyMenuState = (): MenuState => ({
  anchorEl: null,
  issue: null,
  field: null,
  issueId: null,
  durations: null,
  dateField: null,
});

export const durationComparator = (a: string, b: string): number =>
  parseISODurationToSeconds(a) - parseISODurationToSeconds(b);

interface TaskTableProps {
  data: TaskItem[];
  start: Dayjs; // первый день недели (понедельник)
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  token: string | null;
  setData: (args: SetDataArgs) => Promise<void>;
  deleteData: (args: DeleteDataArgs) => void;
  setAlert: React.Dispatch<React.SetStateAction<AlertState>>;
  isEditable: boolean;
}

const IssueDisplay: FC<{
  display: string;
  href?: string | null;
  fio: string | null;
}> = ({ display, href = null, fio = null }) => (
  <>
    <Typography variant="subtitle1" sx={{ position: "relative", left: -7 }}>
      {href && (
        <IconButton
          component="a"
          href={href}
          target="_blank"
          sx={(theme) => ({
            borderRadius: "50%",
            color: theme.palette.primary.light,
            "&:hover": {
              color: theme.palette.primary.main,
            },
          })}
        >
          <OpenInNewIcon />
        </IconButton>
      )}
      {display}
    </Typography>
    <Typography
      variant="subtitle2"
      color="text.secondary"
      sx={{ position: "relative", top: -5, left: 30 }}
    >
      {fio}
    </Typography>
  </>
);

interface RawTransformedRow {
  id: string;
  issue: TaskItemIssue;
  issueId: string;
  groupIssue: string;
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
  saturday: string[];
  sunday: string[];
  total: string;
}

const transformData = (data: TaskItem[]): TransformedTaskRow[] => {
  const grouped: Record<string, RawTransformedRow> = {} as Record<
    string,
    RawTransformedRow
  >;

  data.forEach((item: TaskItem) => {
    const dayName: DayOfWeek = dayOfWeekNameByDate(
      dayjs(item.start)
    ) as DayOfWeek;

    if (!grouped[item.key]) {
      grouped[item.key] = {
        id: item.key,
        issue: item.issue,
        issueId: item.issueId,
        groupIssue: item.groupIssue,
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
        total: "",
      };
    }

    (
      grouped[item.key][
        dayName as keyof Omit<
          RawTransformedRow,
          "id" | "issue" | "issueId" | "groupIssue" | "total"
        >
      ] as string[]
    ).push(item.duration);
  });

  return Object.values(grouped).map((rawRow) => {
    const monday = sumDurations(rawRow.monday);
    const tuesday = sumDurations(rawRow.tuesday);
    const wednesday = sumDurations(rawRow.wednesday);
    const thursday = sumDurations(rawRow.thursday);
    const friday = sumDurations(rawRow.friday);
    const saturday = sumDurations(rawRow.saturday);
    const sunday = sumDurations(rawRow.sunday);
    const combined = [
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
    ];

    return {
      id: rawRow.id,
      issue: rawRow.issue,
      issueId: rawRow.issueId,
      groupIssue: rawRow.groupIssue,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      total: displayDuration(sumDurations(combined)),
    } as unknown as TransformedTaskRow;
  });
};

const TaskTable: FC<TaskTableProps> = ({
  data,
  start,
  setState,
  token,
  setData,
  deleteData,
  setAlert,
  isEditable = false,
}) => {
  // --- 0) Выравниваем «шапку недели» под данные / выбранную неделю ---
  const viewStart = useMemo(() => {
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
  }, [start, data]);

  // --- 1) Берём только записи этой недели (важно для сумм/колонок) ---
  const dataForWeek = useMemo(() => {
    const s = viewStart;
    const e = viewStart.endOf("isoWeek");
    return data.filter((i) => {
      const d = toTarget(i.start);
      return d.isSameOrAfter(s) && d.isSameOrBefore(e);
    });
  }, [data, viewStart]);

  // --- 2) Проверка тегов для ячейки (внутри этой недели) ---
  const cellHasAllTags = useCallback(
    (rowId: string | number, field: string): boolean => {
      if (!dataForWeek) return true;

      const norm = (s: string) => s.replace(/[\u00A0\u202F]/g, " ");
      const BAD_TAG_RE =
        /\[\s*ProjectControlWT\s*:\s*Временно\s+не\s*определ[её]н\s*\]/i;

      const rawItems = dataForWeek.filter(
        (r) => r.key === rowId && dayOfWeekNameByDate(dayjs(r.start)) === field
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
    [dataForWeek]
  );

  // --- 3) Строим строки по отфильтрованным данным ---
  const tableRows = useMemo(() => transformData(dataForWeek), [dataForWeek]);

  // --- 4) Определяем «сегодняшний» столбец в рамках viewStart ---
  const todayKey: DayOfWeek | "" = useMemo(() => {
    const today = toTarget(dayjs()).startOf("day");
    for (const day of daysMap) {
      const dateOfThisDay = getDateOfWeekday(
        viewStart,
        dayToNumber(day)
      ).startOf("day");
      if (dateOfThisDay.isSame(today)) return day;
    }
    return "";
  }, [viewStart]);

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
        dataForWeek != null
          ? dataForWeek.find(
              (row) =>
                dayOfWeekNameByDate(dayjs(row.start)) === params.field &&
                row.key === params.id
            )?.durations
          : null;

      setMenuState({
        anchorEl: anchor,
        issue: params.row.issue.display,
        field: params.field as DayOfWeek,
        issueId: params.row.issueId,
        durations: foundRow ?? null,
        dateField: getDateOfWeekday(
          viewStart,
          dayToNumber(params.field as DayOfWeek)
        ),
      });
    },
    [dataForWeek, viewStart, setMenuState]
  );

  const handleMenuClose = useCallback(() => {
    setMenuState(createEmptyMenuState());
  }, [setMenuState]);

  const handleInfoOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, params: GridRenderCellParams) => {
      clearInfoCloseTimer();
      const anchor = event.currentTarget as HTMLElement;
      const foundRow =
        dataForWeek != null
          ? dataForWeek.find(
              (row) =>
                dayOfWeekNameByDate(dayjs(row.start)) === params.field &&
                row.key === params.id
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
        field: params.field as DayOfWeek,
        issueId: params.row.issueId,
        durations: foundRow,
        dateField: getDateOfWeekday(
          viewStart,
          dayToNumber(params.field as DayOfWeek)
        ),
      };

      setInfoState(nextState);
      setInfoOpen(true);
    },
    [
      dataForWeek,
      viewStart,
      closeInfo,
      setInfoState,
      setInfoOpen,
      clearInfoCloseTimer,
    ]
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
    [scheduleInfoClose]
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
    [infoState.anchorEl, scheduleInfoClose]
  );

  const handlePopoverMouseEnter = useCallback(() => {
    clearInfoCloseTimer();
  }, [clearInfoCloseTimer]);

  useEffect(() => {
    return () => {
      clearInfoCloseTimer();
    };
  }, [clearInfoCloseTimer]);

  // --- 6) Сохранение времени в выбранный день текущей (viewStart) недели ---
  const handleCellEdit = useCallback(
    (field: DayOfWeek, newValue: string, issueId: string) => {
      const normalizedValue = normalizeDuration(newValue);
      if (
        normalizedValue.trim() === "" ||
        normalizedValue === "P" ||
        token == null
      ) {
        return false;
      }
      if (!isValidDuration(normalizedValue)) {
        setAlert({
          open: true,
          severity: "error",
          message: `Значение "${newValue}" не является корректным форматом времени.`,
        });
        return false;
      }
      try {
        const dateCell = getDateOfWeekday(viewStart, dayToNumber(field)); // ⬅️ viewStart
        setData({
          dateCell,
          setState,
          setAlert,
          token,
          issueId,
          duration: normalizedValue,
        });
        return true;
      } catch (err: any) {
        console.error("handleCellEdit error:", err.message);
        setAlert({ open: true, severity: "error", message: err.message });
        return false;
      }
    },
    [viewStart, setData, setState, setAlert, token]
  );

  // --- 7) Колонки (шапка дат строится от viewStart) ---
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

    ...daysMap.map((day) => {
      const header = `${headerWeekName[day]} ${getDateOfWeekday(
        viewStart,
        dayToNumber(day)
      ).format("DD.MM")}`;

      return {
        field: day,
        headerName: header,
        flex: 1,
        editable: false,
        sortable: true,
        sortComparator: (v1: string, v2: string, params1, params2) => {
          if (params1.id === "total") return 1;
          if (params2.id === "total") return -1;
          return durationComparator(v1, v2);
        },
        headerClassName: day === todayKey ? "current-column-header" : "",
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
      daysMap.forEach((field) => {
        totals[field] = displayDuration(
          sumDurations(rows.map((row) => (row as any)[field] as string))
        );
        totalsVals[field] = sumDurations(
          rows.map((row) => (row as any)[field] as string)
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
    []
  );

  const totalRow = useMemo(
    () => calculateTotalRow(tableRows),
    [tableRows, calculateTotalRow]
  );

  const isEmptyDurationValue = (value: unknown): boolean => {
    if (value == null) return true;
    if (typeof value !== "string") return false;
    return value === "P" || value === "PT0M" || value.trim() === "";
  };

  return (
    <>
      <DataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        disableColumnMenu
        pageSizeOptions={[15]}
        onCellClick={(params, event) => {
          if (
            isEditable &&
            params.row.id !== "total" &&
            daysMap.includes(params.field as DayOfWeek) &&
            isEmptyDurationValue(params.value) &&
            (event as React.MouseEvent).detail === 1
          ) {
            handleMenuOpen(
              event as React.MouseEvent<HTMLElement>,
              params as GridRenderCellParams
            );
          }
        }}
        processRowUpdate={(updatedRow, originalRow) =>
          handleCellEdit(
            Object.keys(updatedRow).find(
              (key) => (updatedRow as any)[key] !== (originalRow as any)[key]
            ) as DayOfWeek,
            updatedRow[
              Object.keys(updatedRow).find(
                (key) => (updatedRow as any)[key] !== (originalRow as any)[key]
              ) as DayOfWeek
            ],
            updatedRow.issueId
          )
            ? updatedRow
            : originalRow
        }
        getRowClassName={(params) => (params.id === "total" ? "no-hover" : "")}
        sx={{
          "& .no-hover:hover": { backgroundColor: "transparent !important" },
          "& .current-column-header": {
            backgroundColor: "rgba(200, 220, 255, 0.5)",
          },
          "& .current-column-cell": {
            backgroundColor: "rgba(200, 230, 255, 0.2)",
          },
        }}
      />
      <TableCellMenu
        key={`${menuState.issueId}-${menuState.field}-${menuState.dateField?.toISOString()}`}
        open={Boolean(menuState.anchorEl)}
        onClose={handleMenuClose}
        menuState={menuState}
        deleteData={deleteData}
        token={token}
        setData={setData}
        setState={setState}
        setAlert={setAlert}
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

export default TaskTable;
