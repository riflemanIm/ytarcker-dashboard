import React, { useMemo, useCallback, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Grid2 as Grid, IconButton, Typography } from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DurationAlert from "./DurationAlert";
dayjs.extend(duration);
dayjs.locale("ru");

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
    {fio && <Typography variant="subtitle2">{fio}</Typography>}
  </>
);

const sumDurations = (durations) => {
  let totalMinutes = durations.reduce(
    (total, dur) => total + dayjs.duration(dur).asMinutes(),
    0
  );

  const days = Math.floor(totalMinutes / 1440);
  totalMinutes %= 1440;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let result = "P";
  if (days > 0) result += `${days}D`;
  if (hours > 0 || minutes > 0) {
    result += "T";
    if (hours > 0) result += `${hours}H`;
    if (minutes > 0) result += `${minutes}M`;
  }

  return result;
};

const isValidDuration = (duration) => {
  const iso8601DurationRegex =
    /^P(?=\d|T\d)(\d+D)?(T(?=\d+[HM])(\d+H)?(\d+M)?)?$/i;
  return iso8601DurationRegex.test(duration);
};

const normalizeDuration = (input) => {
  if (isValidDuration(input)) return input;

  const regex = /^(?:(\d+)[dD])?(?:(\d+)[hH])?(?:(\d+)[mM])?$/;
  const match = input.trim().match(regex);

  if (!match || (!match[1] && !match[2] && !match[3])) {
    return input; // невалидный формат, возвращаем исходное значение
  }

  const [, days, hours, minutes] = match;

  let result = "P";
  if (days) result += `${parseInt(days, 10)}D`;
  if (hours || minutes) result += "T";
  if (hours) result += `${parseInt(hours, 10)}H`;
  if (minutes) result += `${parseInt(minutes, 10)}M`;

  return result;
};

const transformData = (data, userId) => {
  const result = {};

  data.forEach((item) => {
    const dayOfWeek = dayjs(item.updatedAt).day();
    if (!result[item.key]) {
      result[item.key] = {
        id: item.key,
        issue: {
          display: item.issue,
          //href: item.href,
          fio: !userId ? item.updatedBy : null,
        },
        key: item.key,
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
    }

    const daysMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    result[item.key][daysMap[dayOfWeek]].push(item.duration);
  });

  return Object.values(result).map((item) => ({
    ...item,
    monday: sumDurations(item.monday),
    tuesday: sumDurations(item.tuesday),
    wednesday: sumDurations(item.wednesday),
    thursday: sumDurations(item.thursday),
    friday: sumDurations(item.friday),
    saturday: sumDurations(item.saturday),
    sunday: sumDurations(item.sunday),
    total: sumDurations(
      [
        item.monday,
        item.tuesday,
        item.wednesday,
        item.thursday,
        item.friday,
        item.saturday,
        item.sunday,
      ].flat()
    ).replace(/P|T/g, ""),
  }));
};

const TaskTable = ({ data, userId }) => {
  const [alert, setAlert] = useState(null);
  const handleCloseAlert = () => setAlert(null);
  const [tableRows, setTableRows] = useState(() => transformData(data, userId));

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
      totals[field] = sumDurations(rows.map((row) => row[field])).replace(
        /P|T/g,
        ""
      );
      totalsVals[field] = sumDurations(rows.map((row) => row[field]));
    });

    totals.total = sumDurations(Object.values(totalsVals)).replace(/P|T/g, "");

    return {
      id: "total",
      issue: { display: "Итого" },
      key: "",
      ...totals,
    };
  }, []);

  const totalRow = useMemo(
    () => calculateTotalRow(tableRows),
    [tableRows, calculateTotalRow]
  );

  const renderWeekCell = (params) => {
    const val = params.value === "P" ? "+" : params.value.replace(/P|T/g, "");
    return val;
  };

  const handleCellEdit = useCallback((rowId, field, newValue) => {
    const normalizedValue = normalizeDuration(newValue);

    if (!isValidDuration(normalizedValue)) {
      setAlert(
        `Значение "${newValue}" не является корректным форматом времени.`
      );
      return false;
    }

    setAlert(null);
    setTableRows((prevRows) => {
      const updatedRows = prevRows.map((row) =>
        row.id === rowId ? { ...row, [field]: normalizedValue } : row
      );
      return updatedRows;
    });

    return true;
  }, []);

  const headerWeekName = {
    monday: "Пн",
    tuesday: "Вт",
    wednesday: "Ср",
    thursday: "Чт",
    friday: "Пт",
    saturday: "Сб",
    sunday: "Вс",
  };

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
    { field: "key", headerName: "Key", flex: 1.5 },
    ...[
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((day) => ({
      field: day,
      //headerName: day[0].toUpperCase() + day.slice(1, 2),
      headerName: headerWeekName[day],
      flex: 1,
      editable: true,
      sortable: false,
      renderCell: renderWeekCell,
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
    <Grid>
      <DurationAlert
        open={!!alert}
        message={alert}
        onClose={handleCloseAlert}
      />
      <DataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        disableColumnMenu
        pageSizeOptions={[5]}
        isCellEditable={(params) => params.row.id !== "total"}
        onCellEditStart={(params, event) => {
          const input = event.currentTarget.querySelector("input");
          console.log("event.currentTarget", event.currentTarget);
          if (input) input.value = "sss";
        }}
        processRowUpdate={(updatedRow, originalRow) =>
          handleCellEdit(
            updatedRow.id,
            Object.keys(updatedRow).find(
              (key) => updatedRow[key] !== originalRow[key]
            ),
            updatedRow[
              Object.keys(updatedRow).find(
                (key) => updatedRow[key] !== originalRow[key]
              )
            ]
          )
            ? updatedRow
            : originalRow
        }
        getRowClassName={(params) => (params.id === "total" ? "no-hover" : "")}
        sx={{
          "& .no-hover:hover": { backgroundColor: "transparent !important" },
        }}
      />
    </Grid>
  );
};

export default TaskTable;
