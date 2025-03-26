import React, { useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Grid2 as Grid,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
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

const formatDuration = (isoDuration, isTotal = false) => {
  if (!isoDuration || isoDuration === "P") return isTotal ? "" : "+";
  return isoDuration.replace(/P|T/g, "");
};

const sumDurations = (durations) => {
  let totalMinutes = durations.reduce((total, dur) => {
    const parsed = dayjs.duration(dur).asMinutes();
    return total + parsed;
  }, 0);

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

const transformData = (data) => {
  const result = {};

  data.forEach((item) => {
    const dayOfWeek = dayjs(item.updatedAt).day();
    if (!result[item.key]) {
      result[item.key] = {
        id: item.key,
        issue: { display: item.issue, href: item.href },
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
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({});

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
      const fieldDurations = rows
        .map((row) => row[field])
        .filter(Boolean)
        .map((dur) => `P${dur}`);

      totals[field] = sumDurations(fieldDurations);
    });

    totals.total = sumDurations(Object.values(totals).map((dur) => `P${dur}`));

    return {
      id: "total",
      issue: { display: "Итого", href: "#" },
      key: "",
      ...totals,
    };
  }, [rows]);

  const handleCellClick = (params) => {
    if (
      params.row.id !== "total" &&
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].includes(params.field)
    ) {
      setDialogContent(params);
      setOpenDialog(true);
    }
  };

  const renderButtonCell = (params) =>
    params.row.id !== "total" ? (
      <Button variant="outlined" size="small">
        {formatDuration(params.value)}
      </Button>
    ) : (
      formatDuration(params.value, true)
    );

  return (
    <Grid>
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
          {
            field: "monday",
            headerName: "Пн",
            flex: 1,
            renderCell: renderButtonCell,
          },
          {
            field: "tuesday",
            headerName: "Вт",
            flex: 1,
            renderCell: renderButtonCell,
          },
          {
            field: "wednesday",
            headerName: "Ср",
            flex: 1,
            renderCell: renderButtonCell,
          },
          {
            field: "thursday",
            headerName: "Чт",
            flex: 1,
            renderCell: renderButtonCell,
          },
          {
            field: "friday",
            headerName: "Пт",
            flex: 1,
            renderCell: renderButtonCell,
          },
          {
            field: "saturday",
            headerName: "Сб",
            flex: 1,
            renderCell: renderButtonCell,
          },
          {
            field: "sunday",
            headerName: "Вс",
            flex: 1,
            renderCell: renderButtonCell,
          },
          { field: "total", headerName: "Итого", flex: 1.5 },
        ]}
        pageSizeOptions={[5]}
        onCellClick={handleCellClick}
      />
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Детали ячейки</DialogTitle>
        <DialogContent>
          <pre>{JSON.stringify(dialogContent, null, 2)}</pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default TaskTable;
