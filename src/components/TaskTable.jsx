import { Chip, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useCallback, useMemo, useState } from "react";

import {
  dayOfWeekNameByDate,
  daysMap,
  dayToNumber,
  displayDuration,
  getDateOfCurrentWeekday,
  getDateOfWeekday,
  isValidDuration,
  normalizeDuration,
  sumDurations,
} from "@/helpers";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"; // ✅ добавляем utc
import DurationAlert from "./DurationAlert";
import TableCellMenu from "./TableCellMenu";

dayjs.locale("ru");
dayjs.extend(utc); // ✅ расширяем

const IssueDisplay = ({ display, href = null, fio = null }) => (
  <>
    <Typography variant="subtitle1">
      {href && (
        <IconButton component="a" href={href} target="_blank">
          <OpenInNewIcon />
        </IconButton>
      )}
      {display}
    </Typography>
    <Typography variant="subtitle2">{fio}</Typography>
  </>
);

const headerWeekName = {
  monday: "Пн",
  tuesday: "Вт",
  wednesday: "Ср",
  thursday: "Чт",
  friday: "Пт",
  saturday: "Сб",
  sunday: "Вс",
};

const transformData = (data) => {
  const result = {};

  data.forEach((item) => {
    const dayOfWeekName = dayOfWeekNameByDate(item.start);
    if (!result[item.key]) {
      result[item.key] = {
        id: item.key,
        issue: {
          display: item.issue,
          //href: item.href,
          fio: item.updatedBy,
        },
        issueId: item.issueId,
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
    }

    result[item.key][dayOfWeekName].push(item.duration);
  });

  return Object.values(result).map((item) => {
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

const TaskTable = ({ data, start, setState, token, setData, deleteData }) => {
  console.log("data", data);

  const [alert, setAlert] = useState({
    open: false,
    severity: "",
    message: "",
  });
  const handleCloseAlert = () => {
    setAlert({
      open: false,
      severity: "",
      message: "",
    });
  };

  const tableRows = transformData(data);

  const [menuState, setMenuState] = useState({
    anchorEl: null,
    issue: null,
    field: null,
    issueId: null,
    durations: null,
    dateField: null,
  });

  const handleMenuOpen = (event, params) => {
    console.log("handleMenuOpen params", params);

    setMenuState({
      anchorEl: event.currentTarget,
      issue: params.row.issue.display,
      field: params.field,
      issueId: params.row.issueId,
      durations: data.find(
        (row) =>
          dayOfWeekNameByDate(row.start) === params.field &&
          row.key === params.id
      ).durations,
      dateField: getDateOfWeekday(start, dayToNumber(params.field)),
    });
  };

  const handleMenuClose = () =>
    setMenuState({
      anchorEl: null,
      issue: null,
      field: null,
      issueId: null,
      durations: null,
      dateField: null,
    });

  const calculateTotalRow = useCallback((rows) => {
    const fields = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    const totals = {};
    const totalsVals = {};
    fields.forEach((field) => {
      totals[field] = displayDuration(
        sumDurations(rows.map((row) => row[field]))
      );
      totalsVals[field] = sumDurations(rows.map((row) => row[field]));
    });

    totals.total = displayDuration(sumDurations(Object.values(totalsVals)));

    return {
      id: "total",
      issue: { display: "Итого" },
      issueId: "",
      ...totals,
    };
  }, []);

  const totalRow = useMemo(
    () => calculateTotalRow(tableRows),
    [tableRows, calculateTotalRow]
  );

  const handleCellEdit = useCallback((field, newValue, issueId) => {
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
    } catch (err) {
      console.log("ERROR ", err.message);

      setAlert({ open: true, severity: "error", message: err.message });
      return false;
    }
  }, []);

  const columns = [
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
    { field: "issueId", headerName: "Issue Id", flex: 1.5 },
    ...daysMap.map((day) => ({
      field: day,
      headerName: `${headerWeekName[day]} ${getDateOfWeekday(start, dayToNumber(day)).format("DD.MM")}`,
      flex: 1,
      editable: true,
      sortable: false,
      renderCell: (params) => {
        const val = displayDuration(params.value);
        if (params.row.id === "total" || val === "") return val;
        return (
          <Chip
            label={val}
            component="a"
            href="#basic-chip"
            variant="outlined"
            clickable
            color="warning"
            onClick={(e) => handleMenuOpen(e, params)}
          />
        );
      },
      renderEditCell: (params) => (
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
          onBlur={(e) => {
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: e.target.value,
            });
            params.api.stopCellEditMode({ id: params.id, field: params.field });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: e.target.value,
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
        severity={alert.severity}
        onClose={handleCloseAlert}
      />
      <DataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        disableColumnMenu
        pageSizeOptions={[15]}
        isCellEditable={(params) => {
          //console.log("isCellEditable params", params);
          return params.value === "P";
        }}
        processRowUpdate={(updatedRow, originalRow) =>
          handleCellEdit(
            Object.keys(updatedRow).find(
              (key) => updatedRow[key] !== originalRow[key]
            ),
            updatedRow[
              Object.keys(updatedRow).find(
                (key) => updatedRow[key] !== originalRow[key]
              )
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
