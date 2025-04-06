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
  GridRenderEditCellParams,
} from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import React, { FC, useCallback, useMemo, useState } from "react";
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
  start: Dayjs;
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
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    severity: "",
    message: "",
  });

  const handleCloseAlert = useCallback(() => {
    setAlert({ open: false, severity: "", message: "" });
  }, []);

  const tableRows = transformData(data);

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
    {
      field: "issueId",
      headerName: "Key",
      flex: 1.5,
    },
    {
      field: "groupIssue",
      headerName: "Группа",

      flex: 1.5,
    },

    ...daysMap.map((day) => ({
      field: day,
      headerName: `${headerWeekName[day]} ${getDateOfWeekday(start, dayToNumber(day)).format("DD.MM")}`,
      flex: 1,
      editable: true,
      sortable: false,
      //sortComparator: timeSortComparator,
      renderCell: (params: GridRenderCellParams) => {
        const val = displayDuration(params.value);
        if (params.row.id === "total") return val;
        if (val === "") {
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
                (e.currentTarget.firstChild as HTMLElement).style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.firstChild as HTMLElement).style.opacity = "0";
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
      renderEditCell: (params: GridRenderEditCellParams) => (
        <input
          type="text"
          autoFocus
          style={{
            border: "none",
            outline: "none",
            width: "100%",
            height: "100%",
            fontSize: "inherit",
            fontFamily: "inherit",
            padding: "0 8px",
            boxSizing: "border-box",
          }}
          defaultValue=""
          onBlur={(e: React.FocusEvent<HTMLInputElement, Element>) => {
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: (e.target as HTMLInputElement).value,
            });
            params.api.stopCellEditMode({ id: params.id, field: params.field });
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: (e.target as HTMLInputElement).value,
              });
              params.api.stopCellEditMode({
                id: params.id,
                field: params.field,
              });
            } else if (e.key === "Escape") {
              params.api.stopCellEditMode({
                id: params.id,
                field: params.field,
                ignoreModifications: true,
              });
            }
          }}
        />
      ),
    })),
    {
      field: "total",
      headerName: "Итого",
      sortable: false,
      //sortComparator: timeSortComparator,
      flex: 1.5,
    },
  ];

  return (
    <>
      <DurationAlert
        open={alert.open}
        message={alert.message}
        severity={alert.severity as AlertColor | undefined}
        onClose={handleCloseAlert}
      />
      <DataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        disableColumnMenu
        pageSizeOptions={[15]}
        isCellEditable={(params) => params.value === "P"}
        processRowUpdate={(updatedRow, originalRow) =>
          handleCellEdit(
            Object.keys(updatedRow).find(
              (key) => updatedRow[key] !== originalRow[key]
            ) as DayOfWeek,
            updatedRow[
              Object.keys(updatedRow).find(
                (key) => updatedRow[key] !== originalRow[key]
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
