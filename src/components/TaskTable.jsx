import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Grid2 as Grid, IconButton, Typography } from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/ru"; // Подключение русской локализации
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
dayjs.locale("ru");

// Пример данных
// const jsonData = [
//   {
//     id: "67dadfb8abcc830716019cbe",
//     key: "PLATFORMABI-226",
//     issue:
//       "Включить в конфигурации Superset на dev-стенде опцию работы с шаблонами Jinja",
//     updatedAt: "2025-03-19T15:16:26.473+0000",
//   },
//   {
//     id: "67dadfb8abcc830716019cbf",
//     key: "PLATFORMABI-227",
//     issue: "Обновить документацию по API",
//     updatedAt: "2025-03-20T10:00:00.000+0000",
//   },
// ];

const IssueDisplay = ({ display, href }) => (
  <>
    <Typography variant="body2">
      <IconButton content="a" href={href} target="_blank">
        <OpenInNewIcon />
      </IconButton>{" "}
      {display}{" "}
    </Typography>
  </>
);
// Функция преобразования данных
const transformData = (data) => {
  return data.map((item) => {
    const updatedDate = dayjs(item.updatedAt);
    const dayOfWeek = updatedDate.day(); // 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
    const durationOfWeek = item.duration;
    return {
      id: item.id,
      issue: item.issue.display,
      key: item.issue.key,

      monday: dayOfWeek === 1 ? durationOfWeek : "",
      tuesday: dayOfWeek === 2 ? durationOfWeek : "",
      wednesday: dayOfWeek === 3 ? durationOfWeek : "",
      thursday: dayOfWeek === 4 ? durationOfWeek : "",
      friday: dayOfWeek === 5 ? durationOfWeek : "",
      saturday: dayOfWeek === 6 ? durationOfWeek : "",
      sunday: dayOfWeek === 0 ? durationOfWeek : "",
    };
  });
};

// Определение колонок
const columns = [
  {
    field: "issue",
    headerName: "Название",
    flex: 4,
    // renderCell: (params) => {
    //   //console.log("params", params);
    //   return (
    //     <IssueDisplay
    //       display={params.row.issue.display}
    //       href={params.row.issue.self}
    //     />
    //   );
    // },
  },
  { field: "key", headerName: "Key", flex: 1.5 },
  { field: "monday", headerName: "Пн", flex: 1 },
  { field: "tuesday", headerName: "Вт", flex: 1 },
  { field: "wednesday", headerName: "Ср", flex: 1 },
  { field: "thursday", headerName: "Чт", flex: 1 },
  { field: "friday", headerName: "Пт", flex: 1 },
  { field: "saturday", headerName: "Сб", flex: 0.5 },
  { field: "sunday", headerName: "Вс", flex: 0.5 },
];

const TaskTable = ({ data }) => {
  const rows = transformData(data);

  return (
    <Grid>
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[5]} />
    </Grid>
  );
};

export default TaskTable;
