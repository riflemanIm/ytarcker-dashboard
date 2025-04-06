import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { AlertColor, Chip, IconButton, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import React, { FC, useCallback, useMemo, useState } from "react";
import {
  AlertState,
  MenuState,
  TaskItem,
  TransformedTaskRow,
} from "../types/global";
import DurationAlert from "./DurationAlert";
import TableCellMenu from "./TableCellMenu";

import { SetDataArgs } from "@/actions/data";
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

dayjs.locale("ru");
dayjs.extend(utc);

interface TaskTableProps {
  data: TaskItem[];
  start: Dayjs;
  setState: (arg: any) => void;
  token: string | null;
  setData: (args: SetDataArgs) => Promise<void>;

  deleteData: (args: {
    token: string | null;
    setState: (arg: any) => void;
    setAlert: (arg: AlertState) => void;
    issueId: string | null;
    ids: string[];
  }) => void;
}

//
// Отображение задачи с кнопкой перехода (если есть ссылка) и информацией по ФИО
//
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

//
// Преобразование исходных данных в структуру, удобную для отображения в таблице
//
const transformData = (data: TaskItem[]): TransformedTaskRow[] => {
  const result: Record<string, any> = {};

  data.forEach((item: TaskItem) => {
    const dayName = dayOfWeekNameByDate(dayjs(item.start));
    if (!result[item.key]) {
      result[item.key] = {
        id: item.key,
        issue: {
          display: item.issue,
          href: item.href,
          fio: item.updatedBy,
        },
        issueId: item.issueId,
        monday: [] as string[],
        tuesday: [] as string[],
        wednesday: [] as string[],
        thursday: [] as string[],
        friday: [] as string[],
        saturday: [] as string[],
        sunday: [] as string[],
      };
    }
    result[item.key][dayName].push(item.duration);
  });

  return Object.values(result).map((item: any) => {
    const totalDurations = [
      ...item.monday,
      ...item.tuesday,
      ...item.wednesday,
      ...item.thursday,
      ...item.friday,
      ...item.saturday,
      ...item.sunday,
    ];
    return {
      ...item,
      monday: sumDurations(item.monday),
      tuesday: sumDurations(item.tuesday),
      wednesday: sumDurations(item.wednesday),
      thursday: sumDurations(item.thursday),
      friday: sumDurations(item.friday),
      saturday: sumDurations(item.saturday),
      sunday: sumDurations(item.sunday),
      total: displayDuration(sumDurations(totalDurations)),
    };
  });
};

//
// Основной компонент TaskTable
//
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
    setAlert({
      open: false,
      severity: "",
      message: "",
    });
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

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent, params: any) => {
      const foundRow =
        data != null
          ? data.find(
              (row) =>
                dayOfWeekNameByDate(dayjs(row.start)) === params.field &&
                row.key === params.id
            )?.durations
          : null;
      console.log("foundRow", foundRow);
      setMenuState({
        anchorEl: event.currentTarget as HTMLElement,
        issue: params.row.issue.display,
        field: params.field,
        issueId: params.row.issueId,
        durations: foundRow ?? null,
        dateField: getDateOfWeekday(start, dayToNumber(params.field)),
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
      const fields: (keyof TransformedTaskRow)[] = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const totals: Record<string, string> = {};
      const totalsVals: Record<string, string> = {};
      fields.forEach((field) => {
        totals[field] = displayDuration(
          sumDurations(rows.map((row) => row[field] as string))
        );
        totalsVals[field] = sumDurations(
          rows.map((row) => row[field] as string)
        );
      });
      totals.total = displayDuration(sumDurations(Object.values(totalsVals)));
      return {
        id: "total",
        issue: { display: "Итого" },
        issueId: "",
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
    (field: string, newValue: string, issueId: string) => {
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
    []
  );

  const columns: GridColDef[] = [
    {
      field: "issue",
      headerName: "Название",
      flex: 4,
      sortable: false,
      renderCell: (params) =>
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
    { field: "issueId", headerName: "Key", flex: 1.5 },
    ...daysMap.map((day) => ({
      field: day,
      headerName: `${headerWeekName[day as keyof typeof headerWeekName]} ${getDateOfWeekday(start, dayToNumber(day)).format("DD.MM")}`,
      flex: 1,
      editable: true,
      sortable: false,
      renderCell: (params: any) => {
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
      renderEditCell: (params: any) => (
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
    { field: "total", headerName: "Итого", flex: 1.5 },
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
            ) as string,
            updatedRow[
              Object.keys(updatedRow).find(
                (key) => updatedRow[key] !== originalRow[key]
              ) as string
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
