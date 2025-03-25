import React, { useMemo, useCallback, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Grid2 as Grid, IconButton, Typography, Alert } from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
dayjs.extend(duration);
dayjs.locale("ru");

const IssueDisplay = ({ display, href }) => (
  <Typography variant="body2" display="flex" alignItems="center">
    <IconButton component="a" href={href} target="_blank">
      <OpenInNewIcon />
    </IconButton>
    {display}
  </Typography>
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
  const iso8601DurationRegex = /^P(?=.+)(\d+D)?(T(?=\d+[HM])(\d+H)?(\d+M)?)?$/;
  return iso8601DurationRegex.test(duration);
};

const transformData = (data) => {
  const result = {};

  data.forEach((item) => {
    const dayOfWeek = dayjs(item.updatedAt).day();
    if (!result[item.key]) {
      result[item.key] = {
        id: item.key,
        issue: { display: item.issue, href: `#${item.key}` },
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

const TaskTable = ({ data }) => {
  const [alert, setAlert] = useState(null);

  const rows = useMemo(() => transformData(data), [data]);

  const totalRow = useMemo(() => {
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
      issue: { display: "Итого", href: "#" },
      key: "",
      ...totals,
    };
  }, [rows]);

  const renderWeekCell = (params) => {
    const val = params.value === "P" ? "+" : params.value.replace(/P|T/g, "");
    return val;
  };

  const handleCellEdit = useCallback((rowId, field, newValue) => {
    if (!isValidDuration(newValue)) {
      setAlert(
        `Значение "${newValue}" не является корректным форматом времени.`
      );
    } else {
      setAlert(null);
      console.log(
        `Edited row ${rowId}, field ${field}, new value: ${newValue}`
      );
    }
  }, []);

  return (
    <Grid>
      {alert && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {alert}
        </Alert>
      )}
      <DataGrid
        rows={[...rows, totalRow]}
        columns={[
          {
            field: "issue",
            headerName: "Название",
            flex: 4,
            renderCell: (params) =>
              params.row.id !== "total" ? (
                <IssueDisplay
                  display={params.value.display}
                  href={params.value.href}
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
            headerName: day[0].toUpperCase() + day.slice(1, 2),
            flex: 1,
            editable: true,
            renderCell: renderWeekCell,
          })),
          { field: "total", headerName: "Итого", flex: 1.5 },
        ]}
        pageSizeOptions={[5]}
        isCellEditable={(params) => params.row.id !== "total"}
        processRowUpdate={(updatedRow, originalRow) => {
          Object.keys(updatedRow).forEach((field) => {
            if (updatedRow[field] !== originalRow[field] && field !== "id") {
              handleCellEdit(updatedRow.id, field, updatedRow[field]);
            }
          });
          return updatedRow;
        }}
      />
    </Grid>
  );
};

export default TaskTable;
