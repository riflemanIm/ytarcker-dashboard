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
  sumDurations,
} from "@/helpers";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { AlertColor, Chip, IconButton, Typography } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridSortModel,
  gridStringOrNumberComparator,
} from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertState,
  AppState,
  DayOfWeek,
  MenuState,
  TaskItem,
  TaskItemIssue,
  TransformedTaskRow,
} from "../types/global";
import DurationAlert from "./DurationAlert";
import TableCellMenu from "./TableCellMenu";

dayjs.locale("ru");
dayjs.extend(utc);

interface TaskTableProps {
  data: TaskItem[];
  start: Dayjs; // первый день недели (понедельник)
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  token: string | null;
  setData: (args: SetDataArgs) => Promise<void>;
  deleteData: (args: DeleteDataArgs) => void;
}

// Компонент для отображения задачи (с переходом по ссылке, если она есть)
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

// Промежуточный тип для группировки, где для каждого дня хранится массив строк (длительностей)
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
    // Добавляем длительность в массив для нужного дня
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
}) => {
  // Состояние для показа ошибок при вводе времени
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    severity: "",
    message: "",
  });
  const handleCloseAlert = useCallback(() => {
    setAlert({ open: false, severity: "", message: "" });
  }, []);

  // Трансформируем «сырые» задачи в строки для DataGrid
  const tableRows = transformData(data);

  // --- Шаг 1: Вычисляем, какой ключ (monday/tuesday/…) соответствует сегодняшней дате ---
  // todayKey будет, например, "tuesday" если сегодня вторник в пределах недели start..start+6дн
  const todayKey: DayOfWeek | "" = useMemo(() => {
    const today = dayjs().startOf("day");
    // Перебираем весь daysMap (массив: ["monday","tuesday",…])
    for (const day of daysMap) {
      // получаем дату этого «day» (DAY_OF_WEEK) в рамках недели start..start+6
      const dateOfThisDay = getDateOfWeekday(start, dayToNumber(day)).startOf(
        "day"
      );
      if (dateOfThisDay.isSame(today)) {
        return day;
      }
    }
    return "";
  }, [start]);

  // Менеджер контекстного меню ячеек (при клике на Chip с длительностью)
  const [menuState, setMenuState] = useState<MenuState>({
    anchorEl: null,
    issue: null,
    field: null,
    issueId: null,
    durations: null,
    dateField: null,
  });

  // Используем GridRenderCellParams вместо any для handleMenuOpen
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, params: GridRenderCellParams) => {
      const foundRow =
        data != null
          ? data.find(
              (row) =>
                dayOfWeekNameByDate(dayjs(row.start)) === params.field &&
                row.key === params.id
            )?.durations
          : null;

      setMenuState({
        anchorEl: event.currentTarget,
        issue: params.row.issue.display,
        field: params.field as DayOfWeek,
        issueId: params.row.issueId,
        durations: foundRow ?? null,
        dateField: getDateOfWeekday(
          start,
          dayToNumber(params.field as DayOfWeek)
        ),
      });
    },
    [data, start]
  );
  const handleMenuClose = useCallback(() => {
    setMenuState({
      anchorEl: null,
      issue: null,
      field: null,
      issueId: null,
      durations: null,
      dateField: null,
    });
  }, []);

  // Обработка редактирования «сырых» значений времени: нормализация, валидация, вызов setData
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
        const dateCell = getDateOfWeekday(start, dayToNumber(field));
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
        console.log("ERROR ", err.message);
        setAlert({ open: true, severity: "error", message: err.message });
        return false;
      }
    },
    [start, setData, setState, setAlert, token]
  );

  // --- Шаг 2: формируем колонки, подключая классы для «текущего» столбца ---
  const columns: GridColDef[] = [
    {
      field: "issue",
      headerName: "Название",
      flex: 4,
      sortable: true,

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
    {
      field: "issueId",
      headerName: "Key",
      flex: 1.5,
      sortable: true,
    },
    {
      field: "groupIssue",
      headerName: "Группа",
      flex: 1.5,
      sortable: true,
    },
    // Динамически создаём по одному столбцу на каждый день недели
    ...daysMap.map((day) => {
      // Вычисляем форматированный заголовок (например, "Вт 03.06")
      const header = `${headerWeekName[day]} ${getDateOfWeekday(
        start,
        dayToNumber(day)
      ).format("DD.MM")}`;

      return {
        field: day,
        headerName: header,
        flex: 1,
        editable: false,
        sortable: true,
        // кастомный компаратор — проталкивает row.id="total" вниз
        sortComparator: (v1: string, v2: string, params1, params2) => {
          if (params1.id === "total") return 1; // total всегда «больше»
          if (params2.id === "total") return -1; // total всегда «больше»
          // иначе — стандартное сравнение строк/чисел
          return gridStringOrNumberComparator(v1, v2, params1, params2);
        },

        // Здесь добавляем классы, если day === todayKey
        headerClassName: day === todayKey ? "current-column-header" : "",
        cellClassName: (params: GridRenderCellParams) =>
          params.field === todayKey ? "current-column-cell" : "",
        renderCell: (params: GridRenderCellParams) => {
          const val = displayDuration(params.value);
          if (params.row.id === "total") return val;
          if (val === "") {
            // Если ячейка пустая, показываем иконку добавления
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
          return (
            <Chip
              label={val}
              variant="outlined"
              clickable
              color="warning"
              onClick={(e) => handleMenuOpen(e, params)}
            />
          );
        },
        // renderEditCell: (params: GridRenderEditCellParams) => (
        //   <input
        //     type="text"
        //     autoFocus
        //     style={{
        //       border: "none",
        //       outline: "none",
        //       width: "100%",
        //       height: "100%",
        //       fontSize: "inherit",
        //       fontFamily: "inherit",
        //       padding: "0 8px",
        //       boxSizing: "border-box",
        //     }}
        //     defaultValue=""
        //     onBlur={(e: React.FocusEvent<HTMLInputElement, Element>) => {
        //       params.api.setEditCellValue({
        //         id: params.id,
        //         field: params.field,
        //         value: (e.target as HTMLInputElement).value,
        //       });
        //       params.api.stopCellEditMode({
        //         id: params.id,
        //         field: params.field,
        //       });
        //     }}
        //     onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        //       if (e.key === "Enter") {
        //         params.api.setEditCellValue({
        //           id: params.id,
        //           field: params.field,
        //           value: (e.target as HTMLInputElement).value,
        //         });
        //         params.api.stopCellEditMode({
        //           id: params.id,
        //           field: params.field,
        //         });
        //       } else if (e.key === "Escape") {
        //         params.api.stopCellEditMode({
        //           id: params.id,
        //           field: params.field,
        //           ignoreModifications: true,
        //         });
        //       }
        //     }}
        //   />
        // ),
      } as GridColDef;
    }),
    {
      field: "total",
      headerName: "Итого",
      sortable: true,
      flex: 1.5,
    },
  ];

  // --- Шаг 3: вычисляем строку «Итого» по всем задачам ---
  const calculateTotalRow = useCallback(
    (rows: TransformedTaskRow[]): TransformedTaskRow => {
      const totals: Record<string, string> = {};
      const totalsVals: Record<string, string> = {};
      daysMap.forEach((field) => {
        totals[field] = displayDuration(
          sumDurations(
            rows.map((row) => (row as unknown as Record<string, string>)[field])
          )
        );
        totalsVals[field] = sumDurations(
          rows.map((row) => (row as unknown as Record<string, string>)[field])
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

  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [displayRows, setDisplayRows] = useState<TransformedTaskRow[]>([]);

  // Вычисляем totalRow и tableRows как раньше…

  useEffect(() => {
    const dataRows = [...tableRows];
    if (sortModel.length > 0) {
      const { field, sort } = sortModel[0];
      dataRows.sort((a, b) => {
        if (a.id === "total") return 1;
        if (b.id === "total") return -1;
        const vA = (a as any)[field];
        const vB = (b as any)[field];
        const cmp = gridStringOrNumberComparator(
          vA,
          vB,
          { id: a.id, field, row: a } as any,
          { id: b.id, field, row: b } as any
        );
        return sort === "asc" ? cmp : -cmp;
      });
    }
    setDisplayRows([...dataRows, totalRow]);
  }, [tableRows, totalRow, sortModel]);

  return (
    <>
      <DurationAlert
        open={alert.open}
        message={alert.message}
        severity={alert.severity as AlertColor | undefined}
        onClose={handleCloseAlert}
      />
      <DataGrid
        rows={displayRows}
        columns={columns}
        disableColumnMenu
        pageSizeOptions={[15]}
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={(newModel) => setSortModel(newModel)}
        // Перехват single-click по пустой ячейке-«дню»
        onCellClick={(
          params,
          event // MuiEvent<React.MouseEvent>
        ) => {
          // проверяем, что это одинарный клик по одному из столбцов дней
          if (
            daysMap.includes(params.field as DayOfWeek) &&
            params.value === "P" &&
            (event as React.MouseEvent).detail === 1
          ) {
            // открываем ваше меню точно так же, как по кнопке AddIcon
            handleMenuOpen(
              event as React.MouseEvent<HTMLElement>,
              params as GridRenderCellParams
            );
          }
        }}
        // Разрешаем редактировать ячейку, только если там «P» (плейсхолдер пустого значения)

        //isCellEditable={(params) => params.value === "P"}
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
          // Обычные стили для «no-hover»-строки
          "& .no-hover:hover": { backgroundColor: "transparent !important" },

          // --- Стили для подсветки «текущего» столбца ---
          "& .current-column-header": {
            backgroundColor: "rgba(200, 220, 255, 0.5)",
          },
          "& .current-column-cell": {
            backgroundColor: "rgba(200, 230, 255, 0.2)",
          },
        }}
      />
      <TableCellMenu
        open={Boolean(menuState.anchorEl)}
        onClose={handleMenuClose}
        menuState={menuState}
        deleteData={deleteData}
        token={token}
        setData={setData}
        setState={setState}
        setAlert={setAlert}
      />
    </>
  );
};

export default TaskTable;
