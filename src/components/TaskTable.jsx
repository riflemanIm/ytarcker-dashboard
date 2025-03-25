import React, { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Grid2 as Grid, IconButton, Typography } from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { sumDurations } from "@/helpers";
dayjs.extend(duration);
dayjs.locale("ru");

const IssueDisplay = ({ display, href }) => (
  <>
    <Typography variant="body2">
      <IconButton content="a" href={href} target="_blank">
        <OpenInNewIcon />
      </IconButton>
      {display}
    </Typography>
  </>
);

// const sumDurations = (durations) => {
//   let totalMinutes = durations.reduce((total, dur) => {
//     const parsed = dayjs.duration(dur).asMinutes();
//     return total + parsed;
//   }, 0);

//   const days = Math.floor(totalMinutes / 1440);
//   totalMinutes %= 1440;

//   const hours = Math.floor(totalMinutes / 60);
//   const minutes = totalMinutes % 60;

//   let result = "P";
//   if (days > 0) result += `${days}D`;
//   if (hours > 0 || minutes > 0) {
//     result += "T";
//     if (hours > 0) result += `${hours}H`;
//     if (minutes > 0) result += `${minutes}M`;
//   }

//   return result;
// };

const transformData = (data) => {
  const result = {};

  data.forEach((item) => {
    const dayOfWeek = dayjs(item.updatedAt).day();
    if (!result[item.key]) {
      result[item.key] = {
        id: item.key,
        issue: item.issue,
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
    ),
  }));
};

const TaskTable = ({ data }) => {
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
    fields.forEach((field) => {
      totals[field] = sumDurations(rows.map((row) => row[field]));
    });

    totals.total = sumDurations(Object.values(totals));

    return { id: "total", issue: "Итого", key: "", ...totals };
  }, [rows]);

  return (
    <Grid>
      <DataGrid
        rows={[...rows, totalRow]}
        columns={[
          { field: "issue", headerName: "Название", flex: 4 },
          { field: "key", headerName: "Key", flex: 1.5 },
          { field: "monday", headerName: "Пн", flex: 1 },
          { field: "tuesday", headerName: "Вт", flex: 1 },
          { field: "wednesday", headerName: "Ср", flex: 1 },
          { field: "thursday", headerName: "Чт", flex: 1 },
          { field: "friday", headerName: "Пт", flex: 1 },
          { field: "saturday", headerName: "Сб", flex: 1 },
          { field: "sunday", headerName: "Вс", flex: 1 },
          { field: "total", headerName: "Итого", flex: 1.5 },
        ]}
        pageSizeOptions={[5]}
      />
    </Grid>
  );
};

export default TaskTable;
